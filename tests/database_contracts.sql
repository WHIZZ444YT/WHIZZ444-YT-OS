\set ON_ERROR_STOP on
begin;
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (bucket_id text, name text);
create function storage.foldername(text) returns text[] language sql immutable
as $$ select string_to_array($1, '/') $$;

\ir ../supabase/migrations/20261108072919_finance_intelligence_os_initial_schema.sql
\ir ../supabase/migrations/20261108134935_add_economic_observations_and_ingestion_runs.sql
\ir ../supabase/migrations/20261120110000_add_futures_market_observations.sql
\ir ../supabase/migrations/20261127120000_require_futures_display_expiry.sql
\ir ../supabase/migrations/20261126120000_preserve_economic_observation_revisions.sql

create function public.fixture_assert(ok boolean, label text) returns void language plpgsql
as $$ begin if ok is distinct from true then raise exception '%', label; end if; end $$;

set local role service_role;
insert into public.economic_observations
  (provider,dataset_id,series_id,series_name,frequency,observation_date,value,retrieved_at,source_url,raw_payload)
values ('fixture','macro','series','Fixture','daily','2026-11-01',10,'2026-11-02T00:00:00Z','https://provider.example','{"private":true}');
update public.economic_observations set retrieved_at='2026-11-03T00:00:00Z' where provider='fixture';
update public.economic_observations set retrieved_at='2026-11-04T00:00:00Z',value=12 where provider='fixture';
update public.economic_observations set retrieved_at='2026-11-03T00:00:00Z',value=10 where provider='fixture';
update public.economic_observations set retrieved_at='2026-11-04T00:00:00Z',value=12 where provider='fixture';
select public.fixture_assert((select count(*)=1 and min(value)=10 from public.economic_observation_revisions),'revision history');
select public.fixture_assert((select value=12 from public.economic_observations where provider='fixture'),'late retry overwrote latest');
reset role;

insert into public.futures_market_data_entitlements (
  provider_id, venue, instrument_root, delay_class, public_display_status,
  rights_reference, reviewed_at, reviewed_by, is_active, valid_until
) values ('fixture','CME','NQ','end-of-day','public-display-approved','fixture-review',now(),'fixture-owner',true,now()+interval '1 hour');
insert into public.futures_market_observations (
  provider_id, venue, instrument_root, contract_month, exchange_instrument_id,
  observation_type, interval_code, observed_at, data_as_of, volume, volume_unit,
  source_url, source_record_id, delay_class
) values ('fixture','CME','NQ','202612','fixture-nq','daily_volume','1d',now(),now(),24,'contracts',
 'https://provider.example','fixture-observation','end-of-day');
set local role anon;
select public.fixture_assert((select count(*)=1 from public.futures_market_observations),'approved observation hidden');
reset role;
update public.futures_market_data_entitlements set valid_until=null where provider_id='fixture';
set local role anon;
select public.fixture_assert((select count(*)=0 from public.futures_market_observations),'undated entitlement exposed data');
reset role;
update public.futures_market_data_entitlements set valid_until=now() where provider_id='fixture';
set local role anon;
select public.fixture_assert((select count(*)=0 from public.futures_market_observations),'expired entitlement exposed data');
reset role;
update public.futures_market_data_entitlements set valid_until=now()+interval '1 hour', is_active=false where provider_id='fixture';
set local role anon;
select public.fixture_assert((select count(*)=0 from public.futures_market_observations),'revoked observation visible');
reset role;

insert into auth.users values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into public.journal_trades(user_id,market_id,side) values
 ('00000000-0000-4000-8000-000000000001','nq','long'),('00000000-0000-4000-8000-000000000002','es','short');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select public.fixture_assert((select array_agg(market_id)=array['nq'] from public.journal_trades),'cross-account data visible');
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select public.fixture_assert((select array_agg(market_id)=array['es'] from public.journal_trades),'second account isolation');
select public.fixture_assert(not has_table_privilege(current_user,'public.ingestion_runs','SELECT'),'ingestion audit exposed');
select public.fixture_assert(not has_table_privilege(current_user,'public.economic_observation_revisions','SELECT'),'revision archive exposed');
select public.fixture_assert(not has_column_privilege(current_user,'public.economic_observations','raw_payload','SELECT'),'raw payload exposed');
reset role;
\ir ../supabase/migrations/20261126130000_gate_direct_fred_reads.sql
insert into public.economic_observations
  (provider,dataset_id,series_id,series_name,frequency,observation_date,value,source_url)
values ('fred','fred:series_observations','DFF','Fixture','daily','2026-11-01',1,'https://fred.stlouisfed.org/');
set local role anon;
select public.fixture_assert((select count(provider)=0 from public.economic_observations where provider='fred'),'direct FRED reads bypass approval');
select public.fixture_assert((select value=12 from public.economic_observations where provider='fixture'),'public normalized reads lost');
rollback;
