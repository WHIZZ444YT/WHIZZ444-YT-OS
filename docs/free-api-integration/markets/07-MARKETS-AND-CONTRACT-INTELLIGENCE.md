# 07 · Markets and contract intelligence

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Maintain the 15-family universe and verified contract lifecycle. Link each card to chart, family-specific research and official specification. Reuse lifecycle snapshot workflow. Validate real calendar YYYYMM, specific product, source evidence and effective period. Fail closed at validThrough for static publication and protect cached delivery against expiry.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Existing repository building blocks verified in source. Proposed changes and production verification remain pending.

- [`ict-futures/data/market-universe.json`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/ict-futures/data/market-universe.json)
- [`scripts/build_site.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/build_site.py)
- [`scripts/import_authorized_contract_lifecycle.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/import_authorized_contract_lifecycle.py)
- [`tests/test_contract_lifecycle.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/tests/test_contract_lifecycle.py)

The gap to close is defined by this acceptance condition: Exercise authorized and unapproved fixtures, 202600/202613, validThrough boundary and correct tick versus point value.

## Website behavior and placement

**Routes** — /markets/; /ict-futures/markets/{id}.html; /contract-specs/

```text
1. Filters
2. market cards
3. source facts
4. authorized contracts or official dates
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

| ID / provider | Dataset | Source and endpoint | Access | Decision | Parameters, cadence and response shape |
|---|---|---|---|---|---|
| `tradingview` · TradingView | Hosted market widgets | [Official documentation](https://www.tradingview.com/widget-docs/faq/data/) · [Endpoint or reference](https://www.tradingview.com/widget/) | Hosted embed; no site API key | Conditional display via provider-generated embed only; exclude extraction, caching, export and analytics reuse | Test exact widget/symbol/venue/timeframe in preview. Label continuous and delay state. Direct links remain available. |
| `cme` · CME Group | Contract specs, holidays, Daily Bulletin, Volume & OI, licensed prices/history | [Official documentation](https://www.cmegroup.com/market-data/license-data.html) · [Endpoint or reference](https://www.cmegroup.com/market-data/daily-bulletin.html) | Reference links; vendor contract for data feed | Reference-only baseline; licensed data excluded until explicit written approval | Link to exchange product pages from active registry. Review 2027 distribution agreement and Bulletin revision. No automated scraping or reuse of Bulletin data assumed. |
| `databento` · Databento | Live/historical futures, venue/schema-specific | [Official documentation](https://databento.com/futures) · [Endpoint or reference](https://databento.com/docs/) | Licensed vendor; no credential requested in baseline | Excluded from free baseline; credits and individual access do not grant website display | If procured later, separate vendor adapter using documented schema and approved delay/venue/audience. |

**Site API** — GET /market-data/status for optional coverage. Lifecycle imports use the existing offline script. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Use existing Worker dispatch and canonical registry for approved data only. Anonymous sources require no owner credential. Run a bounded, redacted sample in preview and cache only if permitted.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — Use existing contract_specs only for approved records. Existing versioned snapshot remains the static input.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.

### Active family mappings

Continuous chart symbols are current registry configuration. Widget support and delay remain preview checks. Listed contract IDs, dates and multiplier metadata must come from exchange evidence and authorized snapshots.

| ID | Exchange | TradingView registry symbol | Official spec |
|---|---|---|---|
| nq | CME | `CME_MINI:NQ1!` | [Contract specs](https://www.cmegroup.com/markets/equities/nasdaq/e-mini-nasdaq-100.contractSpecs.html) |
| es | CME | `CME_MINI:ES1!` | [Contract specs](https://www.cmegroup.com/markets/equities/sp/e-mini-sandp500.contractSpecs.html) |
| gc | COMEX | `COMEX:GC1!` | [Contract specs](https://www.cmegroup.com/markets/metals/precious/gold-futures.contractSpecs.html) |
| 6e | CME | `CME:6E1!` | [Contract specs](https://www.cmegroup.com/markets/fx/g10/euro-fx/specs) |
| 6b | CME | `CME:6B1!` | [Contract specs](https://www.cmegroup.com/markets/fx/g10/british-pound/specs) |
| ym | CBOT | `CBOT_MINI:YM1!` | [Contract specs](https://www.cmegroup.com/markets/equities/dow-jones/e-mini-dow.contractSpecs.html) |
| rty | CME | `CME_MINI:RTY1!` | [Contract specs](https://www.cmegroup.com/markets/equities/russell/e-mini-russell-2000.contractSpecs.html) |
| dx | ICE US | `ICEUS:DX1!` | [Contract specs](https://www.ice.com/products/194/us-dollar-index-futures) |
| zn | CBOT | `CBOT:ZN1!` | [Contract specs](https://www.cmegroup.com/markets/interest-rates/us-treasury/10-year-us-treasury-note/specs) |
| cl | NYMEX | `NYMEX:CL1!` | [Contract specs](https://www.cmegroup.com/markets/energy/crude-oil/light-sweet-crude.contractSpecs.html) |
| 6j | CME | `CME:6J1!` | [Contract specs](https://www.cmegroup.com/markets/fx/g10/japanese-yen/specs) |
| 6a | CME | `CME:6A1!` | [Contract specs](https://www.cmegroup.com/markets/fx/g10/australian-dollar/specs) |
| 6c | CME | `CME:6C1!` | [Contract specs](https://www.cmegroup.com/markets/fx/g10/canadian-dollar/specs) |
| si | COMEX | `COMEX:SI1!` | [Contract specs](https://www.cmegroup.com/markets/metals/precious/silver.contract.html) |
| btc | CME | `CME:BTC1!` | [Contract specs](https://www.cmegroup.com/markets/cryptocurrencies/bitcoin/bitcoin/specs) |

Add [CME trading hours](https://www.cmegroup.com/trading-hours.html), [CME holiday calendar](https://www.cmegroup.com/tools-information/holiday-calendar.html), [CME expiry calendar](https://www.cmegroup.com/tools-information/calendars/expiration-calendar.html), and [ICE DX expiry](https://www.ice.com/products/194/US-Dollar-Index-Futures/expiry) beside the existing schedule/expiry disclosures. Each family profile presents current source date, standard and applicable micro units, currency, multiplier, tick size and tick value; require exact contract-month provenance before dates are promoted.

## Future file changes and implementation sequence

**Dependencies** — [01 · Provider registry and licensing](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md) · [06 · TradingView charts and widgets](../markets/06-TRADINGVIEW-CHARTS-AND-WIDGETS.md)

**Existing files** — ict-futures/data/market-universe.json, scripts/build_site.py, scripts/import_authorized_contract_lifecycle.py, tests/test_contract_lifecycle.py.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Link each card to chart, family-specific research and official specification. Reuse lifecycle snapshot workflow. Validate real calendar YYYYMM, specific product, source evidence and effective period. Fail closed at validThrough for static publication and protect cached delivery against expiry.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Exercise authorized and unapproved fixtures, 202600/202613, validThrough boundary and correct tick versus point value.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [ ] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 07 (Markets and contract intelligence) on the existing repository stack and reuse the named source owners. Prioritize maintain the 15-family universe and verified contract lifecycle. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
