# ==============================================================================
# file_id: SOM-SCR-0013-v0.1.0
# name: sync_web_public_data.py
# description: Sync derived state datasets into web/public/data for Vercel static serving
# project_id: HIPPOCRATIC
# category: script
# tags: [data, sync, web, vercel, static, facilities]
# created: 2026-01-16
# modified: 2026-01-16
# version: 0.1.0
# agent_id: AGENT-CURSOR-OPENAI
# execution: python scripts/sync_web_public_data.py --state CA
# ==============================================================================

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SRC = ROOT / "data" / "derived" / "state"
DEFAULT_DEST = ROOT / "web" / "public" / "data" / "state"


def _copy_tree(src: Path, dest: Path) -> None:
    if not src.exists():
        raise FileNotFoundError(src)
    dest.mkdir(parents=True, exist_ok=True)
    for p in src.rglob("*"):
        if p.is_dir():
            continue
        rel = p.relative_to(src)
        out = dest / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, out)


def run(state: str, src_root: Path, dest_root: Path) -> None:
    state_norm = (state or "").strip().upper()
    if not state_norm:
        raise ValueError("state is required (e.g. CA)")
    _copy_tree(src_root / state_norm, dest_root / state_norm)


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync derived state data into web/public/data/state/<STATE>.")
    parser.add_argument("--state", required=True, help="2-letter state code (e.g. CA)")
    parser.add_argument("--src-root", type=Path, default=DEFAULT_SRC, help="Source root (default: data/derived/state)")
    parser.add_argument("--dest-root", type=Path, default=DEFAULT_DEST, help="Dest root (default: web/public/data/state)")
    args = parser.parse_args()

    run(args.state, args.src_root, args.dest_root)


if __name__ == "__main__":
    main()





