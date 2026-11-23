"""
Tests for AI interpretation of free-text tournament conditions (issue #77).

The Groq call is mocked — no real API call is made. Run:
  cd backend
  pytest tests/test_schedule_ai.py -v
"""

from __future__ import annotations

import json

import pytest

from app.schedule_ai import (
    AINotConfiguredError,
    AIInterpretationError,
    GROQ_API_URL,
    GROQ_MODEL,
    NOT_CONFIGURED_MESSAGE,
    interpret_conditions,
)

KGRA_TEXT = (
    "Two groups, Pro and Legend, 4 teams in each. Round robin in each "
    "group, a separate final for each group, 12 overs per match, 4 days, "
    "max 4 matches a day. All Pro matches first because we provide their "
    "accommodation, so the Pro teams finish and leave and only the "
    "Legend teams stay."
)

KGRA_LLM_REPLY = {
    "groups": [
        {"name": "Pro", "teams": ["Pro Team 1", "Pro Team 2", "Pro Team 3", "Pro Team 4"]},
        {"name": "Legend", "teams": ["Legend Team 1", "Legend Team 2", "Legend Team 3", "Legend Team 4"]},
    ],
    "finals_per_group": True,
    "matches_per_day": 4,
    "overs": 12,
    "start_date": None,
    "days": 4,
}


class _FakeResponse:
    """Minimal stand-in for a requests Response."""

    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


def _groq_reply(conditions, calls=None):
    """A mock http_post returning a Groq-style chat completion."""

    def post(url, headers=None, timeout=None, **kwargs):
        payload = kwargs.get("json")
        if calls is not None:
            calls.append({"url": url, "headers": headers, "json": payload, "timeout": timeout})
        content = conditions if isinstance(conditions, str) else json.dumps(conditions)
        return _FakeResponse(200, {"choices": [{"message": {"content": content}}]})

    return post


def test_kgra_text_interprets_to_kgra_conditions():
    """A KGRA-style description produces the KGRA conditions."""
    conditions = interpret_conditions(
        KGRA_TEXT, api_key="test-key", http_post=_groq_reply(KGRA_LLM_REPLY)
    )
    assert [g["name"] for g in conditions["groups"]] == ["Pro", "Legend"]
    assert [len(g["teams"]) for g in conditions["groups"]] == [4, 4]
    assert conditions["finals_per_group"] is True
    assert conditions["matches_per_day"] == 4
    assert conditions["overs"] == 12
    assert conditions["days"] == 4


def test_groq_request_uses_groq_model_and_url():
    """The call goes to Groq's chat completions endpoint with gpt-oss-120b."""
    calls = []
    interpret_conditions(KGRA_TEXT, api_key="test-key", http_post=_groq_reply(KGRA_LLM_REPLY, calls))
    assert len(calls) == 1
    assert calls[0]["url"] == GROQ_API_URL
    assert calls[0]["json"]["model"] == GROQ_MODEL
    assert calls[0]["headers"]["Authorization"] == "Bearer test-key"
    # The description is sent as the user message.
    assert calls[0]["json"]["messages"][-1]["content"] == KGRA_TEXT


def test_malformed_llm_reply_rejected():
    """A reply that is not JSON is rejected cleanly."""
    with pytest.raises(AIInterpretationError, match="not valid JSON"):
        interpret_conditions(KGRA_TEXT, api_key="test-key", http_post=_groq_reply("not json at all"))


def test_invalid_conditions_from_llm_rejected():
    """Valid JSON that fails conditions validation is rejected, naming the problem."""
    bad = {
        "groups": [{"name": "Pro", "teams": ["Only One Team"]}],
        "finals_per_group": True,
        "matches_per_day": 4,
        "overs": 12,
        "start_date": None,
        "days": 4,
    }
    with pytest.raises(AIInterpretationError, match="at least 2 teams"):
        interpret_conditions(KGRA_TEXT, api_key="test-key", http_post=_groq_reply(bad))


def test_llm_http_error_rejected():
    """A non-200 from Groq is rejected cleanly."""
    def failing_post(url, headers=None, json=None, timeout=None):
        return _FakeResponse(401, {"error": {"message": "invalid key"}})

    with pytest.raises(AIInterpretationError, match="HTTP 401"):
        interpret_conditions(KGRA_TEXT, api_key="test-key", http_post=failing_post)


def test_no_key_returns_not_configured_error(monkeypatch):
    """Without GROQ_API_KEY the AI path fails with the clear message — and makes no HTTP call."""
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    calls = []

    def post(url, headers=None, json=None, timeout=None):
        calls.append(url)
        raise AssertionError("no HTTP call should be made without a key")

    with pytest.raises(AINotConfiguredError, match="not configured"):
        interpret_conditions(KGRA_TEXT, api_key=None, http_post=post)
    assert calls == []


def test_empty_text_rejected():
    """An empty description is rejected before any LLM call."""
    with pytest.raises(AIInterpretationError, match="Describe the tournament first"):
        interpret_conditions("   ", api_key="test-key", http_post=_groq_reply(KGRA_LLM_REPLY))


def test_fenced_json_reply_parsed():
    """A reply wrapped in a markdown code fence is still parsed."""
    fenced = "```json\n" + json.dumps(KGRA_LLM_REPLY) + "\n```"
    conditions = interpret_conditions(KGRA_TEXT, api_key="test-key", http_post=_groq_reply(fenced))
    assert [g["name"] for g in conditions["groups"]] == ["Pro", "Legend"]


def test_key_never_appears_in_error_messages(monkeypatch):
    """The API key must not leak into any error message."""
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    def failing_post(url, headers=None, json=None, timeout=None):
        return _FakeResponse(500, {})

    with pytest.raises(AIInterpretationError) as excinfo:
        interpret_conditions(KGRA_TEXT, api_key="sk-secret-key", http_post=failing_post)
    assert "sk-secret-key" not in str(excinfo.value)
