-- Phase 3: atomic reviewer approval -> reviewed evidence publication -> facility summary.
-- Raw contribution evidence remains private and AI observations require both contributor
-- confirmation/correction and reviewer approval before entering this publication layer.

create table public.reviewed_evidence_publications (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  zone_id uuid not null references public.facility_zones(id) on delete cascade,
  indicator_code text not null,
  focus_indicator text,
  normalized_state public.evidence_state not null,
  explanation_ar text not null,
  explanation_en text not null,
  verification public.verification_status not null default 'team_reviewed'
    check (verification = 'team_reviewed'),
  reviewed_at timestamptz not null,
  evidence_recorded_at timestamptz not null,
  source_contribution_id uuid not null references public.contributions(id) on delete restrict,
  source_analysis_id uuid not null references public.analyses(id) on delete restrict,
  source_observation_id uuid not null unique references public.observations(id) on delete restrict,
  source_confirmation_id uuid not null unique references public.confirmations(id) on delete restrict,
  source_moderation_decision_id uuid not null references public.moderation_decisions(id) on delete restrict,
  source_contribution_image_ids uuid[] not null default '{}'::uuid[],
  reviewed_storage_paths text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create index reviewed_evidence_publications_facility_latest_idx
  on public.reviewed_evidence_publications(facility_id, indicator_code, reviewed_at desc, evidence_recorded_at desc);
create index reviewed_evidence_publications_contribution_idx
  on public.reviewed_evidence_publications(source_contribution_id);

alter table public.reviewed_evidence_publications enable row level security;

create policy "public read approved reviewed evidence"
  on public.reviewed_evidence_publications for select
  to anon, authenticated
  using (
    verification = 'team_reviewed'
    and exists (
      select 1
      from public.facilities f
      where f.id = facility_id
        and f.is_demo = false
        and f.verification in ('team_reviewed', 'stale')
    )
  );

revoke all on table public.reviewed_evidence_publications from public, anon, authenticated;
grant select on table public.reviewed_evidence_publications to anon, authenticated;
grant all on table public.reviewed_evidence_publications to service_role;

comment on table public.reviewed_evidence_publications is
  'Immutable, human-reviewed evidence lineage. Contains no contributor identity, private raw path, AI JSON, score, or certification claim.';
comment on column public.reviewed_evidence_publications.reviewed_storage_paths is
  'Only paths to actually sanitized objects in the private mutah-reviewed-evidence bucket. Empty until sanitization is completed.';

create or replace function public.recompute_facility_summary(p_facility_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evidence jsonb;
  v_status jsonb;
  v_last_verified_at timestamptz;
begin
  if not public.is_mutah_reviewer() then
    raise exception 'REVIEWER_REQUIRED';
  end if;

  if exists (
    select 1 from public.facilities f
    where f.id = p_facility_id and f.is_demo = true
  ) then
    raise exception 'DEMO_FACILITY_NOT_PUBLISHABLE';
  end if;

  with latest as (
    select distinct on (publication.indicator_code)
      publication.id,
      publication.indicator_code,
      publication.normalized_state,
      publication.explanation_ar,
      publication.explanation_en,
      publication.focus_indicator,
      publication.source_contribution_id,
      publication.reviewed_at,
      zone.zone_type
    from public.reviewed_evidence_publications publication
    join public.facility_zones zone on zone.id = publication.zone_id
    where publication.facility_id = p_facility_id
      and publication.verification = 'team_reviewed'
      and exists (
        select 1
        from public.contributions contribution
        where contribution.id = publication.source_contribution_id
          and contribution.status = 'approved'
      )
    order by
      publication.indicator_code,
      publication.reviewed_at desc,
      publication.evidence_recorded_at desc,
      publication.created_at desc,
      publication.id desc
  )
  select
    coalesce(jsonb_object_agg(
      indicator_code,
      jsonb_build_object(
        'state', normalized_state,
        'explanation_ar', explanation_ar,
        'explanation_en', explanation_en,
        'zone', zone_type,
        'focus_indicator', focus_indicator,
        'publication_id', id,
        'source_contribution_id', source_contribution_id,
        'reviewed_at', reviewed_at
      )
    ), '{}'::jsonb),
    coalesce(jsonb_object_agg(indicator_code, to_jsonb(normalized_state)), '{}'::jsonb),
    max(reviewed_at)
  into v_evidence, v_status, v_last_verified_at
  from latest;

  if v_last_verified_at is null then
    raise exception 'NO_APPROVED_REVIEWED_EVIDENCE';
  end if;

  insert into public.facility_summaries (
    facility_id,
    reviewed_evidence,
    evidence_status,
    last_recomputed_at
  )
  values (p_facility_id, v_evidence, v_status, now())
  on conflict (facility_id) do update set
    reviewed_evidence = excluded.reviewed_evidence,
    evidence_status = excluded.evidence_status,
    last_recomputed_at = excluded.last_recomputed_at;

  update public.facilities
  set verification = 'team_reviewed',
      last_verified_at = v_last_verified_at,
      updated_at = now()
  where id = p_facility_id
    and is_demo = false;
end;
$$;

revoke execute on function public.recompute_facility_summary(uuid) from public, anon;
grant execute on function public.recompute_facility_summary(uuid) to authenticated;

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
  v_zone_id uuid;
  v_focus_indicator text;
  v_is_demo boolean;
  v_decision_id uuid;
  v_reviewed_at timestamptz := now();
  v_publication_count integer := 0;
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

  select contribution.status,
         contribution.facility_id,
         contribution.zone_id,
         contribution.focus_indicator,
         facility.is_demo
  into v_status, v_facility_id, v_zone_id, v_focus_indicator, v_is_demo
  from public.contributions contribution
  join public.facilities facility on facility.id = contribution.facility_id
  where contribution.id = p_contribution_id
  for update of contribution;

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
    reviewer_note,
    created_at
  )
  values (
    p_contribution_id,
    auth.uid(),
    p_decision,
    nullif(trim(coalesce(p_reviewer_note, '')), ''),
    v_reviewed_at
  )
  returning id into v_decision_id;

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
    reviewed_at = case when p_decision in ('approved','rejected') then v_reviewed_at else null end,
    reviewed_by = auth.uid(),
    updated_at = now()
  where id = p_contribution_id;

  if p_decision = 'approved' and v_is_demo = false then
    insert into public.reviewed_evidence_publications (
      facility_id,
      zone_id,
      indicator_code,
      focus_indicator,
      normalized_state,
      explanation_ar,
      explanation_en,
      reviewed_at,
      evidence_recorded_at,
      source_contribution_id,
      source_analysis_id,
      source_observation_id,
      source_confirmation_id,
      source_moderation_decision_id,
      source_contribution_image_ids,
      reviewed_storage_paths
    )
    select
      v_facility_id,
      v_zone_id,
      observation.indicator_code,
      v_focus_indicator,
      case
        when confirmation.action = 'unsure' then 'unknown'::public.evidence_state
        else confirmation.confirmed_state
      end,
      case
        when confirmation.action = 'unsure'
          then 'لم يتمكن المساهم من تأكيد هذا العنصر، لذلك تبقى حالته غير مؤكدة.'
        else coalesce(nullif(trim(confirmation.note), ''), nullif(trim(observation.explanation_ar), ''), 'دليل مراجع')
      end,
      case
        when confirmation.action = 'unsure'
          then 'The contributor could not confirm this item, so its state remains unknown.'
        else coalesce(nullif(trim(confirmation.note), ''), nullif(trim(observation.explanation_en), ''), 'Reviewed evidence')
      end,
      v_reviewed_at,
      confirmation.created_at,
      p_contribution_id,
      analysis.id,
      observation.id,
      confirmation.id,
      v_decision_id,
      image_lineage.image_ids,
      image_lineage.reviewed_paths
    from public.observations observation
    join public.analyses analysis
      on analysis.id = observation.analysis_id
     and analysis.contribution_id = p_contribution_id
     and analysis.status = 'completed'
    join lateral (
      select candidate.*
      from public.confirmations candidate
      where candidate.observation_id = observation.id
        and candidate.contribution_id = p_contribution_id
      order by candidate.created_at desc, candidate.id desc
      limit 1
    ) confirmation on true
    cross join lateral (
      select
        coalesce(array_agg(image.id order by image.created_at, image.id), '{}'::uuid[]) as image_ids,
        coalesce(
          array_agg(image.sanitized_storage_path order by image.created_at, image.id)
            filter (where image.sanitized_storage_path is not null),
          '{}'::text[]
        ) as reviewed_paths
      from public.contribution_images image
      where image.contribution_id = p_contribution_id
        and (
          (coalesce(cardinality(observation.image_refs), 0) > 0 and image.id = any(observation.image_refs))
          or
          (coalesce(cardinality(observation.image_refs), 0) = 0 and image.clarification_round = analysis.clarification_round)
        )
    ) image_lineage
    where observation.contribution_id = p_contribution_id
      and observation.requires_confirmation = true
    on conflict (source_observation_id) do nothing;

    get diagnostics v_publication_count = row_count;

    if v_publication_count = 0 then
      raise exception 'NO_CONFIRMED_EVIDENCE_TO_PUBLISH';
    end if;

    perform public.recompute_facility_summary(v_facility_id);
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
    case
      when p_decision = 'approved' and v_is_demo = false then 'contribution_approved_and_published'
      else 'contribution_reviewed'
    end,
    'contribution',
    p_contribution_id,
    jsonb_build_object(
      'reviewer_id', auth.uid(),
      'facility_id', v_facility_id,
      'moderation_decision_id', v_decision_id,
      'decision', p_decision,
      'publication_action', case
        when p_decision = 'approved' and v_is_demo = false then 'published_and_summary_recomputed'
        when p_decision = 'approved' and v_is_demo = true then 'demo_isolated_not_published'
        else 'not_published'
      end,
      'publication_count', v_publication_count,
      'has_note', coalesce(char_length(trim(p_reviewer_note)) > 0, false),
      'reviewed_at', v_reviewed_at
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
