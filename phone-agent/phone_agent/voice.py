"""통화 중의 듣기·생각하기·말하기는 ElevenLabs Agents 가 맡습니다(두뇌는 그 안에서 Claude).

에이전트는 `phone-agent setup` 이 한 번 만들고, 통화마다 용건을 변수({{topic}} 등)로 넘깁니다.
"""
import threading

from elevenlabs.client import ElevenLabs
from elevenlabs.conversational_ai.conversation import AudioInterface, Conversation, ConversationInitiationData

from .audio import CallAudio
from .phone import PhoneError

LLM = "claude-sonnet-5-5"
MAX_CALL_SECONDS = 600

# 전화를 받자마자 AI임과 용건을 한 문장으로 밝힙니다. 승인 화면에도 이 문장을 그대로 보여 줍니다.
FIRST_MESSAGE = (
    "안녕하세요. {{owner_name}} 님을 대신해 전화드린 AI 비서입니다. "
    "{{topic}} 건으로 연락드렸는데, 잠시 통화 괜찮으실까요?"
)

PROMPT = """\
당신은 {{owner_name}} 님의 부탁으로 대신 전화를 건 AI 비서입니다. 지금 전화 통화 중이며, 상대방은 이 전화를 받은 사람입니다.

# 이번 통화의 용건
- 한 줄 요약: {{topic}}
- 자세한 요청: {{details}}

# 말하는 방식
- 정중한 존댓말로, 한 번에 한두 문장만 짧게 말합니다. 전화 통화이므로 목록, 기호, 이모지는 쓰지 않습니다.
- 질문은 한 번에 하나만 합니다.
- 상대방이 이미 답했거나 알아들었다고 한 내용은 다시 묻거나 반복하지 않습니다.
- 숫자, 날짜, 시간은 자연스러운 한국어로 말합니다.
- 상대방이 잘 못 들었다고 하면 같은 내용을 더 짧고 또렷하게 다시 말합니다.

# 지켜야 할 것
- 첫 인사에서 이미 AI 비서임을 밝혔습니다. 누구냐고 다시 물으면 "{{owner_name}} 님을 대신해 전화드린 AI 비서"라고 솔직하게 답합니다. 사람인 척하지 않습니다.
- "자세한 요청"에 있는 내용만 전달하고 약속합니다. 거기 없는 개인정보(주민등록번호, 카드번호, 주소 등)는 말하지 않고 지어내지도 않습니다.
- 요청한 조건이 안 된다고 하면 가능한 대안(다른 날짜나 시간 등)을 물어봅니다. 요청에 그 대안을 받아들여도 된다는 내용이 없으면 확정하지 말고 "{{owner_name}} 님께 전달드리고 다시 연락드리겠습니다"라고 합니다.
- 결제, 계약, 위약금이 걸린 확정처럼 돈이나 책임이 따르는 일에는 동의하지 않고, 본인이 직접 다시 연락드리겠다고 합니다.
- 모르는 것을 물으면 추측하지 말고 "확인해서 다시 연락드리겠습니다"라고 합니다.
- 상대방이 본인과 직접 통화하고 싶어 하면 "{{owner_name}} 님께 전달해 직접 전화드리도록 하겠습니다"라고 합니다.
- 상대방이 AI와 통화하기를 원하지 않거나 불쾌해하면 바로 사과하고 통화를 마칩니다.

# 통화를 마칠 때
- 용건이 해결되면 확인된 내용을 한 문장으로 다시 말해 확인받고, 감사 인사를 한 뒤 end_call 도구로 전화를 끊습니다.
- 자동응답(ARS)이나 음성사서함이 받았거나 통화를 더 진행할 수 없으면 짧게 인사하고 end_call 도구로 끊습니다.
- 인사를 마친 뒤에는 더 말하지 말고 반드시 end_call 을 호출합니다.
"""


def opening_line(owner_name: str, topic: str) -> str:
    return FIRST_MESSAGE.replace("{{owner_name}}", owner_name).replace("{{topic}}", topic)


def agent_config() -> dict:
    return {
        "agent": {
            "language": "ko",
            "first_message": FIRST_MESSAGE,
            "prompt": {
                "prompt": PROMPT,
                "llm": LLM,
                "built_in_tools": {
                    "end_call": {"type": "system", "name": "end_call", "params": {"system_tool_type": "end_call"}},
                },
            },
        },
        "tts": {"model_id": "eleven_flash_v2_5"},  # 한국어를 지원하는 저지연 음성 모델
        "conversation": {
            "max_duration_seconds": MAX_CALL_SECONDS,
            # API로 만든 에이전트는 받을 이벤트를 직접 지정해야 대화 내용(글)이 넘어옵니다.
            "client_events": [
                "conversation_initiation_metadata", "audio", "interruption", "ping",
                "user_transcript", "agent_response", "agent_response_correction",
            ],
        },
    }


def create_agent(api_key: str) -> str:
    client = ElevenLabs(api_key=api_key)
    return client.conversational_ai.agents.create(name="Phone Agent", conversation_config=agent_config()).agent_id


def check_ready(cfg):
    """전화를 걸기 전에 AI 쪽이 준비됐는지 확인합니다. 상대방이 받았는데 AI가 말을 못 하는 일을 막습니다."""
    if not (cfg.owner_name and cfg.elevenlabs_api_key and cfg.agent_id):
        raise PhoneError("설정이 끝나지 않았습니다. `phone-agent setup`을 먼저 실행하세요.")
    try:
        ElevenLabs(api_key=cfg.elevenlabs_api_key).conversational_ai.conversations.get_signed_url(agent_id=cfg.agent_id)
    except Exception as e:
        raise PhoneError(f"AI 서비스에 연결하지 못했습니다. 인터넷 연결과 API 키를 확인하세요. ({type(e).__name__})")


class _Bridge(AudioInterface):
    """SDK 가 요구하는 음성 입출력(16 kHz·16비트·모노)을 통화 음성에 연결합니다."""

    def __init__(self, audio: CallAudio):
        self._audio = audio

    def start(self, input_callback):
        self._audio.start(input_callback)

    def stop(self):
        self._audio.stop()

    def output(self, audio: bytes):
        self._audio.play(audio)

    def interrupt(self):
        self._audio.flush()


class VoiceSession:
    """통화 한 건의 AI 대화. on_line(화자, 문장) 으로 대화 내용을 알려 줍니다(화자: "ai" 또는 "callee")."""

    def __init__(self, cfg, audio: CallAudio, topic: str, details: str, on_line):
        self.ended = threading.Event()  # AI가 끊었거나 연결이 끊겨 대화가 끝남
        self.failure = ""               # 오류로 끝났을 때의 사유
        self._conversation = Conversation(
            ElevenLabs(api_key=cfg.elevenlabs_api_key),
            cfg.agent_id,
            requires_auth=True,
            audio_interface=_Bridge(audio),
            config=ConversationInitiationData(
                dynamic_variables={"owner_name": cfg.owner_name, "topic": topic, "details": details}
            ),
            callback_agent_response=lambda text: on_line("ai", text),
            callback_user_transcript=lambda text: on_line("callee", text),
            callback_disconnect=self._on_disconnect,
        )

    def _on_disconnect(self, why):
        if why.reason == "error":
            self.failure = why.message or f"연결이 끊겼습니다(코드 {why.close_code})"
        self.ended.set()

    def start(self):
        self._conversation.start_session()

    def end(self):
        self._conversation.end_session()
        self._conversation.wait_for_session_end()
