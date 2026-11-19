# Futures-Only Implementation Roadmap

**Repository:** [WHIZZ444YT/WHIZZ444-YT-OS](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS)  
**Review date:** 19 November 2026  
**Scope:** This folder contains the implementation contract and dated execution reports for the futures-only market-intelligence and ICT education product. A roadmap document alone does not configure a provider, grant a license or prove a production deployment.

## Read this first

1. [Project charter and global execution rules](00-PROJECT-CHARTER-AND-EXECUTION-RULES.md)
2. [Part 0 — Baseline audit and scope cleanup](01-PART-0-BASELINE-AUDIT-AND-SCOPE-CLEANUP.md)
   - [Part 0 execution report — 19 November 2026](15-PART-0-EXECUTION-REPORT-2026-11-19.md)
3. [Part 1 — Premium UI and information architecture](02-PART-1-PREMIUM-UI-AND-INFORMATION-ARCHITECTURE.md)
   - [Part 1 execution report — 19 November 2026](16-PART-1-EXECUTION-REPORT-2026-11-19.md)
4. [Part 2 — Complete ICT Academy](03-PART-2-COMPLETE-ICT-ACADEMY.md)
   - [Part 2 execution report — 19 November 2026](17-PART-2-EXECUTION-REPORT-2026-11-19.md)
5. [Part 3 — Futures contract intelligence](04-PART-3-FUTURES-CONTRACT-INTELLIGENCE.md)
   - [Part 3 execution report — 19 November 2026](18-PART-3-EXECUTION-REPORT-2026-11-19.md)
6. [Part 4 — Session engine and economic calendar](05-PART-4-SESSION-ENGINE-AND-ECONOMIC-CALENDAR.md)
   - [Part 4 execution report — 19 November 2026](19-PART-4-EXECUTION-REPORT-2026-11-19.md)
7. [Part 5 — Futures news and data gateway](06-PART-5-FUTURES-NEWS-AND-DATA-GATEWAY.md)
   - [Part 5 execution report — 19 November 2026](20-PART-5-EXECUTION-REPORT-2026-11-19.md)
8. [Part 6 — Volume, open interest and COT](07-PART-6-VOLUME-OPEN-INTEREST-AND-COT.md)
   - [Part 6 execution report — 19 November 2026](21-PART-6-EXECUTION-REPORT-2026-11-19.md)
9. [Part 7 — Strategy Lab and ICT backtesting](08-PART-7-STRATEGY-LAB-AND-ICT-BACKTESTING.md)
10. [Part 8 — Risk and prop-firm intelligence](09-PART-8-RISK-AND-PROP-FIRM-INTELLIGENCE.md)
11. [Part 9 — Journal and private workspace](10-PART-9-JOURNAL-AND-PRIVATE-WORKSPACE.md)
12. [Production QA, security and release runbook](11-PRODUCTION-QA-SECURITY-AND-RELEASE.md)
13. [Provider register, data contracts and licensing](12-DATA-PROVIDER-REGISTER-AND-LICENSING.md)
14. [ChatGPT / Claude / GitHub execution protocol](13-CHATGPT-EXECUTION-PROMPTS-AND-HANDOFF.md)
15. [PDF-to-product traceability map](14-PDF-TO-PRODUCT-TRACEABILITY.md)
16. [Historical Part 0 route map](PART-0-BASELINE-AUDIT-AND-ROUTE-MAP.md)
17. [Current production implementation and site audit — 19 November 2026](26-PRODUCTION-IMPLEMENTATION-AND-SITE-AUDIT-2026-11-19.md)

## Product boundary

The active product is for exchange-traded futures and futures-specific learning/research: CME/CBOT/COMEX/NYMEX/ICE instruments, equity-index, metals, energy, currency and Treasury futures, plus CME Bitcoin futures. Spot/cash series may appear as clearly labelled context only. Generic equities, spot crypto, FX/CFDs, prediction markets and unrelated personal-finance areas are outside the active product. Preserve useful historical source material until its dependencies and user-data impact are reviewed.

