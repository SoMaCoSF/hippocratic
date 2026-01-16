# ==============================================================================
# file_id: SOM-SCR-0009-v0.1.0
# name: prescrub_split_by_zip.py
# description: Pre-scrub CHHS facilities data and split into per-ZIP JSON outputs (multi-state layout)
# project_id: HIPPOCRATIC
# category: script
# tags: [data, scrub, split, zip, chhs, facilities]
# created: 2026-01-16
# modified: 2026-01-16
# version: 0.1.0
# agent_id: AGENT-CURSOR-OPENAI
# execution: python scripts/prescrub_split_by_zip.py --input data/ca_lic_health_facilities.json --out data/derived --state CA
# ==============================================================================

"""
Pre-scrub + split CA CHHS licensed health facilities data by ZIP.

Input file format (as provided):
{
  "fields": [{"id": "...", "type": "..."}, ...],
  "records": [
    [ ... row values aligned to fields ... ],
    ...
  ]
}

Outputs:
- data/derived/state/<STATE>/by_zip/<ZIP>.json: array of facility objects for that ZIP
- data/derived/state/<STATE>/index.json: zip -> {count, file} plus summary metadata
"""

from __future__ import annotations

import argparse
import json
import math
import os
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any, Iterable, Optional


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "data" / "ca_lic_health_facilities.json"
DEFAULT_OUT_DIR = ROOT / "data" / "derived"


def _parse_iso_date(value: Any) -> Optional[str]:
    """
    Normalizes common CHHS timestamps like '2025-12-15T00:00:00' to 'YYYY-MM-DD'.
    Keeps None/empty as None. If parsing fails, returns the original string.
    """
    if value is None:
        return None
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        # Common case: ISO with time
        try:
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
            return dt.date().isoformat()
        except Exception:
            # Could already be a date-ish string; keep as-is
            return s
    return str(value)


def _to_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
            return None
        return float(value)
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        try:
            return float(s)
        except ValueError:
            return None
    return None


def _normalize_zip(value: Any) -> str:
    """
    Returns a 5-digit ZIP string, or 'UNKNOWN' if missing/unparseable.
    """
    if value is None:
        return "UNKNOWN"
    if isinstance(value, (int, float)):
        if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
            return "UNKNOWN"
        n = int(value)
        if n <= 0:
            return "UNKNOWN"
        return f"{n:05d}"
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return "UNKNOWN"
        digits = "".join(ch for ch in s if ch.isdigit())
        if len(digits) >= 5:
            return digits[:5]
        if digits:
            return digits.zfill(5)
        return "UNKNOWN"
    return "UNKNOWN"


def _safe_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip()
    return s if s else None


def _derive_in_service(license_status: Optional[str], expiration_date: Optional[str], terminat_sw: Optional[str]) -> Optional[bool]:
    """
    Conservative 'in service' heuristic:
    - If explicitly not ACTIVE -> False
    - If ACTIVE and terminat_sw indicates termination -> False
    - If ACTIVE and expiration exists and is before today -> False
    - If ACTIVE otherwise -> True
    - If status missing -> None
    """
    if license_status is None:
        return None

    status = license_status.strip().upper()
    if status != "ACTIVE":
        return False

    if terminat_sw is not None and terminat_sw.strip().upper() in {"Y", "YES", "TRUE", "1", "T"}:
        return False

    if expiration_date:
        # expiration_date should be YYYY-MM-DD after normalization, but may not be.
        try:
            exp = date.fromisoformat(expiration_date[:10])
            if exp < date.today():
                return False
        except Exception:
            pass

    return True


@dataclass(frozen=True)
class Facility:
    id: str
    name: str
    npi: Optional[str]
    hcaiId: Optional[str]
    businessName: Optional[str]
    contactEmail: Optional[str]
    categoryName: Optional[str]
    categoryCode: Optional[str]
    licenseStatus: Optional[str]
    inService: Optional[bool]
    licenseNumber: Optional[str]
    licenseEffectiveDate: Optional[str]
    licenseExpirationDate: Optional[str]
    dataDate: Optional[str]
    capacity: Optional[int]
    address: Optional[str]
    city: Optional[str]
    zip: str
    county: Optional[str]
    phone: Optional[str]
    lat: Optional[float]
    lng: Optional[float]


def _normalize_npi(value: Any) -> Optional[str]:
    """
    NPI is a 10-digit numeric identifier; store as a digit string when possible.
    """
    if value is None:
        return None
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        digits = "".join(ch for ch in s if ch.isdigit())
        return digits if digits else None
    # numeric types
    try:
        n = int(float(value))
        if n <= 0:
            return None
        return str(n)
    except Exception:
        return None


def _normalize_hcai_id(value: Any) -> Optional[str]:
    """
    HCAI_ID is a numeric facility identifier (often looks like 406xxxxx for HHA/Hospice).
    Store as digit string when possible.
    """
    if value is None:
        return None
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        digits = "".join(ch for ch in s if ch.isdigit())
        return digits if digits else None
    try:
        n = int(float(value))
        if n <= 0:
            return None
        return str(n)
    except Exception:
        return None


