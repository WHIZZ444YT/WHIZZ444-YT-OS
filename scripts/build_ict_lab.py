"""Generate public ICT Lab pages from the versioned catalog."""
from html import escape
import json
import re
from urllib.parse import parse_qs, urlsplit

from ict_lesson_figures import IFVG, concept_diagrams


ROOT_URL = "/ict-lab/"
VIEWS = {"learn": "Learn", "playbooks": "Playbooks", "practice": "Practice",
         "podcasts": "Podcasts", "mentors": "Mentors"}


def url(view, item=""):
    return f"{ROOT_URL}{view}/" + (f"{item}/" if item else "")


def detail(view, item):
    return url(view, item if view == "podcasts" else str(item).lower())


def link(label, href, external=False):
    behavior = ' target="_blank" rel="noopener noreferrer"' if external else ""
    return f'<a href="{escape(href, quote=True)}"{behavior}>{escape(str(label))}</a>'


def lesson_link(item, label=None):
    return link(label or item, detail("playbooks" if item.startswith("P") else "learn", item))


def items(elements):
    return "<ul>" + "".join(f"<li>{element}</li>" for element in elements) + "</ul>"


def validate_sources(source):
    videos = source["videos"]
    for key, video in videos.items():
        if not re.fullmatch(r"[A-Za-z0-9_-]{11}", key) or video["id"] != key:
            raise ValueError(f"Invalid ICT video key {key}")
        if video.get("linkCheckedAt") and not video.get("publishedTitle"):
            raise ValueError(f"Dated title evidence requires a title: {key}")
    placements = [entry["sources"] for group in ("modules", "concepts", "playbooks", "practice", "mentors",
                                                  "podcasts", "charter", "academySources") for entry in source[group]]
    for placed in [*placements, source["featured"], source["library"]]:
        if not placed:
            raise ValueError("Each ICT placement requires a source")
        for ref in placed:
            seconds = ref["seconds"]
            expected = {"v": [ref["id"]]}
            if seconds is not None:
                if type(seconds) is not int or seconds < 0:
                    raise ValueError(f"Invalid chapter offset: {ref}")
                expected["t"] = [f"{seconds}s"]
            url = urlsplit(ref["url"])
            if (ref["id"] not in videos or (url.scheme, url.netloc, url.path) != ("https", "www.youtube.com", "/watch")
                    or parse_qs(url.query) != expected):
                raise ValueError(f"ICT video placement does not match its registry ID and offset: {ref}")


