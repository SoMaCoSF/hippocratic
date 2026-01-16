# ==============================================================================
# file_id: SOM-SCR-0010-v0.1.0
# name: fetch_chhs_dataset.py
# description: Fetch CHHS CKAN dataset resources; fallback to datastore export when direct downloads are blocked
# project_id: HIPPOCRATIC
# category: script
# tags: [data, fetch, chhs, ckan, datastore, download]
# created: 2026-01-16
# modified: 2026-01-16
# version: 0.1.0
# agent_id: AGENT-CURSOR-OPENAI
# execution: python scripts/fetch_chhs_dataset.py --dataset healthcare-facility-locations --out data/source/chhs/healthcare-facility-locations
# ==============================================================================

"""
Fetch CHHS Open Data (CKAN) resources for a dataset (by slug/id) into a local folder.

Example:
  python scripts/fetch_chhs_dataset.py --dataset healthcare-facility-locations --out data/source/chhs

This uses the CKAN Action API:
  https://data.chhs.ca.gov/api/3/action/package_show?id=<dataset>
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import urllib.request
import urllib.error
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Optional


CHHS_BASE = "https://data.chhs.ca.gov"
PACKAGE_SHOW = CHHS_BASE + "/api/3/action/package_show?id={dataset}"


def _slugify(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s or "resource"


def _guess_extension(fmt: Optional[str], url: str) -> str:
    fmt_norm = (fmt or "").strip().lower()
    if fmt_norm in {"csv", "xlsx", "pdf", "zip", "json"}:
        return "." + fmt_norm
    # Try URL
    m = re.search(r"\.([a-z0-9]{2,5})(?:\?|$)", url.lower())
    if m:
        return "." + m.group(1)
    return ""


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    # Some CHHS endpoints block requests without a browser-like User-Agent.
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; HippocraticDataBot/1.0; +https://data.chhs.ca.gov/)",
            "Accept": "*/*",
        },
    )
    with urllib.request.urlopen(req) as r, dest.open("wb") as f:
        while True:
            chunk = r.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)

def _resource_show(resource_id: str) -> dict[str, Any]:
    url = CHHS_BASE + "/api/3/action/resource_show?id=" + resource_id
    data = _fetch_json(url)
    if not data.get("success"):
        raise RuntimeError(f"CKAN resource_show failed for {resource_id}: {data}")
    return data["result"]


def _datastore_dump_table_json(resource_id: str, dest: Path, page_size: int = 5000) -> None:
    """
    Dumps the entire datastore resource into our local "{fields, records}" table-json format.
    This avoids downloading the CSV directly (which may be blocked by 403).
    """
    fields: list[dict[str, Any]] = []
    records: list[list[Any]] = []

    offset = 0
    field_ids: list[str] = []
    total: Optional[int] = None

    while True:
        url = (
            CHHS_BASE
            + "/api/3/action/datastore_search?resource_id="
            + resource_id
            + f"&limit={page_size}&offset={offset}"
        )
        data = _fetch_json(url)
        if not data.get("success"):
            raise RuntimeError(f"CKAN datastore_search failed for {resource_id}: {data}")

        result = data["result"]
        if total is None:
            total = int(result.get("total") or 0)
            fields = list(result.get("fields") or [])
            field_ids = [f.get("id") for f in fields if f.get("id")]

        batch = result.get("records") or []
        if not batch:
            break

        for rec in batch:
            records.append([rec.get(fid) for fid in field_ids])

        offset += len(batch)
        if total is not None and offset >= total:
            break

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps({"fields": fields, "records": records}, ensure_ascii=False, indent=2), encoding="utf-8")


def _fetch_json(url: str) -> dict[str, Any]:
    with urllib.request.urlopen(url) as r:
        return json.load(r)


@dataclass(frozen=True)
class ResourceToDownload:
    name: str
    format: str
    url: str
    id: str


def _select_resources(resources: list[dict[str, Any]], include_all: bool) -> list[ResourceToDownload]:
    selected: list[ResourceToDownload] = []

    for r in resources:
        url = r.get("url") or ""
        fmt = (r.get("format") or "").strip()
        name = (r.get("name") or r.get("description") or r.get("id") or "resource").strip()
        rid = (r.get("id") or "").strip()

        if not url:
            continue

        if include_all:
            selected.append(ResourceToDownload(name=name, format=fmt, url=url, id=rid))
            continue

        # Default: prefer files we can download and use in a pipeline.
        # Skip dashboards (tableau) unless explicitly requested.
        fmt_norm = fmt.lower()
        if fmt_norm in {"csv", "xlsx", "pdf", "zip", "json"}:
            selected.append(ResourceToDownload(name=name, format=fmt, url=url, id=rid))

    return selected


def run(dataset: str, out_dir: Path, include_all: bool) -> None:
    pkg = _fetch_json(PACKAGE_SHOW.format(dataset=dataset))
    if not pkg.get("success"):
        raise RuntimeError(f"CKAN package_show failed: {pkg}")

    result = pkg["result"]
    resources = result.get("resources", [])

    selected = _select_resources(resources, include_all=include_all)
    if not selected:
        raise RuntimeError("No downloadable resources found (try --include-all).")

    fetched_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    manifest: dict[str, Any] = {
        "dataset": dataset,
        "title": result.get("title"),
        "source": CHHS_BASE + "/dataset/" + dataset,
        "fetchedAt": fetched_at,
        "resources": [],
        "errors": [],
    }

    for r in selected:
        ext = _guess_extension(r.format, r.url)
        base = _slugify(r.name)
        # Keep names stable even if two resources slugify the same:
        # add a short id suffix.
        suffix = ("_" + r.id[:8]) if r.id else ""
        filename = f"{base}{suffix}{ext}"
        dest = out_dir / filename

        downloaded_via = "direct"
        try:
            _download(r.url, dest)
        except urllib.error.HTTPError as e:
            # Some CHHS download endpoints can return 403 even though the data is available via datastore.
            if e.code == 403 and r.id:
                try:
                    meta = _resource_show(r.id)
                    if meta.get("datastore_active"):
                        dest = out_dir / f"{base}{suffix}.table.json"
                        _datastore_dump_table_json(r.id, dest)
                        downloaded_via = "datastore"
                    else:
                        manifest["errors"].append(
                            {"name": r.name, "format": r.format, "url": r.url, "id": r.id, "error": "HTTP 403 (no datastore)"}
                        )
                        continue
                except Exception as meta_err:
                    manifest["errors"].append(
                        {
                            "name": r.name,
                            "format": r.format,
                            "url": r.url,
                            "id": r.id,
                            "error": f"HTTP 403 (resource_show failed: {meta_err})",
                        }
                    )
                    continue
            else:
                manifest["errors"].append({"name": r.name, "format": r.format, "url": r.url, "id": r.id, "error": f"HTTP {e.code}"})
                continue
        except Exception as e:
            manifest["errors"].append({"name": r.name, "format": r.format, "url": r.url, "id": r.id, "error": str(e)})
            continue

        manifest["resources"].append(
            {
                "name": r.name,
                "format": r.format,
                "url": r.url,
                "id": r.id,
                "downloadedVia": downloaded_via,
                "file": os.fspath(dest.relative_to(out_dir)),
                "sha256": _sha256_file(dest),
                "bytes": dest.stat().st_size,
            }
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch CHHS CKAN dataset resources.")
    parser.add_argument("--dataset", required=True, help="CKAN dataset id/slug (e.g. healthcare-facility-locations)")
    parser.add_argument("--out", type=Path, default=Path("data/source/chhs"), help="Output directory")
    parser.add_argument(
        "--include-all",
        action="store_true",
        help="Also include non-file resources (e.g. dashboards) when possible (default: only CSV/XLSX/PDF/ZIP/JSON)",
    )
    args = parser.parse_args()

    run(args.dataset, args.out, include_all=args.include_all)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)


