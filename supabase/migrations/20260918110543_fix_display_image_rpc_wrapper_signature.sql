create or replace function public.create_facility_display_image_proposal(
  p_facility_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_context_note text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_facility_display_image_proposal(
    p_facility_id,
    p_storage_path,
    p_mime_type,
    p_context_note
  )
$$;

revoke all on function public.create_facility_display_image_proposal(uuid, text, text, text)
from public, anon;

grant execute on function public.create_facility_display_image_proposal(uuid, text, text, text)
to authenticated, service_role;
