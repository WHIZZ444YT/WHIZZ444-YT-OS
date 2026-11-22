"""Check preservation of the exact watch URLs supplied by the ICT Lab catalog document."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
WATCH_URL = re.compile(r"https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}(?:&[^\s<>\x22)\x60]+)*")


def watch_urls(path):
    return set(WATCH_URL.findall(path.read_text(encoding="utf-8")))


if __name__ == "__main__":
    supplied = watch_urls(ROOT / "docs/futures-market-improvements/03-ict-curriculum-and-video-catalog.md")
    catalog = watch_urls(ROOT / "ict-lab/catalog.json")
    if len(supplied) != 100:
        sys.exit(f"Expected 100 supplied watch URL variants, found {len(supplied)}.")
    missing = sorted(supplied - catalog)
    if missing:
        sys.exit("Catalog is missing supplied watch URLs:\n" + "\n".join(missing))
    print("Catalog preserves all 100 supplied watch URL variants and exact offsets.")

