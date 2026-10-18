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
  reason: string | null; note: string | null; attached_content: string | null; consent_basis: string | null; consent_source: string | null;
};
export async function listFeedback(days = 180, limit = 5000): Promise<FeedbackAdminRow[]> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data, error } = await anyTable("ai_check_feedback")
    .select("id, created_at, reporter_role, check_kind, skill_key, skill_version, result_level, rating, reason, note, attached_content, consent_basis, consent_source")
    .gte("created_at", since).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as FeedbackAdminRow[];
}

export type AnonymousSignalRow = { key: string; checks_count: number; high_count: number; mid_count: number; low_count: number; thumbs_up: number; thumbs_down: number; last_seen_at: string };
export async function listAnonymousSignals() {
  const [domains, phones, consents] = await Promise.all([
    anyTable("ai_signal_domains").select("domain, checks_count, high_count, mid_count, low_count, thumbs_up, thumbs_down, last_seen_at").order("checks_count", { ascending: false }).limit(50),
    anyTable("ai_signal_phone_prefixes").select("prefix, checks_count, high_count, mid_count, low_count, thumbs_up, thumbs_down, last_seen_at").order("checks_count", { ascending: false }).limit(30),
    anyTable("ai_check_feedback").select("consent_source").not("consent_source", "is", null),
  ]);
  if (domains.error || phones.error || consents.error) throw new Error(domains.error?.message || phones.error?.message || consents.error?.message);
  return {
    domains: (domains.data ?? []).map((r: any) => ({ ...r, key: r.domain })) as AnonymousSignalRow[],
    phones: (phones.data ?? []).map((r: any) => ({ ...r, key: r.prefix })) as AnonymousSignalRow[],
    consentCounts: (consents.data ?? []).reduce((acc: Record<string, number>, r: { consent_source: string }) => { acc[r.consent_source] = (acc[r.consent_source] ?? 0) + 1; return acc; }, {}),
  };
}

/** Publish only an admin-written, reviewed rule; never auto-publish raw feedback. */
export async function approveFeedbackLearning(feedbackId: string, skillKey: string, rule: string): Promise<number> {
  const { data, error } = await (supabase.rpc as unknown as (name: string, args: object) => Promise<{ data: number | null; error: { message: string } | null }>)(
    "approve_feedback_learning",
    { _feedback_id: feedbackId, _skill_key: skillKey, _rule_text: rule.trim() },
  );
  if (error) throw new Error(error.message);
  if (typeof data !== "number") throw new Error("Không nhận được phiên bản skill mới.");
  return data;
}
