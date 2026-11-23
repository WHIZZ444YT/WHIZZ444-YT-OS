"""Generate public ICT Lab pages from the versioned catalog."""
from html import escape
import json
import re
from urllib.parse import parse_qs, urlsplit

from ict_editorial import TERMINAL_PLACEMENTS, featured_for, learning_paths
from ict_official_sources import CHARTER_INDEX, CREATOR_PLACEMENTS, MENTOR_FOLLOWUPS, OFFICIAL_SERIES, comparable_popular, creator_sources
from ict_gap_register import gap_register, verification
from ict_crosswalk import PUBLIC_MODELS
from ict_lesson_figures import IFVG, concept_diagrams
from ict_specs import KNOWABLE, MODULES, PLAYBOOK_CONTEXT


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


def resource_list(sources, catalog, limit=None, coverage=None, *, searchable=False):
    rendered, seen = [], set()
    for rank, source in enumerate(sources, 1):
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
        explanation = source.get("explanation") or coverage
        evidence = [video.get("publishedTitle"), f"Placement {rank} · {label}", coverage or "Selected for this lesson or exercise.",
                    "Channel ID: " + (video.get("channelId") or "unconfirmed"),
                    "Duration: " + (timecode(video["durationSeconds"]) if video.get("durationSeconds") else "unconfirmed"),
                    "Watch-page check: " + (video.get("linkCheckedAt") or "no recorded date"),
                    "Evidence: " + verification(video), "Playback: " + video["playback"].lower(), "Embed: " + video["embedding"].lower()]
        if seconds is not None:
            evidence.append(video.get("chapterStatus", "Offsets not independently checked"))
        rendered.append((f'<p>{escape(explanation)}</p>' if explanation else "") + link(label + (offset if seconds is not None and timecode(seconds) not in label else ""), source["url"], True)
                        + f'<small>{escape(meta)}</small>'
                        + '<details class="ict-video-evidence"><summary>Source details</summary>'
                        + items([escape(value) for value in evidence if value]) + '</details>')
    if searchable:
        labels = {
            "original ict": "original",
            "creator explanation": "creator",
            "independent supplement": "creator",
        }
        return "<ul>" + "".join(
            f'<li data-ict-item data-category="{labels.get(str(catalog["videos"][ref["id"]].get("role", "")).lower(), "other")}" '
            f'data-evidence="{escape(verification(catalog["videos"][ref["id"]]), quote=True)}" '
            f'data-search="{escape(ref["id"], quote=True)}">{body}</li>'
            for ref, body in zip(sources, rendered)
        ) + "</ul>"
    return items(rendered)