def timecode(seconds):
    hours, remainder = divmod(seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    return f"{hours}:{minutes:02d}:{secs:02d}" if hours else f"{minutes}:{secs:02d}"


def resource_list(sources, catalog, limit=None, coverage=None):
    rendered, seen = [], set()
    for source in sources:
        video = catalog["videos"][source["id"]]
        if limit is not None and video["id"] not in seen and len(seen) >= limit:
            continue
        seen.add(video["id"])
        seconds = source["seconds"]
        offset = f" at {timecode(seconds)}" if seconds is not None else ""
        label = source["label"]
        if not label.lower().startswith(("watch ", "open ", "study ")):
            label = f"Watch {label}"
        meta = " · ".join(s for s in (video.get("uploader") or "Uploader unconfirmed", video.get("role"), video.get("language")) if s)
        evidence = [video.get("publishedTitle"), coverage or "Selected for this lesson or exercise.",
                    "Watch-page check: " + (video.get("linkCheckedAt") or "no recorded date"),
                    "Playback: " + video["playback"].lower(), "Embed: " + video["embedding"].lower()]
        if seconds is not None:
            evidence.append(video.get("chapterStatus", "Offsets not independently checked"))
        rendered.append(link(label + (offset if seconds is not None and timecode(seconds) not in label else ""), source["url"], True)
                        + f'<small>{escape(meta)}</small>'
                        + '<details class="ict-video-evidence"><summary>Source details</summary>'
                        + items([escape(value) for value in evidence if value]) + '</details>')
    return items(rendered)


def search_form(action):
    return (f'<form class="ict-search" action="{action}" role="search" data-ict-search hidden>'
            '<label for="ict-query">Search this view</label>'
            '<div><input id="ict-query" name="q" type="search" placeholder="Try an ID, topic, or alias">'
            '<button type="submit">Search</button></div></form>'
            '<p role="status" data-ict-search-status hidden></p>')


def card(title, href, summary, searchable="", category=""):
    return (f'<article class="ict-card" data-ict-item data-search="{escape(searchable, quote=True)}" '
            f'data-category="{escape(category, quote=True)}"><h3>{link(title, href)}</h3>'
            f'<p>{escape(summary)}</p></article>')


def example_table(title, headings, rows):
    cols = "".join(f'<th scope="col">{escape(x)}</th>' for x in headings)
    html = "".join("<tr>" + "".join(f"<td>{escape(str(x))}</td>" for x in row) + "</tr>" for row in rows)
    return (f'<div class="ict-scroll"><table><caption>{escape(title)}</caption>'
            f"<thead><tr>{cols}</tr></thead><tbody>{html}</tbody></table></div>")


def concept_fixture(item):
    key = item["id"]
    if key == "C34":
        return example_table("EDU-OPEN-01 · NQ synthetic · 5 minutes · NY regular-session convention · America/New_York",
                             ["Period", "Trading date", "First eligible bar (ET)", "Synthetic open"],
                             [("Day", "2026-06-02", "09:30", "20020.00"),
                              ("Week", "2026-06-01", "09:30", "20005.00"),
                              ("Month", "2026-05-01", "09:30", "19980.00")])
    if key == "C56":
        return example_table("EDU-OPEN-02 · ES synthetic · 1 minute · Overnight / premarket · America/New_York",
                             ["Reference", "Same local date", "Bar open (ET)", "Synthetic print"],
                             [("Midnight", "2026-06-02", "00:00", "5001.25"),
                              ("08:30 reference", "2026-06-02", "08:30", "5012.50")])
    if key == "C55":
        return ('<p>Custom Lab illustration: anchor the range to the first completed five-minute bar after midnight. '
                'The one-range projection is the anchor high plus (anchor high minus anchor low). '
                'This is a price-range extension.</p>'
                + example_table("EDU-PROJ-01 · NQ synthetic · 5 minutes · Overnight · America/New_York",
                                ["Date", "Anchor bar open (ET)", "Low", "High", "One range above high"],
                                [("2026-06-02", "00:00", "20000.00", "20008.00", "20016.00")]))
    return ""


def concept_page(item, module, catalog, names, crosswalk):
    key = item["id"]
    links = crosswalk.academy_links(item["academy"])
    adjacent = [lesson_link(other, f"{other} · {names[other]}") for other in module["concepts"] if other != key][:3]
    if key == "C17":
        adjacent = [lesson_link("C16", "C16 · Fair value gap"), lesson_link("C09", "C09 · Displacement"),
                    lesson_link("P07", "P07 · Inversion FVG entry"), link("Module 13 · Blind Replay", url("practice", 13))]
    notes = {
        "C34": "Partial coverage: the video covers selected daily opening references. Weekly and monthly examples use the disclosed Lab convention.",
        "C54": "The original Central Bank Dealers Range source is forex. Use separate rules and session evidence before adapting it to futures.",
        "C55": "The linked source teaches its own structural anchors and projections. The midnight formula here is a separately labeled Lab rule.",
        "C56": "Compare the two reference opens on the same New York date. Identify the intended bar before applying the rule in an exercise.",
    }
    shared_steps = crosswalk.shared_steps(item)
    shared = '<h3>From the Academy lesson</h3>' + items([escape(step) for step in shared_steps]) if shared_steps else ""
    diagrams = concept_diagrams(key)
    if key == "C17":
        prices = ",".join(str(price) for price in IFVG)
        diagrams = (f'<section data-ifvg-practice="{prices}"><h2>Practice before the retest</h2>'
                    '<p>The original bullish gap spans 20010–20012. Use a completed close below 20010 for a breach. '
                    'A later candle must return from below. For this exercise, invalidate the short idea at or above 20012.</p>'
                    '<p>Use the submitted chart to assess the first eligible retest.</p></section>'
                    '<details><summary>Review both worked charts</summary>' + diagrams + '</details>')
    scope = f'<p class="ict-muted">{escape(item["scope"])}</p>' if item.get("scope") else ""
    clocks = ('<p>New York and India time examples for 08:30 ET: 18:00 IST on 2026-06-02 '
              'and 19:00 IST on 2026-01-06. Use the date-aware '
              + link("Session & Bias Planner", url("practice", 12)) + ' for a different date.</p>'
              if module["id"] == 6 else "")
    return (f'<div class="ict-reading">{scope}<p>{escape(crosswalk.definition(item))}</p>'
            f'<h2>What to mark</h2><p>{escape(item["rule"])}</p>'
            f'{shared}{crosswalk.teaching(key)}'
            f'<h2>Compare the examples</h2><dl class="ict-scenarios"><dt>Valid</dt><dd>{escape(item["example"])}</dd>'
            f'<dt>Invalid look-alike</dt><dd>{escape(item["lookalike"])}</dd></dl>'
            f'<p class="ict-muted">{escape(notes.get(key, "The examples are written teaching scenarios."))}</p>'
            f'{clocks}{concept_fixture(item)}{diagrams}<h2>Practice question</h2><p>{escape(item["objective"].replace("**", ""))}</p>'
            f'<details><summary>Show the marking guide</summary><p>{escape(item["rule"])}</p></details>'
            f'<h2>Watch</h2>{resource_list(item["sources"], catalog, 3, notes.get(key))}'
            f'{crosswalk.media(key, item["sources"])}'
            f'<h2>Continue learning</h2>{items([*adjacent, *links, link("Open Practice", url("practice"))])}</div>')


def playbook_page(item, catalog, crosswalk):
    rule_labels = ["Prerequisites", "Entry trigger", "Stop and invalidation", "Target", "Skip conditions", "Expiration"]
    examples = ["Valid", "Invalid", "No trade"]
    blocks = "".join(f'<dt>{label}</dt><dd>{escape(value)}</dd>' for label, value in zip(rule_labels, item["rules"]))
    scenarios = "".join(f'<dt>{label}</dt><dd>{escape(value)}</dd>' for label, value in zip(examples, item["examples"]))
    key = item["id"]
    academy = crosswalk.playbook_academy(key)
    media_note = {
        "P04": "The short is a worked example. Follow the Lab’s stated entry and expiration rules in the exercise.",
        "P07": "The Dhesi walkthrough is applied context. Chapter fit and playback need separate review.",
        "P09": "The Academy’s TTrades example is XAUUSD. The synthetic NQ diagram has its own exercise scope.",
        "P10": "The two supplied references serve different purposes. Start with Charter Model 9, then review the chart example.",
    }.get(key)
    return (f'<div class="ict-reading"><p>{escape(item["summary"])}</p>'
            f'<p class="ict-muted">{escape(item["market"])} · {escape(item["timeframe"])}</p>'
            f'<p>Source context: {escape(item["attribution"])}. Rules shown here are educational Lab rules.</p>'
            f'<h2>Rules</h2><dl class="ict-scenarios">{blocks}</dl>'
            f'<h2>Practice scenarios</h2><dl class="ict-scenarios">{scenarios}</dl>'
            f'{crosswalk.teaching(key)}<h2>Watch</h2>{resource_list(item["sources"], catalog, 3, media_note)}'
            f'{crosswalk.media(key, item["sources"])}'
            f'<h2>Related concepts</h2>{items([lesson_link(k) for k in item["concepts"]])}'
            f'{academy}'
            f'<p>Record one primary playbook per trade. Record other concepts as secondary tags in the '
            f'{link("practice journal", url("practice", 16))}.</p></div>')


def build_ict_lab(root, dist, shell, write, academy, json_script, source, crosswalk):
    validate_sources(source)
    modules, concepts, plays, labs = (source[k] for k in ("modules", "concepts", "playbooks", "practice"))
    mentors, podcasts = source["mentors"], source["podcasts"]
    index = {c["id"]: c for c in concepts}
    if len(concepts) != 56 or sorted(index) != [f"C{n:02}" for n in range(1, 57)]:
        raise ValueError("ICT Lab concept IDs must be exactly C01–C56")
    if [m["id"] for m in modules] != list(range(1, 11)) or sorted(k for m in modules for k in m["concepts"]) != sorted(index):
        raise ValueError("ICT Lab module mapping must cover each concept once")
    added_placements = {k: m["id"] for m in modules for k in m["concepts"] if k > "C50"}
    if added_placements != {"C51": 8, "C52": 8, "C53": 5, "C54": 6, "C55": 7, "C56": 6}:
        raise ValueError("Added ICT concepts must retain their catalog modules")
    if [k["id"] for k in plays] != [f"P{n:02}" for n in range(1, 11)]:
        raise ValueError("ICT Lab playbook IDs must be exactly P01–P10")
    if [k["id"] for k in labs] != list(range(11, 17)):
        raise ValueError("ICT Lab practice modules must be exactly 11–16")

    routes = []
    assets = '<link rel="stylesheet" href="/assets/ict-public.css"><script src="/assets/ict-public.js" defer></script>'

    def emit(path, view, title, body, subtitle="", extra=""):
        tabs = "".join('<a href="{}"{}>{}</a>'.format(
            url(key), ' aria-current="page"' if key == view else "", label)
            for key, label in VIEWS.items())
        html = (f'<section class="ict-public" data-ict-view="{view}"><header class="ict-hero">'
                f'<p>{link("ICT Lab", ROOT_URL)}</p><h1>{escape(title)}</h1>'
                f'<p>{escape(subtitle)}</p></header><nav class="ict-tabs" aria-label="ICT Lab sections">{tabs}</nav>'
                f'{body}</section>')
        write(dist / path.lstrip("/") / "index.html", shell(f"{title} | ICT Lab", subtitle or title, html,
                                                              path, assets + extra))
        routes.append(path)

    full = sum(p["type"] == "Full episode" for p in podcasts)
    clips = sum(p["type"] == "Clip" for p in podcasts)
    if (len(mentors), full, clips) != (10, 9, 2) or full + clips != len(podcasts):
        raise ValueError("ICT Lab must publish 10 mentors, 9 full episodes and 2 clips")
    for view, records in (("mentors", mentors), ("podcasts", podcasts)):
        if len({detail(view, x["id"]) for x in records}) != len(records):
            raise ValueError(f"Duplicate ICT Lab {view} route")
    legacy_details = {view: {str(item["id"]): detail(view, item["id"]) for item in records}
                      for view, records in zip(VIEWS, (concepts, plays, labs, podcasts, mentors))}
    home_cards = [("learn", f"{len(concepts)} concepts across {len(modules)} modules"),
                  ("playbooks", f"{len(plays)} playbooks with entry and invalidation rules"),
                  ("practice", f"{len(labs)} labs for rehearsal and review"),
                  ("podcasts", f"{full} full episodes and {clips} clips"),
                  ("mentors", f"{len(mentors)} YouTube channels")]
    emit(ROOT_URL, "", "Study futures with ICT Lab", '<div class="ict-grid">'
         + "".join(card(VIEWS[k], url(k), description) for k, description in home_cards) + "</div>"
         + f'<script type="application/json" id="ict-legacy-details">{json_script(legacy_details)}</script>',
         "Learn the concepts, compare playbooks, and test your decisions on clearly labeled practice samples.")

    paths = (f'<div class="ict-grid">{card("Start learning", detail("learn", "C01"), "Liquidity, structure and the first playbook.")}'
             f'{card("Build a session plan", url("practice", 12), "Work from daily bias to a conditional NQ or ES plan.")}</div>')
    rows = []
    names = {k: v["title"] for k, v in index.items()}
    for module in modules:
        cards = []
        for key in module["concepts"]:
            item = index[key]
            cards.append(card(f'{key} · {item["title"]}', detail("learn", key), item["definition"], item["aliases"], "concept"))
            emit(detail("learn", key), "learn", item["title"],
                 concept_page(item, module, source, names, crosswalk),
                 f'{key} · Module {module["id"]:02} · {module["title"]}',
                 '<script type="module" src="/assets/ict-practice.mjs"></script>' if key == "C17" else "")
        rows.append(f'<section class="ict-group" data-ict-group><h2>{module["id"]:02} · {escape(module["title"])}</h2>'
                    + resource_list(module["sources"], source) + '<div class="ict-grid">' + "".join(cards) + "</div></section>")
    extension_slugs = set("bos choch cisd htf-fvg liquidity-run liquidity-void weekly-profiles mean-threshold ipda fpfvg opening-range-gap smt-fx-metals".split())
    extension_slugs.update(c["id"] for c in academy if c["id"] in {
        "listed-futures-market-basics", "contract-specs-and-tick-math", "futures-expiry-first-notice-and-roll",
        "continuous-contract-mapping", "futures-margin-and-position-risk", "futures-volume-open-interest",
    })
    extensions = [card(c.get("name", c["id"]), f'/ict-futures/academy/{c["id"]}.html', c.get("definition", ""),
                       c["id"], "extension") for c in academy if c.get("id") in extension_slugs]
    rows.append('<section class="ict-group" data-ict-group><h2>Academy extensions</h2>'
                '<p><a href="/academy/crosswalk/">See shared lessons and source coverage</a></p><div class="ict-grid">'
                + "".join(extensions) + "</div></section>")
    rows.append('<section class="ict-group"><h2>Original ICT lectures</h2>'
                + resource_list(source["featured"], source) + f'<p>{link("Browse the complete resource index", ROOT_URL + "resources/")}</p></section>')
    emit(url("learn"), "learn", "Learn ICT", paths + search_form(url("learn")) + "".join(rows),
         f"{len(concepts)} concepts across {len(modules)} modules. Browse by module or search a topic.")

    play_cards = []
    for item in plays:
        play_cards.append(card(f'{item["id"]} · {item["title"]}', detail("playbooks", item["id"]), item["summary"],
                               item["category"] + (" OSOK" if item["id"] == "P10" else ""), "playbook"))
        emit(detail("playbooks", item["id"]), "playbooks", item["title"], playbook_page(item, source, crosswalk), item["id"])
    charter = ""
    for item in source["charter"]:
        related = lesson_link("P10") if item["id"] == 9 else lesson_link("P01") if item["id"] == 13 else ""
        charter += (f'<article class="ict-card" data-ict-item data-category="charter"><h3>Charter Model {item["id"]} · '
                    f'{escape(item["title"])}</h3>{resource_list(item["sources"], source)}{related}</article>')
    emit(url("playbooks"), "playbooks", "ICT playbooks", search_form(url("playbooks"))
         + '<section class="ict-group" data-ict-group><h2>Lab playbooks</h2><div class="ict-grid">'
         + "".join(play_cards) + '</div></section><section class="ict-group" data-ict-group><h2>Original ICT Charter sources</h2>'
         + '<div class="ict-grid">' + charter + f'</div></section><p>{link("Compare Academy model variants", "/entry-models/")}</p>',
         f"{len(plays)} Lab playbooks and {len(source['charter'])} separately attributed Charter lectures.")

    lab_cards = []
    for item in labs:
        key = item["id"]
        lab_cards.append(card(f'{key} · {item["title"]}', url("practice", key), item["description"]))
        playbook_choices = ('<datalist data-journal-playbooks>' + "".join(
            f'<option value="{escape(play["id"] + " " + play["title"])}"></option>' for play in plays
        ) + '</datalist>') if key == 16 else ""
        checklist = ('<template id="legacy-checklist"><ol>' + "".join(
            f'<li>{escape(label)}</li>' for label in json.loads((root / "ict-lab/checklist.json").read_text(encoding="utf-8"))
        ) + '</ol></template>') if key == 16 else ""
        practice_anchor = ' id="local-journal"' if key == 16 else ""
        emit(url("practice", key), "practice", item["title"],
             f'<div class="ict-reading"><section{practice_anchor} data-ict-practice="{key}" aria-label="Practice exercise">'
             '<p>Enable JavaScript for interactive practice. The tutorials below remain available.</p></section>'
             f'{playbook_choices}{checklist}<h2>Watch</h2>{resource_list(item["sources"], source, 3)}</div>', item["description"],
             '<script type="module" src="/assets/ict-practice.mjs"></script>')
    emit(url("practice"), "practice", "ICT practice labs", search_form(url("practice"))
         + '<div class="ict-grid">' + "".join(lab_cards) + "</div>",
         f"{len(labs)} practical modules. Educational samples and local device storage are labeled in each lab.")

    for view, records in (("podcasts", podcasts), ("mentors", mentors)):
        groups = {}
        for item in records:
            key = item["id"]
            title = item.get("title", item.get("name"))
            summary = item["summary"]
            show = item.get("type", "")
            section = item["program"] if view == "podcasts" else ""
            groups.setdefault(section, []).append(card(
                title, detail(view, key), summary, " ".join(item.get(k, "") for k in ("type", "program", "guest")), show))
            if view == "mentors":
                subsequent = f'<h2>More by topic</h2>{resource_list(item["sources"][1:], source)}' if item["sources"][1:] else ""
                channel = (link("Visit YouTube channel", item["channel"], True) if item["channel"] else
                           "Channel identity check pending. " +
                           link("Open the upload and select its creator", item["sources"][0]["url"], True))
                body = f'<h2>Start here</h2>{resource_list(item["sources"][:1], source)}{subsequent}<p>{channel}</p>'
            else:
                identity_note = "<p>Guest identity still needs confirmation from the publisher.</p>" if key == "LF1VTFohH0U" else ""
                body = (f'<h2>Watch</h2>{resource_list(item["sources"], source)}{identity_note}'
                        f'<h2>Related lessons</h2>{items([lesson_link(k) for k in item["related"]])}'
                        f'<p class="ict-muted">{escape(show)} · {escape(item["program"])} · {escape(item["guest"])}</p>')
            emit(detail(view, key), view, title, f'<div class="ict-reading">{body}</div>', summary)
        subtitle = f"{len(mentors)} creator profiles." if view == "mentors" else f"{full} full episodes and {clips} clips."
        filters = ('<div data-ict-filter-wrap hidden><label for="ict-format">Format</label> <select id="ict-format" data-ict-filter>'
                   '<option value="">All</option><option>Full episode</option><option>Clip</option></select></div>') if view == "podcasts" else ""
        cards = "".join(
            (f'<section data-ict-group class="ict-group"><h2>{escape(program)}</h2>' if program else "")
            + '<div class="ict-grid">' + "".join(cards) + "</div>" + ("</section>" if program else "")
            for program, cards in groups.items()
        )
        emit(url(view), view, "ICT " + VIEWS[view].lower(), search_form(url(view)) + filters + cards, subtitle)

    emit(ROOT_URL + "resources/", "learn", "ICT resource index",
         '<div class="ict-reading"><h2>Supplied watch links</h2>' + resource_list(source["library"], source)
         + '<h2>Academy supplements</h2>' + "".join(
             f'<h3>{", ".join(escape(slug) for slug in row["lessons"])}</h3>{resource_list(row["sources"], source)}'
             for row in source["academySources"]) + "</div>",
         "Resources retain their original time offsets. Playback and embedding can vary.")
    return routes
