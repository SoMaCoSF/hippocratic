# ==============================================================================
# file_id: SOM-SCR-0011-v0.1.0
# name: unpack_chhs_zip_and_refresh.py
# description: Unpack CHHS "All resource data" zip, convert facilities CSV to table-json, and refresh derived state/ZIP outputs
# project_id: HIPPOCRATIC
# category: script
# tags: [data, unzip, chhs, refresh, pipeline, facilities]
# created: 2026-01-16
# modified: 2026-01-16
# version: 0.1.0
# agent_id: AGENT-CURSOR-OPENAI
# execution: python scripts/unpack_chhs_zip_and_refresh.py
# ==============================================================================

"""
Unpack the CHHS "All resource data" zip and refresh our local pipeline inputs/outputs.

Given:
  data/healthcare-facility-locations-nogmsilm.zip

This script will:
- Extract zip contents to: data/source/chhs_zip/healthcare-facility-locations/
- Convert the main facilities CSV to our "{fields, records}" JSON table format
  and write it to: data/ca_lic_health_facilities.json (by default)
- (Optional) Run the ZIP-split scrubber to regenerate: data/derived/

Usage:
  python scripts/unpack_chhs_zip_and_refresh.py
  python scripts/unpack_chhs_zip_and_refresh.py --no-split
"""

from __future__ import annotations

import argparse
import csv
import json
import importlib.util
import sys
import zipfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ZIP = ROOT / "data" / "healthcare-facility-locations-nogmsilm.zip"
DEFAULT_EXTRACT_DIR = ROOT / "data" / "source" / "chhs_zip" / "healthcare-facility-locations"
DEFAULT_OUT_TABLE_JSON = ROOT / "data" / "ca_lic_health_facilities.json"

# Name inside the zip as observed in the downloaded bundle
FACILITIES_CSV_NAME = "licensed-and-certified-healthcare-facility-locations.csv"


def _extract(zip_path: Path, out_dir: Path) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    extracted: list[Path] = []
    with zipfile.ZipFile(zip_path, "r") as z:
        for member in z.namelist():
            dest = out_dir / member
            dest.parent.mkdir(parents=True, exist_ok=True)
            with z.open(member) as src, dest.open("wb") as f:
                f.write(src.read())
            extracted.append(dest)
    return extracted


def _infer_field_type(value: str) -> str:
    """
    Very lightweight typing for our table-json:
    - numeric if it parses as float/int
    - timestamp if it looks like ISO date/time
    - otherwise text
    """
    v = value.strip()
    if not v:
        return "text"
    # ISO-ish dates commonly found in this dataset: 2025-12-15T00:00:00
    if len(v) >= 10 and v[4:5] == "-" and v[7:8] == "-":
        return "timestamp"
    try:
        float(v)
        return "numeric"
    except Exception:
        return "text"


def _csv_to_table_json(csv_path: Path, out_path: Path) -> None:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ValueError(f"No header row found in {csv_path}")

        fieldnames = list(reader.fieldnames)
        # Seed types by sampling first N rows
        type_votes: dict[str, dict[str, int]] = {k: {} for k in fieldnames}
        rows: list[dict[str, str]] = []
        for i, row in enumerate(reader):
            rows.append(row)
            if i < 2000:
                for k in fieldnames:
                    t = _infer_field_type(row.get(k, "") or "")
                    type_votes[k][t] = type_votes[k].get(t, 0) + 1

        fields: list[dict[str, Any]] = []
        for k in fieldnames:
            votes = type_votes.get(k) or {}
            # pick most common; default to text
            best = "text"
            best_count = -1
            for t, c in votes.items():
                if c > best_count:
                    best, best_count = t, c
            fields.append({"id": k, "type": best})

        # Convert to records aligned by field order
        records: list[list[Any]] = []
        for row in rows:
            rec: list[Any] = []
            for k in fieldnames:
                v = row.get(k, "")
                if v is None or v == "":
                    rec.append(None)
                    continue
                # Keep as string to avoid losing leading zeros (ZIP) etc.
                rec.append(v)
            records.append(rec)

    payload = {
        "generatedAt": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "source": str(csv_path),
        "fields": fields,
        "records": records,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Unpack CHHS zip and refresh local derived data.")
    parser.add_argument("--zip", type=Path, default=DEFAULT_ZIP, help="Path to downloaded CHHS zip bundle")
    parser.add_argument("--extract-dir", type=Path, default=DEFAULT_EXTRACT_DIR, help="Where to extract the bundle")
    parser.add_argument("--out-table-json", type=Path, default=DEFAULT_OUT_TABLE_JSON, help="Where to write table-json")
    parser.add_argument("--no-split", action="store_true", help="Don't run the split-by-ZIP scrubber step")
    args = parser.parse_args()

    if not args.zip.exists():
        raise SystemExit(f"Zip not found: {args.zip}")

    _extract(args.zip, args.extract_dir)
    facilities_csv = args.extract_dir / FACILITIES_CSV_NAME
    if not facilities_csv.exists():
        raise SystemExit(f"Expected facilities CSV not found in extracted bundle: {facilities_csv}")

    _csv_to_table_json(facilities_csv, args.out_table_json)

    if not args.no_split:
        # Import and run our existing pipeline without requiring scripts/ to be a package.
        module_path = ROOT / "scripts" / "prescrub_split_by_zip.py"
        spec = importlib.util.spec_from_file_location("prescrub_split_by_zip", module_path)
        if spec is None or spec.loader is None:
            raise SystemExit(f"Failed to load module from {module_path}")
        mod = importlib.util.module_from_spec(spec)
        # dataclasses (Py3.13+) may consult sys.modules during class creation
        sys.modules[spec.name] = mod
        spec.loader.exec_module(mod)  # type: ignore[attr-defined]
        split_run = getattr(mod, "run", None)
        if split_run is None:
            raise SystemExit("Expected function 'run' in prescrub_split_by_zip.py")

        split_run(args.out_table_json, ROOT / "data" / "derived", state="CA")


if __name__ == "__main__":
    main()


