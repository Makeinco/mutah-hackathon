create or replace function public.finalize_contribution_for_review(
  p_contribution_id uuid,
  p_provider text,
  p_model text,
  p_prompt_version text,
  p_observations jsonb,
  p_confirmations jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_analysis_id uuid;
  v_item jsonb;
  v_confirmation jsonb;
  v_observation_id uuid;
  v_indicator text;
  v_state public.evidence_state;
  v_confirmed_state public.evidence_state;
  v_action text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1 from public.contributions c
    where c.id = p_contribution_id
      and c.submitted_by = auth.uid()
      and c.status in ('draft','processing','awaiting_confirmation')
  ) then
    raise exception 'CONTRIBUTION_NOT_EDITABLE';
  end if;

  if jsonb_typeof(p_observations) <> 'array' or jsonb_array_length(p_observations) = 0 then
    raise exception 'OBSERVATIONS_REQUIRED';
  end if;

  update public.contributions
  set status = 'processing', updated_at = now()
  where id = p_contribution_id;

  insert into public.analyses (contribution_id, provider, model, prompt_version, status, raw_json)
  values (p_contribution_id, p_provider, p_model, p_prompt_version, 'completed', jsonb_build_object('observations', p_observations))
  returning id into v_analysis_id;

  for v_item in select * from jsonb_array_elements(p_observations)
  loop
    v_indicator := v_item->>'key';
    v_state := (v_item->>'state')::public.evidence_state;

    insert into public.observations (
      analysis_id, contribution_id, indicator_code, ai_state, explanation_ar, explanation_en, requires_confirmation
    )
    values (
      v_analysis_id,
      p_contribution_id,
      v_indicator,
      v_state,
      v_item->'note'->>'ar',
      v_item->'note'->>'en',
      true
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
      observation_id, contribution_id, confirmed_by, confirmed_state, action
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
  set status = 'pending_review', submitted_at = now(), updated_at = now()
  where id = p_contribution_id;

  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, payload)
  values (
    auth.uid(),
    'contribution_submitted_for_review',
    'contribution',
    p_contribution_id,
    jsonb_build_object('provider', p_provider, 'model', p_model, 'observation_count', jsonb_array_length(p_observations))
  );
end;
$$;

grant execute on function public.finalize_contribution_for_review(uuid, text, text, text, jsonb, jsonb) to authenticated;