def filter_control(label, options):
    choices = '<option value="">All</option>' + "".join(
        f'<option value="{escape(key)}">{escape(name)}</option>' for key, name in options
    )
    return (f'<div data-ict-filter-wrap hidden><label for="ict-format">{escape(label)}</label> '
            f'<select id="ict-format" data-ict-filter>{choices}</select></div>')


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
        periods = [
            ("DAY", "2026-06-01 15:55", "2026-06-02", "20020.00", "Next trading day"),
            ("WEEK", "2026-05-29 15:55", "2026-06-01", "20005.00", "Friday to Monday"),
            ("MONTH", "2026-07-31 15:55", "2026-08-03", "19980.00", "August 1 is Saturday"),
        ]
        return ('<p>Lab rule OPEN-RTH v1 · New York regular-session study (NY-RTH). Each timeline uses the '
                'first eligible 09:30 ET bar of its own period. Overnight bars and weekend dates are outside this convention.</p>'
                + "".join(example_table(f"EDU-OPEN-01-{period} · NQ · synthetic Lab data · 5 minutes · NY-RTH · America/New_York",
                            ["Previous eligible bar (ET)", "Boundary", "Trading date", "Eligible open (ET)", "Synthetic open", "Available in closed-bar replay (ET)"],
                            [(prior, boundary, day, "09:30", price, "09:35")])
                          for period, prior, day, price, boundary in periods))
    if key == "C56":
        return example_table("EDU-OPEN-02 · ES · synthetic Lab data · 1 minute · NY overnight / premarket · America/New_York",
                             ["Reference", "Same local date", "Bar open (ET)", "Synthetic print", "Replay reveals at close (ET)"],
                             [("Midnight", "2026-06-02", "00:00", "5001.25", "00:01"),
                              ("08:30 reference", "2026-06-02", "08:30", "5012.50", "08:31")])
    if key == "C54":
        return ('<p>This synthetic NQ session exercise uses a separately chosen 15:30-16:00 ET window. '
                'Record the observed high and low only after the window closes. A missing bar invalidates the sample. '
                'Do not apply the forex projection convention to this range.</p>'
                + example_table("EDU-C54-01 - NQ synthetic - 15 minutes - America/New_York",
                                ["Bar open (ET)", "High", "Low", "Rule annotation"],
                                [("15:30", "20008.00", "19998.00", "First eligible bar"),
                                 ("15:45", "20012.00", "20001.00", "Second eligible bar"),
                                 ("16:00", "20012.00", "19998.00", "Record the completed range only")]))
    if key == "C55":
        return ('<p>The Academy summary measures the height of the chosen structural range and applies ±1, ±2 and ±2.5 range units. '
                'For the source exercise, identify both structural anchor prices and the projection convention used in the linked lesson. '
                'Exact source anchor and chapter coverage remain pending review.</p><p>Lab Rule MIDNIGHT-RANGE v1. '
                'Use only the New York 00:00–00:05 five-minute bar on the selected date, after that bar closes. '
                'The one-range projection is the anchor high plus (anchor high minus anchor low). '
                'If the anchor bar is absent, record the projection as unavailable.</p>'
                + example_table("EDU-PROJ-01 · NQ synthetic · 5 minutes · Overnight · America/New_York",
                                ["Date", "Anchor bar open (ET)", "Low", "High", "One range above high"],
                                [("2026-06-02", "00:00", "20000.00", "20008.00", "20016.00"),
                                 ("2026-06-03", "00:00", "20005.00", "20010.00", "20015.00")]))
    return ""


def featured_index_link(key):
    if any(key in placements for placements in TERMINAL_PLACEMENTS.values()):
        return f'<p>{link("See all predecessor sources for this lesson", ROOT_URL + "resources/#placement-" + key.lower())}</p>'
    return ""


