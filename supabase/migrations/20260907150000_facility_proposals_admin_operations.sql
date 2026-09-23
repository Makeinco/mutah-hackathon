-- Phase 4: facility proposals, admin facility management, reports, and operations.
-- Proposal and moderation records stay private. Only approved, non-archived
-- official facilities are exposed through the existing public read layer.

create type public.facility_proposal_type as enum ('new_facility', 'facility_change');
create type public.facility_proposal_status as enum (
  'draft',
  'pending_review',
  'clarification_requested',
  'recommended',
  'approved',
  'rejected'
);

alter table public.facilities
  add column is_archived boolean not null default false,
  add column archived_at timestamptz,
  add column archived_by uuid references auth.users(id) on delete set null;

alter table public.reports
  add column resolved_at timestamptz,
  add column resolved_by uuid references auth.users(id) on delete set null,
  add column resolution_note text,
  add column updated_at timestamptz not null default now(),
  add constraint reports_status_allowed check (status in ('open', 'resolved', 'dismissed')),
  add constraint reports_resolution_note_length check (
    resolution_note is null or char_length(resolution_note) <= 2000
  );

create table public.facility_proposals (
  id uuid primary key default gen_random_uuid(),
  proposal_type public.facility_proposal_type not null,
  existing_facility_id uuid references public.facilities(id) on delete restrict,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  status public.facility_proposal_status not null default 'draft',
  proposed_name_ar text not null,
  proposed_name_en text,
  proposed_category_ar text not null,
  proposed_category_en text,
  proposed_area_ar text,
  proposed_area_en text,
  proposed_latitude double precision,
  proposed_longitude double precision,
  location_note text,
  proposed_metadata jsonb not null default '{}'::jsonb,
  duplicate_acknowledged boolean not null default false,
  duplicate_note text,
  approved_facility_id uuid references public.facilities(id) on delete restrict,
  submitted_at timestamptz,
  recommended_at timestamptz,
  recommended_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facility_proposals_name_ar_length check (
    char_length(trim(proposed_name_ar)) between 2 and 160
  ),
  constraint facility_proposals_category_ar_length check (
    char_length(trim(proposed_category_ar)) between 2 and 120
  ),
  constraint facility_proposals_optional_text_lengths check (
    (proposed_name_en is null or char_length(proposed_name_en) <= 160)
    and (proposed_category_en is null or char_length(proposed_category_en) <= 120)
    and (proposed_area_ar is null or char_length(proposed_area_ar) <= 160)
    and (proposed_area_en is null or char_length(proposed_area_en) <= 160)
    and (location_note is null or char_length(location_note) <= 1000)
    and (duplicate_note is null or char_length(duplicate_note) <= 1000)
  ),
  constraint facility_proposals_coordinates check (
    (proposed_latitude is null and proposed_longitude is null)
    or (
      proposed_latitude is not null
      and proposed_longitude is not null
      and
      proposed_latitude between -90 and 90
      and proposed_longitude between -180 and 180
    )
  ),
  constraint facility_proposals_new_location_required check (
    proposal_type <> 'new_facility'
    or (proposed_latitude is not null and proposed_longitude is not null)
  ),
  constraint facility_proposals_target_matches_type check (
    (proposal_type = 'new_facility' and existing_facility_id is null)
    or (proposal_type = 'facility_change' and existing_facility_id is not null)
  )
);

create table public.facility_proposal_evidence (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.facility_proposals(id) on delete restrict,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  privacy_status text not null default 'private_raw' check (privacy_status = 'private_raw'),
  created_at timestamptz not null default now()
);

create table public.facility_proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.facility_proposals(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'created', 'submitted', 'clarification_requested', 'clarification_resubmitted',
    'recommended', 'approved', 'rejected'
  )),
  from_status public.facility_proposal_status,
  to_status public.facility_proposal_status not null,
  reason text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint facility_proposal_events_reason_length check (
    reason is null or char_length(reason) <= 2000
  )
);

