-- Move Phase 4 privileged RPC bodies out of the exposed public schema.
-- Public wrappers keep the client API stable and run as SECURITY INVOKER;
-- private bodies retain their explicit auth/role checks and atomic privileges.

create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.create_facility_proposal(public.facility_proposal_type, uuid, text, text, text, text, text, text, double precision, double precision, text, boolean, text, boolean)
  set schema private;
alter function public.attach_facility_proposal_evidence(uuid, text, text)
  set schema private;
alter function public.respond_to_facility_proposal_clarification(uuid, text)
  set schema private;
alter function public.review_facility_proposal(uuid, text, text)
  set schema private;
alter function public.approve_facility_proposal(uuid)
  set schema private;
alter function public.admin_save_facility(uuid, text, text, text, text, text, text, double precision, double precision, text)
  set schema private;
alter function public.admin_set_facility_archived(uuid, boolean, text)
  set schema private;
alter function public.create_facility_report(uuid, text, text)
  set schema private;
alter function public.resolve_facility_report(uuid, text, text)
  set schema private;
alter function public.get_mutah_ops_overview()
  set schema private;

revoke execute on all functions in schema private from public, anon;

alter function public.find_facility_proposal_duplicates(text, double precision, double precision, integer)
  security invoker;

create function public.create_facility_proposal(
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
language sql
security invoker
set search_path = ''
as $$
  select private.create_facility_proposal(
    p_proposal_type, p_existing_facility_id, p_name_ar, p_name_en,
    p_category_ar, p_category_en, p_area_ar, p_area_en,
    p_latitude, p_longitude, p_location_note, p_duplicate_acknowledged,
    p_duplicate_note, p_submit
  );
$$;

create function public.attach_facility_proposal_evidence(
  p_proposal_id uuid, p_storage_path text, p_mime_type text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.attach_facility_proposal_evidence(
    p_proposal_id, p_storage_path, p_mime_type
  );
$$;

create function public.respond_to_facility_proposal_clarification(
  p_proposal_id uuid, p_note text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.respond_to_facility_proposal_clarification(p_proposal_id, p_note);
$$;

create function public.review_facility_proposal(
  p_proposal_id uuid, p_action text, p_reason text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.review_facility_proposal(p_proposal_id, p_action, p_reason);
$$;

create function public.approve_facility_proposal(p_proposal_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.approve_facility_proposal(p_proposal_id);
$$;

create function public.admin_save_facility(
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
language sql
security invoker
set search_path = ''
as $$
  select private.admin_save_facility(
    p_facility_id, p_name_ar, p_name_en, p_category_ar, p_category_en,
    p_area_ar, p_area_en, p_latitude, p_longitude, p_reason
  );
$$;

create function public.admin_set_facility_archived(
  p_facility_id uuid, p_archived boolean, p_reason text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.admin_set_facility_archived(p_facility_id, p_archived, p_reason);
$$;

create function public.create_facility_report(
  p_facility_id uuid, p_report_type text, p_details text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_facility_report(p_facility_id, p_report_type, p_details);
$$;

create function public.resolve_facility_report(
  p_report_id uuid, p_status text, p_resolution_note text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.resolve_facility_report(p_report_id, p_status, p_resolution_note);
$$;

create function public.get_mutah_ops_overview()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_mutah_ops_overview();
$$;

grant execute on function private.create_facility_proposal(public.facility_proposal_type, uuid, text, text, text, text, text, text, double precision, double precision, text, boolean, text, boolean) to authenticated;
grant execute on function private.attach_facility_proposal_evidence(uuid, text, text) to authenticated;
grant execute on function private.respond_to_facility_proposal_clarification(uuid, text) to authenticated;
grant execute on function private.review_facility_proposal(uuid, text, text) to authenticated;
grant execute on function private.approve_facility_proposal(uuid) to authenticated;
grant execute on function private.admin_save_facility(uuid, text, text, text, text, text, text, double precision, double precision, text) to authenticated;
grant execute on function private.admin_set_facility_archived(uuid, boolean, text) to authenticated;
grant execute on function private.create_facility_report(uuid, text, text) to authenticated;
grant execute on function private.resolve_facility_report(uuid, text, text) to authenticated;
grant execute on function private.get_mutah_ops_overview() to authenticated;

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

drop policy if exists "contributors read own facility proposals" on public.facility_proposals;
drop policy if exists "review team reads facility proposals" on public.facility_proposals;
create policy "owners or review team read facility proposals"
on public.facility_proposals for select to authenticated
using (submitted_by = (select auth.uid()) or (select public.is_mutah_reviewer()));

drop policy if exists "contributors read own proposal evidence" on public.facility_proposal_evidence;
drop policy if exists "review team reads proposal evidence" on public.facility_proposal_evidence;
create policy "owners or review team read proposal evidence"
on public.facility_proposal_evidence for select to authenticated
using (submitted_by = (select auth.uid()) or (select public.is_mutah_reviewer()));

drop policy if exists "contributors read own proposal events" on public.facility_proposal_events;
drop policy if exists "review team reads proposal events" on public.facility_proposal_events;
create policy "owners or review team read proposal events"
on public.facility_proposal_events for select to authenticated
using (
  (select public.is_mutah_reviewer())
  or exists (
    select 1 from public.facility_proposals proposal
    where proposal.id = proposal_id and proposal.submitted_by = (select auth.uid())
  )
);

drop policy if exists "contributors read own reports" on public.reports;
drop policy if exists "review team reads reports" on public.reports;
create policy "owners or review team read reports"
on public.reports for select to authenticated
using (created_by = (select auth.uid()) or (select public.is_mutah_reviewer()));
