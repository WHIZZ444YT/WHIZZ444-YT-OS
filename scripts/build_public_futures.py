"""Public futures routes and the compatibility document for terminal bookmarks."""
from html import escape
import re
from urllib.parse import urlencode


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


def market_options(markets):
    return "".join(
        f'<option value="{escape(m["id"])}" data-symbol="{escape(m.get("chart", ""))}">'
        f'{escape(m["label"])}</option>' for m in markets
    )


def chart_page(markets):
    markets = [m for m in markets if m.get("chart")]
    nq = next(m for m in markets if m["id"] == "nq")
    options = market_options(markets)
    direct = "https://www.tradingview.com/chart/?" + urlencode({"symbol": nq["chart"], "interval": "15"})
    return f"""<section class="ict-public"><header class="ict-hero"><h1>Futures charts</h1>
<p>Compare contract families at the same interval. Load a TradingView preview or open the full chart for drawing tools.</p></header>
<form id="public-chart-controls" class="ict-chart-controls" action="/charts/" hidden>
<label>Market <select name="market">{options}</select></label>
<label>Comparison <select name="comparison"><option value="">None</option>{options}</select></label>
<label>Interval <select name="interval"><option value="1">1 minute</option><option value="5">5 minutes</option>
<option value="15" selected>15 minutes</option><option value="60">1 hour</option><option value="240">4 hours</option>
<option value="D">Daily</option><option value="W">Weekly</option></select></label>
<button type="submit">Load previews</button></form>
<p id="public-chart-status" role="status">Data availability and delays depend on TradingView.</p>
<div class="ict-grid ict-chart-previews">
<article class="ict-card" data-chart-slot><h2>{escape(nq["label"])}</h2>
<p><a href="{escape(direct)}" target="_blank" rel="noopener noreferrer">Open chart on TradingView</a></p><div data-chart-mount></div></article>
<article class="ict-card" data-chart-slot hidden><h2>Comparison chart</h2>
<p><a href="https://www.tradingview.com/markets/futures/" target="_blank" rel="noopener noreferrer">Open comparison on TradingView</a></p><div data-chart-mount></div></article></div>
<p>Continuous symbols may contain roll adjustments or gaps. Match listed expiries and bar times when comparing swings. Use the linked lesson to assess SMT manually.</p>
<p><a href="/markets/">Market profiles</a> · <a href="/volume-open-interest/">Volume and open interest</a> · <a href="/ict-lab/learn/c43/">Learn NQ/ES SMT</a></p></section>"""


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
<button class="secondary-button" type="button" data-export-brief>Export brief JSON</button>
</form>
<p role="status">Snapshot status appears when the brief loads.</p>
<div class="card-grid"><article><h3>Contract context</h3><p data-brief-context>Read the <a href="/markets/">contract profiles</a>.</p></article>
<article><h3>Matched headlines</h3><ul data-brief-news><li><a href="/news/">Browse futures news</a></li></ul></article>
<article><h3>Publisher events</h3><ul data-brief-events><li><a href="/sessions/#calendar">Check official schedules</a></li></ul></article></div>
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


def search_page(markets, academy, catalog, nav, json_script):
    public = [*nav, ("Markets", "/markets/"), ("Futures charts", "/charts/"), ("ICT Lab", "/ict-lab/"),
              ("Public social discovery", "/sources/#social-discovery"), ("Daily futures brief", "/futures-intelligence/#daily-brief")]
    rows = [{"title": label, "path": path, "category": "Product area", "keywords": ""}
            for label, path in public]
    rows += [{"title": m["label"], "path": f'/ict-futures/markets/{m["id"]}.html',
              "category": "Contract profile", "keywords": " ".join([m["id"], m["exchange"], *m["drivers"]])}
             for m in markets]
    def normal(title):
        return re.sub(r"[\W_]+", "", title.casefold())
    lab_placements = {(slug, normal(row["title"])) for row in catalog["concepts"] for slug in row["academy"]}
    rows += [{"title": row["name"], "path": f'/ict-futures/academy/{row["id"]}.html',
              "category": "Academy", "keywords": row["id"]}
             for row in academy if (row["id"], normal(row["name"])) not in lab_placements]
    for section, category, items in (("learn", "Concept", catalog["concepts"]),
                                     ("playbooks", "Playbook", catalog["playbooks"]),
                                     ("practice", "Practice", catalog["practice"])):
        rows += [{"title": row["title"], "path": f'/ict-lab/{section}/{str(row["id"]).lower()}/',
                  "category": category, "keywords": f'{row["id"]} {row.get("aliases", "")}'}
                 for row in items]
    links = "".join(f'<li><a href="{escape(path)}">{escape(label)}</a></li>' for label, path in public)
    return f"""<section class="ict-public" id="public-search"><header class="ict-hero"><h1>Search Futures Intelligence OS</h1>
<p>Find a contract profile, lesson, playbook or public tool.</p></header>
<form class="ict-search" action="/search/" hidden><label for="public-query">Search the site</label>
<div><input type="search" name="q" id="public-query" maxlength="100"><button type="submit">Search</button></div></form>
<p role="status"></p><ul data-results></ul><h2>Browse public pages</h2><ul>{links}</ul>
<script type="application/json">{json_script(rows)}</script></section>"""
