"""
Tests for the deterministic match-schedule generator (issue #77).

Pure module — no database, no network, no LLM. Run:
  cd backend
  pytest tests/test_schedule_generator.py -v
"""

from __future__ import annotations

import pytest

from app.schedule import generate_schedule, validate_schedule

KGRA_CONDITIONS = {
    "groups": [
        {"name": "Pro", "teams": ["Pro A", "Pro B", "Pro C", "Pro D"]},
        {"name": "Legend", "teams": ["Leg A", "Leg B", "Leg C", "Leg D"]},
    ],
    "finals_per_group": True,
    "matches_per_day": 4,
    "overs": 12,
    "start_date": "2026-12-10",
    "days": 4,
}


def _all_matches(schedule):
    return [m for day in schedule["days"] for m in day["matches"]]


def test_kgra_case_exact():
    """The KGRA acceptance case, exactly as the ticket states it."""
    s = generate_schedule(KGRA_CONDITIONS)

    assert s["total_matches"] == 14
    assert len(s["days"]) == 4
    # Day split: 3, 3, 4, 4 — never more than 4 a day.
    assert [len(d["matches"]) for d in s["days"]] == [3, 3, 4, 4]
    # Dates run from the start date.
    assert [d["date"] for d in s["days"]] == [
        "2026-12-10",
        "2026-12-11",
        "2026-12-12",
        "2026-12-13",
    ]

    matches = _all_matches(s)
    # Pro done by Day 3 morning: the Pro final is the first match of Day 3.
    pro_final = [m for m in matches if m["stage"] == "final" and m["group"] == "Pro"]
    assert len(pro_final) == 1
    assert pro_final[0]["day"] == 3
    assert s["days"][2]["matches"][0] is pro_final[0]
    # Legend final is the last match of the tournament.
    leg_final = [m for m in matches if m["stage"] == "final" and m["group"] == "Legend"]
    assert len(leg_final) == 1
    assert leg_final[0]["day"] == 4
    assert matches[-1] is leg_final[0]

    # Day 1: Pro M1-M3, Day 2: Pro M4-M6.
    assert [m["group"] for m in s["days"][0]["matches"]] == ["Pro"] * 3
    assert [m["group"] for m in s["days"][1]["matches"]] == ["Pro"] * 3
    # Day 3: Pro final, then Legend M1-M3. Day 4: Legend M4-M6, then final.
    assert s["days"][2]["matches"][0]["stage"] == "final"
    assert [m["group"] for m in s["days"][2]["matches"][1:]] == ["Legend"] * 3
    assert [m["stage"] for m in s["days"][3]["matches"]] == [
        "group",
        "group",
        "group",
        "final",
    ]

    # Round robin complete in each group: every pair exactly once.
    for group, teams in (("Pro", KGRA_CONDITIONS["groups"][0]["teams"]),
                         ("Legend", KGRA_CONDITIONS["groups"][1]["teams"])):
        pairs = {
            frozenset((m["team_a"], m["team_b"]))
            for m in matches
            if m["group"] == group and m["stage"] == "group"
        }
        expected = {
            frozenset((a, b))
            for i, a in enumerate(teams)
            for b in teams[i + 1 :]
        }
        assert pairs == expected, group

    # One final per group, 12 overs on every match.
    assert len([m for m in matches if m["stage"] == "final"]) == 2
    assert all(m["overs"] == 12 for m in matches)


def test_different_conditions_single_group():
    """Conditions are genuinely dynamic: a different setup gives a
    different, valid schedule (single group, 3 teams, 2/day, no finals)."""
    s = generate_schedule(
        {
            "groups": [{"name": "Open", "teams": ["X", "Y", "Z"]}],
            "finals_per_group": False,
            "matches_per_day": 2,
            "overs": 10,
        }
    )
    # 3 teams round robin = 3 matches, no finals, 2/day -> 2 days.
    assert s["total_matches"] == 3
    assert len(s["days"]) == 2
    assert [len(d["matches"]) for d in s["days"]] == [1, 2]
    assert all(m["overs"] == 10 for m in _all_matches(s))
    assert all(m["stage"] == "group" for m in _all_matches(s))
    # No start date -> no dates.
    assert all(d["date"] is None for d in s["days"])


