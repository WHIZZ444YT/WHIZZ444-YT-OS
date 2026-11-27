"""Public futures routes and the compatibility document for terminal bookmarks."""
from html import escape
from urllib.parse import urlencode

from ict_crosswalk import SHARED_CONCEPTS


TERMINAL_ROUTES = {
    "top": "/",
    "dashboard": "/",
    "daily-brief": "/futures-intelligence/#daily-brief",
    "markets": "/markets/",
    "market-profile": "/markets/",
    "charts": "/charts/",
    "learning": "/ict-lab/learn/",
    "academy": "/academy/",
    "sessions": "/sessions/#windows",
    "playbook": "/ict-lab/playbooks/",
    "calendar": "/sessions/#calendar",
    "news": "/news/",
    "social": "/sources/#social-discovery",
    "positioning": "/research/positioning/",
    "risk": "/risk/",
    "journal": "/ict-lab/practice/16/",
    "checklist": "/ict-lab/practice/16/#local-journal",
    "sources": "/sources/",
}


TRADINGVIEW_CHART_PILOT = frozenset({'nq', 'es', 'gc', 'cl'})


def market_options(markets, default=None):
    return "".join(
        f'<option value="{escape(m["id"])}" data-symbol="{escape(m.get("chart", ""))}" data-exchange="{escape(m["exchange"])}" data-preview="{"pilot" if m["id"] in TRADINGVIEW_CHART_PILOT else "link-only"}"{" selected" if m["id"] == default else ""}>'
        f'{escape(m["label"])}</option>' for m in markets
    )


def chart_page(markets):
    markets = [m for m in markets if m.get("chart")]
    nq = next(m for m in markets if m["id"] == "nq")
    options = market_options(markets)
    primary_options = market_options(markets, "nq")
    direct = "https://www.tradingview.com/chart/?" + urlencode({"symbol": nq["chart"], "interval": "15"})
    return f"""<section class="ict-public"><header class="ict-hero"><h1>Futures charts</h1>
<p>Compare contract families at the same interval. Load a pilot preview for NQ, ES, GC or CL, or open the full TradingView chart. Hosted availability and delay can vary by symbol.</p></header>
<form id="public-chart-controls" class="ict-chart-controls" action="/charts/" inert>
<label>Market <select name="market">{primary_options}</select></label>
<label>Comparison <select name="comparison"><option value="">None</option>{options}</select></label>
<label>Interval <select name="interval"><option value="1">1 minute</option><option value="5">5 minutes</option>
<option value="15" selected>15 minutes</option><option value="60">1 hour</option><option value="240">4 hours</option>
<option value="D">Daily</option><option value="W">Weekly</option></select></label>
<button type="submit">Load previews</button></form>
<p id="public-chart-status" role="status">Direct chart links are ready. Load previews to connect to TradingView.</p>
<div class="ict-grid ict-chart-previews">
<article class="ict-card" data-chart-slot><h2>{escape(nq["label"])}</h2>
<p><a href="{escape(direct)}" target="_blank" rel="noopener noreferrer">Open chart on TradingView</a></p><p data-chart-context>Chart provider: TradingView. Delay and listed expiry are unconfirmed.</p><p><a data-chart-profile href="/markets/">Contract profile</a> · <a href="/sessions/">Sessions</a></p><div data-chart-mount></div></article>
<article class="ict-card" data-chart-slot hidden><h2>Comparison chart</h2>
<p><a href="https://www.tradingview.com/markets/futures/" target="_blank" rel="noopener noreferrer">Open comparison on TradingView</a></p><p data-chart-context>Chart provider: TradingView. Delay and listed expiry are unconfirmed.</p><p><a data-chart-profile href="/markets/">Contract profile</a> · <a href="/sessions/">Sessions</a></p><div data-chart-mount></div></article></div>
<noscript><p>Enable JavaScript to change the chart selection. The direct chart link above is available.</p></noscript>
<p>Continuous symbols may contain roll adjustments or gaps. Match listed expiries and bar times when comparing swings. Use the linked lesson to assess SMT manually.</p>
<p><a href="/markets/">Market profiles</a> · <a href="/volume-open-interest/">Volume and open interest</a> · <a href="/ict-lab/learn/c43/">Learn NQ/ES SMT</a></p></section>"""