create table public.facility_change_history (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete restrict,
  changed_by uuid references auth.users(id) on delete set null,
  source_proposal_id uuid references public.facility_proposals(id) on delete restrict,
  change_type text not null check (change_type in (
    'proposal_approved', 'admin_created', 'admin_edited', 'archived', 'unarchived'
  )),
  previous_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index facility_proposals_owner_created_idx
  on public.facility_proposals (submitted_by, created_at desc);
create index facility_proposals_queue_idx
  on public.facility_proposals (status, created_at)
  where status in ('pending_review', 'clarification_requested', 'recommended');
create index facility_proposals_existing_idx
  on public.facility_proposals (existing_facility_id, created_at desc)
  where existing_facility_id is not null;
create unique index facility_proposals_approved_once_idx
  on public.facility_proposals (id)
  where status = 'approved';
create index facility_proposal_evidence_proposal_idx
  on public.facility_proposal_evidence (proposal_id, created_at);
create index facility_proposal_events_proposal_idx
  on public.facility_proposal_events (proposal_id, created_at);
create index facility_change_history_facility_idx
  on public.facility_change_history (facility_id, created_at desc);
create index reports_queue_idx on public.reports (status, created_at);
create index facilities_admin_filter_idx
  on public.facilities (is_archived, verification, category_en, last_verified_at);

alter table public.facility_proposals enable row level security;
alter table public.facility_proposal_evidence enable row level security;
alter table public.facility_proposal_events enable row level security;
alter table public.facility_change_history enable row level security;

create policy "contributors read own facility proposals"
on public.facility_proposals for select to authenticated
using ((select auth.uid()) = submitted_by);

create policy "review team reads facility proposals"
on public.facility_proposals for select to authenticated
using ((select public.is_mutah_reviewer()));

create policy "contributors read own proposal evidence"
on public.facility_proposal_evidence for select to authenticated
using ((select auth.uid()) = submitted_by);

create policy "review team reads proposal evidence"
on public.facility_proposal_evidence for select to authenticated
using ((select public.is_mutah_reviewer()));

create policy "contributors read own proposal events"
on public.facility_proposal_events for select to authenticated
using (
  exists (
    select 1 from public.facility_proposals proposal
    where proposal.id = proposal_id
      and proposal.submitted_by = (select auth.uid())
  )
);

create policy "review team reads proposal events"
on public.facility_proposal_events for select to authenticated
using ((select public.is_mutah_reviewer()));

create policy "review team reads facility change history"
on public.facility_change_history for select to authenticated
using ((select public.is_mutah_reviewer()));

create policy "contributors read own reports"
on public.reports for select to authenticated
using (created_by = (select auth.uid()));

create policy "review team reads reports"
on public.reports for select to authenticated
using ((select public.is_mutah_reviewer()));

create policy "review team reads audit events"
on public.audit_events for select to authenticated
using ((select public.is_mutah_reviewer()));

revoke all on table public.facility_proposals from public, anon, authenticated;
revoke all on table public.facility_proposal_evidence from public, anon, authenticated;
revoke all on table public.facility_proposal_events from public, anon, authenticated;
revoke all on table public.facility_change_history from public, anon, authenticated;
grant select on table public.facility_proposals to authenticated;
grant select on table public.facility_proposal_evidence to authenticated;
grant select on table public.facility_proposal_events to authenticated;
grant select on table public.facility_change_history to authenticated;
grant all on table public.facility_proposals, public.facility_proposal_evidence,
  public.facility_proposal_events, public.facility_change_history to service_role;

revoke insert, update, delete on table public.facilities from anon, authenticated;
revoke insert, update, delete on table public.reports from anon, authenticated;
grant select on table public.reports, public.audit_events to authenticated;

drop policy if exists "authenticated create report" on public.reports;

drop policy if exists "public read reviewed facilities" on public.facilities;
create policy "public read reviewed facilities"
on public.facilities for select to public
using (
  is_demo = false
  and is_archived = false
  and verification in ('team_reviewed', 'stale')
);

drop policy if exists "public read zones of reviewed facilities" on public.facility_zones;
create policy "public read zones of reviewed facilities"
on public.facility_zones for select to public
using (
  exists (
    select 1 from public.facilities facility
    where facility.id = facility_id
      and facility.is_demo = false
      and facility.is_archived = false
      and facility.verification in ('team_reviewed', 'stale')
  )
);

drop policy if exists "public read sanitized reviewed images" on public.facility_images;
create policy "public read sanitized reviewed images"
on public.facility_images for select to public
using (
  is_sanitized = true
  and verification in ('team_reviewed', 'stale')
  and exists (
    select 1 from public.facilities facility
    where facility.id = facility_id
      and facility.is_demo = false
      and facility.is_archived = false
  )
);

drop policy if exists "public read reviewed summaries" on public.facility_summaries;
create policy "public read reviewed summaries"
on public.facility_summaries for select to public
using (
  exists (
    select 1 from public.facilities facility
    where facility.id = facility_id
      and facility.is_demo = false
      and facility.is_archived = false
      and facility.verification in ('team_reviewed', 'stale')
  )
);

drop policy if exists "public read approved reviewed evidence"
  on public.reviewed_evidence_publications;
create policy "public read approved reviewed evidence"
on public.reviewed_evidence_publications for select to anon, authenticated
using (
  verification = 'team_reviewed'
  and exists (
    select 1 from public.facilities facility
    where facility.id = facility_id
      and facility.is_demo = false
      and facility.is_archived = false
      and facility.verification in ('team_reviewed', 'stale')
  )
);

create or replace function public.find_facility_proposal_duplicates(
  p_name text,
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters integer default 250
)
returns table (
  facility_id uuid,
  name_ar text,
  name_en text,
  area_ar text,
  area_en text,
  distance_meters double precision
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_latitude not between -90 and 90
    or p_longitude not between -180 and 180
    or p_radius_meters not between 25 and 5000 then
    raise exception 'INVALID_DUPLICATE_SEARCH';
  end if;

  return query
  select facility.id,
         facility.name_ar,
         facility.name_en,
         facility.area_ar,
         facility.area_en,
         6371000 * acos(least(1.0, greatest(-1.0,
           cos(radians(p_latitude)) * cos(radians(facility.latitude))
             * cos(radians(facility.longitude) - radians(p_longitude))
           + sin(radians(p_latitude)) * sin(radians(facility.latitude))
         ))) as distance_meters
  from public.facilities facility
  where facility.is_demo = false
    and facility.is_archived = false
    and facility.verification in ('team_reviewed', 'stale')
    and facility.latitude is not null
    and facility.longitude is not null
    and (
      lower(facility.name_ar) like '%' || lower(trim(p_name)) || '%'
      or lower(coalesce(facility.name_en, '')) like '%' || lower(trim(p_name)) || '%'
      or 6371000 * acos(least(1.0, greatest(-1.0,
        cos(radians(p_latitude)) * cos(radians(facility.latitude))
          * cos(radians(facility.longitude) - radians(p_longitude))
        + sin(radians(p_latitude)) * sin(radians(facility.latitude))
      ))) <= p_radius_meters
    )
  order by distance_meters, facility.name_ar
  limit 8;
end;
$$;

create or replace function public.create_facility_proposal(
  p_proposal_type public.facility_proposal_type,
  p_existing_facility_id uuid,
  p_name_ar text,
  p_name_en text,
  p_category_ar text,
  p_category_en text,
  p_area_ar text,
  p_area_en text,
  p_latitude double precision,
  p_longitude double precision,
  p_location_note text default null,
  p_duplicate_acknowledged boolean default false,
  p_duplicate_note text default null,
  p_submit boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_status public.facility_proposal_status := case
    when p_submit then 'pending_review' else 'draft'
  end;
  v_duplicate_count integer := 0;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(trim(coalesce(p_name_ar, ''))) < 2
    or char_length(trim(coalesce(p_category_ar, ''))) < 2 then
    raise exception 'PROPOSAL_REQUIRED_FIELDS';
  end if;
  if p_proposal_type = 'new_facility' and p_existing_facility_id is not null then
    raise exception 'NEW_PROPOSAL_CANNOT_TARGET_FACILITY';
  end if;
  if p_proposal_type = 'facility_change' and not exists (
    select 1 from public.facilities facility
    where facility.id = p_existing_facility_id
      and facility.is_demo = false
      and facility.is_archived = false
      and facility.verification in ('team_reviewed', 'stale')
  ) then
    raise exception 'OFFICIAL_FACILITY_NOT_FOUND';
  end if;
  if p_latitude is not null and p_longitude is not null then
    select count(*) into v_duplicate_count
    from public.find_facility_proposal_duplicates(
      p_name_ar, p_latitude, p_longitude, 250
    );
  end if;
  if p_proposal_type = 'new_facility'
    and v_duplicate_count > 0
    and not p_duplicate_acknowledged then
    raise exception 'POSSIBLE_DUPLICATE_REQUIRES_ACKNOWLEDGEMENT';
  end if;
  if p_duplicate_acknowledged
    and char_length(trim(coalesce(p_duplicate_note, ''))) < 4 then
    raise exception 'DUPLICATE_EXPLANATION_REQUIRED';
  end if;

  insert into public.facility_proposals (
    proposal_type, existing_facility_id, submitted_by, status,
    proposed_name_ar, proposed_name_en, proposed_category_ar, proposed_category_en,
    proposed_area_ar, proposed_area_en, proposed_latitude, proposed_longitude,
    location_note, duplicate_acknowledged, duplicate_note, submitted_at
  ) values (
    p_proposal_type, p_existing_facility_id, auth.uid(), v_status,
    trim(p_name_ar), nullif(trim(coalesce(p_name_en, '')), ''), trim(p_category_ar),
    nullif(trim(coalesce(p_category_en, '')), ''), nullif(trim(coalesce(p_area_ar, '')), ''),
    nullif(trim(coalesce(p_area_en, '')), ''), p_latitude, p_longitude,
    nullif(trim(coalesce(p_location_note, '')), ''), p_duplicate_acknowledged,
    nullif(trim(coalesce(p_duplicate_note, '')), ''), case when p_submit then now() else null end
  ) returning id into v_id;

  insert into public.facility_proposal_events (
    proposal_id, actor_id, event_type, to_status, snapshot
  ) values (
    v_id, auth.uid(), case when p_submit then 'submitted' else 'created' end,
    v_status, jsonb_build_object('proposal_type', p_proposal_type, 'duplicate_candidates', v_duplicate_count)
  );
  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, payload)
  values (auth.uid(), 'facility_proposal_created', 'facility_proposal', v_id,
    jsonb_build_object('proposal_type', p_proposal_type, 'status', v_status));
  return v_id;
end;
$$;

create or replace function public.attach_facility_proposal_evidence(
  p_proposal_id uuid,
  p_storage_path text,
  p_mime_type text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_mime_type not in ('image/jpeg', 'image/png', 'image/webp') then
    raise exception 'INVALID_IMAGE_TYPE';
  end if;
  if split_part(p_storage_path, '/', 1) <> auth.uid()::text then
    raise exception 'INVALID_STORAGE_PATH';
  end if;
  if not exists (
    select 1 from public.facility_proposals proposal
    where proposal.id = p_proposal_id
      and proposal.submitted_by = auth.uid()
      and proposal.status in ('draft', 'pending_review', 'clarification_requested')
  ) then raise exception 'PROPOSAL_NOT_EDITABLE'; end if;

  insert into public.facility_proposal_evidence (proposal_id, submitted_by, storage_path, mime_type)
  values (p_proposal_id, auth.uid(), p_storage_path, p_mime_type)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.respond_to_facility_proposal_clarification(
  p_proposal_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_status public.facility_proposal_status;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(coalesce(p_note, '')) > 2000 then raise exception 'NOTE_TOO_LONG'; end if;
  select proposal.status into v_status
  from public.facility_proposals proposal
  where proposal.id = p_proposal_id and proposal.submitted_by = auth.uid()
  for update;
  if v_status <> 'clarification_requested' then raise exception 'PROPOSAL_NOT_CLARIFIABLE'; end if;

  update public.facility_proposals set status = 'pending_review', submitted_at = now(), updated_at = now()
  where id = p_proposal_id;
  insert into public.facility_proposal_events (
    proposal_id, actor_id, event_type, from_status, to_status, reason
  ) values (
    p_proposal_id, auth.uid(), 'clarification_resubmitted', v_status, 'pending_review',
    nullif(trim(coalesce(p_note, '')), '')
  );
  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, payload)
  values (auth.uid(), 'facility_proposal_resubmitted', 'facility_proposal', p_proposal_id, '{}');
end;
$$;

create or replace function public.review_facility_proposal(
  p_proposal_id uuid,
  p_action text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.facility_proposal_status;
  v_next public.facility_proposal_status;
begin
  if not public.is_mutah_reviewer() then raise exception 'REVIEWER_REQUIRED'; end if;
  if p_action not in ('clarification', 'recommend', 'reject') then
    raise exception 'REVIEWER_ACTION_NOT_ALLOWED';
  end if;
  if p_action in ('clarification', 'reject')
    and char_length(trim(coalesce(p_reason, ''))) < 4 then
    raise exception 'REVIEW_REASON_REQUIRED';
  end if;
  select proposal.status into v_status from public.facility_proposals proposal
  where proposal.id = p_proposal_id for update;
  if v_status <> 'pending_review' then raise exception 'PROPOSAL_NOT_REVIEWABLE'; end if;
  v_next := case p_action
    when 'clarification' then 'clarification_requested'::public.facility_proposal_status
    when 'recommend' then 'recommended'::public.facility_proposal_status
    else 'rejected'::public.facility_proposal_status
  end;
  update public.facility_proposals set
    status = v_next,
    recommended_at = case when v_next = 'recommended' then now() else recommended_at end,
    recommended_by = case when v_next = 'recommended' then auth.uid() else recommended_by end,
    decided_at = case when v_next = 'rejected' then now() else null end,
    decided_by = case when v_next = 'rejected' then auth.uid() else null end,
    updated_at = now()
  where id = p_proposal_id;
  insert into public.facility_proposal_events (
    proposal_id, actor_id, event_type, from_status, to_status, reason
  ) values (
    p_proposal_id, auth.uid(), case p_action
      when 'clarification' then 'clarification_requested'
      when 'recommend' then 'recommended'
      else 'rejected' end,
    v_status, v_next, nullif(trim(coalesce(p_reason, '')), '')
  );
  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, payload)
  values (auth.uid(), 'facility_proposal_' || p_action, 'facility_proposal', p_proposal_id,
    jsonb_build_object('from_status', v_status, 'to_status', v_next));
end;
$$;

create or replace function public.approve_facility_proposal(p_proposal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proposal public.facility_proposals%rowtype;
  v_facility_id uuid;
  v_previous jsonb;
  v_new jsonb;
  v_external_key text;
begin
  if not public.is_mutah_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_proposal from public.facility_proposals proposal
  where proposal.id = p_proposal_id for update;
  if v_proposal.id is null then raise exception 'PROPOSAL_NOT_FOUND'; end if;
  if v_proposal.status = 'approved' then raise exception 'PROPOSAL_ALREADY_APPROVED'; end if;
  if v_proposal.status <> 'recommended' then raise exception 'PROPOSAL_NOT_RECOMMENDED'; end if;

  if v_proposal.proposal_type = 'new_facility' then
    v_external_key := 'official-' || replace(v_proposal.id::text, '-', '');
    insert into public.facilities (
      external_key, is_demo, name_ar, name_en, category_ar, category_en,
      area_ar, area_en, latitude, longitude, source, verification
    ) values (
      v_external_key, false, v_proposal.proposed_name_ar, v_proposal.proposed_name_en,
      v_proposal.proposed_category_ar, v_proposal.proposed_category_en,
      v_proposal.proposed_area_ar, v_proposal.proposed_area_en,
      v_proposal.proposed_latitude, v_proposal.proposed_longitude,
      'mutah_admin', 'team_reviewed'
    ) returning id into v_facility_id;
    insert into public.facility_zones (facility_id, zone_type, label_ar, label_en, ordinal)
    values
      (v_facility_id, 'approach_path', 'مسار الوصول', 'Approach path', 0),
      (v_facility_id, 'entrance', 'المدخل', 'Entrance', 1),
      (v_facility_id, 'parking', 'المواقف', 'Parking', 2),
      (v_facility_id, 'elevator', 'المصعد', 'Elevator', 3),
      (v_facility_id, 'accessible_restroom', 'دورة المياه المهيأة', 'Accessible restroom', 4);
    v_new := jsonb_build_object('name_ar', v_proposal.proposed_name_ar,
      'name_en', v_proposal.proposed_name_en, 'category_ar', v_proposal.proposed_category_ar,
      'category_en', v_proposal.proposed_category_en, 'area_ar', v_proposal.proposed_area_ar,
      'area_en', v_proposal.proposed_area_en, 'latitude', v_proposal.proposed_latitude,
      'longitude', v_proposal.proposed_longitude, 'is_archived', false);
    insert into public.facility_change_history (
      facility_id, changed_by, source_proposal_id, change_type, new_values
    ) values (v_facility_id, auth.uid(), p_proposal_id, 'admin_created', v_new);
  else
    v_facility_id := v_proposal.existing_facility_id;
    select jsonb_build_object('name_ar', facility.name_ar, 'name_en', facility.name_en,
      'category_ar', facility.category_ar, 'category_en', facility.category_en,
      'area_ar', facility.area_ar, 'area_en', facility.area_en,
      'latitude', facility.latitude, 'longitude', facility.longitude,
      'is_archived', facility.is_archived)
    into v_previous from public.facilities facility where facility.id = v_facility_id for update;
    if v_previous is null then raise exception 'OFFICIAL_FACILITY_NOT_FOUND'; end if;
    update public.facilities set
      name_ar = v_proposal.proposed_name_ar,
      name_en = v_proposal.proposed_name_en,
      category_ar = v_proposal.proposed_category_ar,
      category_en = v_proposal.proposed_category_en,
      area_ar = v_proposal.proposed_area_ar,
      area_en = v_proposal.proposed_area_en,
      latitude = v_proposal.proposed_latitude,
      longitude = v_proposal.proposed_longitude,
      updated_at = now()
    where id = v_facility_id;
    select jsonb_build_object('name_ar', facility.name_ar, 'name_en', facility.name_en,
      'category_ar', facility.category_ar, 'category_en', facility.category_en,
      'area_ar', facility.area_ar, 'area_en', facility.area_en,
      'latitude', facility.latitude, 'longitude', facility.longitude,
      'is_archived', facility.is_archived)
    into v_new from public.facilities facility where facility.id = v_facility_id;
    insert into public.facility_change_history (
      facility_id, changed_by, source_proposal_id, change_type, previous_values, new_values
    ) values (v_facility_id, auth.uid(), p_proposal_id, 'proposal_approved', v_previous, v_new);
  end if;

  update public.facility_proposals set status = 'approved', approved_facility_id = v_facility_id,
    decided_at = now(), decided_by = auth.uid(), updated_at = now()
  where id = p_proposal_id;
  insert into public.facility_proposal_events (
    proposal_id, actor_id, event_type, from_status, to_status,
    snapshot
  ) values (p_proposal_id, auth.uid(), 'approved', 'recommended', 'approved',
    jsonb_build_object('approved_facility_id', v_facility_id));
  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, payload)
  values (auth.uid(), 'facility_proposal_approved', 'facility_proposal', p_proposal_id,
    jsonb_build_object('facility_id', v_facility_id, 'proposal_type', v_proposal.proposal_type));
  return v_facility_id;
end;
$$;

create or replace function public.admin_save_facility(
  p_facility_id uuid,
  p_name_ar text,
  p_name_en text,
  p_category_ar text,
  p_category_en text,
  p_area_ar text,
  p_area_en text,
  p_latitude double precision,
  p_longitude double precision,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_previous jsonb := '{}'::jsonb;
  v_new jsonb;
begin
  if not public.is_mutah_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if char_length(trim(coalesce(p_name_ar, ''))) < 2
    or char_length(trim(coalesce(p_category_ar, ''))) < 2 then
    raise exception 'FACILITY_REQUIRED_FIELDS';
  end if;
  if (p_latitude is null) <> (p_longitude is null)
    or (p_latitude is not null and (p_latitude not between -90 and 90 or p_longitude not between -180 and 180)) then
    raise exception 'INVALID_COORDINATES';
  end if;

  if p_facility_id is null then
    insert into public.facilities (
      external_key, is_demo, name_ar, name_en, category_ar, category_en,
      area_ar, area_en, latitude, longitude, source, verification
    ) values (
      'admin-' || replace(gen_random_uuid()::text, '-', ''), false, trim(p_name_ar),
      nullif(trim(coalesce(p_name_en, '')), ''), trim(p_category_ar),
      nullif(trim(coalesce(p_category_en, '')), ''), nullif(trim(coalesce(p_area_ar, '')), ''),
      nullif(trim(coalesce(p_area_en, '')), ''), p_latitude, p_longitude,
      'mutah_admin', 'team_reviewed'
    ) returning id into v_id;
    insert into public.facility_zones (facility_id, zone_type, label_ar, label_en, ordinal)
    values
      (v_id, 'approach_path', 'مسار الوصول', 'Approach path', 0),
      (v_id, 'entrance', 'المدخل', 'Entrance', 1),
      (v_id, 'parking', 'المواقف', 'Parking', 2),
      (v_id, 'elevator', 'المصعد', 'Elevator', 3),
      (v_id, 'accessible_restroom', 'دورة المياه المهيأة', 'Accessible restroom', 4);
  else
    select jsonb_build_object('name_ar', facility.name_ar, 'name_en', facility.name_en,
      'category_ar', facility.category_ar, 'category_en', facility.category_en,
      'area_ar', facility.area_ar, 'area_en', facility.area_en,
      'latitude', facility.latitude, 'longitude', facility.longitude,
      'is_archived', facility.is_archived)
    into v_previous from public.facilities facility
    where facility.id = p_facility_id and facility.is_demo = false for update;
    if v_previous is null then raise exception 'OFFICIAL_FACILITY_NOT_FOUND'; end if;
    v_id := p_facility_id;
    update public.facilities set name_ar = trim(p_name_ar),
      name_en = nullif(trim(coalesce(p_name_en, '')), ''), category_ar = trim(p_category_ar),
      category_en = nullif(trim(coalesce(p_category_en, '')), ''),
      area_ar = nullif(trim(coalesce(p_area_ar, '')), ''), area_en = nullif(trim(coalesce(p_area_en, '')), ''),
      latitude = p_latitude, longitude = p_longitude, updated_at = now()
    where id = v_id;
  end if;
  select jsonb_build_object('name_ar', facility.name_ar, 'name_en', facility.name_en,
    'category_ar', facility.category_ar, 'category_en', facility.category_en,
    'area_ar', facility.area_ar, 'area_en', facility.area_en,
    'latitude', facility.latitude, 'longitude', facility.longitude,
    'is_archived', facility.is_archived)
  into v_new from public.facilities facility where facility.id = v_id;
  insert into public.facility_change_history (
    facility_id, changed_by, change_type, previous_values, new_values, reason
  ) values (v_id, auth.uid(), case when p_facility_id is null then 'admin_created' else 'admin_edited' end,
    v_previous, v_new, nullif(trim(coalesce(p_reason, '')), ''));
  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, payload)
  values (auth.uid(), case when p_facility_id is null then 'official_facility_created' else 'official_facility_edited' end,
    'facility', v_id, jsonb_build_object('reason', nullif(trim(coalesce(p_reason, '')), '')));
  return v_id;
end;
$$;

create or replace function public.admin_set_facility_archived(
  p_facility_id uuid,
  p_archived boolean,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_previous jsonb; v_new jsonb;
begin
  if not public.is_mutah_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 4 then raise exception 'ARCHIVE_REASON_REQUIRED'; end if;
  select to_jsonb(facility) - 'archived_by' into v_previous
  from public.facilities facility
  where facility.id = p_facility_id and facility.is_demo = false for update;
  if v_previous is null then raise exception 'OFFICIAL_FACILITY_NOT_FOUND'; end if;
  update public.facilities set is_archived = p_archived,
    archived_at = case when p_archived then now() else null end,
    archived_by = case when p_archived then auth.uid() else null end,
    updated_at = now()
  where id = p_facility_id;
  select to_jsonb(facility) - 'archived_by' into v_new
  from public.facilities facility where facility.id = p_facility_id;
  insert into public.facility_change_history (
    facility_id, changed_by, change_type, previous_values, new_values, reason
  ) values (p_facility_id, auth.uid(), case when p_archived then 'archived' else 'unarchived' end,
    v_previous, v_new, trim(p_reason));
  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, payload)
  values (auth.uid(), case when p_archived then 'official_facility_archived' else 'official_facility_unarchived' end,
    'facility', p_facility_id, jsonb_build_object('reason', trim(p_reason)));
end;
$$;

create or replace function public.create_facility_report(
  p_facility_id uuid,
  p_report_type text,
  p_details text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_report_type not in ('outdated_information', 'facility_changed', 'incorrect_location_name', 'evidence_update') then
    raise exception 'INVALID_REPORT_TYPE';
  end if;
  if char_length(trim(coalesce(p_details, ''))) < 4 then raise exception 'REPORT_DETAILS_REQUIRED'; end if;
  if not exists (select 1 from public.facilities facility where facility.id = p_facility_id
    and facility.is_demo = false and facility.is_archived = false
    and facility.verification in ('team_reviewed', 'stale')) then
    raise exception 'OFFICIAL_FACILITY_NOT_FOUND';
  end if;
  insert into public.reports (facility_id, created_by, report_type, details)
  values (p_facility_id, auth.uid(), p_report_type, trim(p_details)) returning id into v_id;
  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, payload)
  values (auth.uid(), 'facility_report_created', 'report', v_id,
    jsonb_build_object('facility_id', p_facility_id, 'report_type', p_report_type));
  return v_id;
end;
$$;

create or replace function public.resolve_facility_report(
  p_report_id uuid,
  p_status text,
  p_resolution_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_mutah_reviewer() then raise exception 'REVIEWER_REQUIRED'; end if;
  if p_status not in ('resolved', 'dismissed') then raise exception 'INVALID_REPORT_STATUS'; end if;
  if char_length(trim(coalesce(p_resolution_note, ''))) < 4 then raise exception 'RESOLUTION_NOTE_REQUIRED'; end if;
  update public.reports set status = p_status, resolution_note = trim(p_resolution_note),
    resolved_at = now(), resolved_by = auth.uid(), updated_at = now()
  where id = p_report_id and status = 'open';
  if not found then raise exception 'OPEN_REPORT_NOT_FOUND'; end if;
  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, payload)
  values (auth.uid(), 'facility_report_resolved', 'report', p_report_id,
    jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.get_mutah_ops_overview()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_mutah_reviewer() then raise exception 'REVIEWER_REQUIRED'; end if;
  return jsonb_build_object(
    'pending_review', (select count(*) from public.contributions where status = 'pending_review'),
    'clarification_requested', (select count(*) from public.contributions where status = 'clarification_requested'),
    'approved', (select count(*) from public.contributions where status = 'approved'),
    'proposals_pending', (select count(*) from public.facility_proposals where status = 'pending_review'),
    'proposals_clarification', (select count(*) from public.facility_proposals where status = 'clarification_requested'),
    'proposals_recommended', (select count(*) from public.facility_proposals where status = 'recommended'),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'stale_facilities', (select count(*) from public.facilities where is_demo = false and is_archived = false and verification = 'stale'),
    'archived_facilities', (select count(*) from public.facilities where is_demo = false and is_archived = true),
    'official_facilities', (select count(*) from public.facilities where is_demo = false and is_archived = false and verification in ('team_reviewed', 'stale')),
    'contributors', (select count(*) from public.profiles where role = 'contributor')
  );
end;
$$;

revoke execute on function public.find_facility_proposal_duplicates(text, double precision, double precision, integer) from public, anon;
revoke execute on function public.create_facility_proposal(public.facility_proposal_type, uuid, text, text, text, text, text, text, double precision, double precision, text, boolean, text, boolean) from public, anon;
revoke execute on function public.attach_facility_proposal_evidence(uuid, text, text) from public, anon;
revoke execute on function public.respond_to_facility_proposal_clarification(uuid, text) from public, anon;
revoke execute on function public.review_facility_proposal(uuid, text, text) from public, anon;
revoke execute on function public.approve_facility_proposal(uuid) from public, anon;
revoke execute on function public.admin_save_facility(uuid, text, text, text, text, text, text, double precision, double precision, text) from public, anon;
revoke execute on function public.admin_set_facility_archived(uuid, boolean, text) from public, anon;
revoke execute on function public.create_facility_report(uuid, text, text) from public, anon;
revoke execute on function public.resolve_facility_report(uuid, text, text) from public, anon;
revoke execute on function public.get_mutah_ops_overview() from public, anon;

grant execute on function public.find_facility_proposal_duplicates(text, double precision, double precision, integer) to authenticated;
grant execute on function public.create_facility_proposal(public.facility_proposal_type, uuid, text, text, text, text, text, text, double precision, double precision, text, boolean, text, boolean) to authenticated;
grant execute on function public.attach_facility_proposal_evidence(uuid, text, text) to authenticated;
grant execute on function public.respond_to_facility_proposal_clarification(uuid, text) to authenticated;
grant execute on function public.review_facility_proposal(uuid, text, text) to authenticated;
grant execute on function public.approve_facility_proposal(uuid) to authenticated;
grant execute on function public.admin_save_facility(uuid, text, text, text, text, text, text, double precision, double precision, text) to authenticated;
grant execute on function public.admin_set_facility_archived(uuid, boolean, text) to authenticated;
grant execute on function public.create_facility_report(uuid, text, text) to authenticated;
grant execute on function public.resolve_facility_report(uuid, text, text) to authenticated;
grant execute on function public.get_mutah_ops_overview() to authenticated;

comment on table public.facility_proposals is
  'Private contributor proposals. Approval is an admin-only atomic RPC and is the sole proposal-to-official publication path.';
comment on table public.facility_proposal_evidence is
  'Private raw proposal evidence metadata. Storage paths are visible only to the owner and review team.';
comment on table public.facility_proposal_events is
  'Append-only proposal clarification, review, recommendation, and approval history.';
comment on table public.facility_change_history is
  'Immutable before/after history for official facility changes and archive transitions.';
