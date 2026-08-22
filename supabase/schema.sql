-- ===========================================================================
-- Loft — database schema and access rules
--
-- Run once in Supabase → SQL Editor. Safe to re-run: every statement guards
-- itself.
--
-- The security model in one sentence: a project row is readable only by the
-- people listed in project_members for that project, and that check happens in
-- the database, not in the app.
-- ===========================================================================

-- --- roles -----------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'project_role') then
    create type public.project_role as enum ('owner', 'editor', 'commenter', 'viewer');
  end if;
end
$$;

-- --- tables ----------------------------------------------------------------

-- Client code cannot read auth.users, so each account gets a mirrored profile
-- carrying only what collaborators legitimately need to see.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text not null default '',
  color        text not null default '#4dabf7',
  updated_at   timestamptz not null default now()
);

create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Untitled project',
  doc        jsonb not null,
  version    bigint not null default 1,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_updated_at_idx on public.projects (updated_at desc);

create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.project_role not null default 'editor',
  -- Kept so an invitation still shows the address it was sent to, even before
  -- the person has signed in and filled out a display name.
  invited_email text,
  accepted_at   timestamptz,
  created_at    timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_members_user_idx on public.project_members (user_id);

-- --- membership helpers ----------------------------------------------------
-- These are SECURITY DEFINER on purpose. A policy on project_members that
-- queries project_members would recurse forever; routing the lookup through a
-- definer function breaks the cycle.

create or replace function public.is_project_member(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p_project and m.user_id = auth.uid()
  );
$$;

create or replace function public.project_role_of(p_project uuid)
returns public.project_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role from public.project_members m
  where m.project_id = p_project and m.user_id = auth.uid();
$$;

create or replace function public.shares_any_project(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members mine
    join public.project_members theirs on theirs.project_id = mine.project_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user
  );
$$;

-- --- new accounts get a profile -------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --- whoever creates a project owns it ------------------------------------

create or replace function public.handle_new_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role, accepted_at)
  values (new.id, new.created_by, 'owner', now())
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_project_created on public.projects;
create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project();

-- --- row level security ----------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;

-- Profiles: yourself, plus anyone you actually work with.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_any_project(id));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Projects: members read. Viewers cannot write.
--
-- Note the honest limit here: the whole document is one JSONB value, so the
-- database can allow or refuse a write but cannot tell "checked a card off"
-- from "deleted the canvas". Commenter is therefore an interface-level role
-- that writes like an editor. Making it a real boundary means promoting cards
-- to their own table — see the roadmap in DESIGN.md.
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select to authenticated
  using (public.is_project_member(id));

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update to authenticated
  using (public.project_role_of(id) in ('owner', 'editor', 'commenter'))
  with check (public.project_role_of(id) in ('owner', 'editor', 'commenter'));

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
  for delete to authenticated
  using (public.project_role_of(id) = 'owner');

-- Membership: members see the roster, owners change it.
drop policy if exists project_members_select on public.project_members;
create policy project_members_select on public.project_members
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists project_members_write on public.project_members;
create policy project_members_write on public.project_members
  for all to authenticated
  using (public.project_role_of(project_id) = 'owner')
  with check (public.project_role_of(project_id) = 'owner');

-- --- version bump on every save -------------------------------------------

create or replace function public.touch_project()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end;
$$;

drop trigger if exists on_project_updated on public.projects;
create trigger on_project_updated
  before update on public.projects
  for each row execute function public.touch_project();

-- --- roster view -----------------------------------------------------------
-- security_invoker keeps the caller's RLS in force, so this view cannot be
-- used to read membership of a project you do not belong to.

create or replace view public.project_roster
with (security_invoker = true)
as
select
  m.project_id,
  m.user_id,
  m.role,
  m.accepted_at,
  coalesce(nullif(p.display_name, ''), split_part(coalesce(p.email, m.invited_email, ''), '@', 1)) as display_name,
  coalesce(p.email, m.invited_email, '') as email,
  coalesce(p.color, '#4dabf7') as color
from public.project_members m
left join public.profiles p on p.id = m.user_id;

grant select on public.project_roster to authenticated;

-- ===========================================================================
-- Image storage
--
-- Documents are JSON and images are not, so uploads live in a private bucket
-- keyed by project. The first path segment is the project id, which is what
-- the policies below check — so a file is readable by exactly the people who
-- can read the project it belongs to.
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-assets', 'project-assets', false, 8388608)
on conflict (id) do update set public = false, file_size_limit = 8388608;

-- `storage.foldername(name)` yields the path segments; [1] is the project id.
drop policy if exists project_assets_read on storage.objects;
create policy project_assets_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-assets'
    and public.is_project_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists project_assets_write on storage.objects;
create policy project_assets_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-assets'
    and public.project_role_of(((storage.foldername(name))[1])::uuid) in ('owner', 'editor')
  );

drop policy if exists project_assets_delete on storage.objects;
create policy project_assets_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-assets'
    and public.project_role_of(((storage.foldername(name))[1])::uuid) in ('owner', 'editor')
  );
