# 13 · Energy intelligence

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Build an EIA-backed energy research page for CL. Add crude ex-SPR, approved production and gas storage panels. Keep weekly inventory observation, report date and calendar slot distinct. Compare levels and changes in native units; label gas as research context with no new futures family. Link EIA and OPEC publishers.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Proposed route. Related source registry/adapters already exist where shown below.

- [`cloudflare/src/economic-providers.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/economic-providers.js)
- [`assets/economic-data.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/assets/economic-data.js)
- [`scripts/build_site.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/build_site.py)

The gap to close is defined by this acceptance condition: Test holiday schedule, no EIA key, withheld values and barrel/BCF distinction. Reports remain readable with JS blocked.

## Website behavior and placement

**Routes** — /macro/energy/ (new)

```text
1. CL context
2. next WPSR
3. stocks and production
4. gas storage
5. reports
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

| ID / provider | Dataset | Source and endpoint | Access | Decision | Parameters, cadence and response shape |
|---|---|---|---|---|---|
| `eia` · EIA | PET.WCESTUS1.W crude stocks excluding SPR; production PET.WCRFPUS2.W and Lower 48 storage via documented metadata to confirm | [Official documentation](https://www.eia.gov/opendata/documentation.php) · [Endpoint or reference](https://api.eia.gov/v2/seriesid/PET.WCESTUS1.W) | Registered GET v2 with existing EIA_API_KEY | Conditional pending owner registration and dataset review; provider terms govern reuse | length/offset/sort bounded; response.data[].period/value/unit; totals can be strings. Weekly with schedule exceptions; bulk alternatives separate from API-key setup. |
| `opec` · OPEC | Monthly Oil Market Report and official releases | [Official documentation](https://www.opec.org/) · [Endpoint or reference](https://www.opec.org/) | Reference link | Reference only until precise report permalink and reuse permissions verified | Curate latest official publication landing page; avoid mirrored PDFs and unauthorized parsing. |

**Site API** — GET /economic/eia, /economic/history and /events/eia. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Use existing Worker dispatch and canonical registry for approved data only. Anonymous sources require no owner credential. Run a bounded, redacted sample in preview and cache only if permitted.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — Extend EIA series within economic_observations when permitted.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.



## Future file changes and implementation sequence

**Dependencies** — [04 · Database and data contracts](../foundation/04-DATABASE-AND-DATA-CONTRACTS.md) · [09 · Economic calendar](../research/09-ECONOMIC-CALENDAR.md)

**Existing files** — cloudflare/src/economic-providers.js, assets/economic-data.js, scripts/build_site.py.

**Proposed additions** — An Energy page renderer and dedicated view asset only if the shared economic renderer cannot express it.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Add crude ex-SPR, approved production and gas storage panels. Keep weekly inventory observation, report date and calendar slot distinct. Compare levels and changes in native units; label gas as research context with no new futures family. Link EIA and OPEC publishers.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Test holiday schedule, no EIA key, withheld values and barrel/BCF distinction. Reports remain readable with JS blocked.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [ ] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 13 (Energy intelligence) on the existing repository stack and reuse the named source owners. Prioritize build an EIA-backed energy research page for CL. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
