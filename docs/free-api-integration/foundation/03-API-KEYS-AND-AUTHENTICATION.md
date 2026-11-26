# 03 · API keys and authentication

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Identify credentials, ownership, provisioning and missing-key states. Owner registers provider accounts and stores Worker secrets. Browser gets only safe origin/project identifiers and status. Keep preview and production scopes independent. Use short-lived CI credentials where existing tooling supports them.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Setup route, environment-scoped public build configuration and safe credential statuses implemented. Real account credentials and activation remain owner-managed.

- [`.env.example`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/.env.example)
- [`docs/ENVIRONMENT.md`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/docs/ENVIRONMENT.md)
- [`cloudflare/wrangler.toml`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/cloudflare/wrangler.toml)
- [`assets/runtime-config.js`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/assets/runtime-config.js)

The gap to close is defined by this acceptance condition: Test missing key, invalid key and successful retrieval with redacted fixtures. An absent optional key has no impact on anonymous providers.

## Website behavior and placement

**Routes** — /data-health/integrations/

```text
1. Provider
2. requirement
3. registration
4. safe setup status
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

Use the dataset decisions in [01 · Provider registry and licensing](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md). This workstream owns platform behavior and adds no upstream dataset.

**Site API** — See the existing Worker gateway map in Doc 02. This foundation workstream adds no public URL unless explicitly specified. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Exercise this workstream using existing local and preview tools. No new automated upstream connection is required.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — Audit and reuse the existing store and role model. Any persistence requires Doc 04 and explicit dataset-level approval.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.

### Credential matrix

| Variable | Status / owner | Location | Validation and missing-key behavior |
|---|---|---|---|
| `BLS_API_KEY` | Existing optional, [BLS registration](https://data.bls.gov/registrationEngine/) | Worker secret | v2 probe, anonymous v1 remains available when absent. |
| `BEA_API_KEY` | Existing registered, [BEA signup](https://apps.bea.gov/API/signup/) | Worker secret | Activated UserID, bounded NIPA probe. Missing shows link and not-configured. |
| `EIA_API_KEY` | Existing registered, [EIA Open Data](https://www.eia.gov/opendata/) | Worker secret | v2 series sample. Missing leaves schedule/reports available. |
| `FRED_API_KEY` | Existing variable, conditional integration, [FRED key](https://fred.stlouisfed.org/docs/api/api_key.html) | Worker secret | Enable after per-series approval only. Missing or unapproved uses references. |
| `CFTC_APP_TOKEN` | Proposed optional [Socrata token](https://dev.socrata.com/docs/app-tokens.html) | Worker secret | Probe via X-App-Token; anonymous where allowed. |
| `USDA_NASS_API_KEY`, `USDA_FAS_API_KEY` | Proposed optional [Quick Stats](https://quickstats.nass.usda.gov/api), [api.data.gov](https://api.data.gov/signup/) | Worker secrets | Only after agriculture approval and exact operation confirmation. |
| `SITE_URL`, `PUBLIC_FINANCE_OS_API_BASE` | Existing public build variables | Vercel environment | Confirm exact production origins, preview isolation and noindex behavior. |
| `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` | Existing public project URL and anon/publishable identifier | Vercel environment | Inspect generated runtime and verify RLS with two accounts. |
| `SUPABASE_URL`, `ALLOWED_ORIGINS` | Existing server config, nonsecret | Worker variables | Exact DB project and frontend origin. No broad wildcard. |
| `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Existing protected preferred key / legacy fallback | Worker secrets | Test server writes and no browser access. Retire fallback only after cutover. |
| `INGEST_TOKEN` | Existing owner-controlled bearer | Worker secret and authorized ingestion client | Missing disables ingest. Invalid returns 401. Never used by a browser. |
| `BUILDER_PUBLIC_API_KEY`, `BUILDER_PAT` | Existing compatibility integration, independent of financial sources | Worker secrets | Validate only existing CMS scope and preserve read-only PAT model. |
| `GH_TOKEN` | release workflow maps built-in github.token | GitHub Actions release step | Uses workflow contents permission. No new persistent token. |

Initial local testing: fill test-only Worker secrets via Wrangler's local secret config, keep it untracked and use fixtures when no test accounts exist. Vercel public build values belong in preview/production scopes. Owner setup uses Cloudflare Dashboard → Workers & Pages → finance-intelligence-os-edge → Settings → Variables and Secrets, or interactive `wrangler secret put NAME --config cloudflare/wrangler.toml` after confirming the target. Provisioning is manual unless separately authorized through protected tooling. No key should appear in output, command history, browser or error payloads. Some upstream APIs require query auth, so redact Worker invocation query strings and never preserve upstream signed URLs. Validate replacement before revoking old credentials, repeat the sanitized status probe, and use incident procedures if compromised. [Wrangler secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

## Implementation record

- Data Health links to the generated `/data-health/integrations/` page. It has public registration links, setup and rotation guidance, and read-only Worker configuration status. It provides no secret input or public mutation endpoint.
- Economic provider status gives current environment configuration precedence over old KV state. A registered provider returning HTTP 401 or 403 is reported as rejected, without forwarding upstream messages or secret values. Successful refresh replaces failure state. BLS key configuration is optional and separate from economic provider state.
- Vercel preview leaves unset Worker and Supabase endpoints disabled. Explicit build inputs are restricted to the three documented public variables. The frontend key override requires a Supabase publishable key. Local and production builds without overrides retain existing defaults. Untracked Worker dev secret files remain environment-scoped.
- Provision secrets and approve any FRED datasets separately. Existing public calendar routes remain independently available.

## Future file changes and implementation sequence

**Dependencies** — [01 · Provider registry and licensing](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md) · [02 · Data architecture and API gateway](../foundation/02-DATA-ARCHITECTURE-AND-API-GATEWAY.md)

**Existing files** — .env.example, docs/ENVIRONMENT.md, cloudflare/wrangler.toml, assets/runtime-config.js.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Owner registers provider accounts and stores Worker secrets. Browser gets only safe origin/project identifiers and status. Keep preview and production scopes independent. Use short-lived CI credentials where existing tooling supports them.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Test missing key, invalid key and successful retrieval with redacted fixtures. An absent optional key has no impact on anonymous providers.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [x] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 03 (API keys and authentication) on the existing repository stack and reuse the named source owners. Prioritize identify credentials, ownership, provisioning and missing-key states. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
