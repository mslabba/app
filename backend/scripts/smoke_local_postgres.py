#!/usr/bin/env python3
"""
Smoke-test public dual-backend API routes against local Docker Postgres.

Usage:
  # server already running on :8001 with DATA_BACKEND=postgres
  python scripts/smoke_local_postgres.py

  # or pass base URL
  BASE_URL=http://127.0.0.1:8001 python scripts/smoke_local_postgres.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.getenv("BASE_URL", "http://127.0.0.1:8001").rstrip("/")
EVENT = "local-demo-event"
TEAM = "local-demo-team"


def get(path: str) -> tuple[int, object]:
    url = f"{BASE}{path}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            body = resp.read().decode()
            return resp.status, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body
    except Exception as e:
        return 0, str(e)


def main() -> int:
    checks = [
        ("/api/health", lambda d: d.get("data_backend") == "postgres" and d.get("postgres") == "connected"),
        (f"/api/auctions/{EVENT}", lambda d: d.get("id") == EVENT),
        (f"/api/teams/event/{EVENT}", lambda d: isinstance(d, list) and len(d) >= 1),
        (f"/api/auctions/{EVENT}/players", lambda d: isinstance(d, list) and len(d) >= 1),
        (f"/api/categories/event/{EVENT}", lambda d: isinstance(d, list) and len(d) >= 1),
        (f"/api/auction/state/{EVENT}", lambda d: d.get("event_id") == EVENT),
        (f"/api/teams/{TEAM}", lambda d: d.get("id") == TEAM),
        (f"/api/auctions/{EVENT}/registration-count", lambda d: "count" in d),
        (f"/api/analytics/event/{EVENT}", lambda d: d.get("event_id") == EVENT),
        (f"/api/teams/{TEAM}/budget-analysis/{EVENT}", lambda d: "team" in d and "budget_analysis" in d),
        (f"/api/sponsors/event/{EVENT}", lambda d: isinstance(d, list)),
    ]

    # create-order without payment enabled should fail with a clear 400 (not 500/503)
    # This only validates the dual-backend path is reachable.
    def post_create_order() -> tuple[int, object]:
        req = urllib.request.Request(
            f"{BASE}/api/payments/create-order",
            data=json.dumps(
                {
                    "event_id": EVENT,
                    "customer_name": "Smoke Test",
                    "customer_email": "smoke@local.test",
                    "customer_phone": "9876543210",
                    "amount": 100,
                }
            ).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                body = resp.read().decode()
                return resp.status, json.loads(body) if body else None
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            try:
                return e.code, json.loads(body)
            except Exception:
                return e.code, body
        except Exception as e:
            return 0, str(e)

    failed = 0
    code, data = post_create_order()
    # Expected: 400 payment not enabled (demo event) OR gateway not configured
    detail = (data or {}).get("detail", data) if isinstance(data, dict) else data
    ok_pay = code == 400 and isinstance(detail, str)
    print(f"[{'OK' if ok_pay else 'FAIL'}] {code} POST /api/payments/create-order -> {str(detail)[:120]}")
    if not ok_pay:
        failed += 1

    for path, pred in checks:
        code, data = get(path)
        ok = code == 200 and pred(data)
        status = "OK" if ok else "FAIL"
        if not ok:
            failed += 1
        print(f"[{status}] {code} {path}")
        if not ok:
            print(f"       body: {str(data)[:200]}")

    print("")
    total = len(checks) + 1  # + create-order probe
    if failed:
        print(f"{failed} check(s) failed of {total}")
        return 1
    print(f"All {total} checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