def test_different_conditions_three_groups_odd_teams():
    """Three groups, an odd team count (bye handling), a different cap."""
    s = generate_schedule(
        {
            "groups": [
                {"name": "A", "teams": ["A1", "A2", "A3", "A4", "A5"]},
                {"name": "B", "teams": ["B1", "B2", "B3"]},
                {"name": "C", "teams": ["C1", "C2"]},
            ],
            "finals_per_group": True,
            "matches_per_day": 3,
            "overs": 8,
            "days": 10,
        }
    )
    # 5 teams = 10 matches, 3 teams = 3, 2 teams = 1 -> 14 group + 3 finals.
    assert s["total_matches"] == 17
    assert all(len(d["matches"]) <= 3 for d in s["days"])
    matches = _all_matches(s)
    # Groups play in order, one final each, finals last for their group.
    assert [m["group"] for m in matches] == sorted(
        [m["group"] for m in matches],
        key=lambda g: ["A", "B", "C"].index(g),
    )
    assert len([m for m in matches if m["stage"] == "final"]) == 3
    # Round robin complete in the 5-team group.
    pairs = {
        frozenset((m["team_a"], m["team_b"]))
        for m in matches
        if m["group"] == "A" and m["stage"] == "group"
    }
    assert len(pairs) == 10


def test_impossible_conditions_fail_loudly():
    """Too few days for the matches: no half-valid schedule, a clear error."""
    with pytest.raises(ValueError, match="need 7 days"):
        generate_schedule(
            {
                "groups": [{"name": "Pro", "teams": ["A", "B", "C", "D"]}],
                "matches_per_day": 1,
                "days": 2,
            }
        )


def test_invalid_conditions_fail_loudly():
    with pytest.raises(ValueError, match="at least 2 teams"):
        generate_schedule({"groups": [{"name": "Solo", "teams": ["Only"]}]})
    with pytest.raises(ValueError, match="duplicate team names"):
        generate_schedule({"groups": [{"name": "Dup", "teams": ["A", "A", "B"]}]})
    with pytest.raises(ValueError, match="At least one group"):
        generate_schedule({"groups": []})
    with pytest.raises(ValueError, match="matches_per_day must be at least 1"):
        generate_schedule(
            {"groups": [{"name": "G", "teams": ["A", "B"]}], "matches_per_day": 0}
        )
    with pytest.raises(ValueError, match="start_date must be a YYYY-MM-DD date"):
        generate_schedule(
            {
                "groups": [{"name": "G", "teams": ["A", "B"]}],
                "start_date": "10/12/2026",
            }
        )


def _rebuild(schedule, flat_matches, day_sizes):
    """Rebuild a schedule dict from a flat match list and day sizes,
    renumbering matches and fixing their day/date fields."""
    days = []
    cursor = 0
    for day_no, size in enumerate(day_sizes, start=1):
        chunk = flat_matches[cursor : cursor + size]
        cursor += size
        day_date = schedule["days"][day_no - 1]["date"] if day_no <= len(schedule["days"]) else None
        days.append(
            {
                "day": day_no,
                "date": day_date,
                "matches": [
                    {**m, "match": cursor - size + i + 1, "day": day_no, "date": day_date}
                    for i, m in enumerate(chunk)
                ],
            }
        )
    return {
        "conditions": schedule["conditions"],
        "days": days,
        "total_matches": len(flat_matches),
    }


def test_validation_rejects_tampered_schedule():
    """The self-check the save endpoint relies on: a schedule that does
    not match its conditions is refused."""
    s = generate_schedule(KGRA_CONDITIONS)

    # Drop a pairing -> round robin incomplete.
    flat = [m for m in _all_matches(s) if m["match"] != 1]
    tampered = _rebuild(s, flat, [3, 3, 4, 3])
    with pytest.raises(ValueError, match="round robin is incomplete"):
        validate_schedule(s["conditions"], tampered)

    # Duplicate a final -> two finals for one group. Uses a cap of 6 so
    # the extra match does not trip the daily-cap check first.
    wide = generate_schedule({**KGRA_CONDITIONS, "matches_per_day": 6})
    flat = _all_matches(wide)
    extra_final = dict(flat[-1])
    doubled = _rebuild(wide, flat + [extra_final], [3, 3, 4, 5])
    with pytest.raises(ValueError, match="has 2 final"):
        validate_schedule(wide["conditions"], doubled)

    # A day over the cap (5 matches on a day capped at 4).
    flat = _all_matches(s)
    over_cap = _rebuild(s, flat, [5, 3, 3, 3])
    with pytest.raises(ValueError, match="over the limit"):
        validate_schedule(s["conditions"], over_cap)

    # Group order broken: a Legend match before the Pro final.
    flat = _all_matches(s)
    flat[6], flat[7] = flat[7], flat[6]  # Pro final <-> first Legend match
    reordered = _rebuild(s, flat, [3, 3, 4, 4])
    with pytest.raises(ValueError, match="groups must play in order"):
        validate_schedule(s["conditions"], reordered)


def test_no_days_uses_minimum_days():
    """Without a day limit the schedule packs into the fewest days."""
    s = generate_schedule(
        {
            "groups": [{"name": "G", "teams": ["A", "B", "C", "D"]}],
            "finals_per_group": False,
            "matches_per_day": 4,
        }
    )
    assert s["total_matches"] == 6
    assert len(s["days"]) == 2
    assert [len(d["matches"]) for d in s["days"]] == [3, 3]
