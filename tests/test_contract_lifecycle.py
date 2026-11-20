import json
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_site import public_contract_lifecycle_data
from import_authorized_contract_lifecycle import validate_rights_manifest, validate_snapshot


class ContractLifecycleRightsGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.snapshot = json.loads((ROOT / "data/contract-lifecycle.json").read_text(encoding="utf-8"))
        cls.family_ids = {x["id"] for x in json.loads((ROOT / "ict-futures/data/market-universe.json").read_text(encoding="utf-8"))["markets"]}

    def test_repository_snapshot_has_no_unlicensed_contract_rows(self):
        self.assertEqual(self.snapshot["rightsStatus"], "not-approved")
        self.assertEqual(self.snapshot["coverage"], {"familyCount": 15, "familiesWithCurrentOrFutureRows": 0, "contractMonthRows": 0})
        self.assertEqual(self.snapshot["products"], [])

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
        products = [
            {"marketId": family, "label": "Test-only family", "contractMonths": [{"contractSymbol": "SYNTHETIC_TEST_ONLY", "contractMonth": "209912", "lastTradeDate": "2099-12-31", "privateToken": "never-publish"}]}
            for family in sorted(self.family_ids)
        ]
        raw = {
            "rightsStatus": "approved-public-display",
            "rightsReviewDate": "2026-11-20",
            "rightsReference": "PRIVATE-TEST-ONLY",
            "coverage": {"familyCount": 15, "familiesWithCurrentOrFutureRows": 15, "contractMonthRows": 15},
            "products": products,
        }
        public = public_contract_lifecycle_data(raw)
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

    def test_contract_page_and_public_json_show_the_unconfigured_rights_state(self):
        page = (ROOT / "dist/contract-specs/index.html").read_text(encoding="utf-8")
        public_json = json.loads((ROOT / "dist/data/contract-lifecycle.json").read_text(encoding="utf-8"))
        self.assertIn("Contract date display is rights-gated", page)
        self.assertIn("No lifecycle dates are licensed and configured for public display", page)
        self.assertIn("No schedule rows are configured for public display", page)
        self.assertEqual(public_json["rightsStatus"], "not-approved")
        self.assertEqual(public_json["coverage"]["contractMonthRows"], 0)
        self.assertEqual(public_json["products"], [])


if __name__ == "__main__":
    unittest.main()
