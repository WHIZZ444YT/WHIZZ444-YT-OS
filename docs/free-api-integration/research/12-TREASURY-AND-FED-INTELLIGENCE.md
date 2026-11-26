# 12 · Treasury and Fed intelligence

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Display public yields and funding context as dated observations. Reuse funding and Fiscal Data adapters; add bounded daily XML curve parser under existing economic-provider dispatch. Compute 10Y–2Y and 30Y–5Y only with matching curve/date, in bps. Gate NY Fed operations/dealer series separately; link H.4.1.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Existing repository building blocks verified in source. Proposed changes and production verification remain pending.

- [`cloudflare/src/index.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/index.js)
- [`cloudflare/src/economic-providers.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/economic-providers.js)
- [`assets/economic-data.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/assets/economic-data.js)

The gap to close is defined by this acceptance condition: Test missing tenor/date, negative spread, nominal vs real, business-day gaps and revisions.

## Website behavior and placement

**Routes** — /macro/#treasury-rates; /macro/#federal-reserve

```text
1. Daily curve
2. spreads
3. monthly averages
4. SOFR/EFFR and Fed links
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

| ID / provider | Dataset | Source and endpoint | Access | Decision | Parameters, cadence and response shape |
|---|---|---|---|---|---|
| `treasury` · Treasury Fiscal Data | Monthly average interest rates; optional debt to penny | [Official documentation](https://fiscaldata.treasury.gov/api-documentation/) · [Endpoint or reference](https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates) | Anonymous GET | Baseline candidate for attributed observations; dataset notices govern storage/export | fields, filter, sort, page[number], page[size]; data[].record_date and avg_interest_rate_amt. Debt candidate v2/accounting/od/debt_to_penny. Monthly averages and daily debt have different cadence. |
| `treasury-yield` · US Treasury yields | Daily nominal and real par curves | [Official documentation](https://home.treasury.gov/treasury-daily-interest-rate-xml-feed) · [Endpoint or reference](https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=2026) | Anonymous GET Atom XML | Baseline candidate for attributed observations after bounded parser and reuse review | Allowlist daily_treasury_yield_curve and daily_treasury_real_yield_curve; follow documented year parameters per series. Nominal fields NEW_DATE and BC_2YEAR/5YEAR/10YEAR/30YEAR, verify real schema separately. Business-day observations. |
| `nyfed` · New York Fed | SOFR, EFFR, OBFR, TGCR, BGCR; operations and dealer statistics conditional | [Official documentation](https://markets.newyorkfed.org/static/docs/markets-api.html) · [Endpoint or reference](https://markets.newyorkfed.org/api/rates/all/latest.json) | Anonymous GET | Baseline funding display candidate under NY Fed terms; further operations endpoints conditional | Bounded last-N/history per series; repo and reverse-repo operations and primary dealer statistics require separate definitions and contract review. Example refRates[].effectiveDate/percentRate. Publication depends on series. |
| `fed-board` · Federal Reserve Board | FOMC meeting calendar, policy statements, official RSS, H.4.1 | [Official documentation](https://www.federalreserve.gov/feeds/feeds.htm) · [Endpoint or reference](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm) | Anonymous publisher schedule; approved RSS/Atom metadata | Baseline schedule/reference candidate; RSS extract limited to approved fields | Meeting ranges date-only unless official time supplied; RSS dedup by canonical URL/GUID; original releases remain authoritative. |
| `boe` · Bank of England | MPC schedule and decisions | [Official documentation](https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates) · [Endpoint or reference](https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates) | Anonymous supported schedule | Conditional on reuse terms; reference fallback | Date-only unless issuer supplies time; Europe/London; refresh daily when approved. |
| `boc` · Bank of Canada | Policy interest rate schedule | [Official documentation](https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/) · [Endpoint or reference](https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/) | Anonymous source | Conditional on reuse terms; reference fallback | Validate schedule year and source time America/Toronto; refresh daily. |
| `rba` · Reserve Bank of Australia | Board meeting calendar | [Official documentation](https://www.rba.gov.au/schedules-events/board-meeting-schedules.html) · [Endpoint or reference](https://www.rba.gov.au/schedules-events/board-meeting-schedules.html) | Anonymous source | Conditional on reuse terms; reference fallback | Date-only unless issuer supplies time; Australia/Sydney; refresh daily. |

**Site API** — GET /macro/funding, /economic/treasury and /economic/history; proposed provider slug treasury-yield within /economic/{provider}. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Use existing Worker dispatch and canonical registry for approved data only. Anonymous sources require no owner credential. Run a bounded, redacted sample in preview and cache only if permitted.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — Use economic_observations keyed by separate Fed/Treasury datasets and series.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.



## Future file changes and implementation sequence

**Dependencies** — [04 · Database and data contracts](../foundation/04-DATABASE-AND-DATA-CONTRACTS.md) · [09 · Economic calendar](../research/09-ECONOMIC-CALENDAR.md)

**Existing files** — cloudflare/src/index.js, cloudflare/src/economic-providers.js, assets/economic-data.js.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Reuse funding and Fiscal Data adapters; add bounded daily XML curve parser under existing economic-provider dispatch. Compute 10Y–2Y and 30Y–5Y only with matching curve/date, in bps. Gate NY Fed operations/dealer series separately; link H.4.1.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Test missing tenor/date, negative spread, nominal vs real, business-day gaps and revisions.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [ ] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 12 (Treasury and Fed intelligence) on the existing repository stack and reuse the named source owners. Prioritize display public yields and funding context as dated observations. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
