# 05 · Learn, Academy and Playbooks

Routes: /ict-lab/learn/, /academy/, /academy/crosswalk/, /ict-lab/playbooks/, /entry-models/ and legacy Academy detail/tutorial paths. Owners: [Lab generator](../../../scripts/build_ict_lab.py), [Academy generator](../../../scripts/build_academy.py), [crosswalk](../../../scripts/ict_crosswalk.py), [Lab UI](../../../assets/ict-public.js).

| Priority | Current evidence | Required improvement |
|---|---|---|
| P1 | The built Learn index contains learning paths, ten module sections, extensions and original sources. Unfiltered content and controls can compete for the first screen. | Start with one suggested path and clear All concepts, Academy extensions and Original sources controls. Group modules below. Give each a title, concept count and next exercise. Keep all URL-restorable filters. |
| P1 | Playbooks contains Lab, Academy and Charter cards, with a separate Entry Models index. Crosswalk already records different relationships. | Give each distinct rule model one editorial owner. Keep Charter as source material and link its corresponding Lab exercises. Where scope is genuinely different, show a comparison. Consolidate duplicate summaries, never IDs or source attribution. |
| P2 | Lesson and Academy templates render different titles, references and next steps. | Standardize sections: objective, rule, chart/text equivalent, valid vs invalid, practice, then sources. Use progressive disclosure for methodological details. Keep one obvious Practice next action and preserve no-JS reading. |

## Build and verify

1. Use the crosswalk as the deduplication key. Preserve C01–C56, P01–P10, 82 Academy lesson routes and nine tutorial routes. Keep playable media records distinct from lesson associations.
2. Add breadcrumbs and readable positioning for long content. On desktop keep reading width around 68–76 characters. Accessible SVG text equivalents and chart tables stay in the document.
3. Test aliases, category filters, reload and Back, long titles, heading navigation, unknown ID behavior and original deep links. Compare C17, C34, C45 and P01 on both themes. Keep C17 worked examples and hidden exercise outcomes separate.
