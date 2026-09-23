-- Complete the private proposal flow and make admin publication uploads compatible
-- with Storage's INSERT ... RETURNING behavior. This migration is additive.

create policy "admins read official facility media metadata"
on storage.objects for select to authenticated
using (
  bucket_id = 'mutah-public-facility-media'
  and (select public.is_mutah_admin())
);

create policy "admins remove unpublished official facility media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'mutah-public-facility-media'
  and (select public.is_mutah_admin())
);

create policy "contributors remove orphaned display image uploads"
on storage.objects for delete to authenticated
using (
  bucket_id = 'mutah-raw-evidence'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'display-images'
);

create unique index facility_display_image_proposals_one_active_per_owner
on public.facility_display_image_proposals(facility_id, submitted_by)
where status in ('pending_review', 'clarification_requested', 'recommended');

create or replace function private.create_facility_display_image_proposal(
  p_facility_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_context_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if split_part(p_storage_path, '/', 1) <> v_uid::text then
    raise exception 'STORAGE_PATH_OWNER_MISMATCH';
  end if;
  if split_part(p_storage_path, '/', 2) <> 'display-images' then
    raise exception 'DISPLAY_IMAGE_PATH_REQUIRED';
  end if;
  if p_mime_type not in ('image/jpeg', 'image/png', 'image/webp') then
    raise exception 'IMAGE_TYPE_NOT_ALLOWED';
  end if;
  if not exists (
    select 1
    from public.facilities f
    where f.id = p_facility_id
      and not f.is_demo
      and not f.is_archived
  ) then
    raise exception 'FACILITY_NOT_FOUND';
  end if;
  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'mutah-raw-evidence'
      and o.name = p_storage_path
      and o.owner_id = v_uid::text
  ) then
    raise exception 'PRIVATE_IMAGE_OBJECT_NOT_FOUND';
  end if;
  if exists (
    select 1
    from public.facility_display_image_proposals p
    where p.facility_id = p_facility_id
      and p.submitted_by = v_uid
      and p.status in ('pending_review', 'clarification_requested', 'recommended')
  ) then
    raise exception 'DISPLAY_IMAGE_PROPOSAL_PENDING';
  end if;

  insert into public.facility_display_image_proposals(
    facility_id,
    submitted_by,
    private_storage_path,
    mime_type,
    context_note
  )
  values (
    p_facility_id,
    v_uid,
    p_storage_path,
    p_mime_type,
    nullif(trim(coalesce(p_context_note, '')), '')
  )
  returning id into v_id;

  insert into public.audit_events(actor_id, event_type, entity_type, entity_id, payload)
  values (
    v_uid,
    'facility_display_image_proposed',
    'facility_display_image_proposal',
    v_id,
    jsonb_build_object('facility_id', p_facility_id)
  );

  return v_id;
end;
$$;
