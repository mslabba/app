"""
Pure unit tests for the display-board serial number (issue #83).

Serial = players already sold/unsold in the event + 1 for the player on the
block; a just-sold/unsold player is serial = completed. No database, no
Firebase: imports only ``app.public_live`` (stdlib-only). Run:

  cd backend
  export PYTHONPATH=.
  pytest tests/test_public_live_serial.py -v
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.public_live import public_player_payload


def _payload(*, player=None, auction=None, completed=None, total=None):
    return public_player_payload(
        event={"id": "ev1", "name": "Test Cup"},
        auction=auction or {"status": "in_progress", "current_bid": 5000},
        player=player,
        category=None,
        sold_team=None,
        sponsors=[],
        completed_players=completed,
        total_players=total,
    )


def test_player_on_block_is_completed_plus_one():
    out = _payload(
        player={"id": "p12", "name": "Arjun", "status": "current", "base_price": 1000},
        completed=11,
        total=48,
    )
    assert out["player"]["player_number"] == 12
    assert out["player"]["total_players"] == 48


def test_sold_player_is_completed_count():
    out = _payload(
        player={
            "id": "p12",
            "name": "Arjun",
            "status": "sold",
            "base_price": 1000,
            "sold_price": 8000,
        },
        completed=12,
        total=48,
    )
    assert out["player"]["player_number"] == 12
    assert out["player"]["total_players"] == 48


def test_just_sold_synthetic_player_from_last_result():
    out = _payload(
        player=None,
        auction={
            "status": "in_progress",
            "current_bid": None,
            "last_result": {
                "type": "sold",
                "player_id": "p12",
                "player_name": "Arjun",
                "price": 8000,
                "at": "2099-01-01T00:00:00Z",
            },
        },
        completed=12,
        total=48,
    )
    assert out["player"]["player_number"] == 12
    assert out["player"]["total_players"] == 48
    assert out["player"]["status"] == "sold"


def test_no_counts_means_no_serial():
    out = _payload(
        player={"id": "p12", "name": "Arjun", "status": "current", "base_price": 1000},
    )
    assert "player_number" not in out["player"]
    assert "total_players" not in out["player"]


def test_first_player_of_event():
    out = _payload(
        player={"id": "p1", "name": "Bala", "status": "current", "base_price": 500},
        completed=0,
        total=30,
    )
    assert out["player"]["player_number"] == 1
    assert out["player"]["total_players"] == 30
