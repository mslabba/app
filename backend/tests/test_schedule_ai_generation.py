"""
Tests for AI schedule generation (issue #79) — the AI itself creates
the full day-by-day schedule with start/end times and rest-aware
ordering, the deterministic validator checks it, a failed validation
is fed back once, and the deterministic generator is the fallback.

The Groq call is mocked — no real API call is made. Run:
  cd backend
  pytest tests/test_schedule_ai_generation.py -v
"""

from __future__ import annotations

import copy
import json

import pytest

from app.schedule import (
    assign_match_times,
    collect_schedule_violations,
    generate_schedule,
    validate_schedule,
)
from app.schedule_ai import (
    AINotConfiguredError,
    AIGenerationError,
    GROQ_API_URL,
    GROQ_MODEL,
    generate_ai_schedule,
    generate_schedule_ai_or_fallback,
)

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
    "day_start_time": "09:00",
    "day_end_time": "18:00",
    "match_duration_minutes": 90,
    "min_rest_minutes": 30,
    "avoid_consecutive_matches": True,
}


class _FakeResponse:
    """Minimal stand-in for a requests Response."""

    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


def _groq_reply(schedule, calls=None):
    """A mock http_post returning one Groq-style chat completion."""

    def post(url, headers=None, timeout=None, **kwargs):
        payload = kwargs.get("json")
        if calls is not None:
            calls.append({"url": url, "headers": headers, "json": payload, "timeout": timeout})
        content = schedule if isinstance(schedule, str) else json.dumps(schedule)
        return _FakeResponse(200, {"choices": [{"message": {"content": content}}]})

    return post


def _groq_reply_sequence(schedules, calls=None):
    """A mock http_post returning a different reply per call."""

    def post(url, headers=None, timeout=None, **kwargs):
        payload = kwargs.get("json")
        if calls is not None:
            calls.append({"url": url, "headers": headers, "json": payload, "timeout": timeout})
        reply = schedules[min(len(calls) - 1 if calls is not None else 0, len(schedules) - 1)]
        content = reply if isinstance(reply, str) else json.dumps(reply)
        return _FakeResponse(200, {"choices": [{"message": {"content": content}}]})

    return post


def _all_matches(schedule):
    return [m for day in schedule["days"] for m in day["matches"]]


def _valid_timed_kgra():
    """A valid KGRA schedule with times, as the AI would return it
    (days + total only — the server attaches the conditions)."""
    s = generate_schedule(KGRA_CONDITIONS)
    return {"days": s["days"], "total_matches": s["total_matches"]}


def _assert_valid_timed_kgra(schedule):
    """The KGRA acceptance case: hard rules + time/rest rules."""
    assert collect_schedule_violations(KGRA_CONDITIONS, schedule) == []
    assert schedule["total_matches"] == 14
    assert len(schedule["days"]) == 4
    assert [len(d["matches"]) for d in schedule["days"]] == [3, 3, 4, 4]
    matches = _all_matches(schedule)
    # Pro done by Day 3 morning: the Pro final is the first match of Day 3.
    pro_final = [m for m in matches if m["stage"] == "final" and m["group"] == "Pro"]
    assert len(pro_final) == 1 and pro_final[0]["day"] == 3
    # Every match has times inside the day window.
    for m in matches:
        assert m.get("start_time") and m.get("end_time")
        assert "09:00" <= m["start_time"] < m["end_time"] <= "18:00"
    # No team plays two matches with less than 30 minutes rest.
    by_team = {}
    for m in matches:
        for team in (m["team_a"], m["team_b"]):
            by_team.setdefault(team, []).append(m)
    for team, team_matches in by_team.items():
        ordered = sorted(
            team_matches, key=lambda m: (m["day"], m["start_time"])
        )
        for prev, nxt in zip(ordered, ordered[1:]):
            if prev["day"] == nxt["day"]:
                prev_end = int(prev["end_time"][:2]) * 60 + int(prev["end_time"][3:])
                next_start = int(nxt["start_time"][:2]) * 60 + int(nxt["start_time"][3:])
                assert next_start - prev_end >= 30, (team, prev, nxt)


def test_ai_generates_valid_timed_kgra_schedule():
    """A valid mocked AI schedule passes validation and is marked AI."""
    schedule, generated_by, notes = generate_schedule_ai_or_fallback(
        KGRA_CONDITIONS, api_key="test-key", http_post=_groq_reply(_valid_timed_kgra())
    )
    assert generated_by == "ai"
    _assert_valid_timed_kgra(schedule)


