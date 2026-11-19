-- Versioned CFTC COT rows. Keep report family, report variant, position date,
-- provider retrieval time and publisher time distinct. CFTC PRE does not expose
-- a per-row publication timestamp, so published_at intentionally remains NULL.
create table if not exists public.cot_report_observations (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null default 'cftc-pre',
  report_family text not null check (report_family in ('legacy','tff','disaggregated')),
  report_variant text not null check (report_variant in ('futures-only','combined')),
  contract_market_code text not null,
  cftc_market_code text,
  commodity_code text,
  market_name text not null,
  market_and_exchange_names text,
  report_date date not null,
  published_at timestamptz,
  retrieved_at timestamptz not null,
  open_interest bigint,
  trader_category text not null,
  long_contracts bigint,
  short_contracts bigint,
  spreading_contracts bigint,
  net_contracts bigint generated always as (
    case when long_contracts is not null and short_contracts is not null
      then long_contracts - short_contracts else null end
  ) stored,
  unit text not null default 'contracts' check (unit = 'contracts'),
  source_url text not null,
  source_field_mapping jsonb not null default '{}'::jsonb,
  source_fields jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  quality_status text not null default 'source-reported',
  created_at timestamptz not null default now(),
  unique (report_family, report_variant, contract_market_code, report_date, trader_category)
);

create index if not exists cot_report_market_history_idx
  on public.cot_report_observations(report_family, report_variant, contract_market_code, trader_category, report_date desc);
create index if not exists cot_report_date_idx
  on public.cot_report_observations(report_date desc, report_family, report_variant);

alter table public.cot_report_observations enable row level security;
drop policy if exists public_read_cot_report_observations on public.cot_report_observations;
create policy public_read_cot_report_observations
  on public.cot_report_observations for select to anon, authenticated using (true);
revoke insert, update, delete on public.cot_report_observations from anon, authenticated;
grant select on public.cot_report_observations to anon, authenticated;
grant all on public.cot_report_observations to service_role;
