"""
Deterministic match-schedule generator (issues #77, #79).

Pure module: no database, no network, no LLM. The organiser enters the
tournament conditions and this module turns them into a day-by-day match
schedule, then validates its own output against the conditions before
returning it. If no valid schedule can be produced for the given
conditions, it fails loudly (ValueError) instead of returning a
half-valid fixture list.

Soft preferences (issue #79) — day start/end time, match duration,
minimum rest between a team's matches, avoid-consecutive-matches:
these are the conditions the AI generator works with. They are
optional: conditions that omit them keep working exactly as before
(no times in the output). When a day window is given, the generator
also assigns a start and end time to every match (sequential slots
from the day start, each match_duration_minutes long, with a rest gap
inserted when a team's next match would otherwise start too soon).

"Consecutive" — what it means here: a team plays two matches with
less than min_rest_minutes between the end of one and the start of
the next. A rest break of at least min_rest between them means they
are not consecutive. This is the only workable reading: in a day with
3 matches from a 4-team round robin, some team always plays two
matches next to each other in the order (any two distinct pairings
share a team, except the one complementary pair), so a strict
"never adjacent in the order" rule could never be satisfied. The
rest gap is the protection that can actually be kept.

Validation: collect_schedule_violations returns every broken rule as
a list of messages (so the AI retry loop can feed them back);
validate_schedule raises ValueError on the first one, as before.

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
    day_start_time: str "HH:MM", optional — matches start at or after
        this time each day. Set together with day_end_time, or neither.
    day_end_time: str "HH:MM", optional — matches end at or before
        this time each day.
    match_duration_minutes: int, default 90 — how long a match lasts,
        used for time assignment and validation.
    min_rest_minutes: int, default 30 — minimum gap between the end
        of one of a team's matches and the start of its next match.
    avoid_consecutive_matches: bool, default True — the generator and
        the AI try not to place a team's matches next to each other
        in a day; in validation, two of a team's matches next to each
        other in a day with less than min_rest between them is a
        "consecutive matches" violation.

Output (dict):
    conditions: the normalised conditions actually used.
    days: [{"day": int, "date": str | None, "matches": [match, ...]}]
    total_matches: int

Each match is {"match", "day", "date", "group", "team_a", "team_b",
"stage" ("group" | "final"), "overs"} plus "start_time"/"end_time"
("HH:MM") when a day window was given.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

DEFAULT_MATCHES_PER_DAY = 4
DEFAULT_OVERS = 12
DEFAULT_MATCH_DURATION_MINUTES = 90
DEFAULT_MIN_REST_MINUTES = 30
MINUTES_PER_DAY = 24 * 60


def _parse_time(value: Any) -> int | None:
    """Parse an "HH:MM" time into minutes since midnight, or None."""
    if not isinstance(value, str):
        return None
    parts = value.strip().split(":")
    if len(parts) != 2:
        return None
    try:
        hours, minutes = int(parts[0]), int(parts[1])
    except ValueError:
        return None
    if not (0 <= hours <= 23 and 0 <= minutes <= 59):
        return None
    return hours * 60 + minutes


def _format_time(minutes: int) -> str:
    """Format minutes since midnight as "HH:MM"."""
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


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

    # Soft preferences (issue #79). The day window is both times or
    # neither; without a window no times are assigned or required.
    day_start_time = raw.get("day_start_time") or None
    day_end_time = raw.get("day_end_time") or None
    if (day_start_time is None) != (day_end_time is None):
        raise ValueError(
            "Set both day start and end time, or neither"
        )
    start_min = end_min = None
    if day_start_time is not None:
        start_min = _parse_time(day_start_time)
        end_min = _parse_time(day_end_time)
        if start_min is None:
            raise ValueError("day_start_time must be an HH:MM time")
        if end_min is None:
            raise ValueError("day_end_time must be an HH:MM time")
        if end_min <= start_min:
            raise ValueError("day_end_time must be after day_start_time")

    match_duration = raw.get("match_duration_minutes", DEFAULT_MATCH_DURATION_MINUTES)
    if not isinstance(match_duration, int) or isinstance(match_duration, bool):
        raise ValueError("match_duration_minutes must be a whole number")
    if match_duration < 1:
        raise ValueError("match_duration_minutes must be at least 1")

    min_rest = raw.get("min_rest_minutes", DEFAULT_MIN_REST_MINUTES)
    if not isinstance(min_rest, int) or isinstance(min_rest, bool):
        raise ValueError("min_rest_minutes must be a whole number")
    if min_rest < 0:
        raise ValueError("min_rest_minutes must be 0 or more")

    avoid_consecutive = raw.get("avoid_consecutive_matches", True)
    if not isinstance(avoid_consecutive, bool):
        raise ValueError("avoid_consecutive_matches must be true or false")

    return {
        "groups": norm_groups,
        "finals_per_group": finals_per_group,
        "matches_per_day": matches_per_day,
        "overs": overs,
        "start_date": start_date,
        "days": days,
        "day_start_time": day_start_time,
        "day_end_time": day_end_time,
        "match_duration_minutes": match_duration,
        "min_rest_minutes": min_rest,
        "avoid_consecutive_matches": avoid_consecutive,
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


def _reorder_day_matches(matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Reorder a day's group-stage matches (best effort) so no team
    plays two matches in a row; finals stay exactly where they are
    (they involve placeholder teams, so they never block rest).

    Greedy: repeatedly take the earliest remaining match that shares
    no team with the previous match; if every remaining match shares
    a team, take the earliest. This cannot always avoid adjacency —
    in a day with 3 matches from a 4-team group some team always
    plays two in a row — so the rest gap inserted by time assignment
    is what guarantees the rest rule.
    """
    group_positions = [i for i, m in enumerate(matches) if m.get("stage") != "final"]
    if len(group_positions) < 2:
        return list(matches)
    group_matches = [matches[i] for i in group_positions]
    ordered: list[dict[str, Any]] = []
    remaining = list(group_matches)
    prev_teams: set[str] = set()
    while remaining:
        pick = None
        for m in remaining:
            if not ({m.get("team_a"), m.get("team_b")} & prev_teams):
                pick = m
                break
        if pick is None:
            pick = remaining[0]
        ordered.append(pick)
        remaining.remove(pick)
        prev_teams = {pick.get("team_a"), pick.get("team_b")}
    out = list(matches)
    for pos, m in zip(group_positions, ordered):
        out[pos] = m
    return out


