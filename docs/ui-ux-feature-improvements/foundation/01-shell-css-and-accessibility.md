# 01 · Shell, CSS and accessibility

Scope covers the main shell, standalone Desk, legacy Academy shell, Lab and terminal compatibility entry. Owners are [shared stylesheet](../../../assets/site-shell.css), [shell behavior](../../../assets/site-shell.js), [page builder](../../../scripts/build_site.py), and specialist CSS in assets/.

| Priority | Finding | Change |
|---|---|---|
| P1 | The shared stylesheet has four root selector matches and 49 font-size:9px declarations in the inspected source. Later token layers coexist with literal values. This makes contrast and scale difficult to predict. | Inventory computed roles for canvas, elevated surface, text, controls, interactive borders, focus, and state colors. Pick one semantic token per role. Map both themes before removing overrides. |
| P1 | The builder wraps standalone screens while Academy documents own a separate template. Navigation, title prominence and padding can drift between surfaces. | Keep one shared header/sidebar contract with a context title, skip link, search and account access. Document page-title vs section-title usage. Adapt legacy templates without breaking filenames. |
| P1 | Drawer code already handles Escape, inert sidebar and focus return. Background keyboard and screen-reader interaction, browser zoom and longer translated labels need measured evidence. | Test focus entry, cycle, close and return with both pointer and keyboard. Ensure background controls cannot receive focus while a modal drawer is open. Preserve fixed desktop navigation and use a visibly labeled mobile control. |
| P2 | Several panel styles compete for visual emphasis. | Use one page introduction, one dominant action and a shared section/card hierarchy. Reserve emphasized panels for actionable status or current task. |

## Execution

1. Capture current computed contrast and screenshots before editing. Reference Home, Academy detail, Lab detail, Charts, Research and Account.
2. Split handwritten CSS into explicit layers or files for tokens, base, layout, components, pages and compatibility. Define the cascade order first. Move rules one component at a time. Existing vanilla JavaScript modules and Python static rendering are suitable. Add a UI dependency only when a measured need survives a plain HTML/CSS implementation.
3. Define body, labels and dense-data scales. Start at 16px body, 14px form labels and 12–13px secondary text. Use tabular numerals for market values. Use grid/flex, fluid widths and logical properties. Avoid hiding critical instructions at narrow widths.
4. Apply a visible focus ring and spacing around sticky controls. Verify text contrast in both themes and meaningful control boundaries against their actual adjacent colors. Keep state words and icons alongside color.

## Acceptance

- Keyboard-only skip, drawer and navigation work at phone and desktop widths. 200% browser zoom and 320 CSS px reflow preserve content and usable controls.
- Use WCAG 2.2 AA for contrast, focus, 24 CSS px minimum target size and applicable exceptions. Aim for 44 px on common mobile controls. Wide data tables may scroll in their own labeled region.
- Record component samples for default, hover, focus, disabled, loading and error in dark and light themes. Track accessibility failures by route.

References: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) · [Focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum).

## Technology and component contracts

- Use semantic HTML for landmarks, heading levels, tables and forms. Let CSS Grid and Flexbox handle layout. Centralize theme, type, spacing and motion through CSS custom properties. Use cascade layers for ownership where compatible with the existing stylesheet ordering.
- Keep the Python builder as the publishing boundary and JavaScript ES modules as the interaction layer. Introduce TypeScript for a new shared state or data module only if it has multiple typed consumers and CI can type-check it. A React or Next.js migration needs a separate decision with measured costs, route compatibility and deployment impact.
- Define shared component contracts for Page header, Section heading, Card, Filter bar, Data state, Table wrapper and Dialog. Specify label, optional supporting text, action priority, error association and focus behavior before styling.
- Maintain density by screen purpose. Use comfortable spacing for learning pages and opt-in data density for tables. Keep important values and statuses visible at the actual target widths. Use text, icon or line pattern to distinguish status and chart series in addition to color.
