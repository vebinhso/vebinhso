import { stripSkillForRuntime, type RuntimeSkill } from "@/lib/ai-skills";

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
