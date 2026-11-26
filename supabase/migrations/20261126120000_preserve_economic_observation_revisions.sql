-- Keep the latest-observation identity and preserve prior normalized versions.
create table public.economic_observation_revisions (
  id bigint generated always as identity primary key,
  observation_id uuid not null references public.economic_observations(id) on delete cascade,
  value numeric,
  unit text,
  data_as_of date,
  published_at timestamptz,
  vintage_start date,
  vintage_end date,
  retrieved_at timestamptz not null,
  source_url text not null,
  superseded_at timestamptz not null default now()
);

create index economic_observation_revisions_lookup_idx
  on public.economic_observation_revisions (observation_id, superseded_at desc);

alter table public.economic_observation_revisions enable row level security;
revoke all on public.economic_observation_revisions from public, anon, authenticated;
revoke all on sequence public.economic_observation_revisions_id_seq from public, anon, authenticated;
grant select, insert on public.economic_observation_revisions to service_role;
grant usage on sequence public.economic_observation_revisions_id_seq to service_role;

-- Existing public readers can select normalized fields explicitly.
revoke select on public.economic_observations from public, anon, authenticated;
grant select (
  id, provider, dataset_id, series_id, series_name, country_code, frequency,
  observation_date, value, unit, data_as_of, published_at, vintage_start, vintage_end,
  retrieved_at, source_url, freshness_status
) on public.economic_observations to anon, authenticated;

create function public.archive_economic_observation_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Do not let a late retry replace a more recently retrieved version.
  if new.retrieved_at < old.retrieved_at then
    return null;
  end if;

  if row(old.value, old.unit, old.data_as_of, old.published_at, old.vintage_start, old.vintage_end, old.source_url)
    is distinct from row(new.value, new.unit, new.data_as_of, new.published_at, new.vintage_start, new.vintage_end, new.source_url) then
    insert into public.economic_observation_revisions (
      observation_id, value, unit, data_as_of, published_at, vintage_start,
      vintage_end, retrieved_at, source_url
    ) values (
      old.id, old.value, old.unit, old.data_as_of, old.published_at, old.vintage_start,
      old.vintage_end, old.retrieved_at, old.source_url
    );
  end if;
  return new;
end;
$$;

revoke all on function public.archive_economic_observation_revision() from public, anon, authenticated;
create trigger economic_observations_archive_revision
before update on public.economic_observations
for each row execute function public.archive_economic_observation_revision();
