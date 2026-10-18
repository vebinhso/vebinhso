-- Approved feedback becomes a reviewed skill rule, never raw user content.
create table if not exists public.ai_feedback_learnings (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null unique references public.ai_check_feedback(id) on delete restrict,
  skill_key text not null references public.ai_skills(key),
  rule_text text not null,
  approved_by uuid not null,
  approved_at timestamptz not null default now()
);
alter table public.ai_feedback_learnings enable row level security;
revoke all on public.ai_feedback_learnings from anon, authenticated;
create or replace function public.approve_feedback_learning(_feedback_id uuid, _skill_key text, _rule_text text)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  f record;
  v integer;
  cleaned text;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Admin permission required';
  end if;
  cleaned := btrim(_rule_text);
  if length(cleaned) < 20 or length(cleaned) > 1000 then
    raise exception 'Reviewed rule must be 20-1000 characters';
  end if;
  if cleaned ~* '(https?://|[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}|\+?[0-9][0-9 .-]{8,}[0-9])' then
    raise exception 'Remove personal identifiers and URLs from the rule';
  end if;
  select id, check_kind, skill_key, consent_basis, content_expires_at, reporter_role
    into f from public.ai_check_feedback where id = _feedback_id for update;
  if not found then raise exception 'Feedback not found'; end if;
  if f.reporter_role = 'student' and (f.consent_basis is distinct from 'parent_and_student'
      or (f.content_expires_at is not null and f.content_expires_at < now())) then
    raise exception 'Feedback has no valid consent for learning';
  end if;
  if f.skill_key is not null and f.skill_key <> _skill_key then
    raise exception 'Skill mismatch';
  end if;
  perform 1 from public.ai_skills where key = _skill_key and enabled = true for update;
  if not found then raise exception 'Skill not found or disabled'; end if;
  insert into public.ai_feedback_learnings(feedback_id, skill_key, rule_text, approved_by)
    values (_feedback_id, _skill_key, cleaned, auth.uid());
  update public.ai_skills
    set content = content || E'\n\n- [Admin-reviewed feedback] ' || cleaned
    where key = _skill_key
    returning version into v;
  return v;
end;
$$;
revoke all on function public.approve_feedback_learning(uuid,text,text) from public, anon;
grant execute on function public.approve_feedback_learning(uuid,text,text) to authenticated;