def test_ai_request_uses_groq_model_and_url():
    """The generation call goes to Groq with gpt-oss-120b and the conditions."""
    calls = []
    generate_ai_schedule(
        KGRA_CONDITIONS, api_key="test-key", http_post=_groq_reply(_valid_timed_kgra(), calls)
    )
    assert len(calls) == 1
    assert calls[0]["url"] == GROQ_API_URL
    assert calls[0]["json"]["model"] == GROQ_MODEL
    assert calls[0]["json"]["messages"][-1]["content"].startswith(
        "Generate the match schedule"
    )
    assert "Pro" in calls[0]["json"]["messages"][-1]["content"]


def test_retry_fixes_invalid_ai_schedule():
    """First AI reply breaks the rest rule; the retry fixes it and the
    result is still marked AI. The retry prompt names the violation."""
    valid = _valid_timed_kgra()
    broken = copy.deepcopy(valid)
    # Day 2: Pro B plays matches 1 and 2. Remove the rest gap between
    # them (second match starts when the first ends) — a consecutive
    # matches violation.
    day2 = broken["days"][1]["matches"]
    day2[1]["start_time"] = day2[0]["end_time"]
    day2[1]["end_time"] = "12:00"
    assert collect_schedule_violations(KGRA_CONDITIONS, {"conditions": KGRA_CONDITIONS, "days": broken["days"], "total_matches": 14})

    calls = []
    schedule, generated_by, notes = generate_schedule_ai_or_fallback(
        KGRA_CONDITIONS,
        api_key="test-key",
        http_post=_groq_reply_sequence([broken, valid], calls),
    )
    assert generated_by == "ai"
    assert len(calls) == 2
    # The retry was told what was wrong.
    assert "consecutive" in calls[1]["json"]["messages"][-1]["content"]
    _assert_valid_timed_kgra(schedule)


def test_fallback_when_ai_fails_twice():
    """Both AI replies are invalid — the deterministic fallback is
    used, marked as such, valid, and carrying times."""
    valid = _valid_timed_kgra()
    broken = copy.deepcopy(valid)
    # Drop a pairing (and renumber) — round robin incomplete.
    flat = [m for m in _all_matches({"days": valid["days"]}) if m["match"] != 1]
    cursor = 0
    days = []
    for day_no, size in enumerate([3, 3, 4, 3], start=1):
        chunk = flat[cursor : cursor + size]
        cursor += size
        days.append(
            {
                "day": day_no,
                "date": valid["days"][day_no - 1]["date"],
                "matches": [
                    {**m, "match": cursor - size + i + 1, "day": day_no}
                    for i, m in enumerate(chunk)
                ],
            }
        )
    broken = {"days": days, "total_matches": len(flat)}
    assert collect_schedule_violations(
        KGRA_CONDITIONS,
        {"conditions": KGRA_CONDITIONS, "days": days, "total_matches": len(flat)},
    )

    schedule, generated_by, notes = generate_schedule_ai_or_fallback(
        KGRA_CONDITIONS,
        api_key="test-key",
        http_post=_groq_reply_sequence([broken, broken]),
    )
    assert generated_by == "deterministic-fallback"
    assert any("deterministic" in n for n in notes)
    _assert_valid_timed_kgra(schedule)


def test_no_key_returns_not_configured_error(monkeypatch):
    """Without GROQ_API_KEY the AI path fails with the clear message — and makes no HTTP call."""
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    calls = []

    def post(url, headers=None, json=None, timeout=None):
        calls.append(url)
        raise AssertionError("no HTTP call should be made without a key")

    with pytest.raises(AINotConfiguredError, match="not configured"):
        generate_schedule_ai_or_fallback(KGRA_CONDITIONS, api_key=None, http_post=post)
    assert calls == []


def test_malformed_ai_schedule_rejected():
    """A reply that is not a schedule object is rejected cleanly."""
    with pytest.raises(AIGenerationError, match="not valid JSON"):
        generate_ai_schedule(
            KGRA_CONDITIONS, api_key="test-key", http_post=_groq_reply("not json at all")
        )
    with pytest.raises(AIGenerationError, match="no days"):
        generate_ai_schedule(
            KGRA_CONDITIONS, api_key="test-key", http_post=_groq_reply({"no_days": True})
        )


