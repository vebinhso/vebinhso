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
