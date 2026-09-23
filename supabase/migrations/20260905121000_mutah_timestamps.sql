create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists facilities_set_updated_at on public.facilities;
create trigger facilities_set_updated_at
before update on public.facilities
for each row execute function public.set_updated_at();

comment on function public.set_updated_at() is
  'Maintains facilities.updated_at without trusting client input.';
