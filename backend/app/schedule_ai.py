"""
AI interpretation of free-text tournament conditions (issue #77).

The organiser describes the tournament in plain words; this module
asks Groq to turn the description into the structured conditions dict
that app.schedule.generate_schedule expects, then runs the result
through the existing conditions validation. The LLM never generates
the schedule itself — the deterministic generator does that, and it
validates its own output. So a bad interpretation is caught here,
before anything is shown or saved.

Model: openai/gpt-oss-120b via Groq's OpenAI-compatible chat API.
Do NOT use llama-3.3-70b-versatile — it is Enterprise-only on Groq.

The API key comes ONLY from the GROQ_API_KEY environment variable.
It is never committed, never hard-coded, and never logged. Without
the key the AI path fails with a clear "not configured" error and the
manual conditions form keeps working; the deterministic
generate/save endpoints need no key at all.
"""

from __future__ import annotations

import json
import os
from typing import Any, Callable

import requests

from app.schedule import (
    _normalise_conditions,
    collect_schedule_violations,
    generate_schedule,
)


def _groq_chat(messages, api_key, http_post, max_tokens=None):
    """One chat-completion call to Groq. Returns the reply text.

    Raises AIGenerationError (subclass of AIInterpretationError) on
    transport errors, non-200 responses, or an unusable reply shape.
    The key is never included in any error message.
    """
    post = http_post or requests.post
    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens
    try:
        response = post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=GROQ_TIMEOUT_SECONDS,
        )
    except requests.RequestException as e:
        raise AIGenerationError(f"Could not reach the AI service: {e}") from e

    if response.status_code != 200:
        raise AIGenerationError(
            f"AI service returned HTTP {response.status_code}"
        )

    try:
        content = response.json()["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as e:
        raise AIGenerationError(
            "AI service returned an unexpected response"
        ) from e
    if not isinstance(content, str) or not content.strip():
        raise AIGenerationError("AI service returned an empty reply")
    return content


def _groq_api_key(api_key):
    """The key comes ONLY from the argument or GROQ_API_KEY."""
    key = api_key if api_key is not None else os.environ.get("GROQ_API_KEY")
    if not key:
        raise AINotConfiguredError(NOT_CONFIGURED_MESSAGE)
    return key

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "openai/gpt-oss-120b"
GROQ_TIMEOUT_SECONDS = 60

NOT_CONFIGURED_MESSAGE = (
    "AI interpretation is not configured — add GROQ_API_KEY, "
    "or enter the conditions manually"
)

_SYSTEM_PROMPT = """You convert a tournament organiser's plain-language description into structured schedule conditions as JSON.

Return ONLY a JSON object. No other text, no markdown, no code fences. The object must match this schema exactly:
{
  "groups": [{"name": "string", "teams": ["string", ...]}, ...],
  "finals_per_group": true or false,
  "matches_per_day": integer,
  "overs": integer,
  "start_date": "YYYY-MM-DD" or null,
  "days": integer or null
}

Rules:
- "groups" lists the groups in the order they play. All of one group's matches (including its final) happen before the next group's matches start. If the description says one group plays first for a reason — for example, "all Pro matches first because we provide their accommodation, so the Pro teams finish and leave and only the Legend teams stay" — put that group first in the list.
- Each group needs at least 2 teams. If the description names the teams, list them. If it only gives a count (for example "4 teams per group"), use placeholder names like "Pro Team 1", "Pro Team 2", "Pro Team 3", "Pro Team 4".
- "finals_per_group": true when each group has its own final, false when there are no finals.
- "matches_per_day": the maximum matches on any one day. If not stated, use 4.
- "overs": overs per match. If not stated, use 12.
- "start_date": the first day's date as YYYY-MM-DD, or null if no date is given. Do not guess a year — if the description gives a date without a year, set start_date to null.
- "days": the number of days available, or null if not stated."""


class AINotConfiguredError(ValueError):
    """GROQ_API_KEY is not set — the AI path is unavailable."""


class AIInterpretationError(ValueError):
    """The LLM call failed, or its reply was not usable conditions."""


class AIGenerationError(AIInterpretationError):
    """The LLM call failed, or its reply was not a usable schedule."""


def _strip_code_fences(text: str) -> str:
    """Remove a markdown code fence if the model wrapped the JSON in one."""
    text = text.strip()
    if text.startswith("```"):
        text = text[3:]
        if text.lstrip().startswith("json"):
            text = text.lstrip()[4:]
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]
    return text.strip()


