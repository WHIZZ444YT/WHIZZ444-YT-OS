-- P9: add explicit futures identity, risk/review fields and expiry context.
-- Existing rows are retained. Older imported records may remain incomplete.

alter table public.journal_trades
  add column if not exists instrument_family text,
  add column if not exists exchange_contract text,
  add column if not exists expiry_date date,
  add column if not exists timezone text,
  add column if not exists target_price numeric,
  add column if not exists tick_size numeric,
  add column if not exists tick_value_usd numeric,
  add column if not exists contract_size_class text
    check (contract_size_class is null or contract_size_class in ('standard','micro','other')),
  add column if not exists model_id text,
  add column if not exists model_version text,
  add column if not exists session_name text,
  add column if not exists higher_timeframe_bias text,
  add column if not exists liquidity_target text,
  add column if not exists planned_risk_usd numeric,
  add column if not exists rule_adherence boolean,
  add column if not exists news_context text,
  add column if not exists entry_reason text,
  add column if not exists exit_reason text,
  add column if not exists pre_trade_plan text,
  add column if not exists post_trade_review text,
  add column if not exists source_backtest_id uuid,
  add column if not exists schema_version integer not null default 2;

-- A blank fee is different from an affirmed zero fee. Preserve existing values.
alter table public.journal_trades alter column fees drop default;
alter table public.journal_trades alter column fees drop not null;

do $$
begin
  if to_regclass('public.strategy_backtests') is not null and not exists (
    select 1 from pg_constraint
    where conname = 'journal_trades_source_backtest_owner_fk'
      and conrelid = 'public.journal_trades'::regclass
  ) then
    alter table public.journal_trades
      add constraint journal_trades_source_backtest_owner_fk
      foreign key (source_backtest_id, user_id)
      references public.strategy_backtests(id, user_id)
      on delete set null (source_backtest_id);
  end if;
end $$;

alter table public.watchlist_items
  add column if not exists expiry_date date,
  add column if not exists continuous_alias text,
  add column if not exists preferred_session text,
  add column if not exists selected_data_source text,
  add column if not exists is_active boolean,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists display_preferences jsonb not null default '{}'::jsonb;

alter table public.research_notes
  add column if not exists exchange_contract text,
  add column if not exists expiry_date date,
  add column if not exists liquidity_targets jsonb not null default '[]'::jsonb,
  add column if not exists alternative_scenario text,
  add column if not exists session_name text,
  add column if not exists model_id text,
  add column if not exists higher_timeframe_context text,
  add column if not exists confirmations jsonb not null default '[]'::jsonb,
  add column if not exists source_references jsonb not null default '[]'::jsonb,
  add column if not exists review_conclusion text,
  add column if not exists news_context text,
  add column if not exists review_date date;

create index if not exists journal_trades_owner_expiry_idx
  on public.journal_trades(user_id, expiry_date);
create index if not exists watchlist_items_owner_expiry_idx
  on public.watchlist_items(user_id, expiry_date);
create index if not exists research_notes_owner_expiry_idx
  on public.research_notes(user_id, expiry_date);
