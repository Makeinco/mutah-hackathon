-- PHASE 2
-- Append-only clarification evidence and response history for contribution resubmission.

alter table public.contribution_images
  add column clarification_round integer not null default 0,
  add constraint contribution_images_clarification_round_nonnegative
    check (clarification_round >= 0);

alter table public.analyses
  add column clarification_round integer not null default 0,
  add constraint analyses_clarification_round_nonnegative
    check (clarification_round >= 0);

create table if not exists public.clarification_responses (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  responded_by uuid not null references auth.users(id) on delete restrict,
  note text,
  clarification_round integer,
  created_at timestamptz not null default now(),
  constraint clarification_responses_note_length
    check (note is null or char_length(note) <= 2000)
);

alter table public.clarification_responses
  add column if not exists clarification_round integer;

update public.clarification_responses response
set clarification_round = greatest(
  1,
  (
    select count(*)::integer
    from public.moderation_decisions decision
    where decision.contribution_id = response.contribution_id
      and decision.decision = 'clarification'
      and decision.created_at <= response.created_at
  )
)
where response.clarification_round is null;

alter table public.clarification_responses
  alter column clarification_round set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.clarification_responses'::regclass
      and conname = 'clarification_responses_round_positive'
  ) then
    alter table public.clarification_responses
      add constraint clarification_responses_round_positive
      check (clarification_round > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.clarification_responses'::regclass
      and conname = 'clarification_responses_contribution_round_key'
  ) then
    alter table public.clarification_responses
      add constraint clarification_responses_contribution_round_key
      unique (contribution_id, clarification_round);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.clarification_responses'::regclass
      and conname = 'clarification_responses_note_length'
  ) then
    alter table public.clarification_responses
      add constraint clarification_responses_note_length
      check (note is null or char_length(note) <= 2000);
  end if;
end;
$$;

comment on table public.clarification_responses is
  'Immutable contributor responses to reviewer clarification requests. Evidence and AI records remain append-only on the parent contribution.';

create index if not exists clarification_responses_submitter_idx
  on public.clarification_responses (responded_by, created_at desc);
create index if not exists contribution_images_round_idx
  on public.contribution_images (contribution_id, clarification_round, created_at);
create index if not exists analyses_round_idx
  on public.analyses (contribution_id, clarification_round, created_at);

alter table public.clarification_responses enable row level security;

drop policy if exists "contributors read own clarification responses"
  on public.clarification_responses;
drop policy if exists "reviewers read clarification responses"
  on public.clarification_responses;

create policy "contributors read own clarification responses"
on public.clarification_responses for select to authenticated
using (
  (select auth.uid()) is not null
  and responded_by = (select auth.uid())
  and exists (
    select 1
    from public.contributions c
    where c.id = contribution_id
      and c.submitted_by = (select auth.uid())
  )
);

create policy "reviewers read clarification responses"
on public.clarification_responses for select to authenticated
using ((select public.is_mutah_reviewer()));

revoke all on table public.clarification_responses from public, anon, authenticated;
grant select on table public.clarification_responses to authenticated;

-- Retire the earlier note-only RPC when present: a response is now accepted
-- only when its evidence, AI observations, and confirmations commit together.
do $$
begin
  if to_regprocedure('public.add_clarification_response(uuid,text)') is not null then
    execute 'revoke execute on function public.add_clarification_response(uuid, text) from public, anon, authenticated';
  end if;
end;
$$;

