from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from ict_official_sources import comparable_popular


class PopularityEvidenceTests(unittest.TestCase):
    def test_comparable_dated_publisher_counts_only(self):
        refs = [{"id": key} for key in ("first", "second", "undated")]
        videos = {ref["id"]: {"id": ref["id"], "url": "https://www.youtube.com/watch?v=" + ref["id"]}
                  for ref in refs}
        for key, count in (("first", 12), ("second", 31), ("undated", 999)):
            videos[key]["viewSnapshot"] = {
                "count": count, "observedAt": "2026-11-22", "sourceUrl": videos[key]["url"], "verified": True,
            }
        videos["undated"]["viewSnapshot"]["observedAt"] = ""
        self.assertEqual(comparable_popular(refs, videos), [(refs[1], 31, "2026-11-22"), (refs[0], 12, "2026-11-22")])
        videos["second"]["viewSnapshot"]["observedAt"] = "2026-11-21"
        self.assertEqual(comparable_popular(refs, videos), [])
        videos["second"]["viewSnapshot"]["sourceUrl"] = "https://example.com"
        self.assertEqual(comparable_popular(refs, videos), [])
