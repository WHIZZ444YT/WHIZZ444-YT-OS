# 24 · Testing and quality assurance

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Provide measurable evidence across provider fixtures, generated HTML and previews. Run Python and Node suites, structural checks, internal link audit, clean reproduction and standard/cutover parity. Add targeted tests to existing fixture suites for auth, rights, timestamps, limits and UI failures. Keep live network verification isolated from deterministic CI.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Quality Gates publishes `qa-evidence-cutover-0` and `qa-evidence-cutover-1`; Database Contracts publishes `qa-database`. Each JSON artifact records the tested commit, run attempt, command identifiers and outcomes, and live prerequisites this CI did not verify. Browser checks use localhost and intercepted fixtures. Worker bundling runs with `--dry-run`; live smoke remains a separate read-only command.

- [`package.json`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/package.json)
- [`scripts/validate.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/validate.py)
- [`scripts/check_public_ui.mjs`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/check_public_ui.mjs)
- [`tests/`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/tree/e791f37da39209f3ac6c50ebf2f960101f618efb/tests)
- [`.github/workflows/quality.yml`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/.github/workflows/quality.yml)

The gap to close is defined by this acceptance condition: Report machine-readable commands/results and unapplied prerequisites. Test empty/new/authorized/expired states with representative fixtures.

## Website behavior and placement

**Routes** — All affected routes

```text
1. Release evidence
2. route coverage
3. provider smoke
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

Use the dataset decisions in [01 · Provider registry and licensing](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md). This workstream owns platform behavior and adds no upstream dataset.

**Site API** — No new endpoints. Preview/live read-only smoke and fixture-based ingest tests. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Exercise this workstream using existing local and preview tools. No new automated upstream connection is required.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — Use disposable database, synthetic credentials and fixture data.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.

### Command matrix for future build

| Gate | Commands or evidence |
|---|---|
| Static build | `npm run build`, then `npm run validate` with matching SITE_URL |
| Tests | `npm test`, `node --test tests/*.mjs` |
| Link and artifact | `npm run audit:links`, `python3 scripts/check_clean_artifact.py`, release parity per quality workflow |
| Worker | `npm run worker:dry-run`; preview smoke with `npm run smoke:worker -- <worker-url>`; fetch samples with key-free provenance |
| Preview browser | Keyboard and pointer at 320px, 390px, tablet and desktop, light/dark, blocked third-party, offline shell, CORS, stale data and deep links |
| Authorization | Unapproved, approved, expired and revoked fixtures with populated cache; account A/B RLS; malformed YYYYMM and authorized static lifecycle build |

Reuse tests/test_provider_http.mjs, tests/test_worker_news_routes.mjs, tests/test_economic_calendar.mjs, tests/test_cot_contracts.mjs, tests/test_futures_market_observations.mjs and tests/test_contract_lifecycle.py. Include owner credential missing paths and license expiry in live smoke without requesting production secrets.

## Future file changes and implementation sequence

**Dependencies** — [22 · UI, UX and navigation](../platform/22-UI-UX-AND-NAVIGATION.md) · [23 · Security and data compliance](../delivery/23-SECURITY-AND-DATA-COMPLIANCE.md)

**Existing files** — package.json, scripts/validate.py, scripts/check_public_ui.mjs, tests/, .github/workflows/quality.yml.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Run Python and Node suites, structural checks, internal link audit, clean reproduction and standard/cutover parity. Add targeted tests to existing fixture suites for auth, rights, timestamps, limits and UI failures. Keep live network verification isolated from deterministic CI.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Report machine-readable commands/results and unapplied prerequisites. Test empty/new/authorized/expired states with representative fixtures.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [ ] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 24 (Testing and quality assurance) on the existing repository stack and reuse the named source owners. Prioritize provide measurable evidence across provider fixtures, generated HTML and previews. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