def assign_match_times(
    schedule: dict[str, Any], raw_conditions: dict[str, Any]
) -> dict[str, Any]:
    """Add start_time/end_time to every match of a generated schedule,
    deterministically, and return the same schedule (mutated in place).

    Sequential slots from the day start time, each
    match_duration_minutes long. Before a match, the slot is pushed
    back until every team in it has had min_rest_minutes since the
    end of its previous match that day — so the rest rule holds
    whatever the match order is. Raises ValueError if the day's
    matches (with the rest gaps) do not fit inside the day window.
    When no day window is given the day starts at 09:00 and there is
    no end-of-day check.
    """
    conditions = _normalise_conditions(raw_conditions)
    start_min = _parse_time(conditions["day_start_time"]) if conditions["day_start_time"] else 9 * 60
    end_min = _parse_time(conditions["day_end_time"]) if conditions["day_end_time"] else None
    duration = conditions["match_duration_minutes"]
    rest = conditions["min_rest_minutes"]
    window = (
        f"{conditions['day_start_time']}–{conditions['day_end_time']}"
        if conditions["day_start_time"]
        else None
    )

    # Reorder within each day first, then renumber globally so match
    # numbers stay 1..N in the final order.
    for day in schedule["days"]:
        day["matches"] = _reorder_day_matches(day["matches"])
    pos = 0
    for day in schedule["days"]:
        for m in day["matches"]:
            pos += 1
            m["match"] = pos

    for day in schedule["days"]:
        cursor = start_min
        last_end: dict[str, int] = {}
        for m in day["matches"]:
            earliest = cursor
            for team in (m.get("team_a"), m.get("team_b")):
                if team in last_end:
                    earliest = max(earliest, last_end[team] + rest)
            start_t = earliest
            end_t = start_t + duration
            if end_min is not None and end_t > end_min:
                raise ValueError(
                    f"Day {day.get('day')} matches do not fit in the day "
                    f"window {window} at {duration} minutes per match with "
                    f"{rest} minutes rest — extend the day end time, raise "
                    "matches per day, or lower the match duration"
                )
            m["start_time"] = _format_time(start_t)
            m["end_time"] = _format_time(end_t)
            cursor = end_t
            last_end[m.get("team_a")] = end_t
            last_end[m.get("team_b")] = end_t
    return schedule


