# Part 2 — Academy video verification update

**Review date:** 20 November 2026
**Status:** Partial; four exact official video references verified
**Branch:** `codex/futures-roadmap-next-2026-11-20`
**Pull request:** [#22](https://github.com/WHIZZ444YT/WHIZZ444-YT-OS/pull/22)

## Scope and result

The Academy has 82 active lesson pages. Its eight Entry Model pages are included in those 82 pages and are also tracked as a separate coverage gate. The current generated register reports:

| Gate | Covered | Total | Status |
|---|---:|---:|---|
| Academy lesson pages | 4 | 82 | Partial |
| Entry Model pages | 1 | 8 | Partial |

These counts overlap. They do not represent 90 unique pages.

## Verified mappings

| Lesson | Official ICT upload | Exact match in the upload description | Scope |
|---|---|---|---|
| ICT 2022 Model (`ict-2022-model`) | [2022 ICT Mentorship Episode 14](https://www.youtube.com/watch?v=NUdu1n-ML98) | ICT identifies an execution of the Mentorship Model in Nasdaq. | Official execution example; not a complete rulebook or performance evidence. |
| Market Structure Shift (`mss`) | [2022 ICT Mentorship Episode 3](https://www.youtube.com/watch?v=nQfHZ2DEJ8c) | The description names Market Structure Shifts. | Mapped only to MSS; other pages need their own mapping or reviewed segments. |
| Fair Value Gap (`fvg`) | [2022 ICT Mentorship Episode 6](https://www.youtube.com/watch?v=Bkt8B3kLATQ) | The description identifies a deep dive into Fair Value Gap and Market Structure Shifts. | Mapped only to FVG. |
| Order Block (`order-block`) | [2022 ICT Mentorship Episode 22](https://www.youtube.com/watch?v=QKc_i90chVg) | The description names Market Structure and Order Block. | Mapped only to Order Block. |

All four uploads were returned with The Inner Circle Trader as the verified YouTube publisher, and their direct watch pages were checked on 20 November 2026. Each record maps to one page, so no timestamp segment is inferred. Direct-link fallbacks are recorded available. Embed permission and player behavior are `not_checked`; the site links out to YouTube and does not rely on embedded playback.

These official videos are source references for their topics, not a complete rulebook, futures performance study, or proof of an edge.

## Corrections made

The previous registry also associated Episode 14 with the Liquidity Sweep + MSS Model and FVG Continuation Model. Its official description does not specifically substantiate those mappings, so those candidate records were removed from those lesson pages. The verified Episode 3, Episode 6 and Episode 22 records are each assigned to only one lesson; the other concepts named in their descriptions are not counted without a separate item-level review.

The video registry accepts `not_checked` for embed status and permission. This allows the direct-link mapping to be verified without implying that embedding was tested or permitted for this upload.

## Acceptance still open

- Verify exact, directly relevant video references for the other 78 lesson pages.
- Verify mappings for the other seven Entry Model pages; these are part of the 78 uncovered lesson pages.
- For a video shared across several lessons, record a reviewed start and end time for every mapped lesson.
- Preserve publisher identity, exact title/video ID, source class, verification date, reviewer, direct-link health and fallback state for every accepted mapping.
- Keep missing or ambiguous items labelled `VIDEO NEEDED`. Do not call Part 2 complete until both coverage gates reach 100%.

## Verification performed for this update

The repository build generated the coverage register and lesson pages. Python tests cover the one exact mapping, reject shared videos without per-lesson segments, and allow explicit `not_checked` embed fields while requiring a valid direct link. The full site remains a PR preview until review and deployment; this report does not claim production release.
