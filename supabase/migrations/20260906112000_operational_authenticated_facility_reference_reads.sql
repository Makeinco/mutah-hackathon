-- PROMPT 03 / operational reference reads
-- Authenticated contributors must be able to resolve facility/zone metadata for their own contributions,
-- while reviewer/admin accounts need the same references for the review queue.

create policy "contributors read facilities referenced by own contributions"
on public.facilities for select to authenticated
using (
  exists (
    select 1 from public.contributions c
    where c.facility_id = facilities.id and c.submitted_by = auth.uid()
  )
);

create policy "reviewers read facilities for operations"
on public.facilities for select to authenticated
using (public.is_mutah_reviewer());

create policy "contributors read zones referenced by own contributions"
on public.facility_zones for select to authenticated
using (
  exists (
    select 1 from public.contributions c
    where c.zone_id = facility_zones.id and c.submitted_by = auth.uid()
  )
);

create policy "reviewers read zones for operations"
on public.facility_zones for select to authenticated
using (public.is_mutah_reviewer());
