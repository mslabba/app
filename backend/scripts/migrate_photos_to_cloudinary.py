#!/usr/bin/env python3
"""
One-shot migration: upload every player photo / ID proof that is still stored
as a base64 data URI to Cloudinary and save the Cloudinary URL in its place.

Why: a data URI has no URL, so the Excel export can only show
'Photo attached (data URI, not exported)'. Once the photo is on Cloudinary,
the export shows the real, clickable URL.

Safety (no image is replaced, no mismatch):
- Idempotent: only documents whose photo_url / identity_proof_url starts
  with 'data:' are touched. Re-running is safe; already-migrated photos are
  skipped.
- No mismatch: each image is uploaded and the returned URL is written back
  to that SAME document, and only after the upload succeeds. If an upload
  fails, that document is left untouched and reported. The image bytes are
  never altered — they are only re-hosted on Cloudinary.
- Dry run first: --dry-run lists what would be migrated without uploading
  or changing anything.
- Scope it: --event-id migrates a single event first, so you can verify the
  result on a small set before running it for everything.
- One first: --limit 1 migrates a single photo, so you can confirm it
  worked (re-export and check that one row) before doing the rest.

Collections migrated: player_registrations and players (approved players
carry the same photo_url copied from their registration).

Usage (from backend/ with the venv active):
  export PYTHONPATH=.
  python scripts/migrate_photos_to_cloudinary.py --dry-run
  python scripts/migrate_photos_to_cloudinary.py --dry-run --event-id 5dc941da-347a-4471-80a6-25af5dbe4360
  python scripts/migrate_photos_to_cloudinary.py --event-id 5dc941da-347a-4471-80a6-25af5dbe4360 --limit 1 --yes
  python scripts/migrate_photos_to_cloudinary.py --event-id 5dc941da-347a-4471-80a6-25af5dbe4360 --yes
  python scripts/migrate_photos_to_cloudinary.py --yes

Credentials: same as the backend — backend/firebase-admin.json by default,
or set FIREBASE_CREDENTIALS_PATH to a service account JSON path, or
FIREBASE_CREDENTIALS to the JSON string. Cloudinary uses the same unsigned
preset as the app (CLOUDINARY_CLOUD_NAME / CLOUDINARY_UPLOAD_PRESET,
defaults drok5rkeb / auction_uploads).
"""

from __future__ import annotations

import argparse
import base64
import logging
import os
import sys
from pathlib import Path

import requests

# Ensure backend root is on path (so `app.*` imports work).
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.migration.firestore_client import get_firestore_client  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("migrate_photos_to_cloudinary")

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "drok5rkeb")
CLOUDINARY_UPLOAD_PRESET = os.getenv("CLOUDINARY_UPLOAD_PRESET", "auction_uploads")

COLLECTIONS = ("player_registrations", "players")
FIELDS = (("photo_url", "auction_players"), ("identity_proof_url", "auction_id_proofs"))

_MIME_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}


def upload_data_uri_to_cloudinary(data_uri: str, folder: str) -> str | None:
    """Decode a base64 data URI and upload it to Cloudinary (unsigned).

    Returns the Cloudinary secure URL, or None if the data URI is invalid
    or the upload fails.
    """
    if not isinstance(data_uri, str) or not data_uri.startswith("data:"):
        return None
    try:
        header, _, b64 = data_uri.partition(",")
        if not b64 or ";base64" not in header:
            logger.warning("Data URI is not base64-encoded, skipping")
            return None
        mime = header[5:].split(";")[0].strip().lower() or "image/jpeg"
        ext = _MIME_EXT.get(mime, "jpg")
        image_data = base64.b64decode(b64, validate=True)
    except Exception as e:  # noqa: BLE001 - report and skip this image
        logger.warning("Could not decode data URI: %s", e)
        return None
    try:
        upload_url = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload"
        files = {"file": (f"photo.{ext}", image_data)}
        data = {
            "upload_preset": CLOUDINARY_UPLOAD_PRESET,
            "folder": folder,
            "resource_type": "image",
        }
        response = requests.post(upload_url, files=files, data=data, timeout=30)
        if response.status_code == 200:
            url = response.json().get("secure_url")
            logger.info("Uploaded to Cloudinary: %s", url)
            return url
        logger.error("Cloudinary upload failed: %s - %s", response.status_code, response.text[:300])
        return None
    except Exception as e:  # noqa: BLE001 - report and skip this image
        logger.error("Error uploading to Cloudinary: %s", e)
        return None


