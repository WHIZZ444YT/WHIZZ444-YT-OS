"""Generate public ICT Lab pages from the versioned catalog."""
from html import escape
import json


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


def resource_list(sources, catalog, limit=None):
    rendered, seen = [], set()
    for source in sources:
        video = catalog["videos"][source["id"]]
        if limit is not None and video["id"] not in seen and len(seen) >= limit:
            continue
        seen.add(video["id"])
        seconds = source["seconds"]
        offset = f" at {seconds // 60}:{seconds % 60:02d}" if seconds is not None else ""
        label = source["label"]
        if not label.lower().startswith(("watch ", "open ", "study ")):
            label = f"Watch {label}"
        meta = " · ".join(s for s in (video.get("uploader"), video.get("role"), video.get("language")) if s)
        rendered.append(link(label + (offset if offset not in label else ""), source["url"], True)
                        + (f'<small>{escape(meta)}</small>' if meta else ""))
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


def concept_page(item, module, catalog, names):
    key = item["id"]
    links = [link("Academy · " + slug.replace("-", " ").title(), f"/ict-futures/academy/{slug}.html")
             for slug in item["academy"]]
    adjacent = [lesson_link(other, f"{other} · {names[other]}") for other in module["concepts"] if other != key][:3]
    if key == "C17":
        adjacent.extend([lesson_link("P07"), link("Blind Replay", url("practice", 13))])
    notes = {
        "C34": "The video covers selected daily opening references. Weekly and monthly examples below use the disclosed Lab convention.",
        "C54": "The original Central Bank Dealers Range source is forex. Use separate rules and session evidence before adapting it to futures.",
        "C55": "The linked source teaches its own structural anchors and projections. The midnight formula here is a separately labeled Lab rule.",
        "C56": "Compare the two reference opens on the same New York date. Identify the intended bar before applying the rule in an exercise.",
    }
    return (f'<div class="ict-reading"><p>{escape(item["definition"])}</p>'
            f'<h2>What to mark</h2><p>{escape(item["rule"])}</p>'
            f'<h2>Compare the examples</h2><dl class="ict-scenarios"><dt>Valid</dt><dd>{escape(item["example"])}</dd>'
            f'<dt>Invalid look-alike</dt><dd>{escape(item["lookalike"])}</dd></dl>'
            f'<p class="ict-muted">{escape(notes.get(key, "The examples are written teaching scenarios."))}</p>'
            f'{concept_fixture(item)}<h2>Practice question</h2><p>{escape(item["objective"])}</p>'
            f'<details><summary>Show the marking guide</summary><p>{escape(item["rule"])}</p></details>'
            f'<h2>Watch</h2>{resource_list(item["sources"], catalog, 3)}'
            f'<h2>Continue learning</h2>{items([*adjacent, *links, link("Open Practice", url("practice"))])}</div>')


def playbook_page(item, catalog):
    rule_labels = ["Prerequisites", "Entry trigger", "Stop and invalidation", "Target", "Skip conditions", "Expiration"]
    examples = ["Valid", "Invalid", "No trade"]
    blocks = "".join(f'<dt>{label}</dt><dd>{escape(value)}</dd>' for label, value in zip(rule_labels, item["rules"]))
    scenarios = "".join(f'<dt>{label}</dt><dd>{escape(value)}</dd>' for label, value in zip(examples, item["examples"]))
    return (f'<div class="ict-reading"><p>{escape(item["summary"])}</p>'
            f'<p class="ict-muted">{escape(item["market"])} · {escape(item["timeframe"])}</p>'
            f'<p>Source context: {escape(item["attribution"])}. Rules shown here are educational Lab rules.</p>'
            f'<h2>Rules</h2><dl class="ict-scenarios">{blocks}</dl>'
            f'<h2>Practice scenarios</h2><dl class="ict-scenarios">{scenarios}</dl>'
            f'<h2>Watch</h2>{resource_list(item["sources"], catalog, 3)}'
            f'<h2>Related concepts</h2>{items([lesson_link(k) for k in item["concepts"]])}</div>')


