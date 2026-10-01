import { supabase } from "@/integrations/supabase/client";
import { parseSkillMarkdown } from "@/lib/ai-skills";

export type SkillRow = {
  key: string;
  title: string;
  content: string;
  version: number;
  enabled: boolean;
  updated_at: string;
};

const table = () => (supabase.from as unknown as (t: string) => any)("ai_skills");

export async function listSkills(): Promise<SkillRow[]> {
  const { data, error } = await table().select("*").order("key");
  if (error) throw new Error(error.message);
  return (data ?? []) as SkillRow[];
}

export async function upsertSkillMarkdown(md: string): Promise<SkillRow> {
  const { key, title } = parseSkillMarkdown(md);
  const { data, error } = await table()
    .upsert({ key, title, content: md }, { onConflict: "key" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as SkillRow;
}

export async function setSkillEnabled(key: string, enabled: boolean): Promise<void> {
  const { error } = await table().update({ enabled }).eq("key", key);
  if (error) throw new Error(error.message);
}

const anyTable = (t: string) => (supabase.from as unknown as (t: string) => any)(t);

export type CheckSkillRow = { check_kind: string; skill_key: string | null; updated_at: string };
export async function listCheckSkills(): Promise<CheckSkillRow[]> {
  const { data, error } = await anyTable("ai_check_skill").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as CheckSkillRow[];
}

export async function setCheckSkill(kind: string, skillKey: string | null): Promise<void> {
  const { error } = await anyTable("ai_check_skill")
    .upsert({ check_kind: kind, skill_key: skillKey }, { onConflict: "check_kind" });
  if (error) throw new Error(error.message);
}

export type SkillVersionRow = { id: string; skill_key: string; version: number; content: string; created_at: string };
export async function listSkillVersions(key: string): Promise<SkillVersionRow[]> {
  const { data, error } = await anyTable("ai_skill_versions")
    .select("*").eq("skill_key", key).order("version", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SkillVersionRow[];
}

export type FeedbackAdminRow = {
  id: string; created_at: string; reporter_role: "student" | "teacher" | "admin"; check_kind: string;
  skill_key: string | null; skill_version: number | null; result_level: string | null; rating: number;
  reason: string | null; note: string | null; attached_content: string | null; consent_basis: string | null;
};
export async function listFeedback(days = 180, limit = 5000): Promise<FeedbackAdminRow[]> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data, error } = await anyTable("ai_check_feedback")
    .select("id, created_at, reporter_role, check_kind, skill_key, skill_version, result_level, rating, reason, note, attached_content, consent_basis")
    .gte("created_at", since).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as FeedbackAdminRow[];
}
