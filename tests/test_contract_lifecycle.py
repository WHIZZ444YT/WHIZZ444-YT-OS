import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_site import public_contract_lifecycle_data
from import_authorized_contract_lifecycle import import_snapshot, validate_rights_manifest, validate_snapshot


class ContractLifecycleRightsGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.snapshot = json.loads((ROOT / "data/contract-lifecycle.json").read_text(encoding="utf-8"))
        cls.family_ids = {x["id"] for x in json.loads((ROOT / "ict-futures/data/market-universe.json").read_text(encoding="utf-8"))["markets"]}

    def test_repository_snapshot_respects_the_configured_rights_state(self):
        public = public_contract_lifecycle_data(self.snapshot, self.family_ids)
        self.assertEqual(public["rightsStatus"], self.snapshot["rightsStatus"])
        self.assertEqual(public["coverage"], self.snapshot["coverage"])

    def test_builder_fails_closed_and_does_not_publish_unapproved_data(self):
        secret_row = {"contractSymbol": "SYNTHETIC_TEST_ONLY", "contractMonth": "209912", "lastTradeDate": "2099-12-31", "sourceUrl": "https://www.cmegroup.com/example", "privateToken": "must-not-escape"}
        raw = {"products": [{"marketId": "nq", "contractMonths": [secret_row]}], "coverage": {"familyCount": 15, "familiesWithCurrentOrFutureRows": 15, "contractMonthRows": 1}}
        public = public_contract_lifecycle_data(raw)
        self.assertEqual(public["rightsStatus"], "not-approved")
        self.assertEqual(public["products"], [])
        self.assertNotIn("must-not-escape", json.dumps(public))

    def test_valid_rights_attestation_must_explicitly_cover_all_fifteen_families(self):
        rights = {
            "schemaVersion": 1,
            "status": "approved",
            "publicDisplayAllowed": True,
            "scope": "contract-lifecycle-public-website",
            "licenseReference": "TEST-ONLY-FAKE-REFERENCE",
            "reviewedAt": "2026-11-20",
            "validThrough": "2026-12-31",
            "families": sorted(self.family_ids),
        }
        self.assertEqual(validate_rights_manifest(rights, self.family_ids, date(2026, 11, 20)), "2026-11-20")
        rights["families"] = rights["families"][:-1]
        with self.assertRaisesRegex(ValueError, "exactly all 15"):
            validate_rights_manifest(rights, self.family_ids, date(2026, 11, 20))

    def test_expired_or_unapproved_rights_are_rejected(self):
        rights = {
            "schemaVersion": 1,
            "status": "approved",
            "publicDisplayAllowed": True,
            "scope": "contract-lifecycle-public-website",
            "licenseReference": "TEST-ONLY-FAKE-REFERENCE",
            "reviewedAt": "2026-11-20",
            "validThrough": "2026-11-20",
            "families": sorted(self.family_ids),
        }
        with self.assertRaisesRegex(ValueError, "expired"):
            validate_rights_manifest(rights, self.family_ids, date(2026, 11, 21))
        rights["status"] = "pending"
        with self.assertRaisesRegex(ValueError, "not explicitly approved"):
            validate_rights_manifest(rights, self.family_ids, date(2026, 11, 20))

    def test_public_builder_allowlists_data_and_omits_private_rights_fields(self):
        day = date(2026, 11, 20)
        raw = self.authorized_fixture(day)
        raw["rightsReference"] = "PRIVATE-TEST-ONLY"
        raw["products"][0]["contractMonths"][0]["privateToken"] = "never-publish"
        public = public_contract_lifecycle_data(raw, self.family_ids, as_of=day)
        serialized = json.dumps(public)
        self.assertEqual(public["rightsStatus"], "approved-public-display")
        self.assertNotIn("PRIVATE-TEST-ONLY", serialized)
        self.assertNotIn("never-publish", serialized)
        self.assertTrue(all("privateToken" not in row for product in public["products"] for row in product["contractMonths"]))

    def test_import_refusal_does_not_replace_existing_snapshot(self):
        from import_authorized_contract_lifecycle import import_snapshot

        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            source = folder / "source.json"
            rights = folder / "rights.json"
            output = folder / "existing.json"
            source.write_text('{"schemaVersion":1}', encoding="utf-8")
            rights.write_text('{"schemaVersion":1,"status":"pending"}', encoding="utf-8")
            output.write_text("existing-safe-state", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "not explicitly approved"):
                import_snapshot(source, rights, output, date(2026, 11, 20))
            self.assertEqual(output.read_text(encoding="utf-8"), "existing-safe-state")

    def test_import_shape_accepts_complete_synthetic_fixture_and_recounts_rows(self):
        row = {
            "contractSymbol": "TEST",
            "contractMonth": "209912",
            "firstTradeDate": "2099-01-01",
            "lastTradeDate": "2099-12-31",
            "firstNoticeDate": None,
            "lastNoticeDate": None,
            "firstDeliveryDate": None,
            "lastDeliveryDate": None,
            "finalSettlementDate": None,
            "sourceUrl": "https://www.cmegroup.com/test-only-synthetic-fixture",
        }
        snapshot = {
            "schemaVersion": 1,
            "asOfDate": "2026-11-20",
            "cmeSourceBusinessDate": "2026-11-20",
            "products": [
                {"marketId": family, "specificationUrl": "https://www.cmegroup.com/test-only-synthetic-fixture", "contractMonths": [dict(row)]}
                for family in sorted(self.family_ids)
            ],
        }
        result = validate_snapshot(snapshot, self.family_ids, date(2026, 11, 20))
        self.assertEqual(result["coverage"], {"familyCount": 15, "familiesWithCurrentOrFutureRows": 15, "contractMonthRows": 15})

    def test_import_shape_rejects_stale_dates_and_duplicate_rows(self):
        row = {"contractSymbol": "TEST", "contractMonth": "209912", "lastTradeDate": "2099-12-31", "sourceUrl": "https://www.cmegroup.com/test-only-synthetic-fixture"}
        products = [
            {"marketId": family, "specificationUrl": "https://www.cmegroup.com/test-only-synthetic-fixture", "contractMonths": [dict(row)]}
            for family in sorted(self.family_ids)
        ]
        snapshot = {"schemaVersion": 1, "asOfDate": "2026-11-20", "cmeSourceBusinessDate": "2026-11-20", "products": products}
        stale = dict(snapshot, cmeSourceBusinessDate="2026-11-12")
        with self.assertRaisesRegex(ValueError, "more than seven days old"):
            validate_snapshot(stale, self.family_ids, date(2026, 11, 20))
        products[0]["contractMonths"].append(dict(row))
        with self.assertRaisesRegex(ValueError, "duplicate contract row"):
            validate_snapshot(snapshot, self.family_ids, date(2026, 11, 20))

    def authorized_fixture(self, day):
        url = "https://www.cmegroup.com/test-only-synthetic-fixture"
        data = {"schemaVersion": 1, "asOfDate": day.isoformat(), "cmeSourceBusinessDate": day.isoformat(),
                "products": [{"marketId": family, "specificationUrl": url, "contractMonths": [
                    {"contractSymbol": "SYNTHZ99", "contractMonth": "209912", "lastTradeDate": "2099-11-30", "sourceUrl": url}
                ]} for family in sorted(self.family_ids)]}
        return {**validate_snapshot(data, self.family_ids, day), "rightsStatus": "approved-public-display",
                "rightsReviewDate": day.isoformat(), "rightsValidThrough": day.isoformat()}

    def test_impossible_months_fail_import_and_publication(self):
        day = date(2026, 11, 20)
        for month in ("202600", "202613", "000012", "2026-12", "2026", None):
            with self.subTest(month=month):
                source = self.authorized_fixture(day)
                source["products"][0]["contractMonths"][0]["contractMonth"] = month
                with self.assertRaisesRegex(ValueError, "invalid YYYYMM"):
                    validate_snapshot(source, self.family_ids, day)
                self.assertEqual(public_contract_lifecycle_data(source, self.family_ids, as_of=day)["products"], [])
        valid = self.authorized_fixture(day)
        self.assertEqual(public_contract_lifecycle_data(valid,self.family_ids,as_of=day)["rightsStatus"], "approved-public-display")
        self.assertEqual(public_contract_lifecycle_data(valid,self.family_ids,as_of=date(2026,11,21))["products"], [])
        valid["products"][0]["marketId"] = "unknown"
        self.assertEqual(public_contract_lifecycle_data(valid,self.family_ids,as_of=day)["products"], [])

    def test_authorized_import_build_and_validate_in_an_isolated_copy(self):
        day = datetime.now(timezone.utc).date()
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            repo = folder / "repo"
            shutil.copytree(ROOT, repo, ignore=shutil.ignore_patterns(".git", "dist", "__pycache__", "node_modules", ".env"))
            source = folder / "source.json"
            rights = folder / "rights.json"
            source.write_text(json.dumps(self.authorized_fixture(day)), encoding="utf-8")
            rights.write_text(json.dumps({"schemaVersion":1,"status":"approved","publicDisplayAllowed":True,
                "scope":"contract-lifecycle-public-website","licenseReference":"synthetic fixture only",
                "reviewedAt":day.isoformat(),"validThrough":day.isoformat(),"families":sorted(self.family_ids)}), encoding="utf-8")
            import_snapshot(source,rights,repo/"data/contract-lifecycle.json",day)
            env = {**os.environ, "SITE_URL": "https://example.invalid", "PYTHONIOENCODING": "utf-8"}
            for script in ("scripts/build_site.py", "scripts/validate.py"):
                result = subprocess.run([sys.executable, script], cwd=repo, env=env, capture_output=True, text=True, encoding="utf-8")
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            data = json.loads((repo/"dist/data/contract-lifecycle.json").read_text(encoding="utf-8"))
            self.assertEqual(data["coverage"]["contractMonthRows"],15)
            page = (repo/"dist/contract-specs/index.html").read_text(encoding="utf-8")
            self.assertEqual(page.count("SYNTHZ99"),15)
            self.assertNotIn("synthetic fixture only",json.dumps(data))

    def test_contract_page_and_public_json_show_the_configured_rights_state(self):
        page = (ROOT / "dist/contract-specs/index.html").read_text(encoding="utf-8")
        public_json = json.loads((ROOT / "dist/data/contract-lifecycle.json").read_text(encoding="utf-8"))
        self.assertIn("Contract date display is rights-gated", page)
        self.assertEqual(public_json,public_contract_lifecycle_data(self.snapshot,self.family_ids))
        if public_json["rightsStatus"]=="not-approved":
            self.assertIn("No schedule rows are configured for public display", page)
            self.assertEqual(public_json["coverage"]["contractMonthRows"],0)
            self.assertEqual(public_json["products"],[])


if __name__ == "__main__":
    unittest.main()
