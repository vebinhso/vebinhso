import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  EVAL_KINDS, EVAL_KIND_LABELS, SAMPLE_EVAL_CSV, parseEvalCsv, computeMetrics, compareRuns, fmtPct, hasMixedVersions,
  type EvalRow, type EvalMetrics,
} from "@/lib/ai-eval";
import {
  createEvalSet, importEvalCases, listEvalSets, listEvalCases, deleteEvalCase, deleteEvalSet,
  getCurrentSkillSnapshot, createEvalRun, saveEvalResult, finishEvalRun, listEvalRuns, getEvalRunResults,
  type EvalCase, type EvalRun, type EvalResultRow, type SkillSnapshot,
} from "@/lib/ai-eval.functions";
import { analyzeText, analyzeLink, analyzeEmail, analyzePhone, analyzeNews } from "@/lib/ai-detect.functions";

type SetRow = { id: string; name: string; description: string | null; case_count: number };

function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
const csv = (rows: (string | number | null | undefined)[][]) =>
  rows.map((r) => r.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
const short = (s: string, n = 120) => (s.length > n ? s.slice(0, n) + "…" : s);
const labelVi = (l: string | null) => (l === "scam" ? "Lừa đảo" : l === "legit" ? "Thật" : "—");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function MetricCards({ m }: { m: EvalMetrics }) {
  const cards = [
    ["Tỷ lệ đúng", fmtPct(m.correct, m.total)],
    ["Tỷ lệ báo nhầm", fmtPct(m.falsePositives, m.legitTotal)],
    ["Tỷ lệ bỏ sót", fmtPct(m.misses, m.scamTotal)],
    ["Số kết quả 40-69", String(m.midCount)],
    ["Số lỗi", String(m.errorCount)],
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {cards.map(([t, v]) => (
        <div key={t} className="rounded-lg bg-muted p-3"><div className="text-xs font-bold text-muted-foreground">{t}</div><div className="font-black">{v}</div></div>
      ))}
    </div>
  );
}

export function EvalPanel() {
  const fnSets = useServerFn(listEvalSets), fnCreateSet = useServerFn(createEvalSet), fnImport = useServerFn(importEvalCases);
  const fnCases = useServerFn(listEvalCases), fnDelCase = useServerFn(deleteEvalCase), fnDelSet = useServerFn(deleteEvalSet);
  const fnSnap = useServerFn(getCurrentSkillSnapshot), fnRun = useServerFn(createEvalRun), fnSave = useServerFn(saveEvalResult);
  const fnFinish = useServerFn(finishEvalRun), fnRuns = useServerFn(listEvalRuns), fnResults = useServerFn(getEvalRunResults);
  const aText = useServerFn(analyzeText), aLink = useServerFn(analyzeLink), aEmail = useServerFn(analyzeEmail);
  const aPhone = useServerFn(analyzePhone), aNews = useServerFn(analyzeNews);

  const [sets, setSets] = useState<SetRow[]>([]);
  const [setId, setSetId] = useState<string>("");
  const [cases, setCases] = useState<EvalCase[]>([]);
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [newName, setNewName] = useState(""); const [newDesc, setNewDesc] = useState("");
  const [preview, setPreview] = useState<{ rows: EvalRow[]; errors: { line: number; message: string }[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [snap, setSnap] = useState<SkillSnapshot | null>(null);
  const [runLabel, setRunLabel] = useState(""); const [attempts, setAttempts] = useState<1 | 2>(1);
  const [running, setRunning] = useState<{ runId: string; done: number; total: number } | null>(null);
  const pauseRef = useRef(false);
  const [viewRunId, setViewRunId] = useState<string>("");
  const [viewResults, setViewResults] = useState<EvalResultRow[]>([]);
  const [cmpA, setCmpA] = useState(""); const [cmpB, setCmpB] = useState("");
  const [cmpRes, setCmpRes] = useState<{ a: EvalResultRow[]; b: EvalResultRow[] } | null>(null);

  const err = (e: unknown) => toast.error((e as Error).message);
  const reloadSets = useCallback(() => fnSets().then(setSets).catch(err), [fnSets]);
  const reloadSet = useCallback(async (id: string) => {
    if (!id) { setCases([]); setRuns([]); return; }
    try {
      const [c, r] = await Promise.all([fnCases({ data: { setId: id } }), fnRuns({ data: { setId: id } })]);
      setCases(c); setRuns(r);
      setRunLabel(`Lượt ${r.length + 1}`);
    } catch (e) { err(e); }
  }, [fnCases, fnRuns]);
  useEffect(() => { void reloadSets(); fnSnap().then(setSnap).catch(err); }, []);
  useEffect(() => { void reloadSet(setId); setViewRunId(""); setCmpA(""); setCmpB(""); setCmpRes(null); }, [setId]);
  useEffect(() => {
    if (!viewRunId) { setViewResults([]); return; }
    fnResults({ data: { runId: viewRunId } }).then(setViewResults).catch(err);
  }, [viewRunId]);

  const caseById = useMemo(() => new Map(cases.map((c) => [c.id, c])), [cases]);

  const onCreateSet = async () => {
    try {
      const s = await fnCreateSet({ data: { name: newName, description: newDesc } });
      setNewName(""); setNewDesc(""); await reloadSets(); setSetId(s.id);
      toast.success("Đã tạo bộ đề");
    } catch (e) { err(e); }
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setPreview(parseEvalCsv(await f.text()));
    if (fileRef.current) fileRef.current.value = "";
  };
  const onConfirmImport = async () => {
    if (!preview || !setId) return;
    try {
      const r = await fnImport({ data: { setId, rows: preview.rows } });
      toast.success(`Đã lưu ${r.inserted} câu`);
      setPreview(null); await reloadSet(setId); await reloadSets();
    } catch (e) { err(e); }
  };

  const callCheck = async (c: EvalCase) => {
    const base = { locale: "vi" as const, source: "eval" as const };
    switch (c.check_kind) {
      case "text": return aText({ data: { text: c.content, ...base } });
      case "link": return aLink({ data: { url: c.content, ...base } });
      case "email": return aEmail({ data: { content: c.content, ...base } });
      case "phone": return aPhone({ data: { phone: c.content, context: c.context ?? "", ...base } });
      case "news": return aNews({ data: { content: c.content, ...base } });
    }
  };

  const execRun = async (run: EvalRun) => {
    pauseRef.current = false;
    const existing = await fnResults({ data: { runId: run.id } });
    const have = new Set(existing.filter((r) => !r.error).map((r) => `${r.case_id}:${r.attempt}`));
    const todo: { c: EvalCase; attempt: number }[] = [];
    for (const c of cases) for (let a = 1; a <= run.attempts; a++) if (!have.has(`${c.id}:${a}`)) todo.push({ c, attempt: a });
    const total = cases.length * run.attempts;
    let done = total - todo.length;
    setRunning({ runId: run.id, done, total });
    let i = 0;
    const worker = async () => {
      while (!pauseRef.current && i < todo.length) {
        const { c, attempt } = todo[i++];
        const t0 = performance.now();
        let result: unknown, error: string | undefined;
        for (let tries = 0; tries < 2; tries++) {
          try { result = await callCheck(c); error = undefined; break; }
          catch (e) {
            error = (e as Error).message || "Lỗi";
            if (tries === 0 && /429|rate|quá nhiều|too many/i.test(error)) { await sleep(10_000); continue; }
            break;
          }
        }
        try {
          await fnSave({ data: { runId: run.id, caseId: c.id, attempt, result: error ? undefined : result, error, durationMs: performance.now() - t0 } });
        } catch (e) { err(e); }
        done++;
        setRunning({ runId: run.id, done, total });
      }
    };
    await Promise.all([worker(), worker()]);
    if (!pauseRef.current) {
      await fnFinish({ data: { runId: run.id } });
      toast.success(`${run.label}: đã chạy xong`);
      setRunning(null);
      setViewRunId(run.id);
    } else {
      toast.info("Đã tạm dừng");
      setRunning(null);
    }
    await reloadSet(setId);
  };

  const onStart = async () => {
    if (!setId || cases.length === 0) return toast.error("Bộ đề chưa có câu nào");
    try {
      const run = await fnRun({ data: { setId, label: runLabel, attempts } });
      await execRun(run);
    } catch (e) { err(e); setRunning(null); }
  };

  const viewRun = runs.find((r) => r.id === viewRunId);
  const viewMetrics = useMemo(() => (viewResults.length ? computeMetrics(viewResults) : null), [viewResults]);
  const wrong = viewResults.filter((r) => !r.error && r.correct === false);

  const resultsCsv = () => {
    download(`ket-qua-${viewRun?.label ?? "luot"}.csv`, csv([
      ["loai", "noi_dung", "nhan_that", "lan", "diem", "muc", "du_doan", "dung", "skill", "phien_ban", "do_chenh", "tom_tat", "dau_hieu", "loi", "ms"],
      ...viewResults.map((r) => {
        const c = caseById.get(r.case_id);
        return [r.check_kind, c?.content, labelVi(r.label), r.attempt, r.risk_score, r.band, labelVi(r.predicted), r.correct == null ? "" : r.correct ? "1" : "0", r.skill_key, r.skill_version, r.margin, r.detail?.summary, (r.detail?.signs ?? []).join(" | "), r.error, r.duration_ms];
      }),
    ]));
  };

  const onCompare = async () => {
    if (!cmpA || !cmpB || cmpA === cmpB) return toast.error("Chọn 2 lượt khác nhau");
    try {
      const [a, b] = await Promise.all([fnResults({ data: { runId: cmpA } }), fnResults({ data: { runId: cmpB } })]);
      setCmpRes({ a, b });
    } catch (e) { err(e); }
  };
  const cmp = useMemo(() => {
    if (!cmpRes) return null;
    const runA = runs.find((r) => r.id === cmpA)!, runB = runs.find((r) => r.id === cmpB)!;
    const mA = computeMetrics(cmpRes.a), mB = computeMetrics(cmpRes.b);
    const diff = compareRuns(cmpRes.a, cmpRes.b);
    const header = ["Lượt", "Phiên bản skill", "Số câu", "Tỷ lệ đúng", "Tỷ lệ báo nhầm", "Tỷ lệ bỏ sót", "Số kết quả 40-69"];
    const row = (r: EvalRun, m: EvalMetrics) => [r.label, m.versionsUsed.join(", ") || "Không dùng skill", String(m.total), fmtPct(m.correct, m.total), fmtPct(m.falsePositives, m.legitTotal), fmtPct(m.misses, m.scamTotal), String(m.midCount)];
    return { header, rows: [row(runA, mA), row(runB, mB)], diff };
  }, [cmpRes]);

  const copyTable = async () => {
    if (!cmp) return;
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const html = `<table border="1" style="border-collapse:collapse"><tr>${cmp.header.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>${cmp.rows.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</table>`;
    const plain = [cmp.header, ...cmp.rows].map((r) => r.join("\t")).join("\n");
    try {
      await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([plain], { type: "text/plain" }) })]);
    } catch { await navigator.clipboard.writeText(plain); }
    toast.success("Đã sao chép bảng");
  };
  const cmpCsv = () => {
    if (!cmp) return;
    const line = (x: { caseId: string; a: EvalResultRow | any; b: EvalResultRow | any }, kind: string) => {
      const c = caseById.get(x.caseId);
      return [kind, c?.check_kind, c?.content, labelVi(c?.label ?? null), x.a.risk_score, x.b.risk_score];
    };
    download("so-sanh-2-luot.csv", csv([
      cmp.header, ...cmp.rows, [],
      ["thay_doi", "loai", "noi_dung", "nhan_that", "diem_luot_A", "diem_luot_B"],
      ...cmp.diff.fixed.map((x) => line(x, "sai→đúng")), ...cmp.diff.broken.map((x) => line(x, "đúng→sai")),
    ]));
  };

  const previewCounts = preview && EVAL_KINDS.map((k) => ({
    k, scam: preview.rows.filter((r) => r.check_kind === k && r.label === "scam").length,
    legit: preview.rows.filter((r) => r.check_kind === k && r.label === "legit").length,
  })).filter((x) => x.scam + x.legit > 0);

  const sel = "rounded-lg border bg-background p-1 text-sm";
  return (
    <section className="space-y-4 rounded-xl border bg-card p-3">
      <div><h3 className="text-lg font-black">Kiểm thử bộ đề</h3>
        <p className="text-xs text-muted-foreground">Chạy một bộ câu có sẵn đáp án qua đúng các kiểm tra học sinh dùng, để so độ chính xác trước và sau khi sửa skill.</p></div>

      {/* 1. Bộ đề */}
      <div className="space-y-2">
        <h4 className="font-black">1. Bộ đề</h4>
        <p className="text-xs font-bold text-destructive">Không đưa số điện thoại, tên hay thông tin cá nhân thật vào bộ đề.</p>
        <div className="flex flex-wrap items-center gap-2">
          <input className={sel} placeholder="Tên bộ đề" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input className={sel} placeholder="Mô tả (tuỳ chọn)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          <button className="toy-button !px-3 !py-1 !text-xs" onClick={() => void onCreateSet()}>Tạo bộ đề mới</button>
          <button className="toy-button !px-3 !py-1 !text-xs" onClick={() => download("bo-de-mau.csv", SAMPLE_EVAL_CSV)}>Tải file mẫu CSV</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className={sel} value={setId} onChange={(e) => setSetId(e.target.value)}>
            <option value="">— Chọn bộ đề —</option>
            {sets.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.case_count} câu)</option>)}
          </select>
          {setId && <>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
            <button className="toy-button !px-3 !py-1 !text-xs" onClick={() => fileRef.current?.click()}>Nhập CSV</button>
            <button className="toy-button !px-3 !py-1 !text-xs" onClick={async () => {
              if (!confirm("Xoá bộ đề này cùng mọi lượt chạy?")) return;
              try { await fnDelSet({ data: { id: setId } }); setSetId(""); await reloadSets(); } catch (e) { err(e); }
            }}>Xoá bộ đề</button>
          </>}
        </div>
        {preview && (
          <div className="space-y-2 rounded-lg border p-2 text-sm">
            <div className="font-bold">Xem trước: {preview.rows.length} câu hợp lệ, {preview.errors.length} dòng lỗi</div>
            <ul className="text-xs">{previewCounts!.map((x) => <li key={x.k}>{EVAL_KIND_LABELS[x.k]}: {x.scam} lừa đảo, {x.legit} thật</li>)}</ul>
            {preview.errors.length > 0 && <ul className="text-xs text-destructive">{preview.errors.map((e) => <li key={e.line}>Dòng {e.line}: {e.message}</li>)}</ul>}
            <div className="flex gap-2">
              <button disabled={!preview.rows.length} className="toy-button toy-button-primary !px-3 !py-1 !text-xs" onClick={() => void onConfirmImport()}>Xác nhận lưu</button>
              <button className="toy-button !px-3 !py-1 !text-xs" onClick={() => setPreview(null)}>Huỷ</button>
            </div>
          </div>
        )}
        {setId && cases.length > 0 && (
          <div className="max-h-72 overflow-auto rounded-lg border">
            <table className="w-full text-xs"><thead className="sticky top-0 bg-muted"><tr><th className="p-2 text-left">Loại</th><th className="p-2 text-left">Nội dung</th><th>Nhãn</th><th>Nhóm</th><th></th></tr></thead>
              <tbody>{cases.map((c) => (
                <tr key={c.id} className="border-t"><td className="p-2">{EVAL_KIND_LABELS[c.check_kind]}</td><td className="p-2">{short(c.content)}</td><td className="text-center">{labelVi(c.label)}</td><td className="text-center">{c.grp ?? ""}</td>
                  <td><button className="toy-button !px-2 !py-0.5 !text-xs" onClick={async () => { try { await fnDelCase({ data: { id: c.id } }); await reloadSet(setId); } catch (e) { err(e); } }}>Xoá</button></td></tr>
              ))}</tbody></table>
          </div>
        )}
      </div>

      {/* 2. Chạy */}
      {setId && (
        <div className="space-y-2">
          <h4 className="font-black">2. Chạy</h4>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input className={sel} value={runLabel} onChange={(e) => setRunLabel(e.target.value)} />
            <label className="font-bold">Số lần mỗi câu
              <select className={`${sel} ml-1`} value={attempts} onChange={(e) => setAttempts(e.target.value === "2" ? 2 : 1)}><option value="1">1</option><option value="2">2</option></select>
            </label>
            <button className="toy-button !px-3 !py-1 !text-xs" onClick={() => fnSnap().then(setSnap).catch(err)}>Làm mới skill</button>
          </div>
          {snap && (
            <table className="text-xs"><thead><tr><th className="pr-4 text-left">Kiểm tra</th><th className="pr-4 text-left">Skill</th><th className="text-left">Phiên bản</th></tr></thead>
              <tbody>{EVAL_KINDS.map((k) => <tr key={k}><td className="pr-4">{EVAL_KIND_LABELS[k]}</td><td className="pr-4 font-mono">{snap[k]?.skill_key ?? "Không dùng skill"}{snap[k]?.enabled === false ? " (đang tắt)" : ""}</td><td>{snap[k]?.version ?? "—"}</td></tr>)}</tbody></table>
          )}
          <p className="text-xs">Số lần gọi AI dự kiến: <b>{cases.length * attempts * 2}</b> ({cases.length} câu × {attempts} lần × 2 mô hình)</p>
          <p className="text-xs text-muted-foreground">Nếu vừa tải skill mới, đợi 1 phút rồi mới chạy. Kiểm tra tin tức phụ thuộc tin mới trên mạng, nên chạy các lượt gần nhau.</p>
          {running ? (
            <div className="space-y-1">
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(running.done / Math.max(1, running.total)) * 100}%` }} /></div>
              <div className="flex items-center gap-2 text-xs"><span>{running.done}/{running.total}</span>
                <button className="toy-button !px-3 !py-1 !text-xs" onClick={() => { pauseRef.current = true; }}>Tạm dừng</button></div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button className="toy-button toy-button-primary !px-3 !py-1 !text-xs" disabled={!cases.length} onClick={() => void onStart()}>Bắt đầu chạy</button>
              {runs.filter((r) => r.status === "running").map((r) => (
                <button key={r.id} className="toy-button !px-3 !py-1 !text-xs" onClick={() => void execRun(r).catch(err)}>Tiếp tục: {r.label}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Kết quả */}
      {setId && runs.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-black">3. Kết quả một lượt</h4>
          <div className="flex flex-wrap items-center gap-2">
            <select className={sel} value={viewRunId} onChange={(e) => setViewRunId(e.target.value)}>
              <option value="">— Chọn lượt —</option>
              {runs.map((r) => <option key={r.id} value={r.id}>{r.label}{r.status === "running" ? " (chưa xong)" : ""}</option>)}
            </select>
            {viewResults.length > 0 && <button className="toy-button !px-3 !py-1 !text-xs" onClick={resultsCsv}>Tải CSV</button>}
          </div>
          {viewMetrics && viewRun && (
            <div className="space-y-2">
              {hasMixedVersions(viewMetrics.versionsUsed) && (
                <div className="rounded-lg border border-orange-400 bg-orange-100 p-2 text-sm font-bold text-orange-900">Lượt này dùng lẫn nhiều phiên bản skill, kết quả không dùng để so sánh được.</div>
              )}
              <MetricCards m={viewMetrics} />
              <table className="w-full text-xs"><thead className="bg-muted"><tr><th className="p-1 text-left">Loại</th><th>Đúng</th><th>Báo nhầm</th><th>Bỏ sót</th><th>40-69</th><th>Lỗi</th></tr></thead>
                <tbody>{Object.entries(viewMetrics.byKind).map(([k, m]) => (
                  <tr key={k} className="border-t"><td className="p-1">{EVAL_KIND_LABELS[k as keyof typeof EVAL_KIND_LABELS]}</td><td className="text-center">{fmtPct(m.correct, m.total)}</td><td className="text-center">{fmtPct(m.falsePositives, m.legitTotal)}</td><td className="text-center">{fmtPct(m.misses, m.scamTotal)}</td><td className="text-center">{m.midCount}</td><td className="text-center">{m.errorCount}</td></tr>
                ))}</tbody></table>
              <p className="text-xs">Độ chênh trung bình giữa 2 mô hình: ca đúng {viewMetrics.avgMarginCorrect ?? "—"}, ca sai {viewMetrics.avgMarginWrong ?? "—"}</p>
              {viewRun.attempts === 2 && viewMetrics.stability && <p className="text-xs">Độ ổn định: {fmtPct(viewMetrics.stability.same, viewMetrics.stability.total)}</p>}
              <p className="text-xs text-muted-foreground">Skill dùng thực tế: {viewMetrics.versionsUsed.join(", ") || "Không dùng skill"}</p>
              {wrong.length > 0 && (
                <div className="max-h-96 overflow-auto rounded-lg border">
                  <table className="w-full text-xs"><thead className="sticky top-0 bg-muted"><tr><th className="p-2 text-left">Nội dung</th><th>Nhãn thật</th><th>Điểm</th><th>Dự đoán</th><th className="text-left">Tóm tắt của AI</th><th className="text-left">Dấu hiệu AI nêu</th></tr></thead>
                    <tbody>{wrong.map((r) => (
                      <tr key={r.id} className="border-t align-top"><td className="p-2">{short(caseById.get(r.case_id)?.content ?? "")}</td><td className="text-center">{labelVi(r.label)}</td><td className="text-center">{r.risk_score}</td><td className="text-center">{labelVi(r.predicted)}</td><td className="p-2">{r.detail?.summary}</td><td className="p-2">{(r.detail?.signs ?? []).join("; ")}</td></tr>
                    ))}</tbody></table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. So sánh */}
      {setId && runs.length > 1 && (
        <div className="space-y-2">
          <h4 className="font-black">4. So sánh 2 lượt</h4>
          <div className="flex flex-wrap items-center gap-2">
            {[[cmpA, setCmpA], [cmpB, setCmpB]].map(([v, set], i) => (
              <select key={i} className={sel} value={v as string} onChange={(e) => { (set as (s: string) => void)(e.target.value); setCmpRes(null); }}>
                <option value="">— Lượt {i ? "B" : "A"} —</option>
                {runs.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            ))}
            <button className="toy-button !px-3 !py-1 !text-xs" onClick={() => void onCompare()}>So sánh</button>
            {cmp && <><button className="toy-button !px-3 !py-1 !text-xs" onClick={cmpCsv}>Tải CSV</button><button className="toy-button !px-3 !py-1 !text-xs" onClick={() => void copyTable()}>Sao chép bảng</button></>}
          </div>
          {cmp && (
            <>
              <table className="w-full text-xs"><thead className="bg-muted"><tr>{cmp.header.map((h) => <th key={h} className="p-1">{h}</th>)}</tr></thead>
                <tbody>{cmp.rows.map((r, i) => <tr key={i} className="border-t">{r.map((v, j) => <td key={j} className="p-1 text-center">{v}</td>)}</tr>)}</tbody></table>
              {([["Đổi từ sai sang đúng", cmp.diff.fixed], ["Đổi từ đúng sang sai", cmp.diff.broken]] as const).map(([t, list]) => (
                <div key={t}><div className="text-sm font-bold">{t} ({list.length})</div>
                  <ul className="list-disc pl-5 text-xs">{list.map((x) => <li key={x.caseId}>{short(caseById.get(x.caseId)?.content ?? "")} — {labelVi(x.a.label)}, điểm {x.a.risk_score} → {x.b.risk_score}</li>)}</ul></div>
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}
