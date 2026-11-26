# 16 · Agriculture intelligence

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Offer optional official USDA agriculture research. Start with WASDE, Quick Stats and PSD links. Only after owner scope approval and dataset review add selected national production/stocks and PSD history; preserve commodity, marketing year, geographic level and units. Do not add agricultural markets to the trading registry.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Optional scope. Route and USDA configuration are proposed.

- [`scripts/build_site.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/build_site.py)
- [`ict-futures/data/source-directory.json`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/ict-futures/data/source-directory.json)

The gap to close is defined by this acceptance condition: Keep route/nav hidden while disabled. Test suppressed values, same-year revisions and no keys in browser.

## Website behavior and placement

**Routes** — /macro/agriculture/ (optional new)

```text
1. Report links
2. commodity and marketing year
3. optional source charts
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

| ID / provider | Dataset | Source and endpoint | Access | Decision | Parameters, cadence and response shape |
|---|---|---|---|---|---|
| `usda-nass` · USDA NASS | Quick Stats crop production and stocks | [Official documentation](https://quickstats.nass.usda.gov/api) · [Endpoint or reference](https://quickstats.nass.usda.gov/api/api_GET/) | Conditional registered GET with proposed USDA_NASS_API_KEY | Optional scope and per-dataset terms approval | Use get_counts before api_GET; segment by commodity/year/statistic and geographic level; data[].Value, unit_desc, reference_period_desc. Verify suppression codes and row cap in official docs. |
| `usda-fas` · USDA FAS | Production, Supply and Distribution (PSD); WASDE remains separate publication | [Official documentation](https://apps.fas.usda.gov/opendata/) · [Endpoint or reference](https://apps.fas.usda.gov/opendata/) | Conditional API key from api.data.gov, proposed USDA_FAS_API_KEY; verify current gateway/header | Optional scope and dataset rights review; WASDE reference link | Verify current OpenAPI operation and commodity/market-year keys first. No guessed production base URL. Track marketing year and revision coverage. |

**Site API** — No API in reference mode; proposed usda-nass/usda-fas economic slugs after approval. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Use existing Worker dispatch and canonical registry for approved data only. Anonymous sources require no owner credential. Run a bounded, redacted sample in preview and cache only if permitted.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — None for links. Reuse economic_observations only for explicitly approved datasets.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.



## Future file changes and implementation sequence

**Dependencies** — [01 · Provider registry and licensing](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md) · [04 · Database and data contracts](../foundation/04-DATABASE-AND-DATA-CONTRACTS.md) · [17 · Reports and publications](../research/17-REPORTS-AND-PUBLICATIONS.md)

**Existing files** — scripts/build_site.py, ict-futures/data/source-directory.json.

**Proposed additions** — An optional Agriculture page renderer and USDA adapter only after scope and rights approval.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Start with WASDE, Quick Stats and PSD links. Only after owner scope approval and dataset review add selected national production/stocks and PSD history; preserve commodity, marketing year, geographic level and units. Do not add agricultural markets to the trading registry.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Keep route/nav hidden while disabled. Test suppressed values, same-year revisions and no keys in browser.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [ ] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 16 (Agriculture intelligence) on the existing repository stack and reuse the named source owners. Prioritize offer optional official USDA agriculture research. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
