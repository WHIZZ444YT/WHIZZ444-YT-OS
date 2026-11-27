# 21 · Historical data and Strategy Lab

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Describe permitted historical imports for reproducible strategy experiments. Reuse synthetic fixtures and existing import controls; track provenance, rights, calendar, timezone, OHLCV granularity, contract month and continuous roll method. Record input digest, engine version, date split, costs and intrabar assumptions. Keep source barred from public sharing unless grant permits.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. Use the linked sequence and acceptance records for merged implementation evidence and current rollout gates.

## Repository audit evidence and gaps

**Status** — Strategy Lab accepts exact-expiry CSVs for browser research. Record provider and dataset ID, download date, bar-close timestamp timezone, session calendar, timeframe, volume units and a rights reference. Private persistence and derived export each require separate permission. Use the synthetic backtest tests in `tests/test_strategy_backtest.mjs` for reproducible QA. No vendor feed is enabled.

For a release-dependent signal, select point-in-time mode. Supply `signal_available_at` as the latest availability timestamp across that signal’s inputs, with `Z` or UTC offset. A non-flat signal without evidence, or one whose evidence follows the bar close, is rejected. Choose the vintage that existed at the time. The engine checks the supplied timestamps, and provenance remains a user declaration. Continuous roll and release ingestion remain unsupported.

- [`assets/strategy-lab.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/assets/strategy-lab.js)
- [`tests/test_strategy_backtest.mjs`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/tests/test_strategy_backtest.mjs)
- [`supabase/migrations/20261108151112_add_strategy_backtest_runs_and_trades.sql`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/supabase/migrations/20261108151112_add_strategy_backtest_runs_and_trades.sql)

The gap to close is defined by this acceptance condition: Test duplicate bars, point-in-time releases, no future leakage, train/test boundaries, drawdown and deterministic rerun.

## Website behavior and placement

**Routes** — /strategy-lab/

```text
1. Data source
2. provenance/coverage
3. assumptions
4. run and diagnostics
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

| ID / provider | Dataset | Source and endpoint | Access | Decision | Parameters, cadence and response shape |
|---|---|---|---|---|---|
| `cme` · CME Group | Contract specs, holidays, Daily Bulletin, Volume & OI, licensed prices/history | [Official documentation](https://www.cmegroup.com/market-data/license-data.html) · [Endpoint or reference](https://www.cmegroup.com/market-data/daily-bulletin.html) | Reference links; vendor contract for data feed | Reference-only baseline; licensed data excluded until explicit written approval | Link to exchange product pages from active registry. Review 2027 distribution agreement and Bulletin revision. No automated scraping or reuse of Bulletin data assumed. |
| `databento` · Databento | Live/historical futures, venue/schema-specific | [Official documentation](https://databento.com/futures) · [Endpoint or reference](https://databento.com/docs/) | Licensed vendor; no credential requested in baseline | Excluded from free baseline; credits and individual access do not grant website display | If procured later, separate vendor adapter using documented schema and approved delay/venue/audience. |

**Site API** — Existing browser file import and Supabase owner-scoped save; no market data vendor API. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Use existing Worker dispatch and canonical registry for approved data only. Anonymous sources require no owner credential. Run a bounded, redacted sample in preview and cache only if permitted.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — Use existing strategy_backtests/strategy_backtest_trades with account RLS; avoid persisting unauthorized inputs.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.



## Future file changes and implementation sequence

**Dependencies** — [04 · Database and data contracts](../foundation/04-DATABASE-AND-DATA-CONTRACTS.md) · [08 · Volume, OI and market data](../markets/08-VOLUME-OI-AND-MARKET-DATA.md)

**Existing files** — assets/strategy-lab.js, tests/test_strategy_backtest.mjs, supabase/migrations/20261108151112_add_strategy_backtest_runs_and_trades.sql.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Reuse synthetic fixtures and existing import controls; track provenance, rights, calendar, timezone, OHLCV granularity, contract month and continuous roll method. Record input digest, engine version, date split, costs and intrabar assumptions. Keep source barred from public sharing unless grant permits.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Test duplicate bars, point-in-time releases, no future leakage, train/test boundaries, drawdown and deterministic rerun.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [ ] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 21 (Historical data and Strategy Lab) on the existing repository stack and reuse the named source owners. Prioritize describe permitted historical imports for reproducible strategy experiments. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
