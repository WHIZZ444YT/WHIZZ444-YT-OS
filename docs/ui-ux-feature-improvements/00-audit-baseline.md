# 00 · Audit baseline and route inventory

## What was checked

- Repository main and current Vercel production both identify commit [87531c9](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/commit/87531c9fb33da429d72e118e8814bc9603b7a603). Vercel reports [production deployment 7bUuLco](https://vercel.com/whizz444yt-7353/finance-intelligence-os/7bUuLcofqgLUaUPJTsS8hYcmJSLY) as ready.
- The public alias route manifest reported 234 routes and terminal cutover off. The public compatibility URL still renders the standalone terminal in that mode. Public tools are reachable directly.
- Repository analysis covered generated HTML, shared and page styles, route builders, client controllers, storage calls, tests, deployment config, provider boundaries and legacy archives. The local artifact snapshot included 234 HTML pages. Four redirect documents were the only pages with no H1, and the parser found no duplicate IDs. Keep that as a regression baseline. Redirects are an exception to the normal page-title requirement.
- Prior integrated Chromium evidence covered responsive widths and themes. The previous controlled mobile run reported 780–900 ms LCP and CLS 0–0.004 across Home, Learn, C34 and Charts after the chart control layout fix. Refer to the [CI run](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/actions/runs/45035329628) and [evidence artifact](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/actions/runs/45035329628/artifacts/14758979247). Those were lab observations on the integration build.
- HTTP checks verified rendered HTML and deployment metadata. They do not verify computed contrast, actual zoom, media playback, signed-in behavior or provider data availability. Treat those as follow-up measurements.

## Public deployment sample

Requests were made on 22 November 2026 against [the public alias](https://finance-intelligence-os-alpha.vercel.app/). Approximate HTML size below is returned character count before transfer compression, not page weight.

| Route | HTTP | Observation |
|---|---|---|
| /route-manifest.json | 200 | 234 routes. Source SHA matches production. Cutover is off. |
| / | 200 | Futures Command Center |
| /futures-intelligence/ | 200 | Futures Intelligence |
| /charts/ | 200 | Futures charts |
| /sessions/ | 200 | Session engine & economic calendar |
| /ict-lab/learn/ | 200 | Learn ICT |
| /ict-lab/resources/ | 200 | ICT resource index · 137k HTML characters |
| /academy/ | 200 | ICT Futures Academy · 170k HTML characters |
| /risk/ | 200 | Risk & Prop Firms |
| /strategy-lab/ | 200 | Strategy Lab |
| /account/ | 200 | Your private cloud workspace |
| /data-health/ | 200 | Sources & Data Health |
| /ict-futures/ | 200 | Make the futures session, contract and catalyst the centre of your plan. · 434k HTML characters |
| /sitemap.xml | 200 | Account excluded. Sessions also omitted even though its public route responds. Sitemap locations use the configured canonical host. |

## Coverage map

| Family | Ownership and inventory |
|---|---|
| Home, global search and shell | Root HTML, public builders and assets/. Includes nav consistency, result grouping, route discovery and loading states. |
| Markets and research | Desk, listed families, contract specs, charts, sessions/calendar, News, Macro, COT, Volume/OI, Sources, Health and Status. Worker and licensed provider readiness are separate evidence. |
| Education | Lab index and five sections, resource index, Academy, crosswalk and Entry Models. Includes 56 concepts, 10 Lab playbooks, six practice labs, 82 Academy lessons, nine tutorials and Legacy URLs. |
| Personal workspace | Account entry, public practice, Strategy Lab and Risk. Browser-local, authenticated, database and storage boundaries require distinct test accounts and synthetic fixtures. |
| Deployment and compatibility | Vercel, Cloudflare, Supabase, standard/cutover manifest, legacy/hashes, sitemap/robots, tracked static output and older docs. |

## Triage

P0 release risks are privacy, unlicensed data states and service-worker migration. First UI pass should handle shell readability, Home purpose, Charts control stability and keyboard flows. Follow with education and provider information architecture, then advanced tools and cleanup. Legacy paths, record formats and user-facing source provenance are acceptance constraints throughout.

The original [futures improvements roadmap](../futures-market-improvements/README.md) provides the previous implementation and pending editorial evidence.
