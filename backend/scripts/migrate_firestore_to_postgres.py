#!/usr/bin/env python3
"""
Firestore → PostgreSQL loader (staging-safe).

Prerequisites:
  - DATABASE_URL pointing at staging Postgres
  - Alembic migrations applied
  - FIREBASE credentials (prefer read-only SA)
  - PYTHONPATH=.

Usage:
  python scripts/migrate_firestore_to_postgres.py
  python scripts/migrate_firestore_to_postgres.py --from-export /path/to/export_dir

Does NOT delete or modify Firestore documents.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterable, Optional

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_engine, get_session_factory
from app.migration.firestore_client import get_firestore_client, stream_collection
from app.migration.transforms import (
    transform_auction_state,
    transform_bank,
    transform_bid,
    transform_category,
    transform_event,
    transform_payment,
    transform_player,
    transform_public_token,
    transform_registration,
    transform_sponsor,
    transform_team,
    transform_user,
)
from app.models import (
    AuctionState,
    BankDetails,
    Bid,
    Category,
    Event,
    MigrationQuarantine,
    MigrationRun,
    PaymentOrder,
    Player,
    PlayerRegistration,
    PublicTeamToken,
    Sponsor,
    Team,
    User,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("migrate")

TransformFn = Callable[[str, dict[str, Any]], dict[str, Any]]


def load_jsonl(path: Path) -> Iterable[tuple[str, dict[str, Any]]]:
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            yield row["_doc_id"], row["data"]


def upsert_mappings(session: Session, model, rows: list[dict[str, Any]], pk: str = "id") -> int:
    if not rows:
        return 0
    table = model.__table__
    # Batch upserts
    count = 0
    batch_size = 200
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        # Filter to columns that exist on the table
        cols = {c.name for c in table.columns}
        clean = [{k: v for k, v in r.items() if k in cols} for r in batch]
        stmt = insert(table).values(clean)
        update_cols = {
            c.name: getattr(stmt.excluded, c.name)
            for c in table.columns
            if c.name != pk
        }
        stmt = stmt.on_conflict_do_update(index_elements=[pk], set_=update_cols)
        session.execute(stmt)
        count += len(clean)
    return count


def collect_source(
    name: str,
    from_export: Optional[Path],
    db_fs,
) -> list[tuple[str, dict[str, Any]]]:
    if from_export:
        path = from_export / f"{name}.jsonl"
        if not path.exists():
            logger.warning("Missing export file %s", path)
            return []
        return list(load_jsonl(path))
    return list(stream_collection(db_fs, name))


def quarantine(session: Session, collection: str, source_id: str, reason: str, payload: dict) -> None:
    session.add(
        MigrationQuarantine(
            source_collection=collection,
            source_id=source_id,
            reason=reason,
            payload=payload,
        )
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate Firestore data into Postgres")
    parser.add_argument(
        "--from-export",
        type=str,
        default=None,
        help="Path to export directory with *.jsonl files (preferred offline mode)",
    )
    parser.add_argument(
        "--skip-purse-recompute",
        action="store_true",
        help="Do not recompute team spent/remaining/players_count",
    )
    args = parser.parse_args()

    settings = get_settings()
    settings.require_database_url()
    get_engine()
    factory = get_session_factory()

    from_export = Path(args.from_export) if args.from_export else None
    db_fs = None if from_export else get_firestore_client()

    report: dict[str, Any] = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "from_export": str(from_export) if from_export else None,
        "counts": {},
        "quarantine": [],
        "purse_reconciliation": [],
        "errors": [],
    }

    with factory() as session:
        run = MigrationRun(status="running", notes="migrate_firestore_to_postgres")
        session.add(run)
        session.commit()
        run_id = run.id

        def load_phase(
            collection: str,
            model,
            transform: TransformFn,
            pk: str = "id",
            required_fields: Optional[list[str]] = None,
        ) -> int:
            rows_out: list[dict[str, Any]] = []
            for doc_id, data in collect_source(collection, from_export, db_fs):
                try:
                    row = transform(doc_id, data if isinstance(data, dict) else {})
                    if required_fields:
                        missing = [f for f in required_fields if not row.get(f)]
                        if missing:
                            quarantine(
                                session,
                                collection,
                                doc_id,
                                f"missing required fields: {missing}",
                                data if isinstance(data, dict) else {"value": data},
                            )
                            continue
                    rows_out.append(row)
                except Exception as exc:
                    quarantine(session, collection, doc_id, str(exc), data if isinstance(data, dict) else {})
            n = upsert_mappings(session, model, rows_out, pk=pk)
            session.commit()
            report["counts"][collection] = {"loaded": n, "source": len(rows_out)}
            logger.info("%s: loaded %s rows", collection, n)
            return n

        # 1. Users (team_id deferred — null then set after teams)
        user_rows = []
        for doc_id, data in collect_source("users", from_export, db_fs):
            row = transform_user(doc_id, data if isinstance(data, dict) else {})
            row["team_id"] = None  # set after teams exist
            user_rows.append(row)
        # Keep original team_id mapping
        user_team_map = {}
        for doc_id, data in collect_source("users", from_export, db_fs):
            if isinstance(data, dict) and data.get("team_id"):
                uid = data.get("uid") or doc_id
                user_team_map[uid] = data["team_id"]

        upsert_mappings(session, User, user_rows, pk="id")
        session.commit()
        report["counts"]["users"] = {"loaded": len(user_rows)}

        load_phase("events", Event, transform_event, required_fields=["id", "name"])
        load_phase("categories", Category, transform_category, required_fields=["id", "event_id"])
        load_phase("teams", Team, transform_team, required_fields=["id", "event_id"])

        # Restore user.team_id
        for uid, team_id in user_team_map.items():
            user = session.get(User, uid)
            if user and session.get(Team, team_id):
                user.team_id = team_id
        session.commit()

        # Players with optional event_id
        player_rows = []
        category_event: dict[str, str] = {
            c.id: c.event_id for c in session.scalars(select(Category)).all()
        }
        for doc_id, data in collect_source("players", from_export, db_fs):
            row = transform_player(doc_id, data if isinstance(data, dict) else {})
            if not row.get("category_id"):
                quarantine(session, "players", doc_id, "missing category_id", data if isinstance(data, dict) else {})
                continue
            if not row.get("event_id"):
                row["event_id"] = category_event.get(row["category_id"])
            if not row.get("event_id"):
                quarantine(
                    session,
                    "players",
                    doc_id,
                    "cannot resolve event_id via category",
                    data if isinstance(data, dict) else {},
                )
                # Still load player with null event_id for preservation
            if not session.get(Category, row["category_id"]):
                quarantine(
                    session,
                    "players",
                    doc_id,
                    f"category_id {row['category_id']} not found",
                    data if isinstance(data, dict) else {},
                )
                # Skip FK violation
                continue
            player_rows.append(row)
        upsert_mappings(session, Player, player_rows, pk="id")
        session.commit()
        report["counts"]["players"] = {"loaded": len(player_rows)}

        load_phase(
            "player_registrations",
            PlayerRegistration,
            transform_registration,
            required_fields=["id", "event_id"],
        )
        load_phase("sponsors", Sponsor, transform_sponsor, required_fields=["id", "event_id"])

        # Bids
        bid_rows = []
        for doc_id, data in collect_source("bids", from_export, db_fs):
            row = transform_bid(doc_id, data if isinstance(data, dict) else {})
            if not all([row.get("id"), row.get("event_id"), row.get("player_id"), row.get("team_id")]):
                quarantine(session, "bids", doc_id, "missing FK fields", data if isinstance(data, dict) else {})
                continue
            # Skip if FK missing
            if not session.get(Event, row["event_id"]) or not session.get(Player, row["player_id"]) or not session.get(Team, row["team_id"]):
                quarantine(session, "bids", doc_id, "FK target missing", data if isinstance(data, dict) else {})
                continue
            bid_rows.append(row)
        upsert_mappings(session, Bid, bid_rows, pk="id")
        session.commit()
        report["counts"]["bids"] = {"loaded": len(bid_rows)}

        # Auction states
        state_rows = []
        for doc_id, data in collect_source("auction_state", from_export, db_fs):
            row = transform_auction_state(doc_id, data if isinstance(data, dict) else {})
            if not row.get("event_id") or not session.get(Event, row["event_id"]):
                quarantine(session, "auction_state", doc_id, "invalid event_id", data if isinstance(data, dict) else {})
                continue
            # Null out dangling current_player/team FKs
            if row.get("current_player_id") and not session.get(Player, row["current_player_id"]):
                row["current_player_id"] = None
            if row.get("current_team_id") and not session.get(Team, row["current_team_id"]):
                row["current_team_id"] = None
            state_rows.append(row)
        upsert_mappings(session, AuctionState, state_rows, pk="event_id")
        session.commit()
        report["counts"]["auction_state"] = {"loaded": len(state_rows)}

        # Payments
        pay_rows = []
        for doc_id, data in collect_source("payment_orders", from_export, db_fs):
            row = transform_payment(doc_id, data if isinstance(data, dict) else {})
            if not row.get("order_id") or not row.get("event_id"):
                quarantine(session, "payment_orders", doc_id, "missing order_id/event_id", data if isinstance(data, dict) else {})
                continue
            if not session.get(Event, row["event_id"]):
                quarantine(session, "payment_orders", doc_id, "event missing", data if isinstance(data, dict) else {})
                continue
            pay_rows.append(row)
        upsert_mappings(session, PaymentOrder, pay_rows, pk="order_id")
        session.commit()
        report["counts"]["payment_orders"] = {"loaded": len(pay_rows)}

        # Tokens
        token_rows = []
        for doc_id, data in collect_source("public_team_tokens", from_export, db_fs):
            row = transform_public_token(doc_id, data if isinstance(data, dict) else {})
            if not row.get("token") or not row.get("team_id"):
                quarantine(session, "public_team_tokens", doc_id, "missing token/team_id", data if isinstance(data, dict) else {})
                continue
            if not session.get(Team, row["team_id"]):
                quarantine(session, "public_team_tokens", doc_id, "team missing", data if isinstance(data, dict) else {})
                continue
            token_rows.append(row)
        upsert_mappings(session, PublicTeamToken, token_rows, pk="id")
        session.commit()
        report["counts"]["public_team_tokens"] = {"loaded": len(token_rows)}

        # Bank details
        bank_rows = []
        for doc_id, data in collect_source("bank_details", from_export, db_fs):
            row = transform_bank(doc_id, data if isinstance(data, dict) else {})
            if not row.get("user_id") or not session.get(User, row["user_id"]):
                quarantine(session, "bank_details", doc_id, "user missing", data if isinstance(data, dict) else {})
                continue
            bank_rows.append(row)
        upsert_mappings(session, BankDetails, bank_rows, pk="id")
        session.commit()
        report["counts"]["bank_details"] = {"loaded": len(bank_rows)}

        # Note: payment_gateway_settings secrets intentionally NOT migrated into tables

        # Purse recompute (approved policy)
        if not args.skip_purse_recompute:
            teams = session.scalars(select(Team)).all()
            for team in teams:
                sold = session.scalars(
                    select(Player).where(
                        Player.sold_to_team_id == team.id,
                        Player.status == "sold",
                    )
                ).all()
                sum_sold = sum((p.sold_price or 0) for p in sold)
                count_sold = len(sold)
                entry = {
                    "team_id": team.id,
                    "team_name": team.name,
                    "budget": team.budget,
                    "original_spent": team.original_spent,
                    "original_remaining": team.original_remaining,
                    "original_players_count": team.original_players_count,
                    "sum_sold_price": sum_sold,
                    "sold_players_count": count_sold,
                    "recomputed_spent": sum_sold,
                    "recomputed_remaining": team.budget - sum_sold,
                    "recomputed_players_count": count_sold,
                    "discrepancy_spent": (team.original_spent or 0) - sum_sold,
                    "discrepancy_remaining": (team.original_remaining or 0) - (team.budget - sum_sold),
                }
                report["purse_reconciliation"].append(entry)
                team.spent = sum_sold
                team.remaining = team.budget - sum_sold
                team.players_count = count_sold
            session.commit()
            logger.info("Purse recompute complete for %s teams", len(teams))

        q_count = len(session.scalars(select(MigrationQuarantine)).all())
        report["quarantine_count"] = q_count
        report["finished_at"] = datetime.now(timezone.utc).isoformat()
        report["status"] = "completed"

        run = session.get(MigrationRun, run_id)
        if run:
            run.status = "completed"
            run.finished_at = datetime.now(timezone.utc)
            run.report = report
        session.commit()

    out_dir = settings.migration_output_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_path = out_dir / f"migration_report_{stamp}.json"
    out_path.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    (out_dir / "migration_report_latest.json").write_text(
        json.dumps(report, indent=2, default=str), encoding="utf-8"
    )
    logger.info("Migration report: %s", out_path)
    print(json.dumps({"ok": True, "report": str(out_path), "counts": report["counts"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
