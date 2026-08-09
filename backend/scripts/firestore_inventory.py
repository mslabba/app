#!/usr/bin/env python3
"""
Read-only Firestore inventory for PowerAuction migration (Phase A1).

Usage (from backend/ with venv active):

  export FIREBASE_CREDENTIALS_PATH=/path/to/readonly-sa.json
  export PYTHONPATH=.
  python scripts/firestore_inventory.py

Outputs JSON report under migration_output/inventory_*.json

This script NEVER writes, updates, or deletes Firestore documents.
"""

from __future__ import annotations

import json
import logging
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Ensure backend root is on path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import get_settings
from app.migration.firestore_client import (
    KNOWN_COLLECTIONS,
    get_firestore_client,
    serialize_value,
    stream_collection,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("firestore_inventory")


def type_label(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "bool"
    if isinstance(value, int) and not isinstance(value, bool):
        return "int"
    if isinstance(value, float):
        return "float"
    if isinstance(value, str):
        return "str"
    if isinstance(value, list):
        return "list"
    if isinstance(value, dict):
        return "dict"
    return type(value).__name__


def inventory_collection(db, name: str, sample_limit: int = 5) -> dict[str, Any]:
    field_presence: Counter[str] = Counter()
    field_types: dict[str, Counter[str]] = defaultdict(Counter)
    count = 0
    samples: list[dict[str, Any]] = []
    missing_id = 0
    null_heavy_fields: Counter[str] = Counter()

    for doc_id, data in stream_collection(db, name):
        count += 1
        if not isinstance(data, dict):
            continue
        if "id" not in data and not doc_id:
            missing_id += 1
        for key, value in data.items():
            field_presence[key] += 1
            field_types[key][type_label(value)] += 1
            if value is None:
                null_heavy_fields[key] += 1
        if len(samples) < sample_limit:
            # Redact obvious secrets
            sample = dict(data)
            for secret_key in (
                "cashfree_secret_key",
                "cashfree_app_id",
                "password",
                "secret",
            ):
                if secret_key in sample:
                    sample[secret_key] = "***REDACTED***"
            samples.append({"_doc_id": doc_id, **sample})

    fields = {}
    for key, present in sorted(field_presence.items()):
        fields[key] = {
            "present_count": present,
            "present_pct": round(100.0 * present / count, 2) if count else 0,
            "null_count": null_heavy_fields.get(key, 0),
            "types": dict(field_types[key]),
        }

    return {
        "collection": name,
        "document_count": count,
        "fields": fields,
        "samples": samples,
        "missing_embedded_id_count": missing_id,
    }


def main() -> int:
    settings = get_settings()
    if not settings.firestore_read_only:
        logger.warning(
            "FIRESTORE_READ_ONLY is false — inventory still performs only reads, "
            "but production policy requires a read-only service account."
        )

    logger.info("Connecting to Firestore (read-only inventory)...")
    db = get_firestore_client()

    report: dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "app_env": settings.app_env,
        "known_collections": KNOWN_COLLECTIONS,
        "collections": {},
        "notes": [
            "This inventory is based on streaming known collections from code.",
            "Unexpected collections are not listed unless FIRESTORE_LIST_ALL=1 is set "
            "(Admin SDK does not list root collections without extra APIs; extend if needed).",
            "Prefer a read-only service account per master plan §45.",
        ],
    }

    total = 0
    for name in KNOWN_COLLECTIONS:
        logger.info("Scanning collection: %s", name)
        try:
            coll_report = inventory_collection(db, name)
            report["collections"][name] = coll_report
            total += coll_report["document_count"]
            logger.info("  %s: %s documents", name, coll_report["document_count"])
        except Exception as exc:
            logger.error("  Failed %s: %s", name, exc)
            report["collections"][name] = {
                "collection": name,
                "error": str(exc),
                "document_count": None,
            }

    report["total_documents_known_collections"] = total

    # Special checks called out in the plan
    players = report["collections"].get("players", {})
    if players.get("document_count"):
        fields = players.get("fields", {})
        report["special_checks"] = {
            "players_with_event_id_field_presence_pct": fields.get("event_id", {}).get(
                "present_pct"
            ),
            "players_with_category_id_field_presence_pct": fields.get("category_id", {}).get(
                "present_pct"
            ),
            "players_status_types": fields.get("status", {}).get("types"),
        }

    out_dir = settings.migration_output_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_path = out_dir / f"inventory_{stamp}.json"
    out_path.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    latest = out_dir / "inventory_latest.json"
    latest.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")

    logger.info("Wrote %s", out_path)
    logger.info("Total documents (known collections): %s", total)
    print(json.dumps({"ok": True, "report": str(out_path), "total_documents": total}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
