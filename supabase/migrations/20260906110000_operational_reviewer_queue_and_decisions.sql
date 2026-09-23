-- PROMPT 03 / reviewer operations
-- Allow authenticated MUTAH reviewers to inspect contribution evidence and record review decisions.

create policy "reviewers read analyses"
on public.analyses for select to authenticated
using (public.is_mutah_reviewer());

create policy "reviewers read observations"
on public.observations for select to authenticated
using (public.is_mutah_reviewer());

create policy "reviewers read confirmations"
on public.confirmations for select to authenticated
using (public.is_mutah_reviewer());

create policy "contributors read own analyses"
on public.analyses for select to authenticated
using (
  exists (
    select 1 from public.contributions c
    where c.id = contribution_id and c.submitted_by = auth.uid()
  )
);

create policy "contributors read own observations"
on public.observations for select to authenticated
using (
  exists (
    select 1 from public.contributions c
    where c.id = contribution_id and c.submitted_by = auth.uid()
  )
);

create policy "contributors read own confirmations"
on public.confirmations for select to authenticated
using (
  exists (
    select 1 from public.contributions c
    where c.id = contribution_id and c.submitted_by = auth.uid()
  )
);

create or replace function public.review_contribution(
  p_contribution_id uuid,
  p_decision public.moderation_status,
  p_reviewer_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.contribution_status;
begin
  if not public.is_mutah_reviewer() then
    raise exception 'REVIEWER_REQUIRED';
  end if;

  if p_decision not in ('approved','rejected','clarification') then
    raise exception 'INVALID_REVIEW_DECISION';
  end if;

  if p_decision in ('rejected','clarification') and length(trim(coalesce(p_reviewer_note,''))) < 4 then
    raise exception 'REVIEW_NOTE_REQUIRED';
  end if;

  select status into v_status
  from public.contributions
  where id = p_contribution_id
  for update;

  if v_status is null then
    raise exception 'CONTRIBUTION_NOT_FOUND';
  end if;

  if v_status not in ('pending_review','clarification_requested') then
    raise exception 'CONTRIBUTION_NOT_REVIEWABLE';
  end if;

  insert into public.moderation_decisions (contribution_id, reviewer_id, decision, reviewer_note)
  values (p_contribution_id, auth.uid(), p_decision, nullif(trim(coalesce(p_reviewer_note,'')),''));

  update public.contributions
  set status = case p_decision
      when 'approved' then 'approved'::public.contribution_status
      when 'rejected' then 'rejected'::public.contribution_status
      else 'clarification_requested'::public.contribution_status
    end,
    clarification_note = case when p_decision = 'clarification' then nullif(trim(coalesce(p_reviewer_note,'')),'') else null end,
    reviewed_at = case when p_decision in ('approved','rejected') then now() else null end,
    reviewed_by = auth.uid(),
    updated_at = now()
  where id = p_contribution_id;

  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, payload)
  values (
    auth.uid(),
    'contribution_reviewed',
    'contribution',
    p_contribution_id,
    jsonb_build_object('decision', p_decision, 'has_note', coalesce(length(trim(p_reviewer_note)) > 0, false))
  );
end;
$$;

grant execute on function public.review_contribution(uuid, public.moderation_status, text) to authenticated;