create or replace function public.attach_contribution_image(
  p_contribution_id uuid,
  p_storage_path text,
  p_mime_type text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_image_id uuid;
  v_status public.contribution_status;
  v_round integer := 0;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_mime_type not in ('image/jpeg','image/png','image/webp') then
    raise exception 'INVALID_IMAGE_TYPE';
  end if;

  select c.status into v_status
  from public.contributions c
  where c.id = p_contribution_id
    and c.submitted_by = auth.uid()
  for update;

  if v_status is null or v_status not in (
    'draft','processing','awaiting_confirmation','clarification_requested'
  ) then
    raise exception 'CONTRIBUTION_NOT_EDITABLE';
  end if;

  if split_part(p_storage_path, '/', 1) <> auth.uid()::text then
    raise exception 'INVALID_STORAGE_PATH';
  end if;

  if v_status = 'clarification_requested' then
    select count(*)::integer into v_round
    from public.moderation_decisions d
    where d.contribution_id = p_contribution_id
      and d.decision = 'clarification';

    if v_round < 1 then
      raise exception 'CLARIFICATION_REQUEST_NOT_FOUND';
    end if;
  end if;

  insert into public.contribution_images (
    contribution_id,
    storage_path,
    mime_type,
    privacy_status,
    clarification_round
  )
  values (
    p_contribution_id,
    p_storage_path,
    p_mime_type,
    'private_raw',
    v_round
  )
  returning id into v_image_id;

  return v_image_id;
end;
$$;

revoke execute on function public.attach_contribution_image(uuid, text, text)
  from public, anon;
grant execute on function public.attach_contribution_image(uuid, text, text)
  to authenticated;

create or replace function public.resubmit_contribution_for_review(
  p_contribution_id uuid,
  p_provider text,
  p_model text,
  p_prompt_version text,
  p_observations jsonb,
  p_confirmations jsonb,
  p_contributor_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.contribution_status;
  v_zone public.zone_type;
  v_round integer;
  v_image_ids uuid[];
  v_allowed_indicators text[];
  v_analysis_id uuid;
  v_item jsonb;
  v_confirmation jsonb;
  v_observation_id uuid;
  v_indicator text;
  v_state public.evidence_state;
  v_confirmed_state public.evidence_state;
  v_action text;
  v_note text := nullif(trim(coalesce(p_contributor_note, '')), '');
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if v_note is not null and char_length(v_note) > 2000 then
    raise exception 'CLARIFICATION_NOTE_TOO_LONG';
  end if;

  if coalesce(trim(p_provider), '') = ''
    or coalesce(trim(p_model), '') = ''
    or coalesce(trim(p_prompt_version), '') = '' then
    raise exception 'ANALYSIS_METADATA_REQUIRED';
  end if;

  select c.status, z.zone_type into v_status, v_zone
  from public.contributions c
  join public.facility_zones z on z.id = c.zone_id
  where c.id = p_contribution_id
    and c.submitted_by = auth.uid()
  for update of c;

  if v_status is null then
    raise exception 'CONTRIBUTION_NOT_FOUND';
  end if;

  if v_status <> 'clarification_requested' then
    raise exception 'CLARIFICATION_NOT_EDITABLE';
  end if;

  select count(*)::integer into v_round
  from public.moderation_decisions d
  where d.contribution_id = p_contribution_id
    and d.decision = 'clarification';

  if v_round < 1 then
    raise exception 'CLARIFICATION_REQUEST_NOT_FOUND';
  end if;

  select array_agg(i.id order by i.created_at) into v_image_ids
  from public.contribution_images i
  where i.contribution_id = p_contribution_id
    and i.clarification_round = v_round;

  if coalesce(cardinality(v_image_ids), 0) = 0 then
    raise exception 'CLARIFICATION_IMAGES_REQUIRED';
  end if;

  v_allowed_indicators := case v_zone
    when 'approach_path' then array['path_surface','curb_ramp','steps','ramp','handrail','obstruction']::text[]
    when 'entrance' then array['steps','ramp','handrail']::text[]
    when 'parking' then array['parking','parking_route']::text[]
    when 'elevator' then array['elevator','elevator_space']::text[]
    when 'accessible_restroom' then array['accessible_restroom','restroom_door']::text[]
  end;

  if jsonb_typeof(p_observations) <> 'array'
    or jsonb_array_length(p_observations) <> cardinality(v_allowed_indicators) then
    raise exception 'ALL_ZONE_OBSERVATIONS_REQUIRED';
  end if;

  if (
    select count(distinct item->>'key')
    from jsonb_array_elements(p_observations) item
  ) <> cardinality(v_allowed_indicators) then
    raise exception 'DUPLICATE_OR_MISSING_OBSERVATIONS';
  end if;

  insert into public.clarification_responses (
    contribution_id,
    responded_by,
    clarification_round,
    note
  )
  values (
    p_contribution_id,
    auth.uid(),
    v_round,
    v_note
  );

  insert into public.analyses (
    contribution_id,
    provider,
    model,
    prompt_version,
    status,
    raw_json,
    clarification_round
  )
  values (
    p_contribution_id,
    p_provider,
    p_model,
    p_prompt_version,
    'completed',
    jsonb_build_object(
      'clarification_round', v_round,
      'observations', p_observations
    ),
    v_round
  )
  returning id into v_analysis_id;

  for v_item in select * from jsonb_array_elements(p_observations)
  loop
    v_indicator := v_item->>'key';
    if not (v_indicator = any(v_allowed_indicators)) then
      raise exception 'INDICATOR_NOT_ALLOWED_FOR_ZONE';
    end if;

    if coalesce(trim(v_item->'note'->>'ar'), '') = ''
      or coalesce(trim(v_item->'note'->>'en'), '') = '' then
      raise exception 'OBSERVATION_EXPLANATION_REQUIRED';
    end if;

    v_state := (v_item->>'state')::public.evidence_state;

    insert into public.observations (
      analysis_id,
      contribution_id,
      indicator_code,
      ai_state,
      explanation_ar,
      explanation_en,
      requires_confirmation,
      image_refs
    )
    values (
      v_analysis_id,
      p_contribution_id,
      v_indicator,
      v_state,
      v_item->'note'->>'ar',
      v_item->'note'->>'en',
      true,
      v_image_ids
    )
    returning id into v_observation_id;

    v_confirmation := p_confirmations->v_indicator;
    if v_confirmation is null then
      raise exception 'CONFIRMATION_REQUIRED_FOR_%', v_indicator;
    end if;

    v_confirmed_state := (v_confirmation->>'state')::public.evidence_state;
    v_action := v_confirmation->>'action';
    if v_action not in ('confirmed','corrected','unsure') then
      raise exception 'INVALID_CONFIRMATION_ACTION';
    end if;

    insert into public.confirmations (
      observation_id,
      contribution_id,
      confirmed_by,
      confirmed_state,
      action
    )
    values (
      v_observation_id,
      p_contribution_id,
      auth.uid(),
      v_confirmed_state,
      v_action
    );
  end loop;

  update public.contributions
  set status = 'pending_review',
      submitted_at = now(),
      reviewed_at = null,
      reviewed_by = null,
      updated_at = now()
  where id = p_contribution_id;

  insert into public.audit_events (
    actor_id,
    event_type,
    entity_type,
    entity_id,
    payload
  )
  values (
    auth.uid(),
    'contribution_resubmitted_for_review',
    'contribution',
    p_contribution_id,
    jsonb_build_object(
      'clarification_round', v_round,
      'has_note', v_note is not null,
      'image_count', cardinality(v_image_ids),
      'observation_count', jsonb_array_length(p_observations),
      'provider', p_provider,
      'model', p_model
    )
  );
end;
$$;

revoke execute on function public.resubmit_contribution_for_review(
  uuid, text, text, text, jsonb, jsonb, text
) from public, anon;
grant execute on function public.resubmit_contribution_for_review(
  uuid, text, text, text, jsonb, jsonb, text
) to authenticated;

create or replace function public.review_contribution(
  p_contribution_id uuid,
  p_decision public.moderation_status,
  p_reviewer_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.contribution_status;
  v_facility_id uuid;
begin
  if not public.is_mutah_reviewer() then
    raise exception 'REVIEWER_REQUIRED';
  end if;

  if p_decision not in ('approved','rejected','clarification') then
    raise exception 'INVALID_REVIEW_DECISION';
  end if;

  if p_decision in ('rejected','clarification')
    and char_length(trim(coalesce(p_reviewer_note, ''))) < 4 then
    raise exception 'REVIEW_NOTE_REQUIRED';
  end if;

  select status, facility_id into v_status, v_facility_id
  from public.contributions
  where id = p_contribution_id
  for update;

  if v_status is null then
    raise exception 'CONTRIBUTION_NOT_FOUND';
  end if;

  if v_status <> 'pending_review' then
    raise exception 'CONTRIBUTION_NOT_REVIEWABLE';
  end if;

  insert into public.moderation_decisions (
    contribution_id,
    reviewer_id,
    decision,
    reviewer_note
  )
  values (
    p_contribution_id,
    auth.uid(),
    p_decision,
    nullif(trim(coalesce(p_reviewer_note, '')), '')
  );

  update public.contributions
  set status = case p_decision
      when 'approved' then 'approved'::public.contribution_status
      when 'rejected' then 'rejected'::public.contribution_status
      else 'clarification_requested'::public.contribution_status
    end,
    clarification_note = case
      when p_decision = 'clarification'
        then nullif(trim(coalesce(p_reviewer_note, '')), '')
      else null
    end,
    reviewed_at = case when p_decision in ('approved','rejected') then now() else null end,
    reviewed_by = auth.uid(),
    updated_at = now()
  where id = p_contribution_id;

  if p_decision = 'approved'
    and to_regprocedure('public.recompute_facility_summary(uuid)') is not null then
    execute 'select public.recompute_facility_summary($1)' using v_facility_id;
  end if;

  insert into public.audit_events (
    actor_id,
    event_type,
    entity_type,
    entity_id,
    payload
  )
  values (
    auth.uid(),
    'contribution_reviewed',
    'contribution',
    p_contribution_id,
    jsonb_build_object(
      'decision', p_decision,
      'has_note', coalesce(char_length(trim(p_reviewer_note)) > 0, false)
    )
  );
end;
$$;

revoke execute on function public.review_contribution(
  uuid, public.moderation_status, text
) from public, anon;
grant execute on function public.review_contribution(
  uuid, public.moderation_status, text
) to authenticated;
