-- Phase 4 least-privilege hardening for pre-existing operations tables.
-- Reports and audit events are private to their owner/review team; anonymous
-- callers do not need a table-level grant in addition to being denied by RLS.

revoke all on table public.reports from public, anon, authenticated;
revoke all on table public.audit_events from public, anon, authenticated;

grant select on table public.reports to authenticated;
grant select on table public.audit_events to authenticated;
grant all on table public.reports to service_role;
grant all on table public.audit_events to service_role;