def migrate_collection(db, collection: str, event_id: str | None, dry_run: bool,
                       limit: int | None = None) -> dict:
    """Migrate data-URI photos in one collection. Returns counts.

    `limit` caps how many items (photos + ID proofs) are migrated in this
    call — pass the remaining budget when limiting across collections.
    Only successful migrations count toward the limit; a failed upload does
    not consume it, so a retry picks up where it left off.
    """
    counts = {"migrated_photos": 0, "migrated_id_proofs": 0, "failed": 0, "skipped": 0, "errors": []}

    def migrated_so_far() -> int:
        return counts["migrated_photos"] + counts["migrated_id_proofs"]

    query = db.collection(collection)
    if event_id:
        query = query.where("event_id", "==", event_id)
    for doc in query.stream():
        if limit is not None and migrated_so_far() >= limit:
            break
        data = doc.to_dict() or {}
        name = data.get("name") or doc.id
        updates: dict[str, str] = {}
        for field, folder in FIELDS:
            if limit is not None and migrated_so_far() >= limit:
                break
            value = data.get(field) or ""
            if isinstance(value, str) and value.startswith("data:"):
                if dry_run:
                    counts["migrated_photos" if field == "photo_url" else "migrated_id_proofs"] += 1
                    logger.info("[dry-run] %s/%s: %s would be uploaded", collection, doc.id, field)
                    continue
                url = upload_data_uri_to_cloudinary(value, folder=folder)
                if url:
                    updates[field] = url
                    counts["migrated_photos" if field == "photo_url" else "migrated_id_proofs"] += 1
                else:
                    counts["failed"] += 1
                    counts["errors"].append(f"{collection}/{doc.id} ({name}): {field} upload failed")
            elif value:
                counts["skipped"] += 1
        if updates and not dry_run:
            try:
                doc.reference.update(updates)
            except Exception as e:  # noqa: BLE001 - report and keep going
                counts["failed"] += 1
                counts["errors"].append(f"{collection}/{doc.id} ({name}): save failed ({e})")
                for field in updates:
                    key = "migrated_photos" if field == "photo_url" else "migrated_id_proofs"
                    counts[key] -= 1
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="List what would be migrated; upload and change nothing.")
    parser.add_argument("--event-id", default=None, help="Migrate only this event (player_registrations and players with this event_id).")
    parser.add_argument("--limit", type=int, default=None, help="Migrate at most this many photos / ID proofs, then stop. Use 1 to try a single photo first and verify it before running the rest.")
    parser.add_argument("--yes", action="store_true", help="Skip the confirmation prompt.")
    args = parser.parse_args()

    db = get_firestore_client()
    logger.info("Cloudinary: cloud=%s preset=%s", CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET)

    if not args.dry_run and not args.yes:
        scope = f"event {args.event_id}" if args.event_id else "ALL events"
        answer = input(
            f"This will upload data-URI photos to Cloudinary and replace them with URLs ({scope}).\n"
            "Type 'yes' to continue: "
        ).strip().lower()
        if answer != "yes":
            print("Aborted.")
            return 1

    total = {"migrated_photos": 0, "migrated_id_proofs": 0, "failed": 0, "skipped": 0, "errors": []}
    remaining = args.limit
    for collection in COLLECTIONS:
        if remaining is not None and remaining <= 0:
            break
        counts = migrate_collection(db, collection, args.event_id, args.dry_run, limit=remaining)
        migrated_here = counts["migrated_photos"] + counts["migrated_id_proofs"]
        if remaining is not None:
            remaining -= migrated_here
        for key in ("migrated_photos", "migrated_id_proofs", "failed", "skipped"):
            total[key] += counts[key]
        total["errors"].extend(counts["errors"])
        logger.info(
            "%s: %d photos, %d ID proofs migrated, %d failed, %d already URLs",
            collection, counts["migrated_photos"], counts["migrated_id_proofs"],
            counts["failed"], counts["skipped"],
        )

    print("\n=== Summary ===")
    print(f"Photos migrated to Cloudinary: {total['migrated_photos']}")
    print(f"ID proofs migrated to Cloudinary: {total['migrated_id_proofs']}")
    print(f"Already URLs (skipped): {total['skipped']}")
    print(f"Failed: {total['failed']}")
    if total["errors"]:
        print("Errors:")
        for err in total["errors"]:
            print(f"  - {err}")
    if args.dry_run:
        print("\nDry run — nothing was uploaded or changed. Re-run without --dry-run to migrate.")
    elif total["failed"]:
        print("\nSome uploads failed. Re-run the same command to retry only the failed ones (migrated ones are skipped).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