def overview_ticker(markets, configured_ids, json_script):
    selected = {item.strip() for item in configured_ids.split(',')} - {''}
    if not selected:
        return ''
    if not selected <= TRADINGVIEW_CHART_PILOT:
        raise ValueError('PUBLIC_TRADINGVIEW_TICKER_MARKETS accepts nq, es, gc and cl only.')
    symbols = [{'proName': market['chart'], 'description': market['id'].upper()}
               for market in markets if market['id'] in selected]
    if len(symbols) != len(selected) or any(not item['proName'] for item in symbols):
        raise ValueError('Ticker market is missing a trading symbol.')
    return (f'<section class="os-widget" aria-labelledby="overview-ticker" data-tradingview-tape="{escape(json_script(symbols), quote=True)}">'
            '<h2 id="overview-ticker">Futures ticker tape</h2>'
            '<p>Continuous futures references. TradingView controls availability and delay.</p>'
            '<button class="secondary-button" type="button">Load ticker tape</button><div data-tape-mount></div>'
            '<a href="/charts/">Open Futures Charts</a></section>'
            '<script defer src="/assets/tradingview-widgets.js"></script>')


def bookmarks_page(markets, json_script):
    routes = {"desk": "/futures-intelligence/", **TERMINAL_ROUTES}
    destinations = "".join(
        f'<li id="{escape(label)}"><a href="{escape(path)}">{escape(label.replace("-", " ").title())}</a></li>'
        for label, path in routes.items()
    )
    data = json_script({"routes": routes, "markets": [m["id"] for m in markets]})
    return (f'<section class="content-section"><h1>ICT Futures bookmarks</h1>'
            f'<p>Choose where to continue in the public workspace.</p><ul>{destinations}</ul></section>'
            f'<script id="ict-terminal-routes" type="application/json">{data}</script>')


def daily_brief(markets, json_script):
    profiles = {m["id"]: {key: m[key] for key in ("profile", "drivers", "sessions", "models")} for m in markets}
    return f"""<section class="content-section" id="daily-brief"><h2>Daily futures brief</h2>
<p>Review contract context and available publisher snapshots. Verify schedules at the issuing source.</p>
<form class="ict-chart-controls" hidden>
<label>Contract <select name="market">{market_options(markets)}</select></label>
<label>Horizon <select name="horizon"><option value="1">Today in New York</option><option value="7" selected>7 calendar days</option><option value="30">30 calendar days</option></select></label>
<button class="primary-button" type="submit">Load snapshots</button>
<button class="secondary-button" type="button" data-export-brief>Export local research plan</button>
</form>
<p role="status">Snapshot status appears when the brief loads.</p>
<p><a data-brief-chart href="/charts/">Charts</a> · <a data-brief-profile href="/markets/">Contract profile</a> · <a href="/data-health/">Data Health</a></p>
<div class="card-grid"><article><h3>Contract context</h3><p data-brief-context>Read the <a href="/markets/">contract profiles</a>.</p></article>
<article><h3>Matched headlines</h3><ul data-brief-news><li><a href="/news/">Browse futures news</a></li></ul><p><a href="/news/">Open full news</a> · <a href="/news/#official-releases">Official releases</a></p></article>
<article><h3>Publisher events</h3><ul data-brief-events><li><a href="/sessions/#calendar">Check official schedules</a></li></ul><p><a href="/sessions/#calendar">Open full calendar</a></p></article>
<article><h3>Funding rates</h3><p data-brief-funding>Funding snapshot has not been loaded.</p><a href="/macro/">Open Macro</a></article>
<article><h3>COT positioning</h3><p data-brief-cot>Positioning snapshot has not been loaded.</p><a href="/research/positioning/">Open COT &amp; Positioning</a></article></div>
<h3>Preparation checklist</h3><ul><li>Mark previous day, week and relevant session levels.</li><li>Check official release calendars and active contract expiry.</li><li>Record the conditions that would invalidate or cancel a setup.</li></ul>
<script type="application/json">{json_script(profiles)}</script></section>"""


def session_heatmap(markets):
    labels = list(next(m["heat"] for m in markets if m.get("heat")))
    headers = "".join(f'<th scope="col">{escape(label)}</th>' for label in labels)
    rows = "".join(
        f'<tr><th scope="row"><a href="/ict-futures/markets/{escape(m["id"])}.html">{escape(m["id"].upper())}</a></th>'
        + "".join(f'<td>{escape(m.get("heat", {}).get(label, "—"))}</td>' for label in labels)
        + "</tr>" for m in markets
    )
    return ('<section class="content-section"><h2>Contract session fit</h2>'
            '<p>High, medium, low and avoid describe qualitative ICT playbook conventions. '
            'A dash means the playbook supplies no rating.</p>'
            f'<div class="table-wrap"><table><thead><tr><th scope="col">Contract</th>{headers}</tr></thead>'
            f'<tbody>{rows}</tbody></table></div></section>')


def personal_reminders(markets):
    return f"""<section class="content-section" id="personal-reminders"><h2>Personal reminders</h2>
<p>Reminders are saved on this device and kept separate from issuer schedules.</p>
<form class="ict-chart-controls" hidden>
<label>Reminder <input name="event" required maxlength="160"></label>
<label>New York date <input name="date" type="date" required></label>
<label>New York time <input name="time" type="time"></label>
<label>Contract <select name="market"><option value="">Any</option>{market_options(markets)}</select></label>
<label>Source URL <input name="source" type="url"></label>
<button class="primary-button" type="submit">Save reminder</button></form>
<p role="status"></p><ul></ul></section>"""


