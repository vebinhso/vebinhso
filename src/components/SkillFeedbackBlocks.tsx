import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CHECK_KINDS, CHECK_LABELS_VI, type CheckKind } from "@/lib/ai-skills";
import { FEEDBACK_REASONS, summarizeFeedback } from "@/lib/ai-feedback";
import { listFeedback, setCheckSkill, type CheckSkillRow, type FeedbackAdminRow, type SkillRow } from "@/lib/ai-skills-admin";
import { pushAdminLog } from "@/lib/admin";

const reasonLabel = (k: string | null) => FEEDBACK_REASONS.find((r) => r.key === k)?.vi ?? "—";
const kindLabel = (k: string) => CHECK_LABELS_VI[k as CheckKind] ?? k;
const pct = (up: number, total: number) => (total ? `${Math.round((up / total) * 100)}%` : "—");

export function CheckSkillMapping({ skills, mapping, onChanged }: {
  skills: SkillRow[]; mapping: CheckSkillRow[]; onChanged: () => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const change = async (kind: CheckKind, value: string) => {
    const key = value || null;
    setSaving(kind);
    try {
      await setCheckSkill(kind, key);
      toast.success(`${CHECK_LABELS_VI[kind]}: ${key ?? "Không dùng skill"}`);
      pushAdminLog(`Kết nối kiểm tra ${CHECK_LABELS_VI[kind]} với ${key ?? "không dùng skill"}`);
      onChanged();
    } catch (e) {
      toast.error(`${CHECK_LABELS_VI[kind]}: ${(e as Error).message}`);
    } finally { setSaving(null); }
  };
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-black">Kết nối kiểm tra với skill</h3>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left"><tr><th className="p-2">Kiểm tra</th><th className="p-2">Skill</th></tr></thead>
          <tbody>
            {CHECK_KINDS.map((k) => {
              const current = mapping.find((m) => m.check_kind === k)?.skill_key ?? "";
              const sk = skills.find((s) => s.key === current);
              return (
                <tr key={k} className="border-t">
                  <td className="p-2">{CHECK_LABELS_VI[k]}</td>
                  <td className="p-2">
                    <select value={current} disabled={saving === k} onChange={(e) => void change(k, e.target.value)}
                      className="rounded-lg border bg-background p-1 text-sm max-w-full">
                      <option value="">Không dùng skill</option>
                      {skills.map((s) => <option key={s.key} value={s.key}>{s.key} — {s.title}</option>)}
                    </select>
                    {sk && !sk.enabled && <span className="ml-2 text-xs font-bold text-orange-600">Skill đang tắt</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FeedbackBlocks() {
  const [rows, setRows] = useState<FeedbackAdminRow[] | null>(null);
  useEffect(() => {
    listFeedback().then(setRows).catch((e) => { toast.error(`Không tải được phản hồi: ${(e as Error).message}`); setRows([]); });
  }, []);
  const summary = useMemo(() => summarizeFeedback(rows ?? []), [rows]);
  const detailed = useMemo(() => (rows ?? []).filter((r) => r.note || r.attached_content).slice(0, 50), [rows]);

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-lg font-black">Phản hồi về kết quả</h3>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left">
              <tr><th className="p-2">Skill</th><th className="p-2">Phiên bản</th><th className="p-2">Học sinh</th><th className="p-2">Giáo viên/Admin</th><th className="p-2">3 lý do 👎 hay gặp</th></tr>
            </thead>
            <tbody>
              {rows === null ? (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Đang tải…</td></tr>
              ) : summary.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Chưa có phản hồi.</td></tr>
              ) : summary.map((g) => (
                <tr key={`${g.skillKey}-${g.skillVersion}`} className="border-t">
                  <td className="p-2 font-mono text-xs">{g.skillKey ?? "Không dùng skill"}</td>
                  <td className="p-2 text-center">{g.skillVersion ?? "—"}</td>
                  <td className="p-2">{g.students.total} · 👍 {pct(g.students.up, g.students.total)}</td>
                  <td className="p-2">{g.staff.total} · 👍 {pct(g.staff.up, g.staff.total)}</td>
                  <td className="p-2 text-xs">{g.topReasons.map((r) => `${reasonLabel(r.reason)} (${r.count})`).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-black">Phản hồi có ghi chú hoặc đính kèm</h3>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left">
              <tr><th className="p-2">Kiểm tra</th><th className="p-2">Phiên bản</th><th className="p-2"></th><th className="p-2">Lý do</th><th className="p-2">Nguồn</th><th className="p-2">Ghi chú</th><th className="p-2">Nội dung đã che</th></tr>
            </thead>
            <tbody>
              {detailed.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Chưa có.</td></tr>
              ) : detailed.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-2">{kindLabel(r.check_kind)}</td>
                  <td className="p-2 text-center">{r.skill_version ?? "—"}</td>
                  <td className="p-2">{r.rating > 0 ? "👍" : "👎"}</td>
                  <td className="p-2 text-xs">{r.rating < 0 ? reasonLabel(r.reason) : "—"}</td>
                  <td className="p-2 text-xs">{r.reporter_role === "student" ? "Học sinh, có đồng ý" : "Giáo viên"}</td>
                  <td className="p-2 text-xs whitespace-pre-wrap">{r.note ?? "—"}</td>
                  <td className="p-2 text-xs whitespace-pre-wrap break-words max-w-xs">{r.attached_content ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
