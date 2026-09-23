-- PROMPT 03 / Phase 3 foundation
-- Private evidence storage buckets and minimal authenticated access policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('mutah-raw-evidence', 'mutah-raw-evidence', false, 8388608, array['image/jpeg','image/png','image/webp']),
  ('mutah-reviewed-evidence', 'mutah-reviewed-evidence', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "contributors upload raw evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'mutah-raw-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "contributors read own raw evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'mutah-raw-evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "reviewers read raw evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'mutah-raw-evidence'
  and public.is_mutah_reviewer()
);

create policy "reviewers read reviewed evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'mutah-reviewed-evidence'
  and public.is_mutah_reviewer()
);

comment on table public.contribution_images is
  'Private contribution image metadata. Raw and sanitized storage paths are never public by default.';
