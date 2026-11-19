# Part 2 — Complete ICT Academy and Futures Learning Knowledge Base

**Review date:** 19 November 2026. **Repository:** https://github.com/WHIZZ444YT/WHIZZ444-YT-OS. Recheck live source and official references before implementation; this document is not runtime or deployment evidence.

**Goal:** Maintain and complete a source-traceable futures-only curriculum across the current 82 lesson pages (preserving 76 original concept IDs), 10 learning tracks and nine guided tutorials. The 39-page Futures Playbook is an input to trace and verify, not the only authority.

## 1. Learning architecture

Organize the Academy as a prerequisite-based curriculum, not a pile of unrelated glossary cards. Keep existing concept IDs and routes where possible; add metadata and lesson objects rather than replacing stable IDs.

Required top-level tracks:
1. Foundations and futures market mechanics.
2. Market structure and dealing ranges.
3. Liquidity and draw on liquidity.
4. Displacement and imbalances.
5. PD Arrays: FVG, OB, breaker and related zones.
6. Time, sessions and daily/weekly narratives.
7. Entry models and execution checklists.
8. Cross-market futures SMT and confirmation.
9. Futures contract, roll and risk application.
10. Replay, journaling and evidence-based model evaluation.

Every track identifies prerequisites, intended skill level, estimated reading/practice effort (as editorial estimates), and completion criteria. Lessons should be searchable by concept, acronym, instrument, model, timeframe, session, bias direction and evidence label.

## 2. PDF concept inventory to preserve and expand

### Structure and directional context
- Swing high / swing low; dealing range; BOS; MSS; CHoCH terminology distinction.
- Displacement: candle body/wick characteristics, structure close and imbalance left behind.
- HTF bias and draw on liquidity.
- Internal Range Liquidity (IRL) and External Range Liquidity (ERL).

### Liquidity
- Buy-side liquidity (BSL), sell-side liquidity (SSL).
- Equal highs (EQH), equal lows (EQL).
- PDH/PDL, PWH/PWL; prior monthly/yearly levels only if included in future scope and correctly defined.
- Session highs/lows; old swing highs/lows; trendline liquidity and round-number liquidity as convention where applicable.
- Sweep/raid versus accepted breakout/liquidity run.
- Judas Swing and session-open manipulation.
- 20/40/60 trading-day IPDA lookback framing.

### Imbalances and PD Arrays
- Bullish and bearish Fair Value Gap (FVG).
- Consequent Encroachment (CE); wick-versus-close mitigation convention.
- Inversion FVG (IFVG).
- Balanced Price Range (BPR).
- Volume imbalance.
- Higher-timeframe FVG.
- First Presented FVG (FPFVG), labelled convention unless exact source definition is verified.
- Liquidity void.
- Order Block (OB), mean threshold, body-versus-wick definition.
- Breaker block, mitigation block, rejection block and Unicorn overlap.

### Range, Fibonacci and anchors
- Premium, Discount, Equilibrium.
- OTE using 0.62–0.79 / 0.705 reference band and 0.618/0.786 Fibonacci convention distinction.
- NWOG and NDOG; explicitly distinguish these from FVG.
- Midnight / True Day Open, 8:30 ET data open and 9:30 ET cash open.
- CBDR, Asian Range, Flout and standard-deviation projections; explain their original market context and futures-specific caveats.

### Narrative, time and entry
- Power of Three / AMD: Accumulation, Manipulation, Distribution.
- Judas Swing.
- Killzones and Silver Bullet windows.
- Weekly profiles: Classic Tuesday Low/High, Wednesday Low/High, Consolidation Thursday Reversal, Consolidation Midweek Rally, Wednesday Weekly Reversal.
- Entry models: Liquidity Sweep + MSS, Silver Bullet, ICT 2022 Model, Judas + MSS, Unicorn, FVG continuation, IFVG model, FVG + OTE, SMT-assisted setup.
- SMT divergence: NQ/ES/YM, 6E/6B/DX (inverse DX comparison), GC/SI; exact expiry, aligned swing time and event/correlation caveats.

