-- PROMPT 03 / MUTAH Operations overview
-- Reviewer/admin-only aggregate counts for operational workload. No public analytics exposure.

create or replace function public.get_mutah_ops_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_mutah_reviewer() then
    raise exception 'REVIEWER_REQUIRED';
  end if;

  return jsonb_build_object(
    'pending_review', (select count(*) from public.contributions where status = 'pending_review'),
    'clarification_requested', (select count(*) from public.contributions where status = 'clarification_requested'),
    'approved', (select count(*) from public.contributions where status = 'approved'),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'stale_facilities', (select count(*) from public.facilities where is_demo = false and verification = 'stale'),
    'contributors', (select count(*) from public.profiles where role = 'contributor')
  );
end;
$$;

grant execute on function public.get_mutah_ops_overview() to authenticated;
