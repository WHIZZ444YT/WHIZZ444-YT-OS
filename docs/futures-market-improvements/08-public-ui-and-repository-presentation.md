# 08 · Public UI and repository presentation

## Navigation and key screens

| Screen | Information hierarchy and behavior |
|---|---|
| Home | Brand, global search, and two prominent actions: Start learning and Open Futures Desk. Then show resumable learning shortcuts, market/data status with timestamps, and direct tools. Use inline status language where feeds are absent. |
| Global nav | Learn (ICT Lab, Academy, Entry Models), Markets (Futures Desk, Markets, Charts), Research (News, Macro, COT, Volume/OI), Tools (Sessions, Strategy, Risk, Journal practice), Account. Put Learning tabs in a separate local navigation region. Use the existing shared sidebar/top bar on desktop and one drawer on mobile. |
| Lab Learn | Start paths for beginners and active NQ/ES students, alias search, module cards and real links to detail. IDs support lookup and appear as secondary metadata. |
| Lesson and playbook | Heading and definition, what to mark, chart with text equivalent, valid vs invalid scenario or no-trade example, guided question, then ranked Watch links, source attribution and Continue learning. Keep one main column around 68–76 characters per line at desktop. A small in-page outline can sit in a second column on wide screens. |
| Practice | Heading and purpose, controls, chart/sample, save or reveal action, result and optional export. Announce validation and save status in an accessible region. Chart markers have keyboard controls and a textual outline. |
| Podcasts and mentors | Separate full episodes from clips. Cards show concrete teaching topics, channel/host/guest labels and a single primary action. Keep timestamp chapters and direct fallback at each detail. |
| Charts and markets | Shared shell with concentration on the current symbol, interval, session and data status. Use a stacked chart control tray on phone. Offer keyboard alternatives for any pointer-only drawing. |
| News, macro, calendar and data health | Make timestamp type, source, lag, access status and missing data clear. Retain separate fields for source, retrieval and publication. Keep provider errors local to the affected widget. |

## Proposed semantic palette

The existing shell contains several generations of CSS and the Lab has its own hard-coded dark surface. Map components to these semantic tokens in the existing shell. Use default dark and remember the manual selection through the shared theme setting. Treat the palette as a proposal until actual component screenshots and accessibility checks are reviewed.

| Role | Dark | Light |
|---|---|---|
| Canvas | `#0C1420` | `#F5F8FC` |
| Surface | `#152233` | `#FFFFFF` |
| Primary text | `#ECF3FA` | `#122539` |
| Secondary text | `#A9B9CA` | `#475C70` |
| Primary action surface | `#63DCC9` | `#087064` |
| Primary action text | `#09231F` | `#FFFFFF` |
| Inline link | `#9ACBFF` | `#174F86` |
| Interactive outline | `#647B92` | `#62778C` |
| Focus ring | `#FFCC73` | `#744600` |
| Fresh or complete | `#69D8A1` | `#176548` |
| Delayed or partial | `#FFD482` | `#754700` |
| Degraded or invalid | `#FF9DA7` | `#A12339` |

Static sRGB contrast calculations yield 8.01:1 dark and 6.50:1 light for secondary text against the weaker of the proposed canvas and surface pairs. The primary button text/surface pairs are 9.92:1 dark and 5.98:1 light. Interactive outlines against the weaker base pair are 3.66:1 dark and 4.35:1 light. Check hover, disabled, focus and adjacent surfaces manually, especially focus over filled actions. Pair all status colors and chart states with text, icon or line pattern. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## Component and responsive targets

- Use Inter/system sans and tabular numerals for quotes, tick values, dates and stats. Start at 16 px body, 14 px controls and labels, 12–13 px secondary metadata. Use a 4/8 px spacing scale, 8–12 px control/card radii and generous group spacing. Reuse the visual language across lessons and market tools.
- At 360 and 390 px, stack cards and use a compact header with drawer, search and theme. At 768 px, open grids only when card copy fits. At 1280 and 1440 px, constrain text reading width and keep data grids readable. Also test 320 CSS px/reflow and 200% browser zoom.
- Aim for 44 CSS px touch targets for primary controls, visible focus, correct drawer focus return and no hidden focus under sticky navigation. Test contrast at 4.5:1 normal text and 3:1 large text or meaningful control boundaries where required. Keep native form elements and keyboard navigation wherever feasible.
- Respect reduced motion, show equivalent data under charts, and provide a stable loading size. Keep user-initiated video/TradingView embeds off the initial load path. Set explicit dimensions for images and charts. Treat responsive behavior and motion as review items, measured from production-like pages.
- Measure representative Home, Learn, C34 and Charts on a production-like build. Initial performance targets are LCP ≤ 2.5 s, CLS ≤ 0.1 and INP ≤ 200 ms at the 75th percentile when field data exists. Capture a reproducible mobile lab run when field data is unavailable and label it as lab measurement.

## GitHub presentation scope

1. Rework the root README as a short product overview with one real desktop screenshot, a phone-width example, live link, route table, deterministic build/test commands and data availability. Place timestamped deployment history in release docs. Use nonprivate fixtures in screenshots.
2. Add links from README and the older roadmap to this folder in a later documentation/build integration change. Keep the [verified UI](https://finance-intelligence-os-alpha.vercel.app/) and status badge targets on reviewed branches. Add alt text, screenshot dates, and concise package links.
3. Document the source → Python builder → Vercel flow, separate Cloudflare gateway and Supabase ownership controls. Explain which directories are canonical, generated or archive. Confirm each hosting consumer before cleaning tracked output.
4. Keep a dated CHANGELOG and a versioned release checklist. Add compact issue/PR templates for routes, screenshots, keyboard/mobile acceptance, provenance and migration evidence. Document `SITE_URL` and prerequisite feature flags using names and example values only.