def creator_references(key, catalog):
    refs = creator_sources(CREATOR_PLACEMENTS.get(key, ()), catalog)
    if not refs:
        return ""
    scope = '<p>These creator study references have a separate editorial review from the Lab rules.</p>'
    return '<details><summary>Creator study references</summary>' + scope + resource_list(refs, catalog) + '</details>'


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
                    '<details data-ifvg-worked hidden><summary>Review both worked charts</summary>' + diagrams + '</details>'
                    '<noscript><p>Enable JavaScript to save a decision and review these charts.</p></noscript>')
    scope = f'<p class="ict-muted">{escape(item["scope"])}</p>' if item.get("scope") else ""
    clocks = ('<p>New York and India time examples for 08:30 ET: 18:00 IST on 2026-06-02 '
              'and 19:00 IST on 2026-01-06. Use the date-aware '
              + link("Session & Bias Planner", url("practice", 12)) + ' for a different date.</p>'
              if module["id"] == 6 else "")
    return (f'<div class="ict-reading">{scope}<p>{escape(crosswalk.definition(item))}</p>'
            f'<p class="ict-muted">{escape(item["aliases"] or "No additional alias recorded")}</p>'
            f'<nav class="ict-lesson-outline" aria-label="Lesson contents">{link("Rule", "#lesson-rule")} · '
            f'{link("Examples", "#lesson-examples")} · {link("Practice", "#lesson-practice")} · {link("Sources", "#lesson-sources")}</nav>'
            f'<h2 id="lesson-rule">What to mark</h2><p>{escape(item["rule"])}</p>' 
            f'<p class="ict-muted">Lab Rule · {escape(key)} v1</p><h3>When the label becomes knowable</h3>'
            f'<p>{escape(KNOWABLE.get(key, "Wait until the observable evidence in the rule is complete. Any condition that requires a close becomes knowable after that bar closes."))}</p>'
            f'{shared}{crosswalk.teaching(key)}'
            f'<h2 id="lesson-examples">Compare the examples</h2><dl class="ict-scenarios"><dt>Valid</dt><dd>{escape(item["example"])}</dd>'
            f'<dt>Invalid look-alike</dt><dd>{escape(item["lookalike"])}</dd></dl>'
            f'<p class="ict-muted">{escape(notes.get(key, "The examples are written teaching scenarios."))}</p>'
            f'{clocks}{concept_fixture(item)}{diagrams}<h2 id="lesson-practice">Practice question</h2><p>{escape(item["objective"].replace("**", ""))}</p>'
            f'<details><summary>Show the marking guide</summary><p>{escape(item["rule"])}</p>'
            '<p>Record the reference level or window, the confirming evidence, and the first time the label could be assigned. '
            'Identify which observable condition the look-alike misses.</p></details>'
            f'<p>{link("Practice next", url("practice", MODULES[module["id"]][2]))}</p>'
            f'<h2 id="lesson-sources">Watch</h2>{resource_list(featured_for(key, catalog, item["sources"]), catalog, 3, notes.get(key))}'
            f'{crosswalk.media(key, item["sources"])}{featured_index_link(key)}{creator_references(key, catalog)}'
            f'<h2>Continue learning</h2>{items([*adjacent, *links])}</div>')


def playbook_page(item, catalog, crosswalk):
    rule_labels = ["Prerequisites", "Entry trigger", "Stop and invalidation", "Target", "Skip conditions", "Expiration"]
    examples = ["Valid", "Invalid", "No trade"]
    blocks = "".join(f'<dt>{label}</dt><dd>{escape(value)}</dd>' for label, value in zip(rule_labels, item["rules"]))
    scenarios = "".join(f'<dt>{label}</dt><dd>{escape(value)}</dd>' for label, value in zip(examples, item["examples"]))
    key = item["id"]
    session, eligible, long, short = PLAYBOOK_CONTEXT[key]
    academy = crosswalk.playbook_academy(key)
    media_note = {
        "P04": "The short is a worked example. Follow the Lab’s stated entry and expiration rules in the exercise.",
        "P07": "The Dhesi walkthrough is applied context. Chapter fit and playback need separate review.",
        "P09": "The Academy’s TTrades example is XAUUSD. The synthetic NQ diagram has its own exercise scope.",
        "P10": "The two supplied references serve different purposes. Start with Charter Model 9, then review the chart example.",
    }.get(key)
    weekly_plan = ""
    if key == "P10":
        weekly_plan = example_table("EDU-P10-WEEK-01 · NQ synthetic Lab study · America/New_York · 5-minute confirmation",
                                    ["State", "New York checkpoint", "Lab evidence"],
                                    [("Valid", "2026-06-02 10:05 ET", "The selected five-minute trigger closes above 20,115 while the declared 20,180 objective remains available."),
                                     ("Invalid", "2026-06-03 09:45 ET", "A five-minute bar closes below the plan's 20,065 invalidation before the entry."),
                                     ("No trade", "2026-06-05 16:00 ET", "The chosen trigger never closes before the declared review cutoff.")])
    return (f'<div class="ict-reading"><p>{escape(item["summary"])}</p>'
            f'<p class="ict-muted">{escape(item["market"])} · {escape(item["timeframe"])}</p>'
            f'<p>Source context: {escape(item["attribution"])}. Lab Rule · {escape(key)} v1.</p>'
            f'<p><b>Session</b> {escape(session)}</p><p><b>Eligible state</b> {escape(eligible)}</p>'
            f'<h2>Rules</h2><dl class="ict-scenarios">{blocks}</dl>'
            '<p>Record the first available objective before entry. A secondary objective requires a separate planned target.</p>'
            f'<h2>Direction-specific examples</h2><dl class="ict-scenarios"><dt>Long</dt><dd>{escape(long)}</dd>'
            f'<dt>Short</dt><dd>{escape(short)}</dd></dl>'
            f'<h2>Practice scenarios</h2><dl class="ict-scenarios">{scenarios}</dl>'
            f'{weekly_plan}{crosswalk.teaching(key)}<h2>Watch</h2>{resource_list(featured_for(key, catalog, item["sources"]), catalog, 3, media_note)}'
            f'{crosswalk.media(key, item["sources"])}{featured_index_link(key)}{creator_references(key, catalog)}'
            f'<h2>Related concepts</h2>{items([lesson_link(k) for k in item["concepts"]])}'
            f'{academy}<p>{link("Practice next", url("practice", 13))}</p>'
            f'<p>Record one primary playbook per trade. Record other concepts as secondary tags in the '
            f'{link("practice journal", url("practice", 16))}.</p></div>')


