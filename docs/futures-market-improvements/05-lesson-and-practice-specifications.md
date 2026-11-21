# 05 · Lesson and practice specifications

## Lesson and playbook contracts

| Record | Required fields and behavior |
|---|---|
| Module | Stable number, learning goal, ordered lesson IDs, prerequisites, supplied overview tutorial and related practice |
| Concept | Stable C ID, title/aliases, concise definition, observable chart rules, when the label becomes knowable, valid example, invalid look-alike, ranked resources, attribution, related concept/playbook IDs, practice prompt and marking guide |
| Playbook | Stable P ID, instrument and timeframe, session and prerequisites, eligible state, entry trigger, stop/invalidation, target order, skip conditions, expiration, direction-specific examples, and separate valid, invalid and no-trade cases |
| Chart fixture | Sample ID or exact exchange contract, instrument, timestamp and date, timeframe, session, IANA timezone, source, rights or synthetic status, candle-close convention, and numbered evidence callouts with a text/table equivalent |
| Video | Immutable YouTube ID, published title, uploader/channel ID, language, source role, duration when verified, link/embedding state and auditable check date |
| Lesson video placement | Lesson ID, video ID, rank, exact supplied URL and chapter seconds if present, purpose, coverage and CTA text. Maximum three distinct videos on each card |
| Podcast | Program, guest(s), host(s), full episode or clip, topics, approved chapters, related lesson IDs and source video |
| Rule statement | Each meaningful rule carries Original ICT, Creator Interpretation or Lab Rule attribution and a rule version. A source role describes the resource and a rule attribution describes the actual rule |

Resource roles are Original ICT, Creator Explanation, Chart Example, Podcast and Tool Tutorial. Multi-use episodes retain podcast identity and can serve as chart-example placements. Store one canonical video record per YouTube ID. Map C17 to C16/C09, P07 and Lab 13. When a preferred resource is unavailable, keep the writing, chart and practice task visible. Offer an observed direct watch link or a verified alternate.

C34 fixtures use three separate period boundaries chosen under a disclosed session convention. For example, use the first eligible bar of the selected trading day, week and month, each on its own timeline. Show the trading date, ET timestamp and session identifier, including weekend/month boundary cases. C56 compares the midnight and 08:30 ET reference prints on the same selected date. C55 starts from the source lesson's documented anchors and projection convention. Any custom midnight anchor needs its own formula, eligible data window, observable examples and Lab-rule attribution.

## Playbook authoring brief

These are proposed educational fixtures and rule prompts. Review each supplied source before attributing an exact threshold, time window or entry detail to the original creator. Each model must include a source-backed or Lab-defined stop, target, expiry, and examples of each outcome state.

| ID | Setup to demonstrate | Invalid and no-trade checks |
|---|---|---|
| P01 | Mark a liquidity objective, raid, qualifying MSS/displacement and eligible FVG retrace. Record the sweep extreme and first available objective | Reject missing displacement or late retest. Expire at the declared session cutoff |
| P02 | Use the source's clearly labeled time window and a preselected liquidity objective, then show a qualifying gap and entry | Show a qualifying-looking gap outside the window and a flat window with no setup |
| P03 | Establish the selected early range, observe false delivery, then apply the disclosed reversal condition | Reject a move that continues beyond the range or has no corroborating shift |
| P04 | Specify the prior extreme, failed break, reclaim window, stop beyond the excursion and opposite objective | Compare accepted breakout, late reclaim and untouched extreme |
| P05 | Define the meaningful impulse, OTE zone, allowed confirmation, invalidation of the impulse and target | Show a correctly measured retracement with unsuitable market context |
| P06 | Require a qualified breaker and meaningful overlap with an FVG before a retest | Show a breaker adjacent to the FVG without overlap and a missed retest |
| P07 | Mark a qualified close through the selected FVG edge, the retest and invalidation on the opposite side | Show a wick-only breach and a valid inversion with no retest |
| P08 | Stage first-side bearish delivery, supported reversal, then bullish delivery and a separately tagged entry | Reject a reversal label assigned before confirmation or a move without a reachable objective |
| P09 | Stage first-side bullish delivery, supported reversal, then bearish delivery and a separately tagged entry | Include an NQ/ES synthetic sample and segregate the creator's gold example |
| P10 | Extract Charter Model 9 context, objective and eligibility from the core source, then annotate valid, invalid and skipped scenarios from an explicitly dated weekly plan | Use the separate chart review to check timing and invalidate any rule inferred only from the example |