def _parse_llm_conditions(raw_text: str) -> dict[str, Any]:
    """Parse the model's reply into a conditions dict.

    Raises AIInterpretationError naming what is wrong — never returns
    a half-parsed object.
    """
    try:
        parsed = json.loads(_strip_code_fences(raw_text))
    except (json.JSONDecodeError, TypeError) as e:
        raise AIInterpretationError(
            f"AI reply was not valid JSON: {e}"
        ) from e
    if not isinstance(parsed, dict):
        raise AIInterpretationError(
            "AI reply was not a JSON object with the conditions"
        )
    return parsed


def interpret_conditions(
    text: str,
    api_key: str | None = None,
    http_post: Callable[..., Any] | None = None,
) -> dict[str, Any]:
    """Turn a free-text tournament description into normalised conditions.

    `api_key` defaults to the GROQ_API_KEY environment variable.
    `http_post` is the HTTP call (defaults to requests.post); tests
    pass a mock so no real API call is made.

    Returns the normalised conditions dict in the exact schema
    generate_schedule expects. Raises AINotConfiguredError when no
    key is set, and AIInterpretationError when the model's reply
    cannot be used — including when the reply fails the existing
    conditions validation, in which case the error names the problem.
    """
    if not isinstance(text, str) or not text.strip():
        raise AIInterpretationError("Describe the tournament first")

    key = _groq_api_key(api_key)
    content = _groq_chat(
        [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": text.strip()},
        ],
        key,
        http_post,
    )

    parsed = _parse_llm_conditions(content)
    try:
        return _normalise_conditions(parsed)
    except ValueError as e:
        raise AIInterpretationError(
            f"AI reply did not describe valid conditions: {e}"
        ) from e


# --- AI schedule generation (issue #79) ---
# The AI itself creates the full day-by-day schedule, with a start and
# end time for every match. The deterministic validator (app.schedule)
# checks the result before it is shown; on failure the exact
# violations are fed back once, and if it still fails the deterministic
# generator is the fallback. An invalid schedule is never returned.

GENERATE_MAX_TOKENS = 4096

_GENERATE_SYSTEM_PROMPT = """You generate a complete day-by-day match schedule for a tournament as JSON.

Return ONLY a JSON object. No other text, no markdown, no code fences. The object must match this schema exactly:
{
  "days": [
    {"day": 1, "date": "YYYY-MM-DD" or null, "matches": [
      {"match": 1, "day": 1, "date": "YYYY-MM-DD" or null, "group": "string", "team_a": "string", "team_b": "string", "stage": "group" or "final", "overs": integer, "start_time": "HH:MM", "end_time": "HH:MM"}
    ]}
  ],
  "total_matches": integer
}

Hard rules — the schedule must satisfy all of these, or it will be rejected:
- Round robin: every team plays every other team in its own group exactly once. No pairing twice, none missing.
- One final per group, played by "Winner of {group}" vs "Runner-up of {group}" (placeholder teams — the finalists are not known yet). A group's final comes after all of that group's group-stage matches.
- Groups play in the order listed in the conditions: all of one group's matches (including its final) finish before the next group's matches start.
- No day has more than matches_per_day matches. The schedule uses at most `days` days.
- Every match has the given overs.
- Number the matches 1..N in order, day by day.
- Dates: day 1 is start_date, each following day is the next calendar day. If start_date is null, set date to null.
- Times: every match has a start_time and end_time (24-hour HH:MM). The match lasts match_duration_minutes minutes, so end_time is start_time plus that many minutes.
- Every match must start at or after day_start_time and end at or before day_end_time on its day.
- No team plays two matches at overlapping times.
- Rest: between the end of one of a team's matches and the start of its next match, leave at least min_rest_minutes minutes.
- Avoid consecutive matches: do not put a team in two matches in a row within a day if it can be avoided — spread a team's matches out, and never with less than min_rest_minutes between them.

Arrange the matches to satisfy the timing and rest rules as well as you can: use the whole day window, balance the days, and give every team a proper break between matches."""


