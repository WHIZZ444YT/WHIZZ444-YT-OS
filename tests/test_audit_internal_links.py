"""Regression tests for the offline generated-site link audit."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest


AUDITOR = Path(__file__).resolve().parents[1] / "scripts/audit_internal_links.py"
SITE = "https://finance-os.example"


class InternalLinkAuditTests(unittest.TestCase):
    def audit(self, href, site_url=SITE):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            script = root / "scripts" / AUDITOR.name
            script.parent.mkdir()
            shutil.copyfile(AUDITOR, script)
            destination = root / "dist" / "lesson"
            destination.mkdir(parents=True)
            (destination / "index.html").write_text('<h1 id="entry">Lesson</h1>', encoding="utf-8")
            (destination.parent / "index.html").write_text(
                f'<a href="{href}">Lesson</a>', encoding="utf-8"
            )
            return subprocess.run(
                [sys.executable, str(script)],
                env={**os.environ, "SITE_URL": site_url},
                capture_output=True,
                text=True,
                check=False,
            )

    def test_existing_absolute_destination_and_fragment(self):
        for href in (SITE + "/lesson/?q=FVG#entry", "//FINANCE-OS.EXAMPLE:443/lesson/#entry"):
            with self.subTest(href=href):
                result = self.audit(href, SITE + "/")
                self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
                self.assertIn("internal links checked: 1; issues: 0", result.stdout)

    def test_missing_destinations_fail_for_absolute_and_relative_urls(self):
        for href in (SITE + "/missing/", "/missing/"):
            with self.subTest(href=href):
                result = self.audit(href)
                self.assertEqual(result.returncode, 1)
                self.assertIn(f"missing {href}", result.stdout)

    def test_missing_same_origin_fragment_fails(self):
        href = SITE + "/lesson/#missing"
        result = self.audit(href)
        self.assertEqual(result.returncode, 1)
        self.assertIn(f"missing-anchor {href}", result.stdout)

    def test_other_origins_are_skipped(self):
        for href in (
            "https://external.invalid/missing/",
            "http://finance-os.example/missing/",
            "https://finance-os.example:8443/missing/",
        ):
            with self.subTest(href=href):
                result = self.audit(href)
                self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
                self.assertIn("internal links checked: 0; issues: 0", result.stdout)

    def test_relative_local_build_without_site_url(self):
        result = self.audit("/lesson/#entry", "")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn("internal links checked: 1; issues: 0", result.stdout)