def build_ict_lab(root, dist, shell, write, academy, json_script, source):
    modules, concepts, plays, labs = (source[k] for k in ("modules", "concepts", "playbooks", "practice"))
    mentors, podcasts = source["mentors"], source["podcasts"]
    index = {c["id"]: c for c in concepts}
    if len(concepts) != 56 or sorted(index) != [f"C{n:02}" for n in range(1, 57)]:
        raise ValueError("ICT Lab concept IDs must be exactly C01–C56")
    if [m["id"] for m in modules] != list(range(1, 11)) or sorted(k for m in modules for k in m["concepts"]) != sorted(index):
        raise ValueError("ICT Lab module mapping must cover each concept once")
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
                 concept_page(item, module, source, names),
                 f'{key} · Module {module["id"]:02} · {module["title"]}')
        rows.append(f'<section class="ict-group" data-ict-group><h2>{module["id"]:02} · {escape(module["title"])}</h2>'
                    + resource_list(module["sources"], source) + '<div class="ict-grid">' + "".join(cards) + "</div></section>")
    extension_slugs = set("bos choch cisd htf-fvg liquidity-runs weekly-profiles mean-threshold ipda fpfvg opening-range-gap".split())
    extensions = [card(c.get("name", c["id"]), f'/ict-futures/academy/{c["id"]}.html', c.get("definition", ""),
                       c["id"], "extension") for c in academy if c.get("id") in extension_slugs]
    rows.append('<section class="ict-group" data-ict-group><h2>Academy extensions</h2><div class="ict-grid">'
                + "".join(extensions) + "</div></section>")
    rows.append('<section class="ict-group"><h2>Original ICT lectures</h2>'
                + resource_list(source["featured"], source) + f'<p>{link("Browse the complete resource index", ROOT_URL + "resources/")}</p></section>')
    emit(url("learn"), "learn", "Learn ICT", paths + search_form(url("learn")) + "".join(rows),
         f"{len(concepts)} concepts across {len(modules)} modules. Browse by module or search a topic.")

    play_cards = []
    for item in plays:
        play_cards.append(card(f'{item["id"]} · {item["title"]}', detail("playbooks", item["id"]), item["summary"],
                               item["category"] + (" OSOK" if item["id"] == "P10" else ""), "playbook"))
        emit(detail("playbooks", item["id"]), "playbooks", item["title"], playbook_page(item, source), item["id"])
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
        cards = []
        for item in records:
            key = item["id"]
            title = item.get("title", item.get("name"))
            summary = item["summary"]
            show = item.get("type", "")
            cards.append(card(title, detail(view, key), summary,
                              " ".join(item.get(k, "") for k in ("type", "program", "guest")), show))
            if view == "mentors":
                body = (f'<h2>Start here</h2>{resource_list(item["sources"][:1], source)}'
                        f'<h2>More by topic</h2>{resource_list(item["sources"][1:], source)}'
                        f'<p>{link("Visit YouTube channel", item["channel"], True)}</p>')
            else:
                body = (f'<h2>Watch</h2>{resource_list(item["sources"], source)}'
                        f'<h2>Related lessons</h2>{items([lesson_link(k) for k in item["related"]])}'
                        f'<p class="ict-muted">{escape(show)} · {escape(item["program"])} · {escape(item["guest"])}</p>')
            emit(detail(view, key), view, title, f'<div class="ict-reading">{body}</div>', summary)
        subtitle = f"{len(mentors)} creator profiles." if view == "mentors" else f"{full} full episodes and {clips} clips."
        filters = ('<div data-ict-filter-wrap hidden><label for="ict-format">Format</label> <select id="ict-format" data-ict-filter>'
                   '<option value="">All</option><option>Full episode</option><option>Clip</option></select></div>') if view == "podcasts" else ""
        emit(url(view), view, "ICT " + VIEWS[view].lower(), search_form(url(view)) + filters + '<div class="ict-grid">'
             + "".join(cards) + "</div>", subtitle)

    emit(ROOT_URL + "resources/", "learn", "ICT resource index",
         '<div class="ict-reading"><h2>Supplied watch links</h2>' + resource_list(source["library"], source)
         + '<h2>Academy supplements</h2>' + "".join(
             f'<h3>{", ".join(escape(slug) for slug in row["lessons"])}</h3>{resource_list(row["sources"], source)}'
             for row in source["academySources"]) + "</div>",
         "Resources retain their original time offsets. Playback and embedding can vary.")
    return routes
