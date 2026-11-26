# 23 · Security and data compliance

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Enforce data and credential boundaries through normal entry points. Static allowlist host/path and bounded payload parsing; reject redirects to other hosts. Apply narrow CSP for the selected embed. Keep CORS exact and grants server-side. Redact provider keys and raw errors; enforce expiration in DB, gateway and static publication.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Existing repository building blocks verified in source. Proposed changes and production verification remain pending.

- [`cloudflare/src/index.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/index.js)
- [`cloudflare/src/provider-http.mjs`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/provider-http.mjs)
- [`cloudflare/src/futures-observations.mjs`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/src/futures-observations.mjs)
- [`vercel.json`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/vercel.json)

The gap to close is defined by this acceptance condition: Validate deny-by-default grants, origins, secret redaction, MIME/size limits, admin authorization and no public/private cache mixing.

## Website behavior and placement

**Routes** — /data-health/; Worker ingestion

```text
1. Public badge
2. source/availability details
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

Use the dataset decisions in [01 · Provider registry and licensing](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md). This workstream owns platform behavior and adds no upstream dataset.

**Site API** — Use existing protected ingest paths; no public secret management. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Exercise this workstream using existing local and preview tools. No new automated upstream connection is required.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — No new table expected. Audit service-only writes and read entitlement policies.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.



## Future file changes and implementation sequence

**Dependencies** — [01 · Provider registry and licensing](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md) · [02 · Data architecture and API gateway](../foundation/02-DATA-ARCHITECTURE-AND-API-GATEWAY.md) · [03 · API keys and authentication](../foundation/03-API-KEYS-AND-AUTHENTICATION.md) · [04 · Database and data contracts](../foundation/04-DATABASE-AND-DATA-CONTRACTS.md) · [20 · Scheduling, caching and free limits](../platform/20-SCHEDULING-CACHING-AND-FREE-LIMITS.md)

**Existing files** — cloudflare/src/index.js, cloudflare/src/provider-http.mjs, cloudflare/src/futures-observations.mjs, vercel.json.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Static allowlist host/path and bounded payload parsing; reject redirects to other hosts. Apply narrow CSP for the selected embed. Keep CORS exact and grants server-side. Redact provider keys and raw errors; enforce expiration in DB, gateway and static publication.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Validate deny-by-default grants, origins, secret redaction, MIME/size limits, admin authorization and no public/private cache mixing.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [ ] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 23 (Security and data compliance) on the existing repository stack and reuse the named source owners. Prioritize enforce data and credential boundaries through normal entry points. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
