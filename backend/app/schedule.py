"""
Deterministic match-schedule generator (issue #77).

Pure module: no database, no network, no LLM. The organiser enters the
tournament conditions and this module turns them into a day-by-day match
schedule, then validates its own output against the conditions before
returning it. If no valid schedule can be produced for the given
conditions, it fails loudly (ValueError) instead of returning a
half-valid fixture list.

AI interpretation of free-text conditions is a possible follow-up, not
this module — a deterministic generator satisfies the acceptance
criteria without LLM cost, latency or hallucination risk.

Conditions (dict):
    groups: [{"name": str, "teams": [str, ...]}, ...]
        Play order is the list order: every match of groups[0] (group
        stage + final) is scheduled before any match of groups[1], and
        so on. This is the KGRA rule — the Pro teams finish first and
        leave, only the Legend teams stay on.
    finals_per_group: bool, default True — one final per group, played
        by the group's 1st- and 2nd-placed teams (unknown at generation
        time, so the final lists placeholder teams).
    matches_per_day: int, default 4 — maximum matches on any one day.
    overs: int, default 12 — overs per match, carried onto every match.
    start_date: str "YYYY-MM-DD", optional — day 1 is this date, each
        following day is the next calendar day.
    days: int, optional — number of days available. The schedule must
        fit inside it.

Output (dict):
    conditions: the normalised conditions actually used.
    days: [{"day": int, "date": str | None, "matches": [match, ...]}]
    total_matches: int

Each match is {"match", "day", "date", "group", "team_a", "team_b",
"stage" ("group" | "final"), "overs"}.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

DEFAULT_MATCHES_PER_DAY = 4
DEFAULT_OVERS = 12


def _normalise_conditions(raw: dict[str, Any]) -> dict[str, Any]:
    """Validate the raw conditions and return a normalised copy.

    Raises ValueError on anything the generator cannot work with.
    """
    if not isinstance(raw, dict):
        raise ValueError("Conditions must be an object")

    groups = raw.get("groups")
    if not isinstance(groups, list) or not groups:
        raise ValueError("At least one group is required")

    norm_groups: list[dict[str, Any]] = []
    for group in groups:
        if not isinstance(group, dict):
            raise ValueError("Each group must be an object with a name and teams")
        name = (group.get("name") or "").strip()
        if not name:
            raise ValueError("Each group needs a name")
        teams = group.get("teams") or []
        if not isinstance(teams, list):
            raise ValueError(f"Group '{name}' teams must be a list of names")
        clean_teams = [str(t).strip() for t in teams if str(t).strip()]
        if len(clean_teams) < 2:
            raise ValueError(f"Group '{name}' needs at least 2 teams")
        if len(set(clean_teams)) != len(clean_teams):
            raise ValueError(f"Group '{name}' has duplicate team names")
        norm_groups.append({"name": name, "teams": clean_teams})

    finals_per_group = raw.get("finals_per_group", True)
    if not isinstance(finals_per_group, bool):
        raise ValueError("finals_per_group must be true or false")

    matches_per_day = raw.get("matches_per_day", DEFAULT_MATCHES_PER_DAY)
    if not isinstance(matches_per_day, int) or isinstance(matches_per_day, bool):
        raise ValueError("matches_per_day must be a whole number")
    if matches_per_day < 1:
        raise ValueError("matches_per_day must be at least 1")

    overs = raw.get("overs", DEFAULT_OVERS)
    if not isinstance(overs, int) or isinstance(overs, bool):
        raise ValueError("overs must be a whole number")
    if overs < 1:
        raise ValueError("overs must be at least 1")

    start_date = raw.get("start_date") or None
    if start_date is not None:
        if not isinstance(start_date, str):
            raise ValueError("start_date must be a YYYY-MM-DD date")
        try:
            date.fromisoformat(start_date)
        except ValueError:
            raise ValueError("start_date must be a YYYY-MM-DD date")

    days = raw.get("days")
    if days is not None:
        if not isinstance(days, int) or isinstance(days, bool):
            raise ValueError("days must be a whole number")
        if days < 1:
            raise ValueError("days must be at least 1")

    return {
        "groups": norm_groups,
        "finals_per_group": finals_per_group,
        "matches_per_day": matches_per_day,
        "overs": overs,
        "start_date": start_date,
        "days": days,
    }


def _round_robin_pairings(teams: list[str]) -> list[tuple[str, str]]:
    """All pairings for a round robin (every team plays every other once).

    Circle method: rounds are generated in order and flattened, so a
    team's matches are spread across the group's matches rather than
    bunched. An odd team count gets a bye (no match) in each round.
    """
    names = list(teams)
    if len(names) % 2 == 1:
        names.append(None)  # bye
    n = len(names)
    arr = names[:]
    pairings: list[tuple[str, str]] = []
    for _ in range(n - 1):
        for i in range(n // 2):
            a, b = arr[i], arr[n - 1 - i]
            if a is not None and b is not None:
                pairings.append((a, b))
        # Keep the first team fixed, rotate the rest.
        arr = [arr[0]] + [arr[-1]] + arr[1:-1]
    return pairings


def _day_date(start_date: str | None, day: int) -> str | None:
    if not start_date:
        return None
    return (date.fromisoformat(start_date) + timedelta(days=day - 1)).isoformat()


def generate_schedule(raw_conditions: dict[str, Any]) -> dict[str, Any]:
    """Generate the day-by-day match schedule for the given conditions.

    The output is validated against the conditions before it is
    returned; raises ValueError if no valid schedule can be produced
    (e.g. the matches do not fit in the days available).
    """
    conditions = _normalise_conditions(raw_conditions)

    # Ordered match list: for each group in order, its group-stage
    # matches, then its final. So all of group 1's matches (including
    # its final) come before any of group 2's.
    ordered: list[dict[str, Any]] = []
    for group in conditions["groups"]:
        for team_a, team_b in _round_robin_pairings(group["teams"]):
            ordered.append(
                {
                    "group": group["name"],
                    "team_a": team_a,
                    "team_b": team_b,
                    "stage": "group",
                    "overs": conditions["overs"],
                }
            )
        if conditions["finals_per_group"]:
            ordered.append(
                {
                    "group": group["name"],
                    "team_a": f"Winner of {group['name']}",
                    "team_b": f"Runner-up of {group['name']}",
                    "stage": "final",
                    "overs": conditions["overs"],
                }
            )

    per_day = conditions["matches_per_day"]
    total = len(ordered)
    if conditions["days"] is not None and total > conditions["days"] * per_day:
        needed = -(-total // per_day)  # ceil division
        raise ValueError(
            f"{total} matches at {per_day} per day need {needed} days, "
            f"but only {conditions['days']} day(s) are available — raise "
            "matches per day or add days"
        )

    # Spread the matches as evenly as possible across the available
    # days, in order, so the fixture list uses the whole window instead
    # of cramming the early days to the cap. When the total does not
    # divide evenly, the later days take the extra matches — that is
    # what puts each group's final on the morning of the day after its
    # group matches (KGRA: 14 matches over 4 days = 3, 3, 4, 4, with
    # the Pro final first on Day 3). Days with no matches are not
    # emitted: if there are fewer matches than days, the schedule uses
    # fewer days.
    num_days = conditions["days"] if conditions["days"] is not None else -(-total // per_day)
    num_days = min(num_days, total)
    base, extra = divmod(total, num_days)
    # Days 1..(num_days - extra) get `base` matches; the last `extra`
    # days get `base + 1`.
    day_sizes = [base + (1 if day_no > num_days - extra else 0) for day_no in range(1, num_days + 1)]

    days: list[dict[str, Any]] = []
    cursor = 0
    for day_no, size in enumerate(day_sizes, start=1):
        chunk = ordered[cursor : cursor + size]
        cursor += size
        day_date = _day_date(conditions["start_date"], day_no)
        matches = [
            {
                "match": cursor - size + i + 1,
                "day": day_no,
                "date": day_date,
                **m,
            }
            for i, m in enumerate(chunk)
        ]
        days.append({"day": day_no, "date": day_date, "matches": matches})

    schedule = {
        "conditions": conditions,
        "days": days,
        "total_matches": total,
    }
    validate_schedule(conditions, schedule)
    return schedule


def validate_schedule(conditions: dict[str, Any], schedule: dict[str, Any]) -> None:
    """Check a generated schedule against the conditions it claims to satisfy.

    Raises ValueError naming the first broken rule. This is the
    self-check generate_schedule runs before returning, and the same
    check the save endpoint runs on a schedule submitted by a client —
    a schedule that was not generated from these conditions is refused.
    """
    conditions = _normalise_conditions(conditions)

    if not isinstance(schedule, dict):
        raise ValueError("Schedule must be an object")
    days = schedule.get("days")
    if not isinstance(days, list) or not days:
        raise ValueError("Schedule has no days")

    matches: list[dict[str, Any]] = []
    for day in days:
        if not isinstance(day, dict) or not isinstance(day.get("matches"), list):
            raise ValueError("Each day must list its matches")
        if len(day["matches"]) > conditions["matches_per_day"]:
            raise ValueError(
                f"Day {day.get('day')} has {len(day['matches'])} matches, "
                f"over the limit of {conditions['matches_per_day']} per day"
            )
        matches.extend(day["matches"])

    # Expected group-stage pairings per group, and finals.
    expected_pairs: dict[str, set[frozenset]] = {}
    for group in conditions["groups"]:
        expected_pairs[group["name"]] = {
            frozenset(pair) for pair in _round_robin_pairings(group["teams"])
        }

    seen_pairs: dict[str, set[frozenset]] = {g["name"]: set() for g in conditions["groups"]}
    finals: dict[str, int] = {g["name"]: 0 for g in conditions["groups"]}
    final_seen: dict[str, bool] = {g["name"]: False for g in conditions["groups"]}
    group_names = [g["name"] for g in conditions["groups"]]
    last_group_index = -1

    for pos, m in enumerate(matches, start=1):
        if m.get("match") != pos:
            raise ValueError(
                f"Match {m.get('match')} is out of order — matches must be numbered 1..N in order"
            )
        group = m.get("group")
        if group not in expected_pairs:
            raise ValueError(f"Match {m.get('match')} is in unknown group '{group}'")
        stage = m.get("stage")
        if m.get("overs") != conditions["overs"]:
            raise ValueError(
                f"Match {m.get('match')} has {m.get('overs')} overs, expected {conditions['overs']}"
            )
        # Group ordering: matches must appear group by group, in order.
        idx = group_names.index(group)
        if idx < last_group_index:
            raise ValueError(
                f"Match {m.get('match')} in group '{group}' appears after a "
                "later group's matches — groups must play in order"
            )
        last_group_index = idx

        if stage == "final":
            finals[group] += 1
            final_seen[group] = True
        elif stage == "group":
            if final_seen[group]:
                raise ValueError(
                    f"Match {m.get('match')} is a group match in '{group}' after "
                    "that group's final — the final comes last for its group"
                )
            pair = frozenset([m.get("team_a"), m.get("team_b")])
            if pair not in expected_pairs[group]:
                raise ValueError(
                    f"Match {m.get('match')} ({m.get('team_a')} vs {m.get('team_b')}) "
                    f"is not a round-robin pairing in group '{group}'"
                )
            if pair in seen_pairs[group]:
                raise ValueError(
                    f"Match {m.get('match')} repeats the pairing "
                    f"{m.get('team_a')} vs {m.get('team_b')} in group '{group}'"
                )
            seen_pairs[group].add(pair)
        else:
            raise ValueError(f"Match {m.get('match')} has unknown stage '{stage}'")

    for group in conditions["groups"]:
        name = group["name"]
        if seen_pairs[name] != expected_pairs[name]:
            missing = expected_pairs[name] - seen_pairs[name]
            raise ValueError(
                f"Group '{name}' round robin is incomplete — "
                f"{len(missing)} pairing(s) missing"
            )
        want_finals = 1 if conditions["finals_per_group"] else 0
        if finals[name] != want_finals:
            raise ValueError(
                f"Group '{name}' has {finals[name]} final(s), expected {want_finals}"
            )

    if schedule.get("total_matches") != len(matches):
        raise ValueError("total_matches does not match the matches listed")
    if conditions["days"] is not None and len(days) > conditions["days"]:
        raise ValueError(
            f"Schedule spans {len(days)} days, over the {conditions['days']} available"
        )