## Six public labs

| ID | User flow | Engine, storage and acceptance |
|---|---|---|
| 11 · Chart annotation | Open an outcome-hidden NQ/ES case, place level/sweep/swing/displacement/FVG marks, submit, then compare with the annotated solution | Tick and bar-index coordinates; zoom-safe anchors; keyboard marker list, undo and reset; rubric grades each mark and explains missing evidence |
| 12 · Session and bias planner | Choose contract, selected date and session, set objective, levels, directional/neutral bias, invalidation, news filter and skip rules, then save a dated plan | Reuse `session-time.js` and public schedule data. Show `America/New_York` and `Asia/Kolkata` from the selected date with next-day rollover. Handle invalid and ambiguous DST inputs and mark issuer/date-only/holiday gaps |
| 13 · Blind replay | Start an NQ/ES series, review only closed bars through the cursor, save Enter, Wait or Skip with reasons, then reveal one more bar | Commit decision and cursor in one write or transaction. Persist dataset/version, bar index, timestamp, action, rationale, known levels and revision. No advance on save failure. Confirm a swing only after the configured right-side bar closes. Keep future candles and marks out of the visible state. Resume by attempt ID and reject stale concurrent saves |
| 14 · Backtest and statistics | Select a versioned rule and an educational or authorized dataset, set costs and execution assumptions, compare development and held-out periods, export manifest and ledger | Reuse `strategy-backtest-engine.mjs`; begin with documented signal input. Add a named ICT detector only after causal fixture tests. Persist exact contract, order timing, stop/target precedence, fees, slippage, dataset hash, rule version and sample windows. Display trade count, net expectancy in R, drawdown and uncertainty. Record zero-trade windows |
| 15 · Futures risk | Pick NQ/MNQ/ES/MES, input entry, stop, budget and costs, see per-contract risk and eligible whole contracts | Reuse `/risk/` fixed-point math and contract registry. Validate side, tick alignment, negative/blank input and stop distance. Cap by configured remaining loss and quantity limits and return zero below one-contract risk. Source each contract's tick and terms and mark outputs conditional while registry evidence is pending |
| 16 · Journal and psychology | Record plan, actual action, before/after charts, review notes and emotion. Include skipped and no-trade sessions | Require one primary playbook for a trade and allow secondary tags. A no-trade journal record can have no playbook or outcome. Grade decision quality, rule adherence and outcome independently. Retain private attachments and use existing account ownership/import/export flows |

## Data and persistence

Start with deterministic, visibly labeled educational samples. Keep separate versioned NQ/ES datasets for annotation and blind replay. For any forex original, identify its instrument and convention and document futures session, tick and instrument changes in a separate adaptation. Authorized history needs provider, exact contract, field provenance, timezone, verification date and rights for its intended access and display. Record missing intervals and holidays without fabricating candles.

Keep terminal keys `ictfos.journal.v1`, `ictfos.checks.v1`, `ictfos.personalEvents.v1`, Academy completion/progress and `ict-lab.practice.v1.*` readable. Use a versioned importer that previews records, derives idempotent origin IDs, validates each entry, logs conflicts for review and keeps old records available during rollback. Never infer realized P&L for no-trade days. Keep cloud import opt-in. Test separate users, local-only behavior, storage quota failure, attachment ownership, export/restore and reconnect retries.

Risk reference sources for future registry verification are [NQ](https://www.cmegroup.com/markets/equities/nasdaq/e-mini-nasdaq-100.contractSpecs.html), [MNQ](https://www.cmegroup.com/markets/equities/nasdaq/micro-e-mini-nasdaq-100.contractSpecs.html), [ES](https://www.cmegroup.com/markets/equities/sp/e-mini-sandp500.contractSpecs.html) and [MES](https://www.cmegroup.com/markets/equities/sp/micro-e-mini-sandp-500.contractSpecs.html). Use effective dates and the exact listed product before publishing a verified registry value.
