import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SKILL_FOR_CHECK, CHECK_LABELS_VI, parseSkillMarkdown, type CheckKind } from "@/lib/ai-skills";
import { listSkills, upsertSkillMarkdown, setSkillEnabled, type SkillRow } from "@/lib/ai-skills-admin";
import { pushAdminLog } from "@/lib/admin";

function usedFor(key: string): string {
  return (Object.keys(SKILL_FOR_CHECK) as CheckKind[])
    .filter((k) => SKILL_FOR_CHECK[k] === key)
    .map((k) => CHECK_LABELS_VI[k])
    .join(", ") || "—";
}

export function SkillsPanel() {
  const [rows, setRows] = useState<SkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<SkillRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      <p className="text-xs text-muted-foreground">Skill có hiệu lực trong AI Centre sau tối đa 1 phút.</p>
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
                <td className="p-2">{usedFor(r.key)}</td>
                <td className="p-2 text-center">{r.version}</td>
                <td className="p-2"><Switch checked={r.enabled} onCheckedChange={(v) => void toggle(r, v)} /></td>
                <td className="p-2 text-xs">{new Date(r.updated_at).toLocaleString("vi-VN")}</td>
                <td className="p-2"><button onClick={() => setViewing(r)} className="toy-button !text-xs !py-1 !px-3">Xem</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.title} <span className="font-mono text-xs text-muted-foreground">({viewing?.key} · v{viewing?.version})</span></DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-sm">{viewing?.content}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
