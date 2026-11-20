#!/usr/bin/env python3
"""Validate and import a human-approved, redistributable contract lifecycle snapshot.

This tool has no network access and does not scrape exchange pages. It refuses to
publish contract dates without an owner-supplied rights manifest authorizing public
website display for the full futures-family scope. A manifest is an attestation to
be reviewed by the data/licensing owner, not legal advice or proof of a license.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
MARKETS_PATH = ROOT / "ict-futures" / "data" / "market-universe.json"
DEFAULT_OUTPUT = ROOT / "data" / "contract-lifecycle.json"
MAX_INPUT_BYTES = 30_000_000
MAX_RIGHTS_BYTES = 100_000
DATE_FIELDS = (
    "maturityDate", "firstTradeDate", "lastTradeDate", "firstNoticeDate",
    "lastNoticeDate", "firstDeliveryDate", "lastDeliveryDate", "finalSettlementDate",
)


def _iso_date(value: object, label: str, *, required: bool = False) -> str | None:
    if value in (None, "") and not required:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{label} must be an ISO date string.")
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"{label} must be an ISO date string.") from exc
    if parsed.isoformat() != value:
        raise ValueError(f"{label} must use YYYY-MM-DD format.")
    return value


def _official_url(value: object, label: str) -> str:
    if not isinstance(value, str) or len(value) > 2048:
        raise ValueError(f"{label} must be a publisher URL.")
    parsed = urlparse(value)
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or not any(host == domain or host.endswith("." + domain) for domain in ("cmegroup.com", "ice.com")):
        raise ValueError(f"{label} must link to an official CME Group or ICE HTTPS source.")
    if parsed.username or parsed.password:
        raise ValueError(f"{label} must not embed credentials.")
    return value


def validate_rights_manifest(rights: dict, family_ids: set[str], as_of: date) -> str:
    """Require a dated human attestation scoped to public display for all families."""
    if not isinstance(rights, dict) or rights.get("schemaVersion") != 1:
        raise ValueError("Rights manifest schemaVersion must be 1.")
    if rights.get("status") != "approved" or rights.get("publicDisplayAllowed") is not True:
        raise ValueError("Public display is disabled: the rights owner has not explicitly approved it.")
    if rights.get("scope") != "contract-lifecycle-public-website":
        raise ValueError("Rights scope must explicitly cover contract-lifecycle public website display.")
    if not isinstance(rights.get("licenseReference"), str) or len(rights["licenseReference"].strip()) < 4:
        raise ValueError("Rights manifest must include a private licenseReference for owner review.")
    reviewed_at = _iso_date(rights.get("reviewedAt"), "reviewedAt", required=True)
    valid_through = _iso_date(rights.get("validThrough"), "validThrough", required=True)
    if date.fromisoformat(reviewed_at) > as_of:
        raise ValueError("Rights review date must not be in the future.")
    if date.fromisoformat(valid_through) < as_of:
        raise ValueError("Rights authorization has expired for this snapshot date.")
    scoped_families = rights.get("families")
    if not isinstance(scoped_families, list) or set(scoped_families) != family_ids:
        raise ValueError("Rights manifest must explicitly cover exactly all 15 configured contract families.")
    return reviewed_at


def validate_snapshot(snapshot: dict, family_ids: set[str], as_of: date) -> dict:
    if not isinstance(snapshot, dict) or snapshot.get("schemaVersion") != 1:
        raise ValueError("Source snapshot schemaVersion must be 1.")
    source_date = _iso_date(snapshot.get("cmeSourceBusinessDate"), "cmeSourceBusinessDate", required=True)
    age_days = (as_of - date.fromisoformat(source_date)).days
    if age_days < 0 or age_days > 7:
        raise ValueError("Source business date must not be future-dated or more than seven days old.")
    _iso_date(snapshot.get("asOfDate"), "asOfDate", required=True)
    products = snapshot.get("products")
    if not isinstance(products, list) or {p.get("marketId") for p in products if isinstance(p, dict)} != family_ids or len(products) != len(family_ids):
        raise ValueError("Source snapshot must contain one product record for each of the 15 configured families.")
    seen_ids: set[str] = set()
    total_rows = 0
    for product in products:
        market_id = product.get("marketId")
        if market_id in seen_ids:
            raise ValueError(f"Duplicate product family: {market_id}")
        seen_ids.add(market_id)
        _official_url(product.get("specificationUrl"), f"{market_id}.specificationUrl")
        rows = product.get("contractMonths")
        if not isinstance(rows, list) or not rows or len(rows) > 1000:
            raise ValueError(f"{market_id} must have between one and 1,000 listed contract rows.")
        seen_rows: set[tuple[str, str]] = set()
        for row in rows:
            if not isinstance(row, dict):
                raise ValueError(f"{market_id} contains a non-object contract row.")
            symbol, month = row.get("contractSymbol"), row.get("contractMonth")
            if not isinstance(symbol, str) or not re.fullmatch(r"[A-Z0-9]{1,12}", symbol):
                raise ValueError(f"{market_id} has an invalid contractSymbol.")
            if not isinstance(month, str) or not re.fullmatch(r"\d{6}", month):
                raise ValueError(f"{market_id}/{symbol} has an invalid YYYYMM contractMonth.")
            key = (symbol, month)
            if key in seen_rows:
                raise ValueError(f"{market_id} contains a duplicate contract row: {symbol} {month}.")
            seen_rows.add(key)
            last_trade = _iso_date(row.get("lastTradeDate"), f"{market_id}/{symbol}/{month}.lastTradeDate", required=True)
            if last_trade < source_date:
                raise ValueError(f"{market_id}/{symbol}/{month} is expired at the source business date.")
            _official_url(row.get("sourceUrl"), f"{market_id}/{symbol}/{month}.sourceUrl")
            for field in DATE_FIELDS:
                _iso_date(row.get(field), f"{market_id}/{symbol}/{month}.{field}")
            total_rows += 1
    normalized = dict(snapshot)
    normalized["coverage"] = {
        "familyCount": len(family_ids),
        "familiesWithCurrentOrFutureRows": len(seen_ids),
        "contractMonthRows": total_rows,
    }
    return normalized


def load_json(path: Path, byte_limit: int, label: str) -> dict:
    payload = path.read_bytes()
    if len(payload) > byte_limit:
        raise ValueError(f"{label} exceeds the {byte_limit:,}-byte size limit.")
    value = json.loads(payload.decode("utf-8-sig"))
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be a JSON object.")
    return value


def import_snapshot(snapshot_path: Path, rights_path: Path, output_path: Path, as_of: date | None = None) -> dict:
    as_of = as_of or date.today()
    markets = json.loads(MARKETS_PATH.read_text(encoding="utf-8"))
    family_ids = {market["id"] for market in markets.get("markets", [])}
    if len(family_ids) != 15:
        raise ValueError("The configured futures market registry must contain 15 unique families.")
    snapshot = load_json(snapshot_path, MAX_INPUT_BYTES, "Source snapshot")
    rights = load_json(rights_path, MAX_RIGHTS_BYTES, "Rights manifest")
    reviewed_at = validate_rights_manifest(rights, family_ids, as_of)
    normalized = validate_snapshot(snapshot, family_ids, as_of)
    normalized["rightsStatus"] = "approved-public-display"
    normalized["rightsReviewDate"] = reviewed_at
    normalized["generatedAt"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    normalized["limitations"] = list(normalized.get("limitations") or []) + [
        "Public display was enabled from an owner-supplied rights attestation; keep the governing agreement and scope review current.",
        "This import validates format and dates; it does not independently verify the license, source values or publisher authorization.",
    ]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", newline="\n", dir=output_path.parent,
            prefix=".contract-lifecycle-", suffix=".tmp", delete=False,
        ) as output:
            temp_path = Path(output.name)
            output.write(json.dumps(normalized, ensure_ascii=False, indent=2) + "\n")
        temp_path.replace(output_path)
    finally:
        if temp_path and temp_path.exists():
            temp_path.unlink()
    return normalized


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", required=True, type=Path, help="Local provider/exchange export with documented redistribution rights")
    parser.add_argument("--rights", required=True, type=Path, help="Private owner-approved public-display rights manifest; do not commit it")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Generated repository JSON file (default: data/contract-lifecycle.json)")
    args = parser.parse_args()
    try:
        result = import_snapshot(args.snapshot, args.rights, args.output)
    except Exception as exc:
        print(f"Lifecycle import refused; no output was replaced: {exc}", file=sys.stderr)
        return 2
    coverage = result["coverage"]
    print(f"Imported authorized snapshot | {coverage['familiesWithCurrentOrFutureRows']}/{coverage['familyCount']} families | {coverage['contractMonthRows']} rows | source date {result['cmeSourceBusinessDate']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
