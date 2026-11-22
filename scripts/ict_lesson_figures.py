"""Deterministic teaching diagrams with equivalent text for ICT Lab."""
from html import escape


def figure(title, values, marks):
    low, high = min(values) - 2, max(values) + 2
    x = lambda index: 18 + 284 * index / (len(values) - 1)
    y = lambda value: 117 - (value - low) * 96 / (high - low)
    points = " ".join(f"{x(i):.1f},{y(p):.1f}" for i, p in enumerate(values))
    dots = "".join(
        f'<circle cx="{x(i):.1f}" cy="{y(values[i]):.1f}" r="8" fill="var(--ict-accent)"/>'
        f'<text x="{x(i):.1f}" y="{y(values[i])+3:.1f}" text-anchor="middle" fill="var(--ict-action-ink)" font-size="9">{n}</text>'
        for n, (i, _) in enumerate(marks, 1)
    )
    equivalent = "".join(f'<li>{escape(text)} (sample {i+1}, price {values[i]:g})</li>' for i, text in marks)
    return (f'<figure class="ict-lesson-chart"><figcaption>{escape(title)}</figcaption>'
            '<svg viewBox="0 0 320 128" aria-hidden="true" width="640" height="256">'
            f'<polyline points="{points}" fill="none" stroke="currentColor" stroke-width="2"/>{dots}</svg>'
            f'<ol>{equivalent}</ol></figure>')


IFVG = [20014, 20011, 20013, 20005, 20008, 20011, 20006]
MMXM = [100, 104, 101, 104, 101, 97, 94, 99, 97, 102, 100, 105]
MMXM_MARKS = [(1, "Original consolidation"), (5, "First-side delivery"),
              (6, "Reversal candidate"), (9, "Opposite-side delivery"),
              (10, "Later retracement to evaluate for a second entry")]


def concept_diagrams(key):
    if key == "C07":
        return figure("Nested swings · schematic price path", [90, 102, 99, 105, 98, 101, 97, 115, 98, 104, 97, 108, 96, 103, 95],
                      [(1, "Short-term high, confirmed by its right neighbor"),
                       (3, "Intermediate high, with lower short-term highs on both sides"),
                       (7, "Longer-term high, with lower intermediate highs on both sides")])
    if key == "C10":
        return figure("Continuation · synthetic close sequence", [100, 108, 105, 110, 112], [(2, "Pullback"), (3, "Close above prior high")]) + figure(
            "Reversal · synthetic close sequence", [100, 108, 105, 103, 98], [(2, "Same pullback"), (4, "Close below prior low")])
    if key == "C17":
        return figure("Worked inversion · separate synthetic NQ example", [20145, 20140, 20143, 20134, 20137, 20140, 20142],
                      [(1, "The existing bullish FVG is 20139–20141"),
                       (3, "A completed close falls below 20139"),
                       (5, "First later return from below")]) + figure(
            "Look-alike · synthetic NQ 5-minute closes", [20145, 20140, 20143, 20140, 20144],
            [(1, "Existing bullish gap"), (3, "Wick low 20138, close 20140. Close-through condition remains unmet")])
    if key in {"C41", "C43"}:
        return figure("NQ · synthetic 5-minute series · 09:30 ET and 09:45 ET lows", [20012, 20020, 20017, 20008, 20018],
                      [(0, "09:30 swing low"), (3, "09:45 lower low")]) + figure(
            "ES · same date and timestamps · synthetic 5-minute series", [5000, 5008, 5005, 5002, 5009],
            [(0, "09:30 swing low"), (3, "09:45 higher low")])
    if key == "C42":
        return figure("NQ · synthetic 5-minute series · 09:30 and 09:45 ET highs", [20020, 20010, 20014, 20027, 20015],
                      [(0, "09:30 high"), (3, "09:45 higher high")]) + figure(
            "ES · same date and timestamps · synthetic 5-minute series", [5008, 5001, 5004, 5006, 5003],
            [(0, "09:30 high"), (3, "09:45 lower high")])
    if key in {"C46", "C47", "C48", "C49", "C50"}:
        return figure("One synthetic MMXM price path across C46–C50", MMXM, MMXM_MARKS)
    return ""
