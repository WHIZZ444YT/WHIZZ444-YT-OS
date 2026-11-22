"""Editorial paths and predecessor video placements for the public ICT Lab."""
from html import escape


TERMINAL_PLACEMENTS = {
    "nQfHZ2DEJ8c": {"C14": "Identify internal liquidity inside the stated dealing range.",
                    "C08": "Compare the structure shift with the liquidity that preceded it."},
    "Bkt8B3kLATQ": {"C16": "Study the imbalance left by a displacement leg.",
                    "C08": "Compare a shift in structure with a simple break of a prior swing.",
                    "C09": "Identify the displacement leg before marking the gap.",
                    "P01": "Follow the sequence from the liquidity raid to the retracement."},
    "NUdu1n-ML98": {"P01": "Compare the chart application with the named 2022 playbook.",
                    "liquidity-sweep-mss-model": "Compare sweep and shift mechanics with the entry model's distinct criteria."},
    "QKc_i90chVg": {"C21": "Compare the candidate order block with the move that follows it.",
                    "C08": "Mark the relevant structure level before evaluating the application.",
                    "C09": "Separate displacement evidence from an ordinary range expansion."},
}


def learning_paths(link, lesson, practice, concepts):
    academy = "/ict-futures/academy/"
    paths = (
        ("First ICT workflow", (
            lesson("C01", "Liquidity"), link("Market structure", academy + "market-structure.html"),
            lesson("C16", "Fair value gaps"), lesson("P01", "ICT 2022 playbook"),
            link("Blind replay", practice(13)), link("Journal", practice(16)))),
        ("Active NQ/ES learner", (
            lesson("C37", "Daily bias"), lesson("C41", "Bullish SMT"), lesson("C42", "Bearish SMT"),
            lesson("C45", "Lower-timeframe confirmation"), link("Futures risk", practice(15)))),
        ("Contract foundations", (
            link("Listed futures", academy + "listed-futures-market-basics.html"),
            link("Expiry and roll", academy + "futures-expiry-first-notice-and-roll.html"),
            link("Continuous charts", academy + "continuous-contract-mapping.html"),
            link("Tick math", academy + "contract-specs-and-tick-math.html"),
            link("Sessions and holiday schedules", "/sessions/"),
            link("Session planner", practice(12)), link("Position sizing", practice(15)))),
        ("Practice review", (
            lesson("C04", concepts["C04"]["title"]), lesson("P01", "Compare invalid and no-trade examples"),
            link("Commit a replay decision", practice(13)), link("Review decision, adherence and outcome", practice(16)))),
    )
    def path_card(title, steps):
        return (f'<article class="ict-card"><h3>{escape(title)}</h3><ol>'
                + "".join(f'<li>{step}</li>' for step in steps) + '</ol></article>')
    return ('<section class="ict-group" aria-labelledby="learning-paths"><h2 id="learning-paths">Learning paths</h2>'
            '<p>Suggested starting path</p>' + path_card(*paths[0])
            + '<details><summary>Explore more learning paths</summary><div class="ict-grid">'
            + "".join(path_card(title, steps) for title, steps in paths[1:]) + '</div></details></section>')



def featured_for(key, catalog, existing):
    featured = {ref["id"]: ref for ref in catalog["featured"]}
    supplemental = {video: note[key] for video, note in TERMINAL_PLACEMENTS.items() if key in note}
    by_id = {ref["id"] for ref in existing}
    return [
        {**ref, **({"explanation": supplemental[ref["id"]]} if ref["id"] in supplemental else {})}
        for ref in existing
    ] + [
        {**featured[video], "explanation": explanation}
        for video, explanation in supplemental.items() if video not in by_id
    ]
