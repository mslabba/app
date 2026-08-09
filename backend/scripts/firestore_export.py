#!/usr/bin/env python3
"""
Read-only Firestore export to JSONL (one file per collection).

Usage:

  export FIREBASE_CREDENTIALS_PATH=/path/to/readonly-sa.json
  export PYTHONPATH=.
  python scripts/firestore_export.py

Does not write to Firestore.
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import get_settings
from app.migration.firestore_client import (
    KNOWN_COLLECTIONS,
    get_firestore_client,
    stream_collection,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("firestore_export")


def main() -> int:
    settings = get_settings()
    db = get_firestore_client()

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_dir = settings.migration_output_dir / f"export_{stamp}"
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "collections": {},
    }

    for name in KNOWN_COLLECTIONS:
        path = out_dir / f"{name}.jsonl"
        count = 0
        logger.info("Exporting %s → %s", name, path)
        with path.open("w", encoding="utf-8") as fh:
            try:
                for doc_id, data in stream_collection(db, name):
                    row = {"_doc_id": doc_id, "data": data}
                    fh.write(json.dumps(row, default=str) + "\n")
                    count += 1
            except Exception as exc:
                logger.error("Failed exporting %s: %s", name, exc)
                manifest["collections"][name] = {"error": str(exc), "count": count}
                continue
        manifest["collections"][name] = {"file": path.name, "count": count}
        logger.info("  %s docs", count)

    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    latest = settings.migration_output_dir / "export_latest"
    if latest.exists() or latest.is_symlink():
        if latest.is_symlink() or latest.is_file():
            latest.unlink()
        else:
            # directory from prior run — leave alone, write pointer file
            pass
    pointer = settings.migration_output_dir / "export_latest_path.txt"
    pointer.write_text(str(out_dir), encoding="utf-8")

    logger.info("Export complete: %s", out_dir)
    print(json.dumps({"ok": True, "export_dir": str(out_dir)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
