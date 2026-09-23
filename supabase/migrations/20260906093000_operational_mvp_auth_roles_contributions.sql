-- PROMPT 03 / Phase 1
-- Operational MVP foundations: profiles, roles, contribution bundles, moderation decisions.

create type public.app_role as enum ('contributor','reviewer','admin');
create type public.contribution_status as enum ('draft','processing','awaiting_confirmation','pending_review','clarification_requested','approved','rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'contributor',
  language text not null default 'ar' check (language in ('ar','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_access_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  selected_needs text[] not null default '{}'::text[],
  updated_at timestamptz not null default now(),
  constraint allowed_access_needs check (
    selected_needs <@ array[
      'step_free','ramp_when_raised','clear_path','handrail','parking','elevator','accessible_restroom'
    ]::text[]
  )
);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  zone_id uuid not null references public.facility_zones(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  status public.contribution_status not null default 'draft',
  source public.source_kind not null default 'volunteer',
  clarification_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contribution_images (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  storage_path text not null,
  sanitized_storage_path text,
  mime_type text not null,
  captured_at timestamptz,
  privacy_status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.analyses
  add column contribution_id uuid references public.contributions(id) on delete cascade;
alter table public.analyses alter column image_id drop not null;

alter table public.observations
  add column contribution_id uuid references public.contributions(id) on delete cascade;
alter table public.observations add column image_refs uuid[];
alter table public.observations alter column image_id drop not null;

alter table public.confirmations
  add column contribution_id uuid references public.contributions(id) on delete cascade;

create table public.moderation_decisions (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  decision public.moderation_status not null,
  reviewer_note text,
  created_at timestamptz not null default now()
);

create index contributions_submitter_idx on public.contributions(submitted_by, created_at desc);
create index contributions_status_idx on public.contributions(status, created_at);
create index contribution_images_contribution_idx on public.contribution_images(contribution_id);
create index analyses_contribution_idx on public.analyses(contribution_id);
create index observations_contribution_idx on public.observations(contribution_id);
create index moderation_decisions_contribution_idx on public.moderation_decisions(contribution_id, created_at desc);

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_mutah_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role in ('reviewer','admin') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_mutah_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''),'@',1)),
    coalesce(nullif(new.raw_user_meta_data->>'language',''),'ar')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_mutah_profile on auth.users;
create trigger on_auth_user_created_mutah_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;
alter table public.user_access_preferences enable row level security;
alter table public.contributions enable row level security;
alter table public.contribution_images enable row level security;
alter table public.moderation_decisions enable row level security;

create policy "profile read own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "profile update own safe fields"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

create policy "admin read profiles"
  on public.profiles for select to authenticated
  using (public.is_mutah_admin());

create policy "preferences own read"
  on public.user_access_preferences for select to authenticated
  using (user_id = auth.uid());
create policy "preferences own insert"
  on public.user_access_preferences for insert to authenticated
  with check (user_id = auth.uid());
create policy "preferences own update"
  on public.user_access_preferences for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "contributor read own contributions"
  on public.contributions for select to authenticated
  using (submitted_by = auth.uid());
create policy "reviewers read contribution queue"
  on public.contributions for select to authenticated
  using (public.is_mutah_reviewer());

create policy "contributor read own images"
  on public.contribution_images for select to authenticated
  using (
    exists (
      select 1 from public.contributions c
      where c.id = contribution_id and c.submitted_by = auth.uid()
    )
  );
create policy "reviewers read contribution images"
  on public.contribution_images for select to authenticated
  using (public.is_mutah_reviewer());

create policy "reviewers read decisions"
  on public.moderation_decisions for select to authenticated
  using (public.is_mutah_reviewer());
create policy "contributor read own decisions"
  on public.moderation_decisions for select to authenticated
  using (
    exists (
      select 1 from public.contributions c
      where c.id = contribution_id and c.submitted_by = auth.uid()
    )
  );

comment on table public.contributions is
  'One contributor submission for one facility zone; may contain multiple images and remains unpublished until human review.';
comment on table public.moderation_decisions is
  'Immutable human review decisions for contribution bundles.';
comment on column public.profiles.role is
  'Operational authorization role. New users default to contributor; reviewer/admin assignment is internal only.';