def social_discovery(markets, social, json_script):
    methods = "".join(f'<option value="{escape(m["id"])}">{escape(m["label"])}</option>' for m in social["methods"])
    return f"""<section class="content-section" id="social-discovery"><h2>Public social discovery</h2>
<p>Explore outside commentary by contract and method. Search results come from the named platforms and may require sign-in.</p>
<form hidden class="ict-chart-controls">
<label>Contract <select name="market">{market_options(markets)}</select></label>
<label>Research approach <select name="method">{methods}</select></label></form>
<ul data-social-links><li><a href="https://www.tradingview.com/markets/futures/">TradingView futures</a></li></ul>
<script type="application/json">{json_script(social)}</script></section>"""


def search_page(markets, academy, catalog, nav_groups, json_script, media_search_rows):
    media_sections = {
        "/academy/videos/": ("ICT Academy video library", "Academy videos"),
        "/academy/podcasts/": ("ICT Academy podcasts", "Academy podcasts"),
        "/academy/mentors/": ("ICT Academy mentors", "Academy mentors"),
    }
    groups = [*nav_groups, ("Quick links", [
        *((label, path) for path, (label, _) in media_sections.items()),
        ("Public social discovery", "/sources/#social-discovery"),
        ("Daily futures brief", "/futures-intelligence/#daily-brief"),
        ("Academy and Lab crosswalk", "/academy/crosswalk/"),
    ])]
    public = [row for _, links in groups for row in links]
    def area(path):
        if path in media_sections:
            return media_sections[path][1]
        if path.startswith(("/academy", "/ict-lab", "/entry-models")):
            return "Lessons"
        if path.startswith(("/markets", "/futures-intelligence", "/charts", "/contract-specs")):
            return "Markets"
        if path.startswith(("/sessions", "/risk", "/strategy-lab")):
            return "Tools"
        return "Sources"
    rows = [{"title": label, "path": path, "category": area(path),
             "keywords": "COT Commitments of Traders" if path == "/research/positioning/" else ""}
            for label, path in public]
    rows += [{"title": m["label"], "path": f'/ict-futures/markets/{m["id"]}.html',
              "category": "Contract profile", "keywords": " ".join([m["id"], m["exchange"], *m["drivers"]])}
             for m in markets]
    historical_by_slug = {row["id"]: row for row in academy}
    shared_slugs = set()
    for row in catalog["concepts"]:
        keywords = f'{row["id"]} {row.get("aliases", "")}'
        if row["id"] in SHARED_CONCEPTS:
            slug = row["academy"][0]
            historical = historical_by_slug[slug]
            keywords += f' {slug} {historical["name"]}'
            shared_slugs.add(slug)
        rows.append({"title": row["title"], "path": f'/academy/learn/{row["id"].lower()}/',
                     "category": "Concept", "keywords": keywords})
    for section, category, items in (("playbooks", "Playbook", catalog["playbooks"]),
                                     ("practice", "Practice", catalog["practice"])):
        rows += [{"title": row["title"], "path": f'/academy/{section}/{str(row["id"]).lower()}/',
                  "category": category, "keywords": f'{row["id"]} {row.get("aliases", "")}'}
                 for row in items]
    rows += [{"title": row["name"], "path": f'/ict-futures/academy/{row["id"]}.html',
              "category": "Historical Academy lesson", "keywords": row["id"]}
             for row in academy if row["id"] not in shared_slugs]
    rows.extend(media_search_rows)
    directory = []
    for group, links in groups:
        items = "".join(f'<li><a href="{escape(path)}">{escape(label)}</a></li>' for label, path in links)
        directory.append(f'<section class="ict-card"><h3>{escape(group)}</h3><ul>{items}</ul></section>')
    return f"""<section class="ict-public" id="public-search"><header class="ict-hero"><h1>Search Futures Intelligence OS</h1>
<p>Find a contract profile, lesson, Academy video, podcast, mentor or public tool.</p></header>
<form class="ict-search" action="/search/" role="search" aria-label="Site search" hidden><label for="public-query">Search the site</label>
<div><input type="search" name="q" id="public-query" maxlength="100" placeholder="Try NQ, FVG or COT"><button type="submit">Search</button><button type="button" class="ict-clear-search" data-clear-search>Clear</button></div></form>
<p role="status"></p><div data-results></div><nav aria-labelledby="search-directory-title"><h2 id="search-directory-title">Browse public pages</h2><div class="ict-grid">{"".join(directory)}</div></nav>
<script type="application/json">{json_script(rows)}</script></section>"""
