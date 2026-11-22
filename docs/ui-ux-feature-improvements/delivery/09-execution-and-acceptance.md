# 09 · Implementation, QA and release

## Build order

1. Establish baseline for public, preview and cutover mode. Record commit, deployment ID, route manifest and screenshot set. Add keyboard/accessibility checks before changing shared components.
2. Ship shell tokens and shared components with Home/Search first. Obtain both-theme review.
3. Improve Markets/Charts/Sessions, then Research. Confirm scope and provider statuses with fixtures and a live read-only smoke.
4. Improve Learning, then Practice and Media. Verify deep links, practice state and publication evidence with written fallbacks.
5. Improve Strategy/Risk and Account. Validate two-account separation with synthetic data. Run the removal decisions and then the cutover proof.

## Acceptance matrix

| Test | Capture |
|---|---|
| Layout | 320, 360, 390, 768, 1280 and 1440 CSS px, both themes, plus real 200% browser zoom. Save before/after screenshots for Home, Desk, Charts, Sessions, Academy detail, Lab detail and Account entry. |
| Accessibility | Keyboard-only start, focus order/return, sticky header focus, screen-reader landmarks, live states, no-JS/direct fallbacks, reduced motion, text/control contrast and meaningful errors. |
| Route behavior | Manifest comparison and link audit in both modes. Verify old terminal hashes, legacy lesson routes, query state, history, 404 and canonical/robots policy. |
| Data | Provider scoped retries, timezones, partial/stale states, delayed vs live and zero vs missing. Audit evidence fields and permissions as separate gates. |
| Privacy | Auth expiry/sign-out, local/cloud migration, backup restore, second-user read denial, caches and attachment boundaries. |
| Speed | Archive controlled mobile LCP/CLS for Home, Learn, C34 and Charts. Use lab as a regression signal. Track field p75 LCP ≤2.5 s, CLS ≤0.1 and INP ≤200 ms when field data exists. |

Use the existing Python builder, Python and Node test suites, structural validator, internal link and exact watch URL audits, clean-artifact comparison and Chromium workflow. Reference [Web Vitals](https://web.dev/articles/vitals).

## Release decision

Each workstream requires green CI and a reviewed preview. Keep release evidence by PR, route, mode and commit. Staging checks include media playback and chapter/embeds, a real previous-worker upgrade, private records isolation and data-provider smoke. Handle Worker traffic independently. Promote the reviewed SHA only when acceptance is recorded. Keep a prior verified Vercel deployment and the Worker rollback version available. Re-run anonymous smoke and verify the release SHA after deployment.
