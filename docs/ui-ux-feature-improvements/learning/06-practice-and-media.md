# 06 · Practice, podcasts, mentors and resources

Routes: /ict-lab/practice/, /ict-lab/podcasts/, /ict-lab/mentors/ and /ict-lab/resources/. Owners: [practice](../../../ict-lab/practice.js), [Lab generator](../../../scripts/build_ict_lab.py), [catalog](../../../ict-lab/catalog.json), [public gap register](../../../scripts/ict_gap_register.py).

| Priority | Current evidence | Required improvement |
|---|---|---|
| P1 | Practice covers six different task shapes, from annotations to replay and journal entry. Handoff between tasks and local persistence use different affordances. | Share instructions, required input, status, result and next action layout. Clearly label unsaved, saved locally, carry-over and exported state. Keep actual sample information and decision boundaries visible. |
| P0 | Replay and journal flows depend on save-before-reveal and private/local record boundaries. | Preserve causal bar gating, never disclose an outcome through a reused fixture, and retain idempotent export/import. No public account data or attachment previews. |
| P1 | The generated resource index included 345 links including navigation. It combines catalog, Academy gaps, original series and discovery. | Add an in-page overview, anchor list and targeted filters for source class, topic and evidence status. Separate primary watch action from chapters and provenance. Keep sections reachable without JS. |
| P2 | Podcasts, mentors and lesson watch cards overlap in source metadata, and current evidence does not support Popular. | Use one source metadata presentation with independently recorded publisher, playback, chapter and embed evidence. Keep 9 episodes, 2 clips, 10 channels, and optional popularity only with comparable dated evidence. |

## Build and verify

- Work from the saved decision and media evidence models. Add a practice progress summary as a browser-local feature only after confirming storage ownership and migration.
- Preserve all 100 supplied URL variants, timestamps and direct-link fallback. Keep third-party embeds off the initial rendering path. Preserve unknown metadata labels and keep candidate status until reviewed.
- Verify keyboard chart alternatives, stale retry, refresh before/after save, cross-device assumptions, unsupported attachment actions and exported sample data. For media, record no-JS access, blocked embed, direct watch, chapter semantics and source date separately.