Use **ICT** (Inner Circle Trader) consistently for the curriculum terminology. The roadmap preserves and expands the existing product; it does not treat any framework or entry model as a proven edge.

## Current repository snapshot — source evidence only

The main branch source reviewed on 19 November 2026 describes:
- A static HTML/CSS/JavaScript and JSON product built through the Python site builder.
- A futures-only primary navigation with 13 areas: Overview; Futures Markets; ICT Academy; Entry Models; Sessions & Calendar; Futures News; Volume & Open Interest; COT & Positioning; Contract Specs & Expiry; Strategy Lab; Risk & Prop Firms; Journal & Watchlists; Data Health & Sources.
- 15 futures contract families.
- 82 Academy lesson pages while preserving 76 original concept IDs, 10 learning tracks and nine guided tutorials.
- A deterministic OHLC signal backtester and private-workspace foundations.

These are README/builder/validator observations, not proof that CI passed, each route works in a browser, content is complete, Supabase RLS is correct, the deployed site matches main, or any provider is configured/licensed. Inspect the exact branch and run the relevant checks before implementation. The historical route map records an earlier audit and must not be used as a current status report.

## Current implementation status — verified 19 November 2026

The dated production implementation and site audit is the current status source; the older Part 0–9 reports below it capture earlier checkpoints from the same day. On this implementation branch:

- Both additive Supabase migrations are applied to the active project and verified against remote migration history, table columns, RLS, and security/health advisors. Local filenames now match production migration versions `20261119125044` and `20261119125110`.
- Cloudflare Worker `2.0.0` is deployed with the configured KV binding and 30-minute Cron; query-string redaction is enabled. Runtime verification reports database, CMS and ingestion-token secrets are not configured. The first live COT probe exceeded Cloudflare's CPU limit; the bounded route was deployed at 13:26:40 UTC and the existing live site's no-search COT request then displayed a fresh TFF futures-only snapshot, position date 10 November 2026, with 780 normalized category rows. Other Worker endpoints and Supabase persistence still need their separate smoke tests.
- The public front-end remains on the last merged `main` source until this branch passes checks, is reviewed and is merged. The current local build regenerates `dist/` from the canonical source.
- Part 0 baseline and parts 1–9 have implementation source, but parts 2–9 and production QA remain **partial** under the charter's evidence rules. Existing implementation does not prove external source completeness, current exchange values or licensed data access.
- Dedicated test accounts are unavailable for signup/session, two-user RLS, attachment, and deletion tests. Account deletion remains disabled; its Edge Function must not be enabled until configured and verified with disposable accounts.

### Requirements still open across the roadmap

- Part 2 exact verified tutorial mappings remain 0/82 Academy lessons and 0/8 Entry Models; channel/search links do not satisfy mapping requirements.
- Part 3 has 15 contract families whose current contract/tick/expiry/first-notice/roll specifications still need official exchange verification.
- Part 4 has IANA/DST session conversion, but official product-hours, holiday, release-calendar and revision feeds are not integrated.
- Part 5 requires provider credentials and rights review for richer collection; Worker provider states are visible, but secrets, Supabase ingestion and licensed futures feeds are not configured.
- Part 6 COT data is weekly aggregate positioning. Daily/intraday exchange volume/OI, reviewed root-to-CFTC market crosswalks, percentile history, and production persistence writes still need evidence and eligible credentials.
- Part 7's OHLC backtester has no automatic detector for the ten candidate ICT models; sealed out-of-sample evidence and full execution-cost/roll realism remain open.
- Part 8 has zero verified prop-firm program records and no verified tick specifications, so sizing remains conditional.
- Part 9 still requires real auth, two-user isolation, attachment/export and deletion workflow tests; deletion stays disabled.
- QA still needs responsive/keyboard and browser error-state review, licensed-data review, current route smoke, and release sign-off. No release tag should be created before the checklist passes.

