#!/usr/bin/env python3
"""
Compare Firestore (or export JSONL) document counts vs PostgreSQL row counts.

Usage:
  PYTHONPATH=. python scripts/reconcile_counts.py
  PYTHONPATH=. python scripts/reconcile_counts.py --from-export path/to/export_dir
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import func, select

from app.core.config import get_settings
from app.db.session import get_engine, get_session_factory
from app.migration.firestore_client import KNOWN_COLLECTIONS, get_firestore_client, stream_collection
from app.models import (
    AuctionState,
    BankDetails,
    Bid,
    Category,
    Event,
    PaymentOrder,
    Player,
    PlayerRegistration,
    PublicTeamToken,
    Sponsor,
    Team,
    User,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("reconcile")

PG_MAP = {
    "users": User,
    "events": Event,
    "categories": Category,
    "teams": Team,
    "players": Player,
    "player_registrations": PlayerRegistration,
    "sponsors": Sponsor,
    "auction_state": AuctionState,
    "bids": Bid,
    "public_team_tokens": PublicTeamToken,
    "payment_orders": PaymentOrder,
    "bank_details": BankDetails,
    # payment_gateway_settings intentionally not in Postgres tables
}


def count_export(export_dir: Path, name: str) -> int:
    path = export_dir / f"{name}.jsonl"
    if not path.exists():
        return -1
    with path.open(encoding="utf-8") as fh:
        return sum(1 for line in fh if line.strip())


def count_firestore(db, name: str) -> int:
    return sum(1 for _ in stream_collection(db, name))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--from-export", type=str, default=None)
    args = parser.parse_args()

    settings = get_settings()
    settings.require_database_url()
    get_engine()
    factory = get_session_factory()

    from_export = Path(args.from_export) if args.from_export else None
    db_fs = None if from_export else get_firestore_client()

    rows = []
    with factory() as session:
        for name in KNOWN_COLLECTIONS:
            if name == "payment_gateway_settings":
                src = (
                    count_export(from_export, name)
                    if from_export
                    else count_firestore(db_fs, name)
                )
                rows.append(
                    {
                        "collection": name,
                        "source_count": src,
                        "postgres_count": None,
                        "note": "secrets not stored as app table; use env vars",
                    }
                )
                continue

            model = PG_MAP.get(name)
            if not model:
                continue
            if from_export:
                src = count_export(from_export, name)
            else:
                src = count_firestore(db_fs, name)
            pg = session.scalar(select(func.count()).select_from(model)) or 0
            rows.append(
                {
                    "collection": name,
                    "source_count": src,
                    "postgres_count": pg,
                    "delta": (pg - src) if src >= 0 else None,
                    "match": src == pg if src >= 0 else None,
                }
            )
            logger.info("%s: source=%s postgres=%s", name, src, pg)

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "rows": rows,
    }
    out = settings.migration_output_dir
    out.mkdir(parents=True, exist_ok=True)
    path = out / "reconcile_latest.json"
    path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