def generate_schedule(raw_conditions: dict[str, Any]) -> dict[str, Any]:
    """Generate the day-by-day match schedule for the given conditions.

    The output is validated against the conditions before it is
    returned; raises ValueError if no valid schedule can be produced
    (e.g. the matches do not fit in the days available, or in the day
    window). When a day window is given, every match also gets a
    start and end time; without one the output has no times, as before.
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
    if conditions["day_start_time"] is not None:
        assign_match_times(schedule, conditions)
    validate_schedule(conditions, schedule)
    return schedule


def collect_schedule_violations(
    conditions: dict[str, Any], schedule: dict[str, Any]
) -> list[str]:
    """Check a schedule against the conditions it claims to satisfy
    and return every broken rule as a list of messages.

    The hard rules from issue #77 (round robin complete, one final
    per group, daily cap, group order, match numbering) plus the
    time/rest rules from issue #79: when a day window is given every
    match must have a start and end time inside it; no team plays two
    matches at overlapping times; and a team's matches must be at
    least min_rest_minutes apart — two of a team's matches next to
    each other in a day with less than that is a "consecutive
    matches" violation when avoid_consecutive_matches is on.

    Time rules only bite where times exist: without a day window and
    without times on the matches, only the hard rules are checked, so
    a plain deterministic schedule (no times) still validates.
    Raises ValueError only if the conditions themselves are invalid.
    """
    conditions = _normalise_conditions(conditions)
    violations: list[str] = []

    if not isinstance(schedule, dict):
        return ["Schedule must be an object"]
    days = schedule.get("days")
    if not isinstance(days, list) or not days:
        return ["Schedule has no days"]

    # Day shape + daily cap, in day order.
    matches: list[dict[str, Any]] = []
    for day in days:
        if not isinstance(day, dict) or not isinstance(day.get("matches"), list):
            violations.append("Each day must list its matches")
            continue
        if len(day["matches"]) > conditions["matches_per_day"]:
            violations.append(
                f"Day {day.get('day')} has {len(day['matches'])} matches, "
                f"over the limit of {conditions['matches_per_day']} per day"
            )
        for m in day["matches"]:
            if not isinstance(m, dict):
                violations.append("Each match must be an object")
                continue
            matches.append(m)

    # Per-match shape: the fields the checks below need. A match
    # missing one is reported once and skipped from further checks.
    required = ("match", "day", "group", "team_a", "team_b", "stage", "overs")
    well_formed: list[dict[str, Any]] = []
    for m in matches:
        missing = [f for f in required if m.get(f) is None]
        if missing:
            violations.append(
                f"Match {m.get('match')} is missing {', '.join(missing)}"
            )
            continue
        well_formed.append(m)

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

    for pos, m in enumerate(well_formed, start=1):
        if m.get("match") != pos:
            violations.append(
                f"Match {m.get('match')} is out of order — matches must be numbered 1..N in order"
            )
        group = m.get("group")
        if group not in expected_pairs:
            violations.append(f"Match {m.get('match')} is in unknown group '{group}'")
            continue
        stage = m.get("stage")
        if m.get("overs") != conditions["overs"]:
            violations.append(
                f"Match {m.get('match')} has {m.get('overs')} overs, expected {conditions['overs']}"
            )
        # Group ordering: matches must appear group by group, in order.
        idx = group_names.index(group)
        if idx < last_group_index:
            violations.append(
                f"Match {m.get('match')} in group '{group}' appears after a "
                "later group's matches — groups must play in order"
            )
        last_group_index = idx

        if stage == "final":
            finals[group] += 1
            final_seen[group] = True
        elif stage == "group":
            if final_seen[group]:
                violations.append(
                    f"Match {m.get('match')} is a group match in '{group}' after "
                    "that group's final — the final comes last for its group"
                )
            pair = frozenset([m.get("team_a"), m.get("team_b")])
            if pair not in expected_pairs[group]:
                violations.append(
                    f"Match {m.get('match')} ({m.get('team_a')} vs {m.get('team_b')}) "
                    f"is not a round-robin pairing in group '{group}'"
                )
            elif pair in seen_pairs[group]:
                violations.append(
                    f"Match {m.get('match')} repeats the pairing "
                    f"{m.get('team_a')} vs {m.get('team_b')} in group '{group}'"
                )
            else:
                seen_pairs[group].add(pair)
        else:
            violations.append(f"Match {m.get('match')} has unknown stage '{stage}'")

    for group in conditions["groups"]:
        name = group["name"]
        if seen_pairs[name] != expected_pairs[name]:
            missing = expected_pairs[name] - seen_pairs[name]
            violations.append(
                f"Group '{name}' round robin is incomplete — "
                f"{len(missing)} pairing(s) missing"
            )
        want_finals = 1 if conditions["finals_per_group"] else 0
        if finals[name] != want_finals:
            violations.append(
                f"Group '{name}' has {finals[name]} final(s), expected {want_finals}"
            )

    if schedule.get("total_matches") != len(matches):
        violations.append("total_matches does not match the matches listed")
    if conditions["days"] is not None and len(days) > conditions["days"]:
        violations.append(
            f"Schedule spans {len(days)} days, over the {conditions['days']} available"
        )

    # --- Time / rest rules (issue #79) ---
    window = conditions["day_start_time"] is not None
    window_start = _parse_time(conditions["day_start_time"]) if window else None
    window_end = _parse_time(conditions["day_end_time"]) if window else None
    min_rest = conditions["min_rest_minutes"]
    avoid_consecutive = conditions["avoid_consecutive_matches"]

    # Position of each match inside its day, for the consecutive check.
    day_position: dict[int, int] = {}
    for day in days:
        if isinstance(day, dict) and isinstance(day.get("matches"), list):
            for i, m in enumerate(day["matches"]):
                if isinstance(m, dict) and isinstance(m.get("match"), int):
                    day_position[m["match"]] = i

    timed: list[tuple[dict[str, Any], int, int]] = []
    for m in well_formed:
        start_raw, end_raw = m.get("start_time"), m.get("end_time")
        if window and (start_raw is None or end_raw is None):
            violations.append(
                f"Match {m.get('match')} has no start/end time, but the day window is set"
            )
            continue
        if start_raw is None and end_raw is None:
            continue
        if start_raw is None or end_raw is None:
            violations.append(
                f"Match {m.get('match')} has only one of start_time/end_time"
            )
            continue
        start_min, end_min = _parse_time(start_raw), _parse_time(end_raw)
        if start_min is None or end_min is None:
            violations.append(
                f"Match {m.get('match')} has an invalid start/end time "
                f"('{start_raw}'–'{end_raw}')"
            )
            continue
        if end_min <= start_min:
            violations.append(
                f"Match {m.get('match')} ends at or before it starts "
                f"('{start_raw}'–'{end_raw}')"
            )
            continue
        if window and (start_min < window_start or end_min > window_end):
            violations.append(
                f"Match {m.get('match')} ({start_raw}–{end_raw}) is outside "
                f"the day window {conditions['day_start_time']}–{conditions['day_end_time']}"
            )
        timed.append((m, start_min, end_min))

    # Per team, in chronological order (absolute minutes across days):
    # no overlap, and at least min_rest between matches. Two of a
    # team's matches next to each other in a day with less than the
    # rest is the "consecutive matches" violation when
    # avoid_consecutive_matches is on.
    by_team: dict[str, list[tuple[int, int, dict[str, Any], int, int]]] = {}
    for m, start_min, end_min in timed:
        day_no = m.get("day") or 0
        abs_start = (day_no - 1) * MINUTES_PER_DAY + start_min
        abs_end = (day_no - 1) * MINUTES_PER_DAY + end_min
        for team in (m.get("team_a"), m.get("team_b")):
            by_team.setdefault(team, []).append((abs_start, abs_end, m, start_min, end_min))
    for team, slots in by_team.items():
        slots.sort(key=lambda s: s[0])
        for prev, nxt in zip(slots, slots[1:]):
            gap = nxt[0] - prev[1]
            prev_m, next_m = prev[2], nxt[2]
            if gap < 0:
                violations.append(
                    f"Team {team} has overlapping matches "
                    f"M{prev_m.get('match')} and M{next_m.get('match')}"
                )
            elif gap < min_rest:
                same_day = prev_m.get("day") == next_m.get("day")
                adjacent = same_day and abs(
                    day_position.get(next_m.get("match"), -1)
                    - day_position.get(prev_m.get("match"), -2)
                ) == 1
                if adjacent and avoid_consecutive:
                    violations.append(
                        f"Team {team} plays consecutive matches "
                        f"M{prev_m.get('match')} and M{next_m.get('match')} "
                        f"with only {gap} minutes rest (minimum is {min_rest})"
                    )
                else:
                    violations.append(
                        f"Team {team} has only {gap} minutes rest between "
                        f"M{prev_m.get('match')} and M{next_m.get('match')} "
                        f"(minimum is {min_rest})"
                    )

    return violations


def validate_schedule(conditions: dict[str, Any], schedule: dict[str, Any]) -> None:
    """Check a generated schedule against the conditions it claims to satisfy.

    Raises ValueError naming the first broken rule. This is the
    self-check generate_schedule runs before returning, and the same
    check the save endpoint runs on a schedule submitted by a client —
    a schedule that was not generated from these conditions is refused.
    Use collect_schedule_violations for the full list (the AI retry
    loop feeds it back to the model).
    """
    violations = collect_schedule_violations(conditions, schedule)
    if violations:
        raise ValueError(violations[0])
