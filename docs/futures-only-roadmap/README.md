# Futures-Only Implementation Roadmap

**Repository:** [WHIZZ444YT/WHIZZ444-YT-OS](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS)  
**Review date:** 19 November 2026  
**Scope:** This folder contains the implementation contract for a futures-only market-intelligence and ICT education product. It changes documentation only; it does not configure a provider, grant a license, change application code, or prove a production deployment.

## Read this first

1. [Project charter and global execution rules](00-PROJECT-CHARTER-AND-EXECUTION-RULES.md)
2. [Part 0 — Baseline audit and scope cleanup](01-PART-0-BASELINE-AUDIT-AND-SCOPE-CLEANUP.md)
3. [Part 1 — Premium UI and information architecture](02-PART-1-PREMIUM-UI-AND-INFORMATION-ARCHITECTURE.md)
4. [Part 2 — Complete ICT Academy](03-PART-2-COMPLETE-ICT-ACADEMY.md)
5. [Part 3 — Futures contract intelligence](04-PART-3-FUTURES-CONTRACT-INTELLIGENCE.md)
6. [Part 4 — Session engine and economic calendar](05-PART-4-SESSION-ENGINE-AND-ECONOMIC-CALENDAR.md)
7. [Part 5 — Futures news and data gateway](06-PART-5-FUTURES-NEWS-AND-DATA-GATEWAY.md)
8. [Part 6 — Volume, open interest and COT](07-PART-6-VOLUME-OPEN-INTEREST-AND-COT.md)
9. [Part 7 — Strategy Lab and ICT backtesting](08-PART-7-STRATEGY-LAB-AND-ICT-BACKTESTING.md)
10. [Part 8 — Risk and prop-firm intelligence](09-PART-8-RISK-AND-PROP-FIRM-INTELLIGENCE.md)
11. [Part 9 — Journal and private workspace](10-PART-9-JOURNAL-AND-PRIVATE-WORKSPACE.md)
12. [Production QA, security and release runbook](11-PRODUCTION-QA-SECURITY-AND-RELEASE.md)
13. [Provider register, data contracts and licensing](12-DATA-PROVIDER-REGISTER-AND-LICENSING.md)
14. [ChatGPT / Claude / GitHub execution protocol](13-CHATGPT-EXECUTION-PROMPTS-AND-HANDOFF.md)
15. [PDF-to-product traceability map](14-PDF-TO-PRODUCT-TRACEABILITY.md)
16. [Historical Part 0 route map](PART-0-BASELINE-AUDIT-AND-ROUTE-MAP.md)

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