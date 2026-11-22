"""Editorial relationships between the Lab, Academy, and terminal model records."""
from collections import defaultdict
from html import escape
from urllib.parse import parse_qs, urlsplit

from build_academy import academy_video_coverage, verified_lesson_videos
from ict_lesson_figures import figure


# These Academy definitions and identification steps cover the same concept.
# Retain the Lab rule where its scope or convention differs (for example C04).
SHARED_CONCEPTS = frozenset("""
C01 C02 C05 C06 C08 C09 C11 C12 C13 C14 C15 C16 C17 C18 C19 C20 C21 C22
C26 C31 C32 C38 C43
""".split())
COMPARISON_CONCEPTS = frozenset("C03 C10 C35 C41 C42".split())

# Slug, Lab IDs, relationship, and the reason the scopes match or differ.
PUBLIC_MODELS = {
    "unicorn": ("P06", "Shared study", "Compare the breaker/FVG overlap boundaries before applying the Lab retest rule."),
    "market-maker-buy-model": ("P08", "Shared study", "The exact ICT NQ chart illustrates this directional model."),
    "market-maker-sell-model": ("P09", "Shared study", "The TTrades chart uses XAUUSD. The Lab includes a separate synthetic NQ illustration."),
    "ict-2022-model": ("P01", "Shared study", "Episode 14 is a chart application of the liquidity raid, MSS and retracement sequence."),
    "liquidity-sweep-mss-model": ("P01 C04 C08", "Overlapping setup", "The sweep and MSS overlap. Keep this setup's trigger and context separately identifiable."),
    "fvg-continuation-model": ("C16 C10", "Distinct variant", "A continuation setup with FVG and continuation-versus-reversal prerequisites."),
    "ifvg-reversal-model": ("P07 C17", "Overlapping setup", "The inversion mechanism overlaps. Compare each version's breach and expiration rules."),
    "fvg-ote-confluence-model": ("P05 C16", "Distinct variant", "The FVG must overlap the OTE zone. P05 teaches the general retracement technique."),
}
TERMINAL_MODELS = {
    "Liquidity Sweep + MSS": ("liquidity-sweep-mss-model", "P01 C04 C08", "Overlapping setup"),
    "Silver Bullet": ("silver-bullet", "P02", "Shared study"),
    "ICT 2022 Model": ("ict-2022-model", "P01", "Shared study"),
    "Judas + MSS": ("judas-swing", "P03", "Overlapping setup"),
    "Unicorn": ("unicorn", "P06", "Shared study"),
    "FVG Continuation": ("fvg-continuation-model", "C16 C10", "Distinct variant"),
    "IFVG": ("ifvg", "P07", "Shared study"),
    "FVG + OTE": ("fvg-ote-confluence-model", "P05 C16", "Distinct variant"),
}
PLAYBOOK_LESSONS = {
    "P01": ("ict-2022-model",), "P02": ("silver-bullet",), "P03": ("judas-swing",),
    "P04": ("turtle-soup",), "P05": ("ote",), "P06": ("unicorn",), "P07": ("ifvg",),
    "P08": ("market-maker-buy-model",), "P09": ("market-maker-sell-model",),
}

# Promotion is scoped to the relationship below. General background stays on its Academy page.
LESSON_MEDIA = {
    "C08": [("mss", "nQfHZ2DEJ8c", "Original ICT mentorship lesson on MSS")],
    "C09": [("displacement", "PePk1V0Q4QQ", "Focused displacement chapter"),
            ("fvg", "Bkt8B3kLATQ", "Original ICT Episode 6 foundation")],
    "C15": [("ote", "1YRs4Z1lMws", "Independent OTE explanation")],
    "C16": [("fvg", "Bkt8B3kLATQ", "Original ICT Episode 6 foundation")],
    "C17": [("ifvg", "uDJI2AbyyCs", "Independent explanation of inversion FVG")],
    "C35": [("ndog", "Sh-bDHWNpsk", "Original ICT NDOG Part 1"),
            ("nwog", "WKKnlIIkBTk", "Original ICT NWOG")],
    "C38": [("amd-po3", "TCFvsZeYvV8", "Independent full AMD sequence")],
    "P01": [("ict-2022-model", "NUdu1n-ML98", "ICT Episode 14 Nasdaq application")],
    "P02": [("silver-bullet", "tRq1hyGGtl4", "Original ICT Silver Bullet lesson")],
    "P05": [("ote", "1YRs4Z1lMws", "Independent OTE explanation")],
    "P06": [("unicorn", "rXMVPUZPw4A", "Independent Unicorn model lesson")],
    "P07": [("ifvg", "uDJI2AbyyCs", "Independent concept explanation")],
    "P08": [("market-maker-buy-model", "1vsIPazjfGQ", "Original ICT NQ chart example")],
    "P09": [("market-maker-sell-model", "0R61Y6Pn74Q", "TTrades XAUUSD chart example")],
}


