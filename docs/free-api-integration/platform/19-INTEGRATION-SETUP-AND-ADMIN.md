# 19 · Integration setup and admin

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Publish safe setup guidance without a browser secret editor. Place under Data Health, list provider registration/key variable/required action, exact Cloudflare location, validation link and anonymous dependencies. Use existing providers endpoint for public status and existing server-side roles for any future private operational page.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — The generated Integration Setup page lists public registration links, placeholder variable names and the Cloudflare dashboard path. Its status request uses `GET /api/v1/providers?view=setup` and reads only fixed provider IDs and setup states. Deploy the updated Worker to the intended environment to enable these statuses. Older Workers show the status-unavailable fallback while the setup instructions remain available.

- [`scripts/build_site.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/build_site.py)
- [`docs/ENVIRONMENT.md`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/docs/ENVIRONMENT.md)
- [`assets/data-health.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/assets/data-health.js)

The gap to close is defined by this acceptance condition: Ensure generated source has placeholders only. Private access errors and provider response bodies remain server-side.

## Website behavior and placement

**Routes** — /data-health/integrations/

```text
1. Connection type
2. setup instructions
3. check safe status
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

Use the [canonical provider and rights register](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md). This workstream applies the relevant provider decisions at the platform layer.

**Site API** — GET /providers?view=setup returns a read-only setup projection. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Use existing Worker dispatch and canonical registry for approved data only. Anonymous sources require no owner credential. Run a bounded, redacted sample in preview and cache only if permitted.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — None for public docs; existing RLS if future admin settings are explicitly approved.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.



## Future file changes and implementation sequence

**Dependencies** — [03 · API keys and authentication](../foundation/03-API-KEYS-AND-AUTHENTICATION.md) · [18 · Data health and source directory](../platform/18-DATA-HEALTH-AND-SOURCE-DIRECTORY.md)

**Existing files** — scripts/build_site.py, docs/ENVIRONMENT.md, assets/data-health.js.

**Proposed additions** — An Integration Setup page renderer. No secret editor or write route.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Place under Data Health, list provider registration/key variable/required action, exact Cloudflare location, validation link and anonymous dependencies. Use existing providers endpoint for public status and existing server-side roles for any future private operational page.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Ensure generated source has placeholders only. Private access errors and provider response bodies remain server-side.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [ ] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 19 (Integration setup and admin) on the existing repository stack and reuse the named source owners. Prioritize publish safe setup guidance without a browser secret editor. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