def _parse_llm_schedule(raw_text: str) -> dict[str, Any]:
    """Parse the model's reply into a schedule dict (days + total).

    Raises AIGenerationError naming what is wrong — never returns a
    half-parsed object.
    """
    try:
        parsed = json.loads(_strip_code_fences(raw_text))
    except (json.JSONDecodeError, TypeError) as e:
        raise AIGenerationError(f"AI reply was not valid JSON: {e}") from e
    if not isinstance(parsed, dict):
        raise AIGenerationError("AI reply was not a JSON object with the schedule")
    if not isinstance(parsed.get("days"), list) or not parsed["days"]:
        raise AIGenerationError("AI reply has no days in the schedule")
    return parsed


def _with_default_window(conditions: dict[str, Any]) -> dict[str, Any]:
    """The AI needs a day window to put times in. If the organiser
    did not give one, default to 09:00–18:00 for the AI path."""
    norm = _normalise_conditions(conditions)
    if norm["day_start_time"] is None:
        norm = {**norm, "day_start_time": "09:00", "day_end_time": "18:00"}
    return norm


def generate_ai_schedule(
    conditions: dict[str, Any],
    api_key: str | None = None,
    http_post: Callable[..., Any] | None = None,
    feedback: str | None = None,
) -> dict[str, Any]:
    """One Groq call to generate the full schedule for the conditions.

    Returns the schedule dict in the app's schema (conditions +
    days + total_matches). The schedule is NOT validated here — the
    caller validates it (collect_schedule_violations) and feeds any
    violations back via `feedback` on a retry. Raises
    AINotConfiguredError when no key is set, and AIGenerationError
    when the call fails or the reply cannot be used.
    """
    norm = _with_default_window(conditions)
    key = _groq_api_key(api_key)

    user_message = (
        "Generate the match schedule for these tournament conditions:\n"
        + json.dumps(norm, indent=2)
    )
    if feedback:
        user_message += (
            "\n\nYour previous schedule had these problems — fix exactly "
            "these and return the complete corrected schedule:\n" + feedback
        )

    content = _groq_chat(
        [
            {"role": "system", "content": _GENERATE_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        key,
        http_post,
        max_tokens=GENERATE_MAX_TOKENS,
    )
    parsed = _parse_llm_schedule(content)
    return {
        "conditions": norm,
        "days": parsed["days"],
        "total_matches": parsed.get("total_matches"),
    }


def generate_schedule_ai_or_fallback(
    conditions: dict[str, Any],
    api_key: str | None = None,
    http_post: Callable[..., Any] | None = None,
) -> tuple[dict[str, Any], str, list[str]]:
    """Generate a schedule with the AI (one retry), falling back to
    the deterministic generator.

    Returns (schedule, generated_by, notes) where generated_by is
    "ai" or "deterministic-fallback". An invalid schedule is never
    returned: if the AI schedule fails validation twice, the
    deterministic generator (with times assigned) is used instead,
    and the notes say so. Raises AINotConfiguredError when no key is
    set — the AI path is unavailable, use the deterministic Generate
    instead — and ValueError/AIGenerationError when even the fallback
    cannot produce a valid timed schedule for these conditions.
    """
    norm = _with_default_window(conditions)

    schedule = generate_ai_schedule(norm, api_key=api_key, http_post=http_post)
    violations = collect_schedule_violations(norm, schedule)
    if not violations:
        return schedule, "ai", ["AI schedule passed validation"]

    feedback = (
        "Your previous schedule had these problems:\n- "
        + "\n- ".join(violations)
    )
    schedule = generate_ai_schedule(
        norm, api_key=api_key, http_post=http_post, feedback=feedback
    )
    violations = collect_schedule_violations(norm, schedule)
    if not violations:
        return (
            schedule,
            "ai",
            ["AI schedule needed one fix and passed validation"],
        )

    fallback = generate_schedule(norm)
    fb_violations = collect_schedule_violations(norm, fallback)
    if fb_violations:
        raise AIGenerationError(
            "AI schedule failed validation and the deterministic "
            "fallback is also invalid: " + "; ".join(fb_violations)
        )
    notes = [
        "AI schedule failed validation twice ("
        + "; ".join(violations)
        + "); used the deterministic schedule instead",
    ]
    return fallback, "deterministic-fallback", notes