See the [current implementation and site audit](26-PRODUCTION-IMPLEMENTATION-AND-SITE-AUDIT-2026-11-19.md) for changed files, deployment evidence and the exact next verification steps. The dated Part 0–9 reports above are point-in-time records and are superseded where they conflict with this current report.

## Earlier local execution status — before production follow-through

> The following snapshot predates the production migrations and Worker deployment described in the current audit. Use it as chronology only; it is not the current deployment state.

- Part 0 regression audit is recorded in [its execution report](15-PART-0-EXECUTION-REPORT-2026-11-19.md).
- Part 1 source and build fixes are recorded, but a post-change browser screenshot is still pending because the generated local preview could not be reached.
- Part 2 is **partial**: strict one-to-one verified video coverage is 0/82 Academy lessons and 0/8 Entry Models. The generated register and per-lesson `VIDEO NEEDED` state make the gap explicit.
- Part 3 is **partial**: all 15 contract rows now have an explicit unverified source-set version and consumers share the canonical JSON; no current exchange specifications, expiry/first-notice schedule or roll records have been verified.
- Part 4 is **partial**: ICT windows now use IANA timezone conversion with explicit DST gap/fold handling, and the stale imported calendar is excluded from scheduling/countdown/export. Publisher retrieval, revision history, event actuals and verified CME/ICE product hours remain unavailable.
- Part 5 is **partial**: news API filters/source metadata, provider retry/circuit handling, and a disabled-until-licensed futures-market-data route are built locally. Production Worker/provider verification, real Supabase ingestion evidence, publisher-specific rights review and broader provider coverage remain outstanding.
- Part 6 is **partial**: the local Worker and UI now distinguish official CFTC Legacy/TFF/Disaggregated and futures-only/combined reports, preserve source-native market codes, separate position/retrieval/publication times, and export normalized history. The COT upsert schema and Worker path are local only; live API, production Supabase migration, exact root-symbol crosswalk, COT percentile, daily exchange volume/OI provider and post-change browser screenshot still need evidence.
- Part 7 is **partial**: the backtester now requires exact contract/expiry and dataset/cost provenance, refuses tick-misaligned OHLC and unreviewed input columns, records timestamp gaps and provides additional sample-aware metrics. Ten ICT model rule cards explicitly state that there are no executable detectors. Live data/calendar/cost verification, session/news filtering, spread and roll modeling, additional metrics/baselines, genuinely sealed OOS, RLS runtime verification and browser screenshot remain outstanding. See the [Part 7 execution report](23-PART-7-EXECUTION-REPORT-2026-11-19.md).
- Part 8 is **partial**: a fixed-point, all-in futures sizing calculator now includes fees, spread/slippage and optional daily/max-loss caps. Imported contract specs remain unverified and all results are conditional. A typed prop-firm registry has zero verified program records; Blue Shift 25K remains explicitly unverified. Official contract-source reconciliation, exact account rule simulation, firm terms, RLS verification and browser screenshot remain outstanding. See the [Part 8 execution report](24-PART-8-EXECUTION-REPORT-2026-11-19.md).
- Part 9 is **partial**: private-data export pagination, attachment transfer, richer journal fields, offline lesson-progress retry, manual-alert idempotency and an account-deletion workflow are implemented locally. Live RLS policies were inspected and Supabase security advisors returned no lints, but no two-user runtime test, real auth browser flow or attachment upload/download test was run. The additive schema migration and deletion function are not deployed. See the [Part 9 execution report](25-PART-9-EXECUTION-REPORT-2026-11-19.md).
- Production QA is **not complete**: local build and structural checks are recorded in the Part 9 report, while production migration/function deployment, user-account smoke tests, two-user isolation, final browser/accessibility review and release sign-off remain open. Keep the current preview un-deployed until the migration is applied and deletion endpoint is configured or the account-deletion control is disabled.

### Verified gaps and release dependencies to close

