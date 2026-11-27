# 14 · Global macro and liquidity

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Compare official global growth, inflation, rates and liquidity. Use ECB reference rate; add approved World Bank indicators with paging and country tags. BIS stays reference-first until selected flow and legal permissions are recorded. IMF stays reference-only until flow authentication and rights verified.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. Use the linked sequence and acceptance records for merged implementation evidence and current rollout gates.

## Repository audit evidence and gaps

**Status** — Global Macro & Liquidity is implemented at `/macro/global/` with labelled official reference and snapshot fallbacks. World Bank series require explicit approval.

- [`cloudflare/src/economic-providers.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/economic-providers.js)
- [`assets/economic-data.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/assets/economic-data.js)
- [`scripts/build_site.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/build_site.py)

The gap to close is defined by this acceptance condition: Test missing countries, off-period observations, EUR/USD interpretation, and no conversion to futures quotes.

## Website behavior and placement

**Routes** — /macro/global/ (new)

```text
1. Country
2. group: growth / prices / rates / liquidity
3. series disclosure
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

| ID / provider | Dataset | Source and endpoint | Access | Decision | Parameters, cadence and response shape |
|---|---|---|---|---|---|
| `ecb` · ECB | EXR D.USD.EUR.SP00.A; monetary aggregates/rates conditional | [Official documentation](https://data.ecb.europa.eu/help/api/overview) · [Endpoint or reference](https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A) | Anonymous GET SDMX CSV or JSON | Baseline for approved ECB-owned series; confirm third-party exclusions and attribution | startPeriod/endPeriod, format=csvdata; TIME_PERIOD/OBS_VALUE. Daily reference only; annual/quarterly/monthly datasets have independent frequencies. |
| `world-bank` · World Bank | GDP NY.GDP.MKTP.CD; growth NY.GDP.MKTP.KD.ZG, CPI FP.CPI.TOTL.ZG, trade NE.TRD.GNFS.ZS, optional debt GC.DOD.TOTL.GD.ZS | [Official documentation](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392) · [Endpoint or reference](https://api.worldbank.org/v2/country/USA/indicator/NY.GDP.MKTP.CD?format=json) | Anonymous GET v2 | Conditional dataset-level reuse review including third-party exceptions; attribute World Bank and original source | date, page, per_page, country/indicator allowlists. Response [paging, observations] with date/value and null gaps. Generally annual with revisions. |
| `bis` · BIS | Global liquidity indicators WS_GLI; verify current agency/version metadata | [Official documentation](https://stats.bis.org/api-doc/v2/) · [Endpoint or reference](https://stats.bis.org/api/v2/dataflow) | Anonymous public SDMX discovery; production query conditional | Reference-first until BIS legal and dataset terms approve display/cache/export | Resolve flow key via metadata then bound periods; parse dimensions, units, counterparty and currency; GLI quarterly, publication lag observed per release. |
| `imf` · IMF | IFS/WEO and global indicators candidate only | [Official documentation](https://data.imf.org/en/Resource-Pages/IMF-API) · [Endpoint or reference](https://data.imf.org/) | Reference-only pending exact SDMX flow, access and rights | No ingestion/cache/export approval in baseline | Use official SDMX 2.1/3.0 discovery when authorized; do not copy obsolete endpoints or infer registration. Record forecast vintage separately from observations. |

**Site API** — GET /economic/ecb and /economic/history; proposed world-bank economic provider slug. BIS/IMF reference links first. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Use existing Worker dispatch and canonical registry for approved data only. Anonymous sources require no owner credential. Run a bounded, redacted sample in preview and cache only if permitted.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — Reuse economic_observations with stable country/region, frequency and dataset ID.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.



## Implementation record

- `/macro/global/` compares United States, India, Germany and Japan in a selected annual WDI period. Missing country/year values are shown as unavailable. Earlier observations do not substitute for a different year.
- The Worker supports four fixed WDI indicators with bounded pagination. Set `WORLD_BANK_APPROVED_INDICATORS` to a comma-separated reviewed subset after confirming original attribution and indicator-specific terms. The default is reference-only. Approved observations use KV snapshots and are excluded from Supabase history pending a separate retention decision. Public reads filter cached rows against current approval.
- ECB EXR daily context is labeled USD per EUR with the publisher's observation date. 6E futures have their own separate Charts link. BIS and IMF remain official links pending flow and rights review. No new accounts, credentials, or deployment are required for the reference links.

## Future file changes and implementation sequence

**Dependencies** — [04 · Database and data contracts](../foundation/04-DATABASE-AND-DATA-CONTRACTS.md) · [12 · Treasury and Fed intelligence](../research/12-TREASURY-AND-FED-INTELLIGENCE.md)

**Existing files** — cloudflare/src/economic-providers.js, assets/economic-data.js, scripts/build_site.py.

**Proposed additions** — A Global Macro page renderer and World Bank adapter module if shared adapters cannot contain it cleanly.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Use ECB reference rate; add approved World Bank indicators with paging and country tags. BIS stays reference-first until selected flow and legal permissions are recorded. IMF stays reference-only until flow authentication and rights verified.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Test missing countries, off-period observations, EUR/USD interpretation, and no conversion to futures quotes.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [x] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 14 (Global macro and liquidity) on the existing repository stack and reuse the named source owners. Prioritize compare official global growth, inflation, rates and liquidity. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
