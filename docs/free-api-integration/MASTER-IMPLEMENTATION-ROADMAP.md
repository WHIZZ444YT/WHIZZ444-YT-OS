# Master implementation roadmap

[Index and dependencies](README.md) · [Audit baseline](foundation/00-REPOSITORY-AUDIT.md) · [Merged evidence and next steps](delivery/26-IMPLEMENTATION-SEQUENCE.md)

Use the existing Python static generator, Vercel frontend, Cloudflare Worker and KV, Supabase, and GitHub workflow stack. All stages work independently of ChatGPT. Keep the current canonical routes and compatibility links.

| Stage | Execution order | Required exit evidence |
|---|---|---|
| 1. Foundation | 00 → 01 → 02 → 03 → 04 | Current HEAD and route owners pinned; provider decision record; compatible contracts; credential and persistence boundaries tested. |
| 2. Anonymous sources | 09 → 10 baseline → 11 BLS → 12 → 15 | Publisher fixture and safe endpoint snapshot per enabled source, ET/IST time evidence, permission and missing/stale tests. |
| 3. Hosted chart context | 06 → 07 → 05 initial | Verified widget/symbol matrix for previews; charts remain reachable as direct links with JS/frames blocked. |
| 4. Registered sources | 11 BEA/FRED decision → 13 EIA | Owner config documented and validated. BEA/EIA can remain disabled independently; FRED reference-first. |
| 5. Research surfaces | 14 → 17 → 08 → finish 05. Optional 16 follows 17 independently. | Approved routes and official links visible with feature-disabled and no-source outcomes. Exchange observations fail closed. |
| 6. Platform integration | 18 → 19 → 20 → 21 → 22 | Health reflects real last success, cache/rights budget tested, package preserves account, Academy and legacy routes. |
| 7. Production hardening | 23 → 24 → 25 → 26 → 27 | Preview parity, rollback evidence, documented owner signoff and read-only production smoke. |

### Route decisions

Upgrade the existing home, Desk, Markets, Charts, Macro, Sessions, News, COT, Volume & OI, Specs, Data Health, Sources and Strategy Lab. Add Energy at `/macro/energy/`, Global Macro at `/macro/global/`, Reports at `/research/reports/` and Integration Setup at `/data-health/integrations/` as nested destinations. Optional Agriculture lives at `/macro/agriculture/` and is disabled by default. Retain existing `/research/` compatibility and current Academy/workspace entry points.

### Owner handoff

1. Confirm intended hosted environment and free-plan eligibility.
2. Approve exact anonymous datasets and permitted operations from the registry. Keep rights uncertainty at reference-only.
3. Register BEA and EIA if desired. BLS v2 and Socrata are optional. Decide FRED/USDA separately.
4. Configure securely and keep ingest disabled until server and dataset entitlement checks pass.
5. Review preview evidence, including official links, stale data handling, mobile behavior, and documented rollback before production activation.

Zero-cost baseline consists of approved official observations/schedules, permitted news links, authorized hosted widgets and curated publisher links. Exchange quotes and historical bars require independently documented authorization and are excluded by default. Production source availability and per-widget delay were outside the documentary source audit.
