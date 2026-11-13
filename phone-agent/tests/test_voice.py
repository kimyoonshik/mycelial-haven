import json
import typing

import httpx
from elevenlabs import ConversationalConfig
from elevenlabs.client import ElevenLabs

from phone_agent import voice
from phone_agent.config import Config


def unknown_keys(model, data, where=""):
    """SDK 모델에 없는 키를 찾습니다(오타 방지). SDK 모델은 모르는 키를 조용히 받아들입니다."""
    found = []
    for key, value in data.items():
        field = model.model_fields.get(key)
        if field is None:
            found.append(where + key)
            continue
        nested = [t for t in typing.get_args(field.annotation) if hasattr(t, "model_fields")]
        if isinstance(value, dict) and nested:
            found += unknown_keys(nested[0], value, f"{where}{key}.")
    return found


def test_agent_config_uses_only_fields_the_sdk_knows():
    config = voice.agent_config()
    assert unknown_keys(ConversationalConfig, config) == []
    ConversationalConfig.model_validate(config)

    allowed_llms = typing.get_args(typing.get_args(
        ConversationalConfig.model_fields["agent"].annotation)[0].model_fields["prompt"].annotation)[0].model_fields["llm"]
    assert voice.LLM in str(allowed_llms.annotation)


def test_every_variable_in_the_prompt_is_supplied_on_each_call():
    import re

    used = set(re.findall(r"{{(\w+)}}", voice.PROMPT + voice.FIRST_MESSAGE))
    cfg = Config(owner_name="김세라", elevenlabs_api_key="key", agent_id="agent_1")
    session = voice.VoiceSession(cfg, audio=None, topic="예약 문의", details="내일 7시", on_line=lambda who, text: None)
    supplied = session._conversation.config.dynamic_variables
    assert used == set(supplied)
    assert supplied == {"owner_name": "김세라", "topic": "예약 문의", "details": "내일 7시"}


def test_opening_line_discloses_the_ai_and_names_the_owner_and_topic():
    line = voice.opening_line("김세라", "내일 저녁 예약 문의")
    assert "{{" not in line
    assert "김세라 님을 대신해" in line and "AI 비서" in line and "내일 저녁 예약 문의" in line


def test_create_agent_sends_the_config_and_returns_the_id(monkeypatch):
    sent = {}

    def handler(request):
        sent["path"], sent["body"], sent["key"] = request.url.path, json.loads(request.content), request.headers["xi-api-key"]
        return httpx.Response(200, json={"agent_id": "agent_123"})

    monkeypatch.setattr(voice, "ElevenLabs", lambda api_key: ElevenLabs(
        api_key=api_key, httpx_client=httpx.Client(transport=httpx.MockTransport(handler))))

    assert voice.create_agent("secret-key") == "agent_123"
    assert sent["path"] == "/v1/convai/agents/create" and sent["key"] == "secret-key"
    assert sent["body"]["conversation_config"] == voice.agent_config()
    agent = sent["body"]["conversation_config"]["agent"]
    assert agent["language"] == "ko" and agent["prompt"]["built_in_tools"]["end_call"]["name"] == "end_call"


def test_session_reports_why_it_ended():
    from elevenlabs.conversational_ai.conversation import DisconnectionDetails

    cfg = Config(owner_name="김세라", elevenlabs_api_key="key", agent_id="agent_1")
    session = voice.VoiceSession(cfg, audio=None, topic="t", details="d", on_line=lambda who, text: None)
    session._on_disconnect(DisconnectionDetails(reason="agent", close_code=1000))
    assert session.ended.is_set() and session.failure == ""

    session = voice.VoiceSession(cfg, audio=None, topic="t", details="d", on_line=lambda who, text: None)
    session._on_disconnect(DisconnectionDetails(reason="error", close_code=1006, message="no close frame"))
    assert session.ended.is_set() and session.failure == "no close frame"


def mock_api(monkeypatch, handler):
    monkeypatch.setattr(voice, "ElevenLabs", lambda api_key: ElevenLabs(
        api_key=api_key, httpx_client=httpx.Client(transport=httpx.MockTransport(handler))))


def test_ready_check_asks_the_service_for_a_session_before_any_dialing(monkeypatch):
    asked = []

    def handler(request):
        asked.append((request.url.path, request.url.params["agent_id"]))
        return httpx.Response(200, json={"signed_url": "wss://example.invalid/convai?token=t"})

    mock_api(monkeypatch, handler)
    voice.check_ready(Config(owner_name="김세라", elevenlabs_api_key="key", agent_id="agent_1"))
    assert asked == [("/v1/convai/conversation/get-signed-url", "agent_1")]


def test_ready_check_stops_the_call_when_the_key_is_rejected_or_setup_is_missing(monkeypatch):
    import pytest

    from phone_agent.phone import PhoneError

    mock_api(monkeypatch, lambda request: httpx.Response(401, json={"detail": "invalid_api_key"}))
    with pytest.raises(PhoneError, match="AI 서비스"):
        voice.check_ready(Config(owner_name="김세라", elevenlabs_api_key="bad", agent_id="agent_1"))
    with pytest.raises(PhoneError, match="setup"):
        voice.check_ready(Config(owner_name="김세라", elevenlabs_api_key="key", agent_id=""))
