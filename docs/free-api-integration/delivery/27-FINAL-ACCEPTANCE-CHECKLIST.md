# 27 · Final acceptance checklist

[Documentation index](../README.md) · [Master roadmap](../MASTER-IMPLEMENTATION-ROADMAP.md)

## Objective and scope

Close implementation only with evidence and explicit blocked/optional statuses. Compare production route manifest, owner grants, provider samples and mobile checks to this pack. Check old links/Academy/account/risk/workspace, disabled integrations and rollback notes. Record actual data dates and age thresholds.

Out of scope for implementation of this workstream are unrelated product upgrades, additional paid services, unapproved exports, AI inference and trade execution. This file is a future implementation handoff.

## Repository audit evidence and gaps

**Status** — Existing repository building blocks verified in source. Proposed changes and production verification remain pending.

- [`scripts/build_route_manifest.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/build_route_manifest.py)
- [`scripts/check_release_parity.py`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/scripts/check_release_parity.py)
- [`.github/workflows/worker-live-smoke.yml`](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/blob/e791f37da39209f3ac6c50ebf2f960101f618efb/.github/workflows/worker-live-smoke.yml)

The gap to close is defined by this acceptance condition: Sign off each baseline row separately; mark live, staged, optional or blocked with reason and owner action.

## Website behavior and placement

**Routes** — All affected routes

```text
1. Status summary
2. approved routes
3. verified sources
4. release evidence
```

Preserve direct source links and readable empty states. Show a precise status beside the relevant field or section, and link details back to the canonical provider status. Use generated source HTML and existing navigation owners.

## Provider register, endpoints and connection

Use the dataset decisions in [01 · Provider registry and licensing](../foundation/01-PROVIDER-REGISTRY-AND-LICENSING.md). This workstream owns platform behavior and adds no upstream dataset.

**Site API** — No new endpoints. Validate documented public contracts. Listed suffixes refer to the existing `/api/v1` base unless a hosted or static mechanism is stated.

**Automatic procedure** — Exercise this workstream using existing local and preview tools. No new automated upstream connection is required.

**Owner and manual procedure** — Review permissions and exact source first. Where a selected row requires a key, register with the official publisher, configure it as a Worker secret using Doc 03 and verify a safe status in preview. Where link-only or widget-only is selected, verify the official HTTPS destination or generate the authorized embed configuration. Withheld credentials or permissions affect only their relevant dataset.

## Data, refresh and fallback

- **Database impact** — Verify migration parity and applicable RLS on approved environments.
- **Contract** — Use stable provider and dataset IDs, relevant market/series identity, observation/release/retrieval timestamps, unit and source URL. Use null for unknowns. Project only approved public fields. Preserve exact semantics specific to this workstream.
- **Refresh** — Apply Doc 20 budgets and the cadence in provider rows. Static links change by reviewed catalog updates. Widgets follow their hosted update behavior. Preserve last good data only inside authorized validity and age windows.
- **Failure** — Show source link plus specific safe state for not configured, unauthorized, stale, rate limited or unavailable. Preserve unrelated modules. Never convert an empty result to zero values.
- **Licensing/security** — Follow Docs 01 and 23 per dataset. Use allowlisted destinations and bounded parameters, redact secrets and classify display, cache, persist and export separately. Keep costs within the eligible free-plan scope.



## Future file changes and implementation sequence

**Dependencies** — [24 · Testing and quality assurance](../delivery/24-TESTING-AND-QUALITY-ASSURANCE.md) · [25 · Deployment and live verification](../delivery/25-DEPLOYMENT-AND-LIVE-VERIFICATION.md) · [26 · Implementation sequence](../delivery/26-IMPLEMENTATION-SEQUENCE.md)

**Existing files** — scripts/build_route_manifest.py, scripts/check_release_parity.py, .github/workflows/worker-live-smoke.yml.

**Proposed additions** — No mandatory new runtime file. Extend the existing owner; add a narrowly scoped fixture alongside existing tests if needed.

1. Compare current HEAD and affected routes to pinned evidence; run the relevant existing baseline tests and record gaps.
2. Resolve owner actions and source rights first. Document access and use boundaries; use fixtures or reference links until a source passes.
3. Compare production route manifest, owner grants, provider samples and mobile checks to this pack. Check old links/Academy/account/risk/workspace, disabled integrations and rollback notes. Record actual data dates and age thresholds.
4. Wire the proposed view and fallbacks into the existing shell and test that dependencies and unaffected routes still work.

## Tests, acceptance and rollback

- Unit and contract tests cover Sign off each baseline row separately; mark live, staged, optional or blocked with reason and owner action.
- Integration evidence includes a deterministic fixture, rebuild/validation where applicable, and a preview check of the affected UI including mobile, disabled credentials, blocked data and fallback links.
- Disable the affected dataset, route flag or widget first if activation fails, restore last reviewed configuration/static build/Worker version, and invalidate any prohibited cached data. Retain permitted database history and prefer corrective additive migrations.

- [ ] Scope and dependency evidence recorded.
- [ ] Relevant data rights, owner actions and fallback verified per dataset.
- [ ] Target routes and existing compatibility checked.
- [ ] Unit, integration and applicable live preview results reported.
- [ ] Rollback or disable procedure verified.

## Coding-agent prompt

> Read this entire document and its linked dependencies. Inspect and pin current HEAD. Implement only Doc 27 (Final acceptance checklist) on the existing repository stack and reuse the named source owners. Prioritize close implementation only with evidence and explicit blocked/optional statuses. Keep paid and unapproved providers disabled. Run the relevant fixture, structural, integration and UI checks. Fix regressions introduced by this change, then report changed files, fulfilled acceptance criteria, test results, owner configuration and unresolved blockers. Apply the master roadmap's stage gates and preserve existing functionality.
