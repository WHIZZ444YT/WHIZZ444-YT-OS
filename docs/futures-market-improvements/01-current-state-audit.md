# 01 · Current-state audit

## Evidence

- The repository is a Python-generated static site. [The builder](../../scripts/build_site.py) generates the shared-shell pages and Academy, then publishes to `dist/`. It copies `ict-lab/` and `ict-futures/` into the output. [Vercel](../../vercel.json) calls the same builder and enables clean URLs and trailing slashes.
- The main [homepage](../../index.html) already links to Academy, ICT Lab and Entry Models. The [Lab HTML](../../ict-lab/index.html) loads shared CSS but has separate markup and the `os-dark` class. [Lab app.js](../../ict-lab/app.js) renders the five views and reads `view`, `id`, and `q` from query parameters. Its initial HTML relies on scripting for the lesson body.
- The [terminal](../../ict-futures/index.html) contains full learning paths, an Academy list and detail panel, model and concept cards, plus charts, news, sessions, calendar, risk, journal and source blocks. The [terminal playbook data](../../ict-futures/data/ict-playbook.json) contains eight named models. The [Academy source](../../ict-futures/data/ict-academy.json) contains 82 lesson records. The Academy builder preserves those legacy slugs and creates separate lesson pages.
- Vercel returned `READY` for production deployment `dpl_Ex2bhsBHLo8ULT9y96wEnwx7wbeo`, matching GitHub `main` at `2caa35210b71`. Both production aliases appear in its deployment metadata. An anonymous browser spot check rendered the production C34 query deep link with all five tabs, the written explanation, three short textual opening-price examples and a direct YouTube link. Full interaction, layout and media checks remain pending. [Production alias](https://finance-intelligence-os-alpha.vercel.app/) · [Deployment record](https://vercel.com/whizz444yt-7353/finance-intelligence-os/Ex2bhsBHLo8ULT9y96wEnwx7wbeo)
- GitHub shows [PR #25](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/25) and [PR #26](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/26) merged. Use #26's recorded candidate/production split when discussing Worker status. Its merge alone is evidence of a repository change.
- Targeted GitHub searches for “Azure Lab” and “RStudio” returned no indexed matches. The confirmed terminal is `/ict-futures/` and the confirmed learning product is `/ict-lab/`. Treat the extra names as unresolved references. Check any supplied sibling URL/project or active hosting record before creating redirects, migrating a separate app, or treating RStudio as a dependency.

## Findings and proposed fixes

| Priority | Finding | Implementation disposition |
|---|---|---|
| P1 | Public and terminal both offer Academy entries and model content, with separate labels and data paths | Public Academy and Lab share records and read views. Terminal links directly to full public detail |
| P1 | Lab uses a separate dark shell and JavaScript query routes | Generate public HTML views and details in the existing shell. Keep query-route compatibility |
| P1 | Catalog records exist but lesson examples are primarily text. C34 has three short textual examples but lacks chart-backed exercises with explicit conventions | Author annotated NQ/ES educational fixtures with metadata and review questions |
| P1 | The 82-record video registry exists but renderers also construct links and infer metadata independently | One video ID record, per-lesson placements, explicit check evidence |
| P1 | Lab sizing and generic backtest demos overlap dedicated tools | Reuse existing math and backtest engine and expose a public guided flow |
| P2 | Replay uses short deterministic samples, and planner, replay and journal records are largely browser-local | Make save behavior explicit, expand fixtures, preserve local data, add authenticated sync only after ownership tests |
| P2 | A no-trade journal action can still require a model, and some practice output contains replacement characters | Allow null model on no-trade, retain legacy entries and add UTF-8/render tests |
| P2 | Generic search links in terminal are useful for discovery | Retain as labeled discovery links where relevant. Use exact video IDs on lessons |
| P2 | Accessibility and generated-route checks do not establish end-to-end Lab coverage | Add media, no-JS, keyboard, dynamic compatibility, mobile and deployed deep-link checks |

## Existing source coverage

PR #25 reports exact-item mappings for 51 of 82 Academy lessons and four of eight Entry Models. The Academy source also contains 51 concepts with a verified curriculum video record. Those checks provide source mapping evidence. Playback, geographic access, consent and embed behavior need their own observations. See the [crosswalk](04-academy-and-entry-model-crosswalk.md) for specific gaps.
