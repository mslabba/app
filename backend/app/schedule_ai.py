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

from app.schedule import _normalise_conditions

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

    key = api_key if api_key is not None else os.environ.get("GROQ_API_KEY")
    if not key:
        raise AINotConfiguredError(NOT_CONFIGURED_MESSAGE)

    post = http_post or requests.post
    try:
        response = post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": text.strip()},
                ],
                "temperature": 0,
                "response_format": {"type": "json_object"},
            },
            timeout=GROQ_TIMEOUT_SECONDS,
        )
    except requests.RequestException as e:
        raise AIInterpretationError(f"Could not reach the AI service: {e}") from e

    if response.status_code != 200:
        raise AIInterpretationError(
            f"AI service returned HTTP {response.status_code}"
        )

    try:
        payload = response.json()
        content = payload["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as e:
        raise AIInterpretationError(
            "AI service returned an unexpected response"
        ) from e
    if not isinstance(content, str) or not content.strip():
        raise AIInterpretationError("AI service returned an empty reply")

    parsed = _parse_llm_conditions(content)
    try:
        return _normalise_conditions(parsed)
    except ValueError as e:
        raise AIInterpretationError(
            f"AI reply did not describe valid conditions: {e}"
        ) from e
