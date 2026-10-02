-- Vệ Binh Số: AI Skill registry
create table if not exists public.ai_skills (
  key text primary key,
  title text not null,
  content text not null,
  version integer not null default 1,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create or replace function public.ai_skills_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.content is distinct from old.content then
    new.version := old.version + 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_ai_skills_before_update on public.ai_skills;
create trigger trg_ai_skills_before_update
before update on public.ai_skills
for each row execute function public.ai_skills_before_update();

alter table public.ai_skills enable row level security;
drop policy if exists ai_skills_admin_select on public.ai_skills;
drop policy if exists ai_skills_admin_insert on public.ai_skills;
drop policy if exists ai_skills_admin_update on public.ai_skills;
drop policy if exists ai_skills_admin_delete on public.ai_skills;
create policy ai_skills_admin_select on public.ai_skills for select using (public.has_role(auth.uid(), 'admin'));
create policy ai_skills_admin_insert on public.ai_skills for insert with check (public.has_role(auth.uid(), 'admin'));
create policy ai_skills_admin_update on public.ai_skills for update using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy ai_skills_admin_delete on public.ai_skills for delete using (public.has_role(auth.uid(), 'admin'));
