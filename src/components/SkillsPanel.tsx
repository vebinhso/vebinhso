import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CHECK_LABELS_VI, parseSkillMarkdown, type CheckKind } from "@/lib/ai-skills";
import {
  listSkills, upsertSkillMarkdown, setSkillEnabled, listCheckSkills, listSkillVersions,
  type SkillRow, type CheckSkillRow, type SkillVersionRow,
  listAnonymousSignals, type AnonymousSignalRow,
} from "@/lib/ai-skills-admin";
import { CheckSkillMapping, FeedbackBlocks } from "@/components/SkillFeedbackBlocks";
import { pushAdminLog } from "@/lib/admin";

function signalsCsv(rows: AnonymousSignalRow[]) {
  return ["key,checks,high,mid,low,thumbs_up,thumbs_down,last_seen", ...rows.map((r) => [r.key, r.checks_count, r.high_count, r.mid_count, r.low_count, r.thumbs_up, r.thumbs_down, r.last_seen_at].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))].join("\n");
}

function downloadSignals(name: string, rows: AnonymousSignalRow[]) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([signalsCsv(rows)], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function SignalTable({ title, rows, filename }: { title: string; rows: AnonymousSignalRow[]; filename: string }) {
  return <div className="space-y-2"><div className="flex items-center justify-between gap-2"><h4 className="font-black">{title}</h4><button className="toy-button !px-3 !py-1 !text-xs" onClick={() => downloadSignals(filename, rows)}>Tải CSV</button></div><div className="max-h-80 overflow-auto rounded-lg border"><table className="w-full text-xs"><thead className="sticky top-0 bg-muted"><tr><th className="p-2 text-left">Giá trị</th><th>Lượt</th><th>Cao</th><th>Vừa</th><th>Thấp</th><th>👍</th><th>👎</th></tr></thead><tbody>{rows.map((r) => <tr key={r.key} className="border-t"><td className="p-2 font-mono">{r.key}</td><td className="text-center">{r.checks_count}</td><td className="text-center">{r.high_count}</td><td className="text-center">{r.mid_count}</td><td className="text-center">{r.low_count}</td><td className="text-center">{r.thumbs_up}</td><td className="text-center">{r.thumbs_down}</td></tr>)}</tbody></table></div></div>;
}

function usedFor(key: string, mapping: CheckSkillRow[]): string {
  return mapping
    .filter((m) => m.skill_key === key)
    .map((m) => CHECK_LABELS_VI[m.check_kind as CheckKind] ?? m.check_kind)
    .join(", ") || "—";
}

export function SkillsPanel() {
  const [rows, setRows] = useState<SkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<SkillRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mapping, setMapping] = useState<CheckSkillRow[]>([]);
  const [versions, setVersions] = useState<SkillVersionRow[]>([]);
  const [versionPick, setVersionPick] = useState<number | null>(null);
  const [signals, setSignals] = useState<{ domains: AnonymousSignalRow[]; phones: AnonymousSignalRow[]; consentCounts: Record<string, number> } | null>(null);

  const reloadMapping = async () => {
    try { setMapping(await listCheckSkills()); }
    catch (e) { toast.error(`Không tải được bảng kết nối: ${(e as Error).message}`); }
  };
  useEffect(() => { void reloadMapping(); }, []);
  useEffect(() => {
    setVersions([]); setVersionPick(null);
    if (!viewing) return;
    listSkillVersions(viewing.key).then(setVersions).catch(() => setVersions([]));
  }, [viewing]);
  const shownContent = versionPick == null
    ? viewing?.content
    : versions.find((v) => v.version === versionPick)?.content ?? viewing?.content;

  const reload = async () => {
    try {
      setRows(await listSkills());
    } catch (e) {
      toast.error(`Không tải được danh sách skill: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void reload(); }, []);
  useEffect(() => { listAnonymousSignals().then(setSignals).catch((e) => toast.error(`Không tải được dữ liệu ẩn danh: ${(e as Error).message}`)); }, []);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    for (const f of Array.from(files)) {
      try {
        const md = await f.text();
        const { key } = parseSkillMarkdown(md);
        const before = rows.find((r) => r.key === key);
        const after = await upsertSkillMarkdown(md);
        if (!before) {
          toast.success(`${key}: phiên bản ${after.version}`);
          pushAdminLog(`Tải lên skill AI ${key} (phiên bản ${after.version})`);
        } else if (after.version !== before.version) {
          toast.success(`${key}: phiên bản ${before.version} → ${after.version}`);
          pushAdminLog(`Cập nhật skill AI ${key}: phiên bản ${before.version} → ${after.version}`);
        } else {
          toast.info(`${key}: không đổi nội dung`);
        }
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message}`);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
    await reload();
    setBusy(false);
  };

  const toggle = async (r: SkillRow, enabled: boolean) => {
    try {
      await setSkillEnabled(r.key, enabled);
      pushAdminLog(`${enabled ? "Bật" : "Tắt"} skill AI ${r.key}`);
      await reload();
    } catch (e) {
      toast.error(`${r.key}: ${(e as Error).message}`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-black">🧠 Skill AI</h2>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".md,text/markdown" multiple className="hidden" onChange={(e) => void onFiles(e.target.files)} />
          <button disabled={busy} onClick={() => fileRef.current?.click()} className="toy-button toy-button-primary !text-sm !py-2 !px-4">
            {busy ? "Đang tải lên…" : "Tải lên file .md"}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Skill có hiệu lực trong Security check sau tối đa 1 phút.</p>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="p-2">Key</th>
              <th className="p-2">Tiêu đề</th>
              <th className="p-2">Dùng cho</th>
              <th className="p-2">Phiên bản</th>
              <th className="p-2">Bật</th>
              <th className="p-2">Cập nhật lúc</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Đang tải…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Chưa có skill nào. Hãy tải lên 6 file .md.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.key} className="border-t">
                <td className="p-2 font-mono text-xs">{r.key}</td>
                <td className="p-2">{r.title}</td>
                <td className="p-2">{usedFor(r.key, mapping)}</td>
                <td className="p-2 text-center">{r.version}</td>
                <td className="p-2"><Switch checked={r.enabled} onCheckedChange={(v) => void toggle(r, v)} /></td>
                <td className="p-2 text-xs">{new Date(r.updated_at).toLocaleString("vi-VN")}</td>
                <td className="p-2"><button onClick={() => setViewing(r)} className="toy-button !text-xs !py-1 !px-3">Xem</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CheckSkillMapping skills={rows} mapping={mapping} onChanged={() => void reloadMapping()} />
      <section className="space-y-3 rounded-xl border bg-card p-3">
        <div><h3 className="text-lg font-black">Dữ liệu ẩn danh</h3><p className="text-xs text-muted-foreground">Chỉ lưu tên miền, đầu số và mức rủi ro tổng hợp; không lưu đường link, số điện thoại hay nội dung người dùng.</p></div>
        {signals ? <><div className="grid gap-2 sm:grid-cols-3"><div className="rounded-lg bg-muted p-3 font-black">Qua lớp: {signals.consentCounts.class ?? 0}</div><div className="rounded-lg bg-muted p-3 font-black">Qua liên kết: {signals.consentCounts.parent_link ?? 0}</div><div className="rounded-lg bg-muted p-3 font-black">Giáo viên/admin: {signals.consentCounts.staff ?? 0}</div></div><div className="grid gap-4 lg:grid-cols-2"><SignalTable title="50 tên miền được kiểm tra nhiều nhất" rows={signals.domains} filename="ten-mien-an-danh.csv" /><SignalTable title="30 đầu số được kiểm tra nhiều nhất" rows={signals.phones} filename="dau-so-an-danh.csv" /></div></> : <p className="text-sm font-bold">Đang tải…</p>}
      </section>
      <FeedbackBlocks />
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.title} <span className="font-mono text-xs text-muted-foreground">({viewing?.key} · v{viewing?.version})</span></DialogTitle>
          </DialogHeader>
          {versions.length > 1 && (
            <label className="flex items-center gap-2 text-sm font-bold">
              Phiên bản
              <select value={versionPick ?? viewing?.version ?? ""} onChange={(e) => setVersionPick(Number(e.target.value))}
                className="rounded-lg border bg-background p-1 text-sm">
                {versions.map((v) => (
                  <option key={v.id} value={v.version}>v{v.version} · {new Date(v.created_at).toLocaleString("vi-VN")}</option>
                ))}
              </select>
            </label>
          )}
          <pre className="whitespace-pre-wrap text-sm">{shownContent}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
