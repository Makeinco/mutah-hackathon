-- Add an explicit private-proposal -> reviewed -> admin-publication workflow.
-- Raw evidence remains private; only immutable, admin-promoted objects enter the public bucket.

alter table public.facilities add column if not exists official_image_path text;

alter table public.facility_change_history drop constraint if exists facility_change_history_change_type_check;
alter table public.facility_change_history add constraint facility_change_history_change_type_check
check (change_type in ('proposal_approved','admin_created','admin_edited','archived','unarchived','official_image_published','official_image_changed'));

create table public.facility_display_image_proposals (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete restrict,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  private_storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  context_note text check (context_note is null or char_length(context_note) <= 2000),
  status text not null default 'pending_review' check (status in ('pending_review','clarification_requested','recommended','approved','rejected')),
  review_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  published_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index facility_display_image_proposals_queue_idx on public.facility_display_image_proposals(status, created_at);
create index facility_display_image_proposals_owner_idx on public.facility_display_image_proposals(submitted_by, created_at desc);
alter table public.facility_display_image_proposals enable row level security;
create policy "owner or review team reads display image proposals" on public.facility_display_image_proposals
for select to authenticated using (submitted_by = (select auth.uid()) or (select public.is_mutah_reviewer()));
revoke all on public.facility_display_image_proposals from public, anon, authenticated;
grant select on public.facility_display_image_proposals to authenticated;
grant all on public.facility_display_image_proposals to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mutah-public-facility-media','mutah-public-facility-media',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "admins upload official facility media" on storage.objects for insert to authenticated
with check (bucket_id = 'mutah-public-facility-media' and (select public.is_mutah_admin()));

create or replace function private.create_facility_display_image_proposal(p_facility_id uuid, p_storage_path text, p_mime_type text, p_context_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if split_part(p_storage_path,'/',1) <> v_uid::text then raise exception 'STORAGE_PATH_OWNER_MISMATCH'; end if;
  if p_mime_type not in ('image/jpeg','image/png','image/webp') then raise exception 'IMAGE_TYPE_NOT_ALLOWED'; end if;
  if not exists (select 1 from public.facilities f where f.id=p_facility_id and not f.is_demo and not f.is_archived) then raise exception 'FACILITY_NOT_FOUND'; end if;
  insert into public.facility_display_image_proposals(facility_id,submitted_by,private_storage_path,mime_type,context_note)
  values(p_facility_id,v_uid,p_storage_path,p_mime_type,nullif(trim(coalesce(p_context_note,'')),'')) returning id into v_id;
  insert into public.audit_events(actor_id,event_type,entity_type,entity_id,payload) values(v_uid,'facility_display_image_proposed','facility_display_image_proposal',v_id,jsonb_build_object('facility_id',p_facility_id));
  return v_id;
end $$;

create or replace function private.review_facility_display_image_proposal(p_proposal_id uuid,p_action text,p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_next text;
begin
  if not public.is_mutah_reviewer() then raise exception 'REVIEWER_REQUIRED'; end if;
  if p_action not in ('clarification','recommend','reject') then raise exception 'REVIEWER_ACTION_NOT_ALLOWED'; end if;
  if p_action in ('clarification','reject') and char_length(trim(coalesce(p_reason,''))) < 4 then raise exception 'REVIEW_REASON_REQUIRED'; end if;
  v_next := case p_action when 'clarification' then 'clarification_requested' when 'recommend' then 'recommended' else 'rejected' end;
  update public.facility_display_image_proposals set status=v_next,review_reason=nullif(trim(coalesce(p_reason,'')),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
  where id=p_proposal_id and status='pending_review';
  if not found then raise exception 'PROPOSAL_NOT_REVIEWABLE'; end if;
  insert into public.audit_events(actor_id,event_type,entity_type,entity_id,payload) values(auth.uid(),'facility_display_image_'||p_action,'facility_display_image_proposal',p_proposal_id,jsonb_build_object('status',v_next));
end $$;

create or replace function private.respond_to_display_image_clarification(p_proposal_id uuid,p_context_note text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.facility_display_image_proposals set status='pending_review',context_note=nullif(trim(coalesce(p_context_note,'')),''),updated_at=now()
  where id=p_proposal_id and submitted_by=auth.uid() and status='clarification_requested';
  if not found then raise exception 'CLARIFICATION_NOT_ALLOWED'; end if;
end $$;

create or replace function private.publish_facility_display_image(p_proposal_id uuid,p_public_path text,p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.facility_display_image_proposals%rowtype; v_previous text;
begin
  if not public.is_mutah_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v from public.facility_display_image_proposals where id=p_proposal_id for update;
  if v.status <> 'recommended' then raise exception 'PROPOSAL_NOT_RECOMMENDED'; end if;
  if split_part(p_public_path,'/',1) <> v.facility_id::text then raise exception 'PUBLIC_PATH_FACILITY_MISMATCH'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='mutah-public-facility-media' and o.name=p_public_path) then raise exception 'PUBLIC_OBJECT_NOT_FOUND'; end if;
  select official_image_path into v_previous from public.facilities where id=v.facility_id for update;
  update public.facilities set official_image_path=p_public_path,updated_at=now() where id=v.facility_id;
  update public.facility_display_image_proposals set status='approved',published_storage_path=p_public_path,decided_by=auth.uid(),decided_at=now(),updated_at=now() where id=p_proposal_id;
  insert into public.facility_change_history(facility_id,changed_by,change_type,previous_values,new_values,reason)
  values(v.facility_id,auth.uid(),case when v_previous is null then 'official_image_published' else 'official_image_changed' end,jsonb_build_object('official_image_path',v_previous),jsonb_build_object('official_image_path',p_public_path,'image_proposal_id',p_proposal_id),nullif(trim(coalesce(p_reason,'')),''));
end $$;

create or replace function private.admin_set_facility_display_image(p_facility_id uuid,p_public_path text,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_previous text;
begin
  if not public.is_mutah_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if char_length(trim(coalesce(p_reason,''))) < 4 then raise exception 'CHANGE_REASON_REQUIRED'; end if;
  if split_part(p_public_path,'/',1) <> p_facility_id::text then raise exception 'PUBLIC_PATH_FACILITY_MISMATCH'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='mutah-public-facility-media' and o.name=p_public_path) then raise exception 'PUBLIC_OBJECT_NOT_FOUND'; end if;
  select official_image_path into v_previous from public.facilities where id=p_facility_id for update;
  if not found then raise exception 'FACILITY_NOT_FOUND'; end if;
  update public.facilities set official_image_path=p_public_path,updated_at=now() where id=p_facility_id;
  insert into public.facility_change_history(facility_id,changed_by,change_type,previous_values,new_values,reason)
  values(p_facility_id,auth.uid(),case when v_previous is null then 'official_image_published' else 'official_image_changed' end,jsonb_build_object('official_image_path',v_previous),jsonb_build_object('official_image_path',p_public_path),trim(p_reason));
end $$;

create function public.create_facility_display_image_proposal(uuid,text,text,text default null) returns uuid language sql security invoker set search_path='' as $$ select private.create_facility_display_image_proposal($1,$2,$3,$4) $$;
create function public.review_facility_display_image_proposal(uuid,text,text default null) returns void language sql security invoker set search_path='' as $$ select private.review_facility_display_image_proposal($1,$2,$3) $$;
create function public.respond_to_display_image_clarification(uuid,text) returns void language sql security invoker set search_path='' as $$ select private.respond_to_display_image_clarification($1,$2) $$;
create function public.publish_facility_display_image(uuid,text,text default null) returns void language sql security invoker set search_path='' as $$ select private.publish_facility_display_image($1,$2,$3) $$;
create function public.admin_set_facility_display_image(uuid,text,text) returns void language sql security invoker set search_path='' as $$ select private.admin_set_facility_display_image($1,$2,$3) $$;

revoke execute on all functions in schema private from public,anon;
grant execute on function private.create_facility_display_image_proposal(uuid,text,text,text),private.review_facility_display_image_proposal(uuid,text,text),private.respond_to_display_image_clarification(uuid,text),private.publish_facility_display_image(uuid,text,text),private.admin_set_facility_display_image(uuid,text,text) to authenticated;
revoke execute on function public.create_facility_display_image_proposal(uuid,text,text,text),public.review_facility_display_image_proposal(uuid,text,text),public.respond_to_display_image_clarification(uuid,text),public.publish_facility_display_image(uuid,text,text),public.admin_set_facility_display_image(uuid,text,text) from public,anon;
grant execute on function public.create_facility_display_image_proposal(uuid,text,text,text),public.review_facility_display_image_proposal(uuid,text,text),public.respond_to_display_image_clarification(uuid,text),public.publish_facility_display_image(uuid,text,text),public.admin_set_facility_display_image(uuid,text,text) to authenticated;
