-- Canonical listed-contract market observations plus a separately reviewed
-- provider/market/delay entitlement registry. Observation batches never grant
-- themselves permission for public display.
create table if not exists public.futures_market_data_entitlements (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  venue text not null,
  instrument_root text not null,
  delay_class text not null check (delay_class in ('real-time','delayed','end-of-day','unknown')),
  public_display_status text not null default 'unverified'
    check (public_display_status in ('unverified','private-only','public-display-approved')),
  rights_reference text,
  reviewed_at timestamptz,
  reviewed_by text,
  valid_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, venue, instrument_root, delay_class),
  check (
    (public_display_status = 'public-display-approved'
      and delay_class <> 'unknown'
      and nullif(btrim(rights_reference), '') is not null
      and reviewed_at is not null
      and nullif(btrim(reviewed_by), '') is not null)
    or (public_display_status <> 'public-display-approved'
      and reviewed_at is null
      and reviewed_by is null)
  )
);

create index if not exists futures_market_entitlements_lookup_idx
  on public.futures_market_data_entitlements(provider_id, venue, instrument_root, delay_class, valid_until)
  where is_active and public_display_status = 'public-display-approved';

create table if not exists public.futures_market_observations (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  venue text not null,
  instrument_root text not null,
  contract_month text not null check (contract_month ~ '^\d{4}(0[1-9]|1[0-2])$'),
  exchange_instrument_id text not null,
  observation_type text not null check (observation_type in ('bar','daily_volume','open_interest')),
  interval_code text not null check (interval_code in ('1m','5m','15m','30m','1h','1d','publication')),
  observed_at timestamptz not null,
  data_as_of timestamptz not null,
  retrieved_at timestamptz not null default now(),
  open numeric,
  high numeric,
  low numeric,
  close numeric,
  volume numeric check (volume is null or volume >= 0),
  open_interest bigint check (open_interest is null or open_interest >= 0),
  volume_unit text check (volume_unit is null or volume_unit in ('contracts','lots','trades')),
  source_url text not null check (source_url ~ '^https://'),
  source_record_id text not null,
  delay_class text not null default 'unknown' check (delay_class in ('real-time','delayed','end-of-day','unknown')),
  quality_status text not null default 'provider-reported'
    check (quality_status in ('provider-reported','reviewed','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, exchange_instrument_id, contract_month, observation_type, interval_code, observed_at, source_record_id),
  check (
    (observation_type = 'bar'
      and interval_code <> 'publication'
      and open is not null and high is not null and low is not null and close is not null
      and volume is not null and volume_unit is not null and open_interest is null
      and high >= greatest(open, close) and low <= least(open, close) and high >= low)
    or (observation_type = 'daily_volume'
      and interval_code = '1d'
      and open is null and high is null and low is null and close is null
      and volume is not null and volume_unit is not null and open_interest is null)
    or (observation_type = 'open_interest'
      and interval_code = 'publication'
      and open is null and high is null and low is null and close is null
      and volume is null and volume_unit is null and open_interest is not null)
  )
);

create index if not exists futures_market_observations_root_time_idx
  on public.futures_market_observations(instrument_root, observation_type, observed_at desc);
create index if not exists futures_market_observations_contract_time_idx
  on public.futures_market_observations(instrument_root, contract_month, observation_type, observed_at desc);
create index if not exists futures_market_observations_provider_time_idx
  on public.futures_market_observations(provider_id, retrieved_at desc);

alter table public.futures_market_data_entitlements enable row level security;
alter table public.futures_market_observations enable row level security;
revoke all on public.futures_market_data_entitlements from anon, authenticated;
grant all on public.futures_market_data_entitlements to service_role;

create or replace function public.futures_market_display_approved(
  check_provider_id text,
  check_venue text,
  check_instrument_root text,
  check_delay_class text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.futures_market_data_entitlements e
    where e.provider_id = check_provider_id
      and e.venue = check_venue
      and e.instrument_root = check_instrument_root
      and e.delay_class = check_delay_class
      and e.public_display_status = 'public-display-approved'
      and e.is_active
      and e.reviewed_at is not null
      and e.reviewed_by is not null
      and e.rights_reference is not null
      and (e.valid_until is null or e.valid_until > now())
  );
$function$;
revoke all on function public.futures_market_display_approved(text, text, text, text) from public;
grant execute on function public.futures_market_display_approved(text, text, text, text) to anon, authenticated, service_role;

drop policy if exists public_read_approved_futures_market_observations on public.futures_market_observations;
create policy public_read_approved_futures_market_observations
  on public.futures_market_observations
  for select to anon, authenticated
  using (
    quality_status <> 'rejected'
    and public.futures_market_display_approved(provider_id, venue, instrument_root, delay_class)
  );

revoke insert, update, delete on public.futures_market_observations from anon, authenticated;
grant select on public.futures_market_observations to anon, authenticated;
grant all on public.futures_market_observations to service_role;

