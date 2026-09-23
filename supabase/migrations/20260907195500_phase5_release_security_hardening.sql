-- PHASE 5
-- Tighten legacy SQL privileges to match the existing RLS and RPC role model.

revoke all on table
  public.profiles,
  public.user_access_preferences,
  public.facilities,
  public.facility_zones,
  public.facility_images,
  public.analyses,
  public.observations,
  public.confirmations,
  public.contributions,
  public.contribution_images,
  public.moderation_decisions,
  public.clarification_responses,
  public.reviewed_evidence_publications,
  public.facility_summaries,
  public.facility_proposals,
  public.facility_proposal_evidence,
  public.facility_proposal_events,
  public.facility_change_history,
  public.reports,
  public.audit_events,
  public.moderation_queue,
  public.pilot_metrics
from public, anon, authenticated;

grant select on table
  public.facilities,
  public.facility_zones,
  public.facility_images,
  public.reviewed_evidence_publications,
  public.facility_summaries
to anon, authenticated;

grant select on table public.guide_assets to anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update on table public.user_access_preferences to authenticated;
grant select on table
  public.analyses,
  public.observations,
  public.confirmations,
  public.contributions,
  public.contribution_images,
  public.moderation_decisions,
  public.clarification_responses,
  public.facility_proposals,
  public.facility_proposal_evidence,
  public.facility_proposal_events,
  public.facility_change_history,
  public.reports,
  public.audit_events
to authenticated;

-- Remove inherited anonymous access from every privileged public function.
do $phase5$
declare
  function_record record;
begin
  for function_record in
    select function_oid::regprocedure as signature
    from (
      select p.oid as function_oid
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prosecdef
    ) privileged_functions
  loop
    execute format('revoke execute on function %s from public, anon', function_record.signature);
  end loop;
end;
$phase5$;

-- This trigger helper is never a client-facing RPC.
revoke execute on function public.handle_new_user_profile() from authenticated;

-- Retire the superseded two-argument draft endpoint.
revoke execute on function public.create_contribution_draft(text, public.zone_type)
from authenticated;

-- These helpers are required by authenticated RLS policies and role gates.
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_mutah_reviewer() to authenticated;
grant execute on function public.is_mutah_admin() to authenticated;

comment on function public.current_user_role() is
  'Authenticated role lookup used by MUTAH role gates. Anonymous execution is revoked.';
