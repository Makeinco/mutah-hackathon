-- PROMPT 03 operational support
-- Keep demo fixtures explicitly isolated from live publication data and provide secure authenticated draft RPCs.

alter table public.facilities
  add column external_key text unique,
  add column is_demo boolean not null default false;

drop policy if exists "public read reviewed facilities" on public.facilities;
create policy "public read reviewed facilities"
  on public.facilities for select
  using (is_demo = false and verification in ('team_reviewed', 'stale'));

drop policy if exists "public read zones of reviewed facilities" on public.facility_zones;
create policy "public read zones of reviewed facilities"
  on public.facility_zones for select
  using (
    exists (
      select 1 from public.facilities f
      where f.id = facility_id
      and f.is_demo = false
      and f.verification in ('team_reviewed', 'stale')
    )
  );

drop policy if exists "public read sanitized reviewed images" on public.facility_images;
create policy "public read sanitized reviewed images"
  on public.facility_images for select
  using (
    is_sanitized = true
    and verification in ('team_reviewed', 'stale')
    and exists (
      select 1 from public.facilities f
      where f.id = facility_id and f.is_demo = false
    )
  );

drop policy if exists "public read reviewed summaries" on public.facility_summaries;
create policy "public read reviewed summaries"
  on public.facility_summaries for select
  using (
    exists (
      select 1 from public.facilities f
      where f.id = facility_id
      and f.is_demo = false
      and f.verification in ('team_reviewed', 'stale')
    )
  );

insert into public.facilities (external_key, is_demo, name_ar, name_en, category_ar, category_en, area_ar, area_en, source, verification)
values
  ('cafe-nassim', true, 'مقهى نسيم', 'Naseem Café', 'مقهى', 'Café', 'حي النخيل', 'Al Nakheel district', 'mutah_admin', 'pending_review'),
  ('library-taak', true, 'مكتبة الحي العامة', 'Neighbourhood Public Library', 'مكتبة عامة', 'Public library', 'حي الياسمين', 'Al Yasmin district', 'mutah_admin', 'pending_review'),
  ('pharmacy-rukn', true, 'صيدلية الركن', 'Al Rukn Pharmacy', 'صيدلية', 'Pharmacy', 'حي النخيل', 'Al Nakheel district', 'mutah_admin', 'pending_review'),
  ('mall-side', true, 'مركز الواحة — المدخل الجانبي', 'Al Waha Centre — side entrance', 'مركز تسوق', 'Shopping centre', 'طريق الملك عبدالله', 'King Abdullah Road', 'mutah_admin', 'pending_review'),
  ('clinic-noor', true, 'مركز نور الصحي', 'Noor Health Centre', 'مركز صحي', 'Health centre', 'حي الياسمين', 'Al Yasmin district', 'mutah_admin', 'pending_review')
on conflict (external_key) do nothing;

insert into public.facility_zones (facility_id, zone_type, label_ar, label_en, ordinal)
select f.id, z.zone_type::public.zone_type, z.label_ar, z.label_en, 0
from public.facilities f
cross join (values
  ('approach_path','مسار الوصول','Approach path'),
  ('entrance','المدخل','Entrance'),
  ('parking','المواقف','Parking'),
  ('elevator','المصعد','Elevator'),
  ('accessible_restroom','دورة المياه المخصصة','Accessible restroom')
) as z(zone_type,label_ar,label_en)
where f.is_demo = true
on conflict (facility_id, zone_type, ordinal) do nothing;

create or replace function public.create_contribution_draft(
  p_external_key text,
  p_zone_type public.zone_type
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_facility_id uuid;
  v_zone_id uuid;
  v_contribution_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select f.id into v_facility_id
  from public.facilities f
  where f.external_key = p_external_key
  limit 1;

  if v_facility_id is null then
    raise exception 'FACILITY_NOT_FOUND';
  end if;

  select z.id into v_zone_id
  from public.facility_zones z
  where z.facility_id = v_facility_id
    and z.zone_type = p_zone_type
  order by z.ordinal
  limit 1;

  if v_zone_id is null then
    raise exception 'ZONE_NOT_FOUND';
  end if;

  insert into public.contributions (facility_id, zone_id, submitted_by, status, source)
  values (v_facility_id, v_zone_id, auth.uid(), 'draft', 'volunteer')
  returning id into v_contribution_id;

  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, payload)
  values (auth.uid(), 'contribution_draft_created', 'contribution', v_contribution_id, jsonb_build_object('zone_type', p_zone_type));

  return v_contribution_id;
end;
$$;

grant execute on function public.create_contribution_draft(text, public.zone_type) to authenticated;

create or replace function public.attach_contribution_image(
  p_contribution_id uuid,
  p_storage_path text,
  p_mime_type text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_image_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_mime_type not in ('image/jpeg','image/png','image/webp') then
    raise exception 'INVALID_IMAGE_TYPE';
  end if;

  if not exists (
    select 1 from public.contributions c
    where c.id = p_contribution_id
      and c.submitted_by = auth.uid()
      and c.status in ('draft','processing','awaiting_confirmation')
  ) then
    raise exception 'CONTRIBUTION_NOT_EDITABLE';
  end if;

  if split_part(p_storage_path, '/', 1) <> auth.uid()::text then
    raise exception 'INVALID_STORAGE_PATH';
  end if;

  insert into public.contribution_images (contribution_id, storage_path, mime_type, privacy_status)
  values (p_contribution_id, p_storage_path, p_mime_type, 'private_raw')
  returning id into v_image_id;

  return v_image_id;
end;
$$;

grant execute on function public.attach_contribution_image(uuid, text, text) to authenticated;
