"""Keep the free-data roadmap complete and its internal links resolvable."""
from pathlib import Path
import re
import unittest
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "docs/free-api-integration"
LINK = re.compile(r"(?<!!)\]\(([^\s)]+)\)")


class FreeApiDocsTests(unittest.TestCase):
    def test_all_workstreams_are_indexed(self):
        workstreams = sorted(PACK.glob("*/*.md"))
        numbers = sorted(path.name[:2] for path in workstreams)
        self.assertEqual(numbers, [f"{number:02d}" for number in range(28)])
        index = (PACK / "README.md").read_text(encoding="utf-8")
        for path in workstreams:
            with self.subTest(path=path):
                self.assertIn(f"]({path.relative_to(PACK).as_posix()})", index)

    def test_relative_destinations_exist(self):
        for document in sorted(PACK.rglob("*.md")):
            for link in LINK.findall(document.read_text(encoding="utf-8")):
                target = urlsplit(link)
                if target.scheme or target.netloc or not target.path:
                    continue
                with self.subTest(document=document.relative_to(ROOT), link=link):
                    destination = (document.parent / unquote(target.path)).resolve()
                    self.assertTrue(destination.is_relative_to(ROOT))
                    self.assertTrue(destination.exists(), destination)
