# ==============================================================================
# file_id: SOM-SCR-0018-v0.1.0
# name: export_ca_hha_hospice_join_keys.py
# description: Export CA Home Health + Hospice join keys (FACID/NPI/legal-ish names/address) for downstream funding joins
# project_id: HIPPOCRATIC
# category: script
# tags: [data, export, join, npi, hospice, home-health, medi-cal]
# created: 2026-01-16
# modified: 2026-01-16
# version: 0.1.0
# agent_id: AGENT-CURSOR-OPENAI
# execution: python scripts/export_ca_hha_hospice_join_keys.py
# ==============================================================================

from __future__ import annotations

import csv
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_IN = ROOT / "data" / "derived" / "state" / "CA" / "all.min.json"
DEFAULT_OUT = ROOT / "data" / "enrichment" / "state" / "CA" / "hha_hospice_join_keys.csv"


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    inp = DEFAULT_IN
    out = DEFAULT_OUT
    out.parent.mkdir(parents=True, exist_ok=True)

    data = _load_json(inp)
    records = data.get("records", [])

    keep_categories = {"HOME HEALTH AGENCY", "HOSPICE"}

    fieldnames = [
        "state",
        "facid",
        "npi",
        "hcai_id",
        "license_number",
        "facility_name",
        "business_name",
        "contact_email",
        "license_status",
        "license_effective_date",
        "license_expiration_date",
        "address",
        "city",
        "zip",
        "county",
        "phone",
        "lat",
        "lng",
        "category_name",
        "category_code",
        "data_date",
        "exported_at",
        "source_file",
    ]

    exported_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    source_file = str(inp)

    with out.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in records:
            if (r.get("categoryName") or "") not in keep_categories:
                continue
            w.writerow(
                {
                    "state": "CA",
                    "facid": r.get("id") or "",
                    "npi": r.get("npi") or "",
                    "hcai_id": r.get("hcaiId") or "",
                    "license_number": r.get("licenseNumber") or "",
                    "facility_name": r.get("name") or "",
                    "business_name": r.get("businessName") or "",
                    "contact_email": r.get("contactEmail") or "",
                    "license_status": r.get("licenseStatus") or "",
                    "license_effective_date": r.get("licenseEffectiveDate") or "",
                    "license_expiration_date": r.get("licenseExpirationDate") or "",
                    "address": r.get("address") or "",
                    "city": r.get("city") or "",
                    "zip": r.get("zip") or "",
                    "county": r.get("county") or "",
                    "phone": r.get("phone") or "",
                    "lat": r.get("lat") if r.get("lat") is not None else "",
                    "lng": r.get("lng") if r.get("lng") is not None else "",
                    "category_name": r.get("categoryName") or "",
                    "category_code": r.get("categoryCode") or "",
                    "data_date": r.get("dataDate") or "",
                    "exported_at": exported_at,
                    "source_file": source_file,
                }
            )

    print(str(out))


if __name__ == "__main__":
    main()