## 3. Lesson-page specification

Every dedicated concept page must include, in this order:

1. Canonical concept name, aliases, acronym and evidence label.
2. Plain-language definition.
3. What question the concept is intended to answer (bias, location, timing, trigger, entry zone, target or risk).
4. Futures-specific context: which contract families use it, session context and known limitations.
5. Prerequisite concepts and timeframe role (HTF context / setup / execution), clearly labelled as framework convention when not an official universal rule.
6. Identification rules stated in testable language.
7. Bullish example and bearish example, both explicitly hypothetical.
8. Chart illustration or annotated replay image with instrument, expiry, timeframe, timezone, data source and sample date.
9. Preconditions and full setup sequence.
10. Entry options and order type assumptions; no live order execution.
11. Stop placement logic and position-sizing link.
12. Targets and partial management, labelled as example rather than promise.
13. Invalidation rules.
14. No-trade conditions and common failure modes.
15. Conflicting definitions and wick-versus-close variants.
16. Related concepts and next lesson.
17. One exact, directly relevant, verified YouTube tutorial for this canonical concept ID. Store official ICT teaching separately from independent/supplemental material. Record the creator/channel identity, exact title, direct video ID/URL, language, concept IDs, source class, optional start/end seconds, verification date and link/embed status.
18. Practice task using chart replay or a supplied hypothetical dataset.
19. Self-review checklist and 3–5 knowledge-check questions with answer rationale.
20. Source notes, author/editor, content version and last reviewed date.

No video may be labelled "Official ICT" because its title or thumbnail looks relevant. Verify uploader/channel and the exact video. A search result or playlist topic link may be labelled "Topic discovery" only.

## 4. Evidence and terminology governance

Retain the PDF's labels and add a source-strength note:
- `SOURCED`: source URL and exact claim are recorded; distinguish primary exchange/regulator from secondary article.
- `CONVENTION`: community practice or synthesis, not a canonical deterministic rule.
- `NO DATA`: independently audited public performance evidence not located.
- `HYPOTHESIS`: a testable proposed interpretation.
- `TESTED`: only when a reproducible test artifact exists, with dataset, dates, costs, rules, sample size and out-of-sample results linked.

Do not convert the PDF's descriptive popularity statements into win-rate claims. Its Reality Check says no audited public statistics establish a best model; Judas examples in spot gold and BTC are not futures proof. Display that warning on Entry Models and contract profiles, not only in a footer.

## 5. Content data model

Extend the existing Academy JSON / build input rather than hardcoding long lesson copy in `scripts/build_academy.py`.

Suggested lesson object:
```json
{
  "id": "stable-existing-id",
  "title": "Fair Value Gap",
  "slug": "fair-value-gap",
  "track": "imbalances-and-pd-arrays",
  "aliases": ["FVG"],
  "level": "intermediate",
  "prerequisites": ["market-structure", "displacement"],
  "purpose": ["entry-zone"],
  "instrument_families": ["equity-index", "metals", "currency-futures"],
  "timeframes": ["1H", "15M", "5M", "1M"],
  "evidence_label": "SOURCED",
  "definitions": [],
  "identification_rules": [],
  "bullish_example": {},
  "bearish_example": {},
  "setup_sequence": [],
  "invalidation": [],
  "failure_modes": [],
  "source_refs": [],
  "video_resources": [{"video_id": "exact-youtube-video-id", "channel_id": "verified-channel-id", "title": "exact verified title", "url": "https://www.youtube.com/watch?v=...", "language": "en", "source_class": "official_ict|independent_supplement", "concept_ids": ["stable-id"], "start_seconds": null, "end_seconds": null, "verified_at": "YYYY-MM-DD", "link_status": "verified|embed_disabled|unavailable"}],
  "practice": {},
  "quiz": [],
  "content_version": 1,
  "reviewed_at": null
}
```