def build_ict_lab(root, dist, shell, write, academy, json_script, source, crosswalk, markets):
    validate_sources(source)
    for row in source["concepts"] + source["playbooks"]:
        videos = {placement["id"] for placement in row["sources"]}
        videos.update(record["videoId"] for _, _, record in crosswalk.supplements.get(row["id"], []))
        if len(videos) > 3:
            raise ValueError(f'{row["id"]} has more than three distinct video references')
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
        tabs = ""
        breadcrumbs = ""
        if path != ROOT_URL:
            links = []
            for key, label in VIEWS.items():
                state = "page" if path == url(key) else "location"
                current = f' aria-current="{state}"' if key == view else ""
                links.append(f'<a href="{url(key)}"{current}>{escape(label)}</a>')
            tabs = '<nav class="ict-tabs" aria-label="ICT Lab sections">' + "".join(links) + '</nav>'
            crumbs = link("ICT Lab", ROOT_URL)
            if view and path != url(view):
                crumbs += ' <span aria-hidden="true">/</span> ' + link(VIEWS[view], url(view))
            breadcrumbs = f'<nav class="ict-breadcrumbs" aria-label="Breadcrumb">{crumbs}</nav>'
        html = (f'<section class="ict-public" data-ict-view="{view}"><header class="ict-hero">'
                f'{breadcrumbs}<h1>{escape(title)}</h1>'
                f'<p>{escape(subtitle)}</p></header>{tabs}'
                f'{body}</section>')
        write(dist / path.lstrip("/") / "index.html", shell(f"{title} | ICT Lab", subtitle or title, html,
                                                              path, assets + extra))
        routes.append(path)

    full = sum(p["type"] == "Full episode" for p in podcasts)
    clips = sum(p["type"] == "Clip" for p in podcasts)
    if (len(mentors), full, clips) != (10, 9, 2) or full + clips != len(podcasts):
        raise ValueError("ICT Lab must publish 10 mentors, 9 full episodes and 2 clips")
    channels = [urlsplit(mentor["channel"] or "") for mentor in mentors]
    if len({channel.path for channel in channels}) != len(mentors) or any(
        channel.scheme != "https" or channel.netloc != "www.youtube.com" or not channel.path.startswith("/@")
        for channel in channels
    ):
        raise ValueError("Each approved mentor needs a distinct public YouTube channel")
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

    paths = learning_paths(link, lesson_link, lambda number: url("practice", number), index)
    rows = []
    names = {k: v["title"] for k, v in index.items()}
    for module in modules:
        goal, prerequisites, practice = MODULES[module["id"]]
        cards = []
        for key in module["concepts"]:
            item = index[key]
            cards.append(card(f'{key} · {item["title"]}', detail("learn", key), item["definition"], item["aliases"], "concept"))
            emit(detail("learn", key), "learn", item["title"],
                 concept_page(item, module, source, names, crosswalk),
                 f'{key} · Module {module["id"]:02} · {module["title"]}',
                 '<script type="module" src="/assets/ict-practice.mjs"></script>' if key == "C17" else "")
        rows.append(f'<section class="ict-group" data-ict-group><h2>{module["id"]:02} · {escape(module["title"])}</h2>'
                    f'<p>{len(module["concepts"])} concepts. {escape(goal)}</p><p>Prerequisites · '
                    + (" · ".join(lesson_link(key, f"{key} · {names[key]}") for key in prerequisites) if prerequisites else "Start here")
                    + ' · ' + link(f"Related Practice {practice}", url("practice", practice)) + '</p>'
                    + resource_list(module["sources"], source) + '<div class="ict-grid">' + "".join(cards) + "</div></section>")
    extension_slugs = set("bos choch cisd htf-fvg liquidity-run liquidity-void weekly-profiles mean-threshold ipda fpfvg opening-range-gap smt-fx-metals".split())
    extension_slugs.update(c["id"] for c in academy if c["id"] in {
        "listed-futures-market-basics", "contract-specs-and-tick-math", "futures-expiry-first-notice-and-roll",
        "continuous-contract-mapping", "futures-margin-and-position-risk", "futures-volume-open-interest",
    })
    extensions = [card(c.get("name", c["id"]), f'/ict-futures/academy/{c["id"]}.html', c.get("definition", ""),
                       c["id"], "extension") for c in academy if c.get("id") in extension_slugs]
    rows.append('<section class="ict-group" data-ict-group><h2>Academy extensions</h2>'
                '<p><a href="/academy/crosswalk/">See shared lessons and source coverage</a> · <a href="/ict-lab/resources/#academy-video-gaps">Review exact video gaps</a></p><div class="ict-grid">'
                + "".join(extensions) + "</div></section>")
    original_cards = [
        card(title, ROOT_URL + "resources/#original-sources", note, "official original ICT " + title, "original")
        for title, note, _ in OFFICIAL_SERIES
    ]
    rows.append('<section class="ict-group" data-ict-group><h2>Original ICT lectures</h2>'
                '<div class="ict-grid">' + "".join(original_cards) + '</div>'
                + resource_list(source["featured"], source)
                + f'<p>{link("Browse the complete resource index", ROOT_URL + "resources/")}</p></section>')
    learn_filters = filter_control("Learning resources", (
        ("concept", "All concepts"), ("extension", "Academy extensions"), ("original", "Original ICT sources")))
    emit(url("learn"), "learn", "Learn ICT", paths + search_form(url("learn")) + learn_filters + "".join(rows),
         f"{len(concepts)} concepts across {len(modules)} modules. Browse by module or search a topic.")

    play_cards = []
    for item in plays:
        play_cards.append(card(f'{item["id"]} · {item["title"]}', detail("playbooks", item["id"]), item["summary"],
                               item["category"] + (" OSOK" if item["id"] == "P10" else ""), "playbook"))
        emit(detail("playbooks", item["id"]), "playbooks", item["title"], playbook_page(item, source, crosswalk), item["id"])
    charter = ""
    if [entry["id"] for entry in source["charter"]] != list(range(1, 14)):
        raise ValueError("Original Charter shelf must retain Models 1-13 in order")
    for item in source["charter"]:
        related = lesson_link("P10") if item["id"] == 9 else lesson_link("P01") if item["id"] == 13 else ""
        charter += (f'<article class="ict-card" data-ict-item data-category="charter"><h3>Charter Model {item["id"]} · '
                    f'{escape(item["title"])}</h3>{resource_list(item["sources"], source)}{related}</article>')
    academy_models = [
        card(crosswalk.academy[slug]["name"], f'/ict-futures/academy/{slug}.html',
             note[2], slug + " " + note[0], "academy")
        for slug, note in PUBLIC_MODELS.items()
    ]
    play_filters = filter_control("Playbook sources", (
        ("playbook", "Lab playbooks"), ("academy", "Academy model variants"), ("charter", "Original ICT Charter")))
    emit(url("playbooks"), "playbooks", "ICT playbooks", search_form(url("playbooks")) + play_filters
         + '<section class="ict-group" data-ict-group><h2>Lab playbooks</h2><div class="ict-grid">'
         + "".join(play_cards) + '</div></section>'
         + '<section class="ict-group" data-ict-group><h2>Academy model variants</h2><div class="ict-grid">'
         + "".join(academy_models) + '</div></section><section class="ict-group" id="charter-lectures" data-ict-group><h2>Original ICT Charter sources</h2>'
         + '<p>Browse the ' + link("creator playlist", OFFICIAL_SERIES[2][2], True) + ' or the '
         + link("independent lecture index", CHARTER_INDEX, True) + '.</p><div class="ict-grid">' + charter + f'</div></section><p>{link("Compare Academy model variants", "/entry-models/")}</p>',
         f"{len(plays)} Lab playbooks and {len(source['charter'])} separately attributed Charter lectures.")

    lab_cards = []
    contracts = {}
    for market in (row for row in markets if row["id"] in {"nq", "es"}):
        for symbol, spec in ((market["id"].upper(), market), (market["microSpec"]["symbol"], market["microSpec"])):
            source_evidence = spec["specEvidence"]
            contracts[symbol] = {"tickSize": spec["tickSize"], "tickValue": spec["tickValue"],
                                 "status": spec["specStatus"], "source": source_evidence["sourceUrl"],
                                 "checkedAt": source_evidence.get("checkedAt"), "effectiveFrom": spec.get("specEffectiveFrom")}
    references = {"contracts": contracts, "sessionIds": [
        f'{crosswalk.windows[key]["name"]} ({crosswalk.windows[key]["start_local"]}–{crosswalk.windows[key]["end_local"]} ET)'
        for key in ("nyam", "nypm", "asia")]}
    inputs = {11: "Choose a sample and annotate the chart.", 12: "Choose a session, contract and planning date.",
              13: "Record a decision and reason before revealing the next bar.",
              14: "Choose an experiment and review the out-of-sample result.",
              15: "Enter contract, risk and stop assumptions.",
              16: "Record a trade or no-trade decision and review the journal export."}
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
        practice_data = (f'<script type="application/json" id="ict-practice-reference">{json_script(references)}</script>'
                         if key in {12, 14, 15} else "")
        emit(url("practice", key), "practice", item["title"],
             f'<div class="ict-reading"><h2>Before you begin</h2><p>{escape(inputs[key])}</p>'
             '<p>Interactive entries begin unsaved. Read the result below the form to confirm a local save or export.</p>'
             f'<section{practice_anchor} data-ict-practice="{key}" aria-label="Practice exercise">'
             '<p>Enable JavaScript for interactive practice. The tutorials below remain available.</p></section>'
             f'{playbook_choices}{checklist}{practice_data}<h2>Watch</h2>{resource_list(item["sources"], source, 3)}{creator_references(key, source)}'
             f'<h2>Next step</h2><p>{link("Open next lab", url("practice", key + 1)) if key < 16 else link("Review practice labs", url("practice"))}</p></div>', item["description"],
             ('<script defer src="/assets/publisher-schedules.js"></script>' if key == 12 else "")
             + '<script type="module" src="/assets/ict-practice.mjs"></script>')
    emit(url("practice"), "practice", "ICT practice labs", '<p data-ict-practice-progress>Saved practice records stay in this browser. Review each lab to see its entries.</p>'
         + search_form(url("practice"))
         + '<div class="ict-grid">' + "".join(lab_cards) + "</div>",
         f"{len(labs)} practical modules. Educational samples and local device storage are labeled in each lab.")

    mentor_topics = {
        "M01": ("C37", "C22", "C45"), "M02": ("C08", "C16", "P01"), "M03": ("C01", "C04"),
        "M04": ("C37", "C52"), "M05": ("P01", "C45"), "M06": ("C29", "C37"),
        "M07": ("C01", "C38"), "M08": ("C06", "C16"), "M09": ("P08", "P09"), "M10": ("P08", "P09"),
    }
    for view, records in (("podcasts", podcasts), ("mentors", mentors)):
        groups = {}
        has_popular = False
        for item in records:
            key = item["id"]
            title = item.get("title", item.get("name"))
            summary = item["summary"]
            show = item.get("type", "")
            section = item["program"] if view == "podcasts" else ""
            refs = item["sources"]
            popular = []
            topics = ()
            if view == "mentors":
                refs = refs + creator_sources(MENTOR_FOLLOWUPS.get(key, ()), source, refs)
                popular = comparable_popular(refs, source["videos"])
                topics = mentor_topics[key]
                has_popular |= bool(popular)
            searchable = " ".join(item.get(k, "") for k in ("type", "program", "guest"))
            if topics:
                searchable += " " + " ".join(crosswalk.lab[topic]["title"] for topic in topics)
            groups.setdefault(section, []).append(card(
                title, detail(view, key), summary, searchable, "popular" if popular else show))
            if view == "mentors":
                subsequent = f'<h3>Follow-up videos</h3>{resource_list(refs[1:], source)}' if refs[1:] else ""
                channel = link("Visit YouTube channel", item["channel"], True)
                channel_note = ("<p>The channel opens separately. Upload-to-channel identity still needs review.</p>"
                                if key == "M06" else "")
                ranking = ('<details><summary>Popular</summary>' +
                           '<ol>' + "".join(
                               f'<li>{link(ref["label"], ref["url"], True)} '
                               f'<small>{count:,} views observed {day}</small></li>'
                               for ref, count, day in popular) + '</ol></details>') if popular else ""
                matching = items([lesson_link(topic, crosswalk.lab[topic]["title"]) for topic in topics])
                body = (f'<p>{channel}</p>{channel_note}<h2>Start here</h2><h3>Best for this topic</h3>'
                        f'{resource_list(refs[:1], source)}{subsequent}<h2>Matching lessons</h2>{matching}{ranking}')
            else:
                identity_note = "<p>Guest identity still needs confirmation from the publisher.</p>" if key == "LF1VTFohH0U" else ""
                topics = ', '.join(crosswalk.lab[key]["title"] for key in item["related"])
                body = (f'<p><b>Topics</b> {escape(topics)}</p><p><b>Program</b> {escape(item["program"])}. '
                        f'{escape(item.get("host") or "Individual host unconfirmed.")}</p>'
                        f'<h2>Watch</h2>{resource_list(item["sources"], source)}{identity_note}'
                        '<p>See Source details for duration and chapter evidence. Unconfirmed fields remain open.</p>' 
                        f'<h2>Related lessons</h2>{items([lesson_link(k) for k in item["related"]])}'
                        f'<p class="ict-muted">{escape(show)} · {escape(item["program"])} · {escape(item["guest"])}</p>')
            emit(detail(view, key), view, title, f'<div class="ict-reading">{body}</div>', summary)
        subtitle = f"{len(mentors)} creator profiles." if view == "mentors" else f"{full} full episodes and {clips} clips."
        filters = ""
        if view == "podcasts":
            filters = filter_control("Format", (("Full episode", "Full episode"), ("Clip", "Clip")))
        elif has_popular:
            filters = filter_control("Mentor videos", (("popular", "Popular"),))
        cards = "".join(
            (f'<section data-ict-group class="ict-group"><h2>{escape(program)}</h2>' if program else "")
            + '<div class="ict-grid">' + "".join(cards) + "</div>" + ("</section>" if program else "")
            for program, cards in groups.items()
        )
        emit(url(view), view, "ICT " + VIEWS[view].lower(), search_form(url(view)) + filters + cards, subtitle)

    placements = {}
    for video, targets in TERMINAL_PLACEMENTS.items():
        for key, explanation in targets.items():
            placements.setdefault(key, {})[video] = explanation
    placement_sections = []
    for key, sources in placements.items():
        destination = (link("Liquidity Sweep + MSS", "/ict-futures/academy/" + key + ".html")
                       if key == "liquidity-sweep-mss-model" else lesson_link(key))
        refs = [{**ref, "explanation": sources[ref["id"]]}
                for ref in source["featured"] if ref["id"] in sources]
        placement_sections.append(f'<section id="placement-{key.lower()}"><h3>{destination}</h3>'
                                  + resource_list(refs, source) + '</section>')
    discovery = [link("Official ICT channel", "https://www.youtube.com/@InnerCircleTrader", True),
                 link("Official ICT playlists", "https://www.youtube.com/@InnerCircleTrader/playlists", True)]
    discovery.extend(link("Search YouTube for " + row["name"], row["videoSearch"], True) for row in academy
                     if row.get("videoSearch", "").startswith("https://www.youtube.com/results?"))
    original_sources = ('<h2 id="original-sources">Original ICT source library</h2>'
                        '<p>Browse creator lectures from ' + link("Michael J. Huddleston's ICT site", "https://theinnercircletrader.com/", True)
                        + '. The Lab curriculum is the site’s teaching sequence.</p>'
                        + items([f'<p>{escape(note)}</p>{link(title, href, True)}' for title, note, href in OFFICIAL_SERIES])
                        + '<p>' + link("Practice P01", detail("playbooks", "P01")) + ' · '
                        + link("See 2022 predecessor placements", ROOT_URL + "resources/#terminal-featured") + ' · '
                        + link("Browse Charter Models 1-13", url("playbooks") + "#charter-lectures") + '</p>'
                        + '<p>Compare session and first-gap rules in the Academy lessons on '
                        + link("opening range gaps", "/ict-futures/academy/opening-range-gap.html") + ' and '
                        + link("first-presented FVG", "/ict-futures/academy/fpfvg.html") + '.</p>')
    resource_links = (
        ("Original lectures", "#original-sources"), ("Watch catalogue and filters", "#watch-library"),
        ("Academy evidence gaps", "#academy-video-gaps"), ("Predecessor placements", "#terminal-featured"),
        ("Academy supplements", "#academy-supplements"), ("Discovery", "#resource-discovery"),
    )
    resource_nav = '<nav aria-label="Resource sections">' + items([link(label, href) for label, href in resource_links]) + '</nav>'
    watch_filters = filter_control("Source class", (("original", "Original ICT"), ("creator", "Creator or independent"), ("other", "Other or unconfirmed")))
    watch_filters += ('<div data-ict-evidence-wrap hidden><label for="ict-evidence">Evidence status</label> '
                      '<select id="ict-evidence" data-ict-evidence><option value="">All</option>'
                      '<option value="metadata-observed">Metadata observed</option><option value="unconfirmed">Unconfirmed</option></select></div>')
    emit(ROOT_URL + "resources/", "learn", "ICT resource index",
         '<div class="ict-reading">' + resource_nav + original_sources
         + '<h2 id="watch-library">Supplied watch links</h2>' + search_form(ROOT_URL + "resources/")
         + watch_filters + resource_list(source["library"], source, searchable=True)
         + gap_register(root, crosswalk, source, link)
         + '<h2 id="terminal-featured">Predecessor tutorial placements</h2>'
         + '<p>Compare each upload with the stated lesson rule. Playback and chapter fit are pending editorial review.</p>'
         + "".join(placement_sections)
         + '<h2 id="academy-supplements">Academy supplements</h2>' + "".join(
             f'<h3>{", ".join(escape(slug) for slug in row["lessons"])}</h3>{resource_list(row["sources"], source)}'
             for row in source["academySources"])
         + '<h2 id="resource-discovery">Discovery shortcuts</h2><p>Use publisher links and topic searches to find candidates. Playback and chapter coverage need a separate review.</p>'
         + '<details><summary>Browse channels, playlists and Academy searches</summary>' + items(discovery) + '</details></div>',
         "Resources retain their original time offsets. Playback and embedding can vary.")
    return routes
