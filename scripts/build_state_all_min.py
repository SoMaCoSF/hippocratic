# ==============================================================================
# file_id: SOM-SCR-0012-v0.1.0
# name: build_state_all_min.py
# description: Build a compact all.min.json for a state by merging derived per-ZIP outputs
# project_id: HIPPOCRATIC
# category: script
# tags: [data, build, search, state, facilities, json]
# created: 2026-01-16
# modified: 2026-01-16
# version: 0.1.0
# agent_id: AGENT-CURSOR-OPENAI
# execution: python scripts/build_state_all_min.py --state CA
# ==============================================================================

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DERIVED = ROOT / "data" / "derived" / "state"


MIN_FIELDS = [
    "id",
    "name",
    "npi",
    "hcaiId",
    "businessName",
    "contactEmail",
    "categoryName",
    "categoryCode",
    "licenseStatus",
    "inService",
    "licenseNumber",
    "address",
    "city",
    "zip",
    "county",
    "phone",
    "lat",
    "lng",
    "licenseEffectiveDate",
    "licenseExpirationDate",
    "dataDate",
]


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def run(state: str, derived_root: Path, out_name: str = "all.min.json") -> Path:
    state_norm = (state or "").strip().upper()
    if not state_norm:
        raise ValueError("state is required (e.g. CA)")

    state_dir = derived_root / state_norm
    index_path = state_dir / "index.json"
    index = _load_json(index_path)

    by_zip_dir = state_dir / "by_zip"
    all_rows: list[dict[str, Any]] = []

    # Iterate zips from index for consistency
    for zip5, meta in index.get("zips", {}).items():
        file_rel = meta.get("file")
        if not file_rel:
            continue
        zip_path = state_dir / file_rel
        if not zip_path.exists():
            # fallback: direct by_zip/<zip>.json
            zip_path = by_zip_dir / f"{zip5}.json"
        rows = _load_json(zip_path)
        for r in rows:
            all_rows.append({k: r.get(k) for k in MIN_FIELDS})

    payload = {
        "generatedAt": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "state": state_norm,
        "recordCount": len(all_rows),
        "fields": MIN_FIELDS,
        "records": all_rows,
    }

    out_path = state_dir / out_name
    _write_json(out_path, payload)
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Build all.min.json for a state by merging per-ZIP outputs.")
    parser.add_argument("--state", required=True, help="2-letter state code (e.g. CA)")
    parser.add_argument("--derived-root", type=Path, default=DEFAULT_DERIVED, help="Path to data/derived/state")
    parser.add_argument("--out-name", default="all.min.json", help="Output file name (default: all.min.json)")
    args = parser.parse_args()

    out = run(args.state, args.derived_root, out_name=args.out_name)
    print(str(out))


if __name__ == "__main__":
    main()