def _load_source(path: Path) -> tuple[list[str], list[list[Any]]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    fields = [f["id"] for f in data["fields"]]
    records = data["records"]
    if not isinstance(records, list):
        raise ValueError("Expected top-level 'records' to be a list.")
    return fields, records


def _row_getter(fields: list[str]):
    idx = {k: i for i, k in enumerate(fields)}

    def get(row: list[Any], key: str) -> Any:
        i = idx.get(key)
        if i is None:
            return None
        if i >= len(row):
            return None
        return row[i]

    return get


def _scrub_facility(fields: list[str], row: list[Any]) -> Facility:
    get = _row_getter(fields)

    facid = _safe_str(get(row, "FACID")) or _safe_str(get(row, "_id")) or "UNKNOWN"
    name = _safe_str(get(row, "FACNAME")) or _safe_str(get(row, "BUSINESS_NAME")) or "UNKNOWN"

    category_name = _safe_str(get(row, "FAC_FDR"))  # human readable
    category_code = _safe_str(get(row, "FAC_TYPE_CODE"))

    npi = _normalize_npi(get(row, "NPI"))
    hcai_id = _normalize_hcai_id(get(row, "HCAI_ID"))
    business_name = _safe_str(get(row, "BUSINESS_NAME"))
    contact_email = _safe_str(get(row, "CONTACT_EMAIL"))

    license_status = _safe_str(get(row, "LICENSE_STATUS_DESCRIPTION"))
    terminat_sw = _safe_str(get(row, "TERMINAT_SW"))
    lic_eff = _parse_iso_date(get(row, "LICENSE_EFFECTIVE_DATE"))
    lic_exp = _parse_iso_date(get(row, "LICENSE_EXPIRATION_DATE"))
    data_date = _parse_iso_date(get(row, "DATA_DATE"))

    in_service = _derive_in_service(license_status, lic_exp, terminat_sw)

    # capacity is numeric in source; can be 0 for some types
    cap_raw = get(row, "CAPACITY")
    capacity: Optional[int]
    if cap_raw is None or cap_raw == "":
        capacity = None
    else:
        try:
            capacity = int(float(cap_raw))
        except Exception:
            capacity = None

    zip5 = _normalize_zip(get(row, "ZIP"))

    lic_num = get(row, "LICENSE_NUMBER")
    license_number = None if lic_num is None else _safe_str(lic_num)

    lat = _to_float(get(row, "LATITUDE"))
    lng = _to_float(get(row, "LONGITUDE"))

    return Facility(
        id=facid,
        name=name,
        npi=npi,
        hcaiId=hcai_id,
        businessName=business_name,
        contactEmail=contact_email,
        categoryName=category_name,
        categoryCode=category_code,
        licenseStatus=license_status,
        inService=in_service,
        licenseNumber=license_number,
        licenseEffectiveDate=lic_eff,
        licenseExpirationDate=lic_exp,
        dataDate=data_date,
        capacity=capacity,
        address=_safe_str(get(row, "ADDRESS")),
        city=_safe_str(get(row, "CITY")),
        zip=zip5,
        county=_safe_str(get(row, "COUNTY_NAME")),
        phone=_safe_str(get(row, "CONTACT_PHONE_NUMBER")),
        lat=lat,
        lng=lng,
    )


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _write_json(path: Path, obj: Any) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def run(input_path: Path, out_dir: Path, state: str = "CA") -> None:
    fields, records = _load_source(input_path)

    state_norm = (state or "CA").strip().upper()
    if not state_norm:
        state_norm = "CA"

    # Multi-state friendly output layout:
    #   data/derived/state/<STATE>/by_zip/<ZIP>.json
    #   data/derived/state/<STATE>/index.json
    state_root = out_dir / "state" / state_norm

    by_zip: dict[str, list[dict[str, Any]]] = defaultdict(list)
    category_counts = Counter()
    status_counts = Counter()
    in_service_counts = Counter()

    for row in records:
        fac = _scrub_facility(fields, row)
        # Keep categoryName as primary; still store code for debugging/joins
        if fac.categoryName:
            category_counts[fac.categoryName] += 1
        status_counts[str(fac.licenseStatus)] += 1
        in_service_counts[str(fac.inService)] += 1

        by_zip[fac.zip].append(asdict(fac))

    # Sort facilities within each ZIP for stable output (nice for diffs/caching)
    for z, items in by_zip.items():
        items.sort(key=lambda x: (x.get("name") or "", x.get("id") or ""))

    by_zip_dir = state_root / "by_zip"
    _ensure_dir(by_zip_dir)

    index: dict[str, Any] = {
        "generatedAt": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "state": state_norm,
        "sourceFile": os.fspath(input_path),
        "recordCount": len(records),
        "zipCount": len(by_zip),
        "zips": {},
        "summary": {
            "categoryNameCountsTop50": dict(category_counts.most_common(50)),
            "licenseStatusCounts": dict(status_counts.most_common()),
            "inServiceCounts": dict(in_service_counts.most_common()),
        },
    }

    for zip5, items in sorted(by_zip.items(), key=lambda kv: kv[0]):
        filename = f"{zip5}.json"
        _write_json(by_zip_dir / filename, items)
        index["zips"][zip5] = {"count": len(items), "file": f"by_zip/{filename}"}

    _write_json(state_root / "index.json", index)


def main() -> None:
    parser = argparse.ArgumentParser(description="Pre-scrub and split facilities by ZIP.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Path to source JSON file.")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT_DIR, help="Output directory.")
    parser.add_argument("--state", type=str, default="CA", help="2-letter state code for output folder (default: CA).")
    args = parser.parse_args()

    run(args.input, args.out, state=args.state)


if __name__ == "__main__":
    main()


