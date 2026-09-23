-- MUTAH MAP — core Supabase schema scaffold
-- Source of truth: multi-view facility evidence, human verification before publication.
-- IMPORTANT: this migration is not applied automatically. Apply to a dedicated Supabase project after review.

create extension if not exists pgcrypto;

create type public.zone_type as enum (
  'approach_path',
  'entrance',
  'parking',
  'elevator',
  'accessible_restroom'
);

create type public.evidence_state as enum (
  'present',
  'absent',
  'unknown',
  'not_visible',
  'not_documented',
  'conflicting',
  'not_applicable'
);

create type public.verification_status as enum (
  'team_reviewed',
  'contributor_only',
  'pending_review',
  'disputed',
  'stale'
);

create type public.source_kind as enum (
  'mutah_admin',
  'volunteer',
  'facility_owner'
);

create type public.moderation_status as enum (
  'pending_review',
  'approved',
  'rejected',
  'clarification'
);

create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  category_ar text,
  category_en text,
  area_ar text,
  area_en text,
  latitude double precision,
  longitude double precision,
  source public.source_kind not null default 'volunteer',
  verification public.verification_status not null default 'pending_review',
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.facility_zones (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  zone_type public.zone_type not null,
  label_ar text,
  label_en text,
  ordinal integer not null default 0,
  created_at timestamptz not null default now(),
  unique (facility_id, zone_type, ordinal)
);

create table public.facility_images (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  zone_id uuid not null references public.facility_zones(id) on delete cascade,
  storage_path text not null,
  captured_at timestamptz,
  submitted_by uuid references auth.users(id) on delete set null,
  source public.source_kind not null default 'volunteer',
  privacy_status text not null default 'pending',
  verification public.verification_status not null default 'pending_review',
  is_sanitized boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references public.facility_images(id) on delete cascade,
  provider text not null,
  model text not null,
  prompt_version text not null,
  status text not null default 'completed',
  raw_json jsonb,
  created_at timestamptz not null default now()
);

create table public.observations (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  image_id uuid not null references public.facility_images(id) on delete cascade,
  indicator_code text not null,
  ai_state public.evidence_state not null,
  evidence_strength numeric(4,3),
  explanation_ar text,
  explanation_en text,
  bbox jsonb,
  requires_confirmation boolean not null default true,
  created_at timestamptz not null default now(),
  constraint observations_strength_range check (
    evidence_strength is null or (evidence_strength >= 0 and evidence_strength <= 1)
  )
);

create table public.confirmations (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.observations(id) on delete cascade,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_state public.evidence_state not null,
  action text not null check (action in ('confirmed', 'corrected', 'unsure')),
  note text,
  created_at timestamptz not null default now()
);

create table public.moderation_queue (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  image_id uuid references public.facility_images(id) on delete cascade,
  status public.moderation_status not null default 'pending_review',
  assigned_to uuid references auth.users(id) on delete set null,
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.facility_summaries (
  facility_id uuid primary key references public.facilities(id) on delete cascade,
  reviewed_evidence jsonb not null default '{}'::jsonb,
  evidence_status jsonb not null default '{}'::jsonb,
  last_recomputed_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  report_type text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.pilot_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_date date not null,
  metric_key text not null,
  metric_value numeric not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (metric_date, metric_key)
);

create index facilities_verification_idx on public.facilities(verification);
create index facility_zones_facility_idx on public.facility_zones(facility_id);
create index facility_images_facility_zone_idx on public.facility_images(facility_id, zone_id);
create index observations_image_idx on public.observations(image_id);
create index moderation_queue_status_idx on public.moderation_queue(status, created_at);

alter table public.facilities enable row level security;
alter table public.facility_zones enable row level security;
alter table public.facility_images enable row level security;
alter table public.analyses enable row level security;
alter table public.observations enable row level security;
alter table public.confirmations enable row level security;
alter table public.moderation_queue enable row level security;
alter table public.facility_summaries enable row level security;
alter table public.reports enable row level security;
alter table public.audit_events enable row level security;
alter table public.pilot_metrics enable row level security;

-- Public product reads only reviewed facility data.
create policy "public read reviewed facilities"
  on public.facilities for select
  using (verification in ('team_reviewed', 'stale'));

create policy "public read zones of reviewed facilities"
  on public.facility_zones for select
  using (
    exists (
      select 1 from public.facilities f
      where f.id = facility_id
      and f.verification in ('team_reviewed', 'stale')
    )
  );

create policy "public read sanitized reviewed images"
  on public.facility_images for select
  using (is_sanitized = true and verification in ('team_reviewed', 'stale'));

create policy "public read reviewed summaries"
  on public.facility_summaries for select
  using (
    exists (
      select 1 from public.facilities f
      where f.id = facility_id
      and f.verification in ('team_reviewed', 'stale')
    )
  );

-- Authenticated contributors can submit reports; evidence writes should go through
-- a server-side action / Edge Function so privacy checks and moderation cannot be bypassed.
create policy "authenticated create report"
  on public.reports for insert
  to authenticated
  with check (created_by = auth.uid());

comment on table public.facilities is
  'Facility identity and publication status. Never stores a universal accessibility score.';
comment on table public.observations is
  'AI observations per image. Not Visible never means Absent.';
comment on table public.facility_summaries is
  'Reviewed evidence aggregate. Personalized status is derived at request/UI time from selected access needs.';