def academy_url(slug):
    return f"/ict-futures/academy/{slug}.html"


def lab_url(key):
    return f'/ict-lab/{"playbooks" if key.startswith("P") else "learn"}/{key.lower()}/'


def link(text, href):
    return f'<a href="{escape(href, quote=True)}">{escape(text)}</a>'


def relationship(key):
    if key in SHARED_CONCEPTS:
        return "Shared definition"
    if key in COMPARISON_CONCEPTS:
        return "Comparison"
    return "Academy background"


class IctCrosswalk:
    def __init__(self, academy, catalog, terminal):
        self.academy = {row["id"]: row for row in academy["concepts"]}
        self.catalog = catalog
        self.lab = {row["id"]: row for group in ("concepts", "playbooks") for row in catalog[group]}
        self.coverage = academy_video_coverage(academy)
        self.covered = set(self.coverage["coveredIds"])
        self.windows = {row["id"]: row for row in terminal["sessions"]}
        self.reverse = defaultdict(list)
        for row in catalog["concepts"]:
            for slug in row["academy"]:
                self.reverse[slug].append((row["id"], relationship(row["id"])))
        for key, slugs in PLAYBOOK_LESSONS.items():
            for slug in slugs:
                self.reverse[slug].append((key, "Related Lab playbook"))
        for slug, (ids, role, _) in PUBLIC_MODELS.items():
            self.reverse[slug] = [(key, role) for key in ids.split()] + [
                (key, relation) for key, relation in self.reverse[slug] if key not in ids.split()
            ]
        if self.reverse.keys() - self.academy.keys() or any(
            key not in self.lab for relations in self.reverse.values() for key, _ in relations
        ):
            raise ValueError("ICT crosswalk has an unknown Academy or Lab ID")
        if set(PUBLIC_MODELS) != {k for k, v in self.academy.items() if v["category"] == "Entry Models"}:
            raise ValueError("Entry Models crosswalk must cover the Academy model index")
        if set(TERMINAL_MODELS) != {row["name"] for row in terminal["models"]}:
            raise ValueError("ICT crosswalk must cover each terminal model")
        self.verified = {slug: verified_lesson_videos(row) for slug, row in self.academy.items()}
        self.supplements = {}
        for key, mappings in LESSON_MEDIA.items():
            items = []
            for slug, vid, label in mappings:
                exact = next((v for v in self.verified[slug] if v.get("videoId") == vid), None)
                if not exact:
                    raise ValueError(f"Missing verified Academy video for {key}: {slug}/{vid}")
                items.append((slug, label, exact))
            self.supplements[key] = items

    def academy_links(self, slugs):
        return [link(self.academy[slug]["name"], academy_url(slug)) for slug in slugs]

    def lab_links(self, keys):
        return [link(f'{key} · {self.lab[key]["title"]}', lab_url(key)) for key in keys]

    def lab_sidebar(self, slug):
        rows = self.reverse.get(slug, [])
        if not rows:
            return ""
        body = "".join(f'<li>{self.lab_links([key])[0]} <small>· {role}</small></li>' for key, role in rows)
        return '<section class="lesson-section" aria-label="ICT Lab crosswalk"><h2>Continue in ICT Lab</h2><ul>' + body + '</ul></section>'

    def definition(self, row):
        key = row["id"]
        if key in {"C41", "C42"}:
            return self.academy["smt"]["definition"]
        if key in SHARED_CONCEPTS:
            return self.academy[row["academy"][0]]["definition"]
        return row["definition"]

    def shared_steps(self, row):
        if row["id"] not in SHARED_CONCEPTS or row["id"] in {"C17", "C43"}:
            return []
        return self.academy[row["academy"][0]]["howToUse"]

    def playbook_academy(self, key):
        slugs = list(PLAYBOOK_LESSONS.get(key, ()))
        slugs.extend(slug for slug, (ids, _, _) in PUBLIC_MODELS.items()
                     if key in ids.split() and slug not in slugs)
        if not slugs:
            return ""
        return '<h2>Academy study</h2><p>' + ' · '.join(self.academy_links(slugs)) + '</p>'

    def media(self, key, supplied):
        def video_key(value):
            query = parse_qs(urlsplit(value).query)
            return query.get("v", [""])[0], query.get("t", [""])[0]

        seen = {video_key(item["url"]) for item in supplied}
        result = []
        for slug, label, record in self.supplements.get(key, []):
            identity = video_key(record["url"])
            source_label = (escape(label) + ' (supplied above)' if identity in seen else
                            link(label, record["url"]))
            seen.add(identity)
            result.append(
                f'<li>{source_label} <small>{escape(record["channelName"])}'
                f' · {escape(record["verifiedAt"])} Academy mapping · {link(self.academy[slug]["name"], academy_url(slug))}</small>'
                f'<p>{escape(record["sourceNote"])}</p></li>'
            )
        if not result:
            return ""
        return '<h3>Academy-mapped sources</h3><ul>' + "".join(result) + '</ul>'

    def model_cards(self, terminal_models):
        parts = []
        for row in terminal_models:
            name = row["name"]
            slug, raw_keys, role = TERMINAL_MODELS[name]
            keys = raw_keys.split()
            parts.append(f'<details><summary>{escape(name)} · {role}</summary><p>'
                         + " · ".join(self.academy_links([slug]) + self.lab_links(keys)) + '</p>')
            if role != "Shared study":
                labels = ("Context", "Entry", "Stop", "Target", "Invalidation")
                parts.append("<dl>" + "".join(f'<dt>{label}</dt><dd>{escape(row[label.lower()])}</dd>' for label in labels) + "</dl>")
            if name == "Judas + MSS":
                parts.append("<p>This variant explicitly requires MSS after the early move. The Lab reversal evidence is described in P03.</p>")
            parts.append("</details>")
        return "".join(parts)

    def page(self):
        counts = self.coverage
        rows = []
        for item in self.catalog["concepts"]:
            key = item["id"]
            linked = [link(self.academy[slug]["name"] + (" · mapped video" if slug in self.covered else " · video needed"),
                           academy_url(slug)) for slug in item["academy"]]
            rows.append(f'<tr><th scope="row">{self.lab_links([key])[0]}</th><td>{relationship(key)}</td><td>{" · ".join(linked)}</td></tr>')
        models = []
        for slug, (ids, role, note) in PUBLIC_MODELS.items():
            models.append(f'<tr><th scope="row">{self.academy_links([slug])[0]}</th>'
                          f'<td>{role}<br>{" · ".join(self.lab_links(ids.split()))}</td>'
                          f'<td>{"Mapped Academy video" if slug in self.covered else "Exact model video needed"} · {escape(note)}</td></tr>')
        gaps = "".join(f'<li>{self.academy_links([slug])[0]}</li>' for slug in counts["missingIds"])
        return (
            f'<p>{counts["coveredCount"]} of {counts["eligibleCount"]} Academy lessons have an exact mapped video. '
            f'{counts["entryModelCoverage"]["coveredCount"]} of {counts["entryModelCoverage"]["eligibleCount"]} '
            'Entry Models have one. These are Academy mappings. Supplied Lab links and playback checks have independent evidence.</p>'
            '<h2>Lab concepts and Academy lessons</h2><div class="table-wrap"><table>'
            '<thead><tr><th scope="col">Lab lesson</th><th scope="col">Relationship</th><th scope="col">Academy references</th></tr></thead>'
            '<tbody>' + "".join(rows) + '</tbody></table></div>'
            '<h2>Entry Models</h2><div class="table-wrap"><table><thead><tr><th scope="col">Academy model</th>'
            '<th scope="col">Lab relationship</th><th scope="col">Scope and source evidence</th></tr></thead><tbody>'
            + "".join(models) + '</tbody></table></div>'
            f'<h2>{counts["missingCount"]} Academy video gaps</h2><ul>{gaps}</ul>'
        )

    def teaching(self, key):
        windows = {
            "C27": ("london", "New York clock for the London reference window", "Forex source and separately labelled Lab adaptation."),
            "C28": ("nyam", "Lab index-futures NY AM convention", "The Academy also records a separate forex NY window."),
            "C29": ("lunch", "Lab lunch window", "A community lunch reversal is a separate setup."),
        }
        if key in windows:
            name, label, note = windows[key]
            row = self.windows[name]
            if key == "C29":
                afternoon = self.windows["nypm"]
                note += f' The afternoon reference is {afternoon["start_local"]}–{afternoon["end_local"]} ET.'
            return f'<p><b>{label}</b> {row["start_local"]}–{row["end_local"]} ET. {note}</p>'
        return EXERCISES.get(key, "")