- Imported contract fields remain unverified until checked against current official exchange sources; tick specs must not be inferred from the risk plugin.
- Licensed CME/ICE real-time trades, quotes, order book and public redistribution are not part of the free baseline. CME's June 2026 F&O Website Information update has requirements effective 1 January 2027; any public website path needs current entitlement, approval and terms.
- A consolidated calendar and release-time/revision workflow must be demonstrated against official schedules and provider responses.
- CFTC COT is weekly; it is not intraday volume/OI.
- The site's deterministic Strategy Lab is not evidence that every named ICT detector or verified historical dataset exists.
- The local Codex plugins are authoring tools, not website APIs. Their outputs need explicit integration, provenance, licensing, privacy controls and tests before appearing as hosted data.
- Every active ICT concept and every Entry Model needs its own exact, verified YouTube tutorial link. Part 2 is incomplete until a coverage report proves 100%; official ICT is the original-source preference, while TTrades/other creators must be clearly labelled independent supplements.
- Data Health must reflect observed source status and data-as-of times, never source-code presence or website uptime.

## Build sequence

Work one Part at a time, in order, using the current default branch as the source of truth:

| Step | Part | Result to prove before advancing |
|---|---|---|
| 0 | Baseline audit and scope cleanup | Current route/data inventory, dependencies, legacy disposition and route-map reconciliation |
| 1 | Premium UI and information architecture | Responsive/accessibility audit of existing 13-area shell; close only demonstrated UX gaps |
| 2 | ICT Academy | Preserve 76 original IDs and current 82 pages; verify curriculum/route schema and exact tutorial coverage for every concept/model |
| 3 | Contract intelligence | Versioned official contract registry, expiry/roll mapping and unresolved-field state |
| 4 | Sessions and calendar | DST/holiday/session engine and revision-aware official event schedule |
| 5 | News and data gateway | Server-side provider adapters, source freshness, licensing and safe failure behavior |
| 6 | Volume, open interest and COT | Weekly CFTC and exchange-statistic semantics, provenance and clear separation |
| 7 | Strategy Lab and backtesting | Causal, reproducible rules/data, realistic costs and out-of-sample controls |
| 8 | Risk and prop-firm intelligence | Verified contract inputs and current dated firm rules; conditional outputs where missing |
| 9 | Journal and private workspace | Tenant-isolated auth/RLS, explicit privacy/export/delete behavior |
| QA | Production QA/security/release | All applicable automated and manual evidence, provider/license review and rollback readiness |

QA, data provenance, security, accessibility, source attribution, mobile UX and documentation run throughout rather than being postponed to the last step.

## Definition of done

A Part is complete only when its source-level scope is implemented, existing routes/data/users are preserved or intentionally migrated, repository checks pass, affected routes and failure states are manually checked, data provenance/licensing are visible, security is reviewed and the report links to evidence. Documentation saying a feature exists does not prove runtime behavior or deployment.

## Shared evidence rules

- Never invent quotes, volume/OI, specs, margin, schedules, expiry, prop rules, API capability, price, license permission, model performance or current plugin state.
- Keep SOURCED, CONVENTION, NO DATA, UNVERIFIED, NOT CONFIGURED, STALE and UNAVAILABLE meanings distinct.
- Store event time, publication/release time, retrieval time, data-as-of, timezone, frequency and delay separately.
- Public/open API access does not automatically authorize public market-data redistribution or AI/ML/LLM use.
- Do not scrape exchange sites. Follow provider terms, exchange entitlements and relevant publication policies.
- Don't call local Codex tools integrated with the website. Keep user files/local journal data private unless an explicit consented flow exists.
- Link each Academy concept/Entry Model to an exact video; channel/search links are discovery aids only. Do not download/cache/re-host video content.

## Change and handoff policy

Use a focused branch/PR. Inspect current source and current provider documentation before changing a Part; update canonical source/build inputs rather than generated output. Keep secrets server-side and database migrations additive. Do not reset production data. Report changed files, observed checks, unverified assumptions, license/configuration blockers and remaining acceptance items.