def test_time_validation_rejects_overlapping_matches():
    """Two matches of one team at overlapping times are rejected."""
    s = generate_schedule(KGRA_CONDITIONS)
    flat = _all_matches(s)
    # Make match 2 overlap match 1 for a shared team: Day 1 matches
    # 1 and 3 share Pro A — give match 3 the same slot as match 1.
    day1 = s["days"][0]["matches"]
    day1[2]["start_time"] = day1[0]["start_time"]
    day1[2]["end_time"] = day1[0]["end_time"]
    violations = collect_schedule_violations(KGRA_CONDITIONS, s)
    assert any("overlapping" in v for v in violations)


def test_time_validation_rejects_out_of_window_matches():
    """A match outside the day window is rejected."""
    s = generate_schedule(KGRA_CONDITIONS)
    s["days"][0]["matches"][0]["start_time"] = "07:00"
    s["days"][0]["matches"][0]["end_time"] = "08:30"
    violations = collect_schedule_violations(KGRA_CONDITIONS, s)
    assert any("outside the day window" in v for v in violations)


def test_time_validation_rejects_rest_violations():
    """A team with less than the minimum rest is rejected; adjacent
    matches with too little rest are the 'consecutive' violation."""
    s = generate_schedule(KGRA_CONDITIONS)
    day2 = s["days"][1]["matches"]
    # Pro B plays matches 1 and 2 of Day 2; remove the rest gap.
    day2[1]["start_time"] = day2[0]["end_time"]
    day2[1]["end_time"] = "12:00"
    violations = collect_schedule_violations(KGRA_CONDITIONS, s)
    assert any("consecutive matches" in v for v in violations)

    # Same pair, but with only 10 minutes rest (not zero) — still a
    # rest violation, now worded as rest rather than consecutive.
    s = generate_schedule(KGRA_CONDITIONS)
    day2 = s["days"][1]["matches"]
    assert day2[0]["end_time"] == "10:30"
    day2[1]["start_time"] = "10:40"
    day2[1]["end_time"] = "12:10"
    violations = collect_schedule_violations(KGRA_CONDITIONS, s)
    assert any("rest" in v for v in violations)


def test_time_validation_rejects_missing_times():
    """With a day window set, a match without times is rejected."""
    s = generate_schedule(KGRA_CONDITIONS)
    del s["days"][0]["matches"][0]["start_time"]
    violations = collect_schedule_violations(KGRA_CONDITIONS, s)
    assert any("no start/end time" in v for v in violations)


def test_deterministic_generator_with_window_assigns_times():
    """The deterministic generator assigns times when a window is
    given — and the result validates, with rest respected."""
    s = generate_schedule(KGRA_CONDITIONS)
    _assert_valid_timed_kgra(s)
    assert [len(d["matches"]) for d in s["days"]] == [3, 3, 4, 4]


def test_deterministic_generator_without_window_has_no_times():
    """Backwards compatible: conditions without a window produce the
    same schedule as before, with no times on the matches."""
    s = generate_schedule(
        {k: v for k, v in KGRA_CONDITIONS.items() if not k.startswith("day_")}
    )
    assert s["total_matches"] == 14
    assert all("start_time" not in m for m in _all_matches(s))
    validate_schedule(s["conditions"], s)


def test_different_conditions_ai_path():
    """A different set of conditions + preferences produces a
    different, valid AI schedule (single group, 3 teams, 2/day)."""
    conditions = {
        "groups": [{"name": "Open", "teams": ["X", "Y", "Z"]}],
        "finals_per_group": False,
        "matches_per_day": 2,
        "overs": 10,
        "start_date": "2026-12-10",
        "days": 2,
        "day_start_time": "10:00",
        "day_end_time": "16:00",
        "match_duration_minutes": 60,
        "min_rest_minutes": 15,
        "avoid_consecutive_matches": True,
    }
    valid = generate_schedule(conditions)
    reply = {"days": valid["days"], "total_matches": valid["total_matches"]}
    schedule, generated_by, notes = generate_schedule_ai_or_fallback(
        conditions, api_key="test-key", http_post=_groq_reply(reply)
    )
    assert generated_by == "ai"
    assert schedule["total_matches"] == 3
    assert collect_schedule_violations(conditions, schedule) == []
    for m in _all_matches(schedule):
        assert "10:00" <= m["start_time"] < m["end_time"] <= "16:00"


def test_assign_times_fails_when_window_too_short():
    """A day window that cannot hold the matches fails loudly."""
    with pytest.raises(ValueError, match="do not fit in the day window"):
        generate_schedule(
            {
                **KGRA_CONDITIONS,
                "day_start_time": "09:00",
                "day_end_time": "10:00",
            }
        )