EXERCISES = {
    "C04": "<p>The Lab records the liquidity breach first and assesses the response separately. The linked Academy convention additionally requires a close back inside.</p>",
    "C33": "<p>Prior-month example: the last completed month reached 20,440 and 19,180. Keep those extrema fixed after the new month starts. IPDA is background for lookback.</p>",
    "C35": "<p>Mark two independent gaps. For a day exercise the declared close and next day open are 20,010 and 20,020. For a week exercise the declared Friday close and next eligible week open are 20,080 and 20,060. State the chosen session boundary and contract before comparing.</p>",
    "C36": "<p>Top-down NQ exercise: daily objective 20,180, hourly return zone 20,080–20,100, five-minute confirmation above 20,115. A close below 20,065 invalidates the staged idea. Mark each level with its timeframe.</p>",
    "C37": "<p>Conditional bias: study upside only while the prior low at 20,010 holds and the upside target at 20,180 remains untraded. Reject the plan after a close below the low or after the target trades first.</p>",
    "C39": "<p>Use the same New York trading date for an intraday profile. Record any weekly narrative as separate context with its own start, end and invalidation.</p>",
    "C40": "<p>No-trade example: the target already traded before the retest, or the required close never printed before the session end. Record the first observable skip condition and the decision time.</p>",
    "C44": "<p>Mark the hourly objective first, then the 15-minute setup zone, then the five-minute close that would confirm an entry. A five-minute trigger outside the setup zone does not meet this exercise.</p>",
    "C45": "<p>Write the required event before replay. For this exercise a five-minute candle must close above 20,115. A wick to 20,118 that closes at 20,112 is a wait decision.</p>",
    "C51": "<p>Two-sided exercise: the session first runs above the 20,100 opening-range high and later trades below the 20,040 low. Record when the first directional premise failed and write the reason to skip a fresh entry.</p>",
    "C52": "<p>Before opening the next session replay, record today's closing price, one conditional objective above it and one invalidation below it. Keep tomorrow's bars hidden until the plan is written.</p>",
    "C53": "<p>Mark the source order block first, then mark the later reaction and qualifying close through the selected continuation reference. Keep the educator’s boundary rule with the example.</p>",
    "C54": "<p>The Academy forex reference records a 14:00–20:00 ET window with convention variation. For a separate synthetic NQ exercise, explicitly choose 14:00–16:00 ET and candle bodies only. Opens and closes of 20,010, 20,020 and 20,005 give a body range of 15 points. This is a Lab adaptation.</p>",
    "C56": "<p>Use the open field of separate 00:00 and 08:30 New York bars on the same date and named contract. If a bar is absent, leave that reference unavailable. Keep the 09:30 cash reference and futures session start separate.</p>",
    "P09": figure("Lab-authored synthetic NQ MMSM illustration · prices are hypothetical", [20020, 20036, 20028, 20042, 20018, 20029, 19996],
                  [(3, "Buy-side run"), (4, "Downside break"), (5, "Retest candidate"), (6, "Downside objective")]),
}