Use JSON Schema validation (or equivalent repository-native validation) to reject missing IDs, malformed URLs, unknown evidence labels, empty source references for sourced claims and broken prerequisite IDs. Preserve the 76 original stable concept IDs and all existing lesson progress references/routes while representing the current 82 lesson pages and 10 tracks. Verify the actual branch data before stating counts.

## 6. Source and video registry

Create or extend one normalized, versioned registry. Required video fields: resource ID, exact title, verified channel ID/name, video ID, direct URL, resource type, canonical concept/model IDs, contract tags where relevant, language, `OFFICIAL_ICT` versus `INDEPENDENT_SUPPLEMENT`, verification status/date/reviewer, optional start/end seconds, last link check, embed permission/status and fallback-link status. A channel home, playlist, search-results page or generic topic query is not a concept's tutorial.

**Coverage gate:** every active Academy lesson page ID (the current target is 82 pages, including 76 original concept IDs) and every Entry Model ID needs at least one exact video that teaches that specific item. A video reused across IDs must include a timestamped segment for each item and be reviewed as directly relevant. Track covered/eligible IDs; require 100% coverage before calling the Academy complete or Part 2 accepted. Any missing, unavailable, ambiguous or unverified mapping remains `VIDEO NEEDED` / `PARTIAL`; do not silently substitute a generic channel link. Official ICT is the original-source preference. TTrades and other independent educators may be used as clearly labelled supplements. The official [ICT site](https://theinnercircletrader.com/) identifies Michael J. Huddleston and links its YouTube study channel ([ICT YouTube](https://www.youtube.com/innercircletrader)); [TTrades' education center](https://ttrades.com/trading-education-center/) is a separate educator/source. Example of a specific supplemental video record to verify at use time: [TTrades — “Market Structure Shift - ICT Concepts”](https://www.youtube.com/watch?v=_94CPMjWi9E). This is a sample, not coverage of all lessons.

Do not imply ICT/TTrades affiliation or endorsement. Further educators are allow-listed only after uploader identity, exact content relevance, futures applicability, language, quality and rights are checked. Do not rank by view count/popularity. Do not download, cache, transcribe, or re-host audiovisual content; link out or embed only through the permitted YouTube player. Provide a direct-link fallback when embedding is unavailable. A curated static registry needs no YouTube API; if dynamic lookup is added, use the official [YouTube Data API](https://developers.google.com/youtube/data/getting-started?hl=en), monitor current quota/terms and do not scrape.

## 7. Visual learning and replay

Use chart images from authorized sources, original diagrams or user-owned screenshots. A chart figure must show symbol, expiry or continuous mapping policy, timeframe, ET/local timezone, session, date range, source/vendor, and whether the data is historical/delayed/live. Never create fake candlestick shapes to illustrate a factual market event. Hypothetical diagrams must say "Illustrative example — not historical market data".

## 8. Build and routes

Inspect and update:
- `scripts/build_academy.py` — generate lesson pages from structured data.
- Existing Academy JSON and `data/` content source — canonical concept definitions.
- `academy/` index and `ict-futures/academy/` existing lesson URLs — route compatibility.
- Existing tutorial workbook data and routes — retain and revise where relevant.
- `scripts/validate.py` — schema, prerequisites, evidence label, source and content version checks.
- `tests/test_build.py` — route generation and lesson count/ID stability.
- Sitemap, search index and Academy navigation.

Do not duplicate all Academy pages in two separate source systems. Establish one canonical content source and generate compatibility pages/indexes.

## 9. Acceptance criteria

- [ ] All 76 original concept IDs and all current 82 lesson pages survive or have a documented, non-breaking migration map; counts match the actual branch.
- [ ] Every PDF concept and glossary term maps to a lesson, glossary entry or explicit out-of-scope reason.
- [ ] Every lesson uses the full page specification and carries provenance.
- [ ] All existing tutorials remain reachable.
- [ ] Every active Academy lesson page ID (including all original concept IDs) and every Entry Model ID has one exact, directly relevant, verified video; coverage report is 100% before Part 2 is complete.
- [ ] Official ICT, TTrades/other independent supplements and any topic-discovery fallback are visibly distinguished; missing videos block completion.
- [ ] Hypothetical examples cannot be mistaken for market history.
- [ ] No model profitability or ranking claim is made without a linked test.
- [ ] Search, prerequisites, related lessons, quiz and completion progress work.
- [ ] Lesson content versioning does not erase existing user progress.
- [ ] Build, schema validation, tests and internal/external link checks pass.

## 10. Part-specific execution prompt

> Review/execute Part 2 only. Audit the current 82 lesson pages (76 original stable IDs), all Entry Model IDs, 10 learning tracks, nine guided tutorials, generated routes, progress sync and the 39-page playbook. Inventory video coverage by stable ID before editing. Map each concept and model to one exact verified YouTube video; prioritize the official ICT channel, and label TTrades/other educators as independent supplements. Require a verified specific video link for 100% of eligible IDs before calling the Academy complete; otherwise report exact uncovered IDs and keep the Part partial. Preserve user progress, add stable source/video schemas and accessibility, preserve SOURCED / CONVENTION / NO DATA distinctions, and never invent best-model performance. Run repo-native checks applicable to changes. Stop after Academy scope; do not implement Strategy Lab or contract-engine logic.

## Standalone handoff context — use this file by itself

**Repository:** https://github.com/WHIZZ444YT/WHIZZ444-YT-OS  
**Product:** Futures Intelligence OS — futures-only markets, ICT futures education, futures news/data, positioning, backtesting, risk and trader workspace.  
**Architecture to inspect and preserve:** static HTML/JavaScript/JSON; Python build at `scripts/build_site.py`; Cloudflare Worker at `cloudflare/src/index.js` with KV; Supabase Postgres/Auth/RLS; Vercel static output `dist/`; GitHub Actions and tests. This is a baseline, not proof each service/credential is currently healthy.

**When this single Part file is the only document supplied:** treat it as the complete request to execute this Part. The user should not need to repeat the repository URL, product purpose or stack. Apply these global rules:
- Execute only the Part named in this file; do not implement another Part.
- Inspect current branch, commit, relevant source, dependencies and runtime first. Actual repo/runtime overrides stale documentation.
- Preserve futures modules, ICT lesson IDs, user data, Auth/RLS, build system and legacy backups. Do not blindly delete/rewrite.
- Futures-only includes CME/ICE listed futures, including currency futures and CME Bitcoin futures. Exclude unrelated equities, generic spot crypto, generic FX/CFD, prediction markets and other non-futures product areas only after dependency audit.
- Never invent prices, volume/OI, specs, expiry, schedules, prop rules, provider capability, licences, API limits or strategy performance.
- Separate real-time, delayed, historical, weekly, cached and unavailable data; display source, frequency and timestamps.
- Keep secrets out of Git/browser; use platform secret stores. Make DB migrations additive; preserve production data. No destructive action without approval.
- Edit canonical source/builders, not generated `dist/`. Use a focused feature branch and reviewable PR, not direct destructive pushes to main.
- Run build, unit tests, structural/security validator and internal-link audit where applicable; add tests and report commands that could not run.
- Verify changed routes/API states, mobile/accessibility, provider freshness/licensing, or RLS according to the Part.
- Complete unblocked work; missing credentials/licenses remain explicitly `NOT CONFIGURED`.
- Never claim a test, deployment or completion without observed evidence.

**Execution:** Read this file fully, inspect the repository and execute only the named Part. Return changed paths, test commands/results, branch/commit/PR, blockers and acceptance checklist. Stop after this Part.
