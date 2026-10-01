import { stripSkillForRuntime, type RuntimeSkill, type CheckKind } from "@/lib/ai-skills";

const TTL = 60_000;
const cache = new Map<string, { at: number; value: RuntimeSkill | null }>();

export async function loadSkill(key: string): Promise<RuntimeSkill | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  let value: RuntimeSkill | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin.from as unknown as (t: string) => any)("ai_skills")
      .select("key, version, content, enabled")
      .eq("key", key)
      .maybeSingle();
    if (error) console.warn(`[ai-skills] Lỗi đọc skill ${key}:`, error.message);
    else if (!data) console.warn(`[ai-skills] Chưa có skill ${key}`);
    else if (!data.enabled) console.warn(`[ai-skills] Skill ${key} đang tắt`);
    else value = { key: data.key, version: data.version, text: stripSkillForRuntime(data.content) };
  } catch (e) {
    console.warn(`[ai-skills] Không tải được skill ${key}:`, e);
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}

let mapCache: { at: number; map: Map<string, string | null> } | null = null;

/** Skill gắn với một loại kiểm tra (bảng ai_check_skill). Không bao giờ ném lỗi. */
export async function loadSkillForCheck(kind: CheckKind): Promise<RuntimeSkill | null> {
  try {
    if (!mapCache || Date.now() - mapCache.at >= TTL) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await (supabaseAdmin.from as unknown as (t: string) => any)("ai_check_skill")
        .select("check_kind, skill_key");
      if (error) {
        console.warn("[ai-skills] Lỗi đọc ai_check_skill:", error.message);
        return null;
      }
      const map = new Map<string, string | null>();
      for (const r of (data ?? []) as { check_kind: string; skill_key: string | null }[]) map.set(r.check_kind, r.skill_key);
      mapCache = { at: Date.now(), map };
    }
    const key = mapCache.map.get(kind) ?? null;
    if (!key) return null;
    return await loadSkill(key);
  } catch (e) {
    console.warn(`[ai-skills] Không tải được skill cho ${kind}:`, e);
    return null;
  }
}
