-- PHASE 1
-- Central guide-asset metadata and optional contributor focus, kept separate from evidence storage.

alter table public.contributions
  add column focus_indicator text;

alter table public.contributions
  add constraint contributions_focus_indicator_allowed
  check (
    focus_indicator is null
    or focus_indicator in ('general', 'ramp', 'handrail', 'path_obstruction')
  );

comment on column public.contributions.focus_indicator is
  'Optional contributor intent within a facility zone. It guides capture UX and never restricts AI observations.';

create table public.guide_assets (
  id uuid primary key default gen_random_uuid(),
  asset_key text unique not null,
  source_name text unique not null,
  category text not null check (category in ('zone', 'indicator')),
  zone_code text check (
    zone_code is null
    or zone_code in ('approach', 'entrance', 'parking', 'elevator', 'restroom')
  ),
  indicator_code text check (
    indicator_code is null
    or indicator_code in ('ramp', 'handrail', 'path_obstruction')
  ),
  file_path text not null,
  title_ar text not null,
  title_en text not null,
  alt_ar text not null,
  alt_en text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint guide_assets_category_target check (
    (category = 'zone' and zone_code is not null and indicator_code is null)
    or (category = 'indicator' and zone_code is null and indicator_code is not null)
  )
);

comment on table public.guide_assets is
  'Read-only metadata for approved capture guides. Guide assets are not user evidence and do not live in evidence buckets.';

alter table public.guide_assets enable row level security;

create policy "public read active guide assets"
on public.guide_assets for select
to anon, authenticated
using (is_active = true);

revoke all on table public.guide_assets from public, anon, authenticated;
grant select on table public.guide_assets to anon, authenticated;

insert into public.guide_assets (
  asset_key,
  source_name,
  category,
  zone_code,
  indicator_code,
  file_path,
  title_ar,
  title_en,
  alt_ar,
  alt_en,
  sort_order
)
values
  ('approach-path', 'Access Path', 'zone', 'approach', null, '/guides/approach-path.webp', 'مسار الوصول', 'Access Path', 'مثال إرشادي لتصوير مسار الوصول', 'Photo guide example for an access path', 1),
  ('parking', 'Accessible Parking', 'zone', 'parking', null, '/guides/parking.webp', 'موقف مخصص', 'Accessible Parking', 'مثال إرشادي لتصوير موقف مخصص', 'Photo guide example for accessible parking', 2),
  ('accessible-restroom', 'Accessible Restroom', 'zone', 'restroom', null, '/guides/accessible-restroom.webp', 'دورة مياه مخصصة', 'Accessible Restroom', 'مثال إرشادي لتصوير دورة مياه مخصصة', 'Photo guide example for an accessible restroom', 3),
  ('elevator', 'Elevator', 'zone', 'elevator', null, '/guides/elevator.webp', 'مصعد', 'Elevator', 'مثال إرشادي لتصوير مصعد', 'Photo guide example for an elevator', 4),
  ('entrance', 'Entrance', 'zone', 'entrance', null, '/guides/entrance.webp', 'مدخل', 'Entrance', 'مثال إرشادي لتصوير مدخل', 'Photo guide example for an entrance', 5),
  ('handrail', 'Handrail', 'indicator', null, 'handrail', '/guides/handrail.webp', 'درابزين', 'Handrail', 'مثال إرشادي لتصوير درابزين', 'Photo guide example for a handrail', 6),
  ('path-obstruction', 'Path Obstruction', 'indicator', null, 'path_obstruction', '/guides/path-obstruction.webp', 'عائق في المسار', 'Path Obstruction', 'مثال إرشادي لتصوير عائق في المسار', 'Photo guide example for a path obstruction', 7),
  ('ramp', 'Ramp', 'indicator', null, 'ramp', '/guides/ramp.webp', 'منحدر', 'Ramp', 'مثال إرشادي لتصوير منحدر', 'Photo guide example for a ramp', 8)
on conflict (asset_key) do update set
  source_name = excluded.source_name,
  category = excluded.category,
  zone_code = excluded.zone_code,
  indicator_code = excluded.indicator_code,
  file_path = excluded.file_path,
  title_ar = excluded.title_ar,
  title_en = excluded.title_en,
  alt_ar = excluded.alt_ar,
  alt_en = excluded.alt_en,
  is_active = true,
  sort_order = excluded.sort_order;

create or replace function public.create_contribution_draft(
  p_external_key text,
  p_zone_type public.zone_type,
  p_focus_indicator text
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

  if p_focus_indicator not in ('general', 'ramp', 'handrail', 'path_obstruction') then
    raise exception 'INVALID_FOCUS_INDICATOR';
  end if;

  if p_focus_indicator <> 'general' and not (
    (p_zone_type = 'approach_path' and p_focus_indicator in ('ramp', 'handrail', 'path_obstruction'))
    or (p_zone_type = 'entrance' and p_focus_indicator in ('ramp', 'handrail'))
  ) then
    raise exception 'FOCUS_INDICATOR_NOT_ALLOWED_FOR_ZONE';
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

  insert into public.contributions (
    facility_id,
    zone_id,
    submitted_by,
    status,
    source,
    focus_indicator
  )
  values (
    v_facility_id,
    v_zone_id,
    auth.uid(),
    'draft',
    'volunteer',
    p_focus_indicator
  )
  returning id into v_contribution_id;

  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, payload)
  values (
    auth.uid(),
    'contribution_draft_created',
    'contribution',
    v_contribution_id,
    jsonb_build_object('zone_type', p_zone_type, 'focus_indicator', p_focus_indicator)
  );

  return v_contribution_id;
end;
$$;

revoke execute on function public.create_contribution_draft(text, public.zone_type, text) from public, anon;
grant execute on function public.create_contribution_draft(text, public.zone_type, text) to authenticated;
