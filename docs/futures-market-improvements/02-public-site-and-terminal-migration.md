# 02 · Public website and terminal migration

## Placement and URLs

| Current entry | Public destination | Compatibility and terminal behavior |
|---|---|---|
| Home and shared navigation | `/` with Learn, Markets, Research, Tools and Account groups using existing components | Promote ICT Lab under Learn and give each group a readable landing page only where it improves discovery |
| Academy and `/ict-futures/#learning`, `#academy` | `/academy/`, stable Academy lesson and tutorial URLs, Lab Learn track | Keep Academy `.html` legacy paths and progress keys. Keep both terminal anchors as short cards with relevant links |
| Terminal `#playbook` and `/entry-models/` | `/ict-lab/playbooks/` for P01–P10, `/entry-models/` as comparison index for all distinct models | Keep terminal context cards and existing market/context-dependent model links |
| Lab existing query views | `/ict-lab/`, `/ict-lab/learn/`, `/ict-lab/playbooks/`, `/ict-lab/practice/`, `/ict-lab/podcasts/`, `/ict-lab/mentors/` | Map old query `view`, `id` and `q` to canonical pages; an unsupported ID produces a useful browse page |
| Lab concepts, models and practice | `/ict-lab/learn/c01/`, `/ict-lab/playbooks/p01/`, `/ict-lab/practice/11/` patterns | Preserve stable C/P IDs and numeric lab IDs. Where an Academy slug already covers the same lesson, render from the shared record and identify one canonical edition |
| Terminal `#markets`, `#market-profile`, `#charts` | `/markets/`, existing `/ict-futures/markets/{id}.html` and a public chart landing page when the tools are extracted | Carry recognized contract, comparison and timeframe context. Keep advanced linked charts and contract switching in terminal |
| Terminal `#sessions`, `#calendar` | `/sessions/` and Practice 12 | Keep contextual session/next-event summary and anchors. Route edit actions to their public or private owner |
| Terminal `#daily-brief`, `#news`, `#positioning`, `#social`, `#sources` | `/futures-intelligence/`, `/news/`, `/research/positioning/`, `/sources/` | Retain contextual source links and a compact market summary where useful. Prefer public research surfaces for full reports |
| Terminal `#risk`, `#journal` | `/risk/`, Practice 15–16, `/account/` | Preserve old anchors, checklist and local journal data. Invite optional account sync through explicit import |
| Strategy Lab | `/strategy-lab/` with Practice 14 guided entry | Use the same execution engine and provide a context link |
| Podcasts and Mentors | Public views linked from Lab and learning navigation | Expose these directly in the public shell and shareable routes |

## Navigation and presentation

Desktop uses the shared sidebar and top bar. Mobile uses the same drawer and a wrapping Lab subnavigation. Use existing light/dark tokens, dark-first preference, skip link, visible focus, heading landmarks, `aria-current`, clear empty/loading states and contained table overflow. Open each tab as a real link. Browser Back should restore view, filters and scroll where practical.

Each detailed page starts with the explanation and what to look for on the chart. Follow with valid/invalid examples and a practice task, then a clearly labeled **Watch** section. Show creator, source role and applicability next to each button. Lazy-load a permitted embed on user intent and always provide direct link fallback. Keep private account and attachment URLs out of the sitemap.

## Migration mechanics

1. Capture existing generated paths, terminal hash targets, legacy risk/tools redirects, bookmarks, query parameters, search aliases, and account/learning data keys before changing templates. Legacy fragments are client-side. Preserve the anchor or provide a client-side compatibility bridge with a visible link.
2. Add stable public pages alongside legacy views. Generate Lab views with the shared shell. Preserve meaningful reading when JavaScript is unavailable; practice widgets can enhance the static instructions.
3. Move content ownership to versioned curriculum and resource records. Academy tracks and Lab modules reference those records with their existing IDs and URLs. Keep separate parts of a concept where the crosswalk marks overlaps as partial.
4. Move global links and search to public destinations, transfer allowlisted query state, and validate redirect/canonical behavior on Vercel. Avoid broad wildcard redirects that capture lessons, asset routes, or anchors.
5. Collapse terminal educational blocks into linked summaries only after their public equivalents pass parity and deep-link tests. Preserve legacy browser data until explicit import and reconciliation succeed.
