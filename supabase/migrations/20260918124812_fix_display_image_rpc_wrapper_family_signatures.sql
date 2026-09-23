create or replace function public.review_facility_display_image_proposal(
  p_proposal_id uuid,
  p_action text,
  p_reason text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.review_facility_display_image_proposal(
    p_proposal_id,
    p_action,
    p_reason
  )
$$;

create or replace function public.respond_to_display_image_clarification(
  p_proposal_id uuid,
  p_context_note text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.respond_to_display_image_clarification(
    p_proposal_id,
    p_context_note
  )
$$;

create or replace function public.publish_facility_display_image(
  p_proposal_id uuid,
  p_public_path text,
  p_reason text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.publish_facility_display_image(
    p_proposal_id,
    p_public_path,
    p_reason
  )
$$;

create or replace function public.admin_set_facility_display_image(
  p_facility_id uuid,
  p_public_path text,
  p_reason text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.admin_set_facility_display_image(
    p_facility_id,
    p_public_path,
    p_reason
  )
$$;

revoke all on function public.review_facility_display_image_proposal(uuid, text, text)
from public, anon;

revoke all on function public.respond_to_display_image_clarification(uuid, text)
from public, anon;

revoke all on function public.publish_facility_display_image(uuid, text, text)
from public, anon;

revoke all on function public.admin_set_facility_display_image(uuid, text, text)
from public, anon;

grant execute on function public.review_facility_display_image_proposal(uuid, text, text)
to authenticated, service_role;

grant execute on function public.respond_to_display_image_clarification(uuid, text)
to authenticated, service_role;

grant execute on function public.publish_facility_display_image(uuid, text, text)
to authenticated, service_role;

grant execute on function public.admin_set_facility_display_image(uuid, text, text)
to authenticated, service_role;
