"""통화 한 건의 진행(연결 → 발신 → 상대가 받으면 AI 대화 → 종료)과 통화 기록."""
import json
import re
import threading
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime

from . import config
from .phone import PhoneError

RING_SECONDS = 45  # 이 시간 안에 받지 않으면 끊습니다
POLL = 0.2

STATUS = {"connecting": "휴대폰에 연결하는 중", "dialing": "전화 거는 중", "talking": "통화 중", "ended": "종료"}
OUTCOMES = {
    "completed": "통화 완료",
    "callee_hung_up": "상대방이 끊음",
    "not_answered": "받지 않음",  # 통화 중·거절 포함
    "stopped": "직접 중단",
    "failed": "실패",
}


@dataclass
class CallRecord:
    id: str
    number: str
    topic: str
    details: str
    started_at: str
    status: str = "connecting"  # connecting → dialing → talking → ended
    outcome: str = ""           # ended 일 때 OUTCOMES 의 키
    error: str = ""
    transcript: list = field(default_factory=list)  # [{"who": "ai" | "callee", "text": "..."}]
    ended_at: str = ""


def normalize_number(raw: str) -> str:
    """국내 일반 전화번호만 받습니다. 긴급(112·119 등)·060 유료·국제전화는 자동 발신하지 않습니다."""
    number = re.sub(r"[\s\-().]", "", raw)
    if not re.fullmatch(r"0[1-9]\d{7,10}|1[5-8]\d{6}", number) or number.startswith("060"):
        raise ValueError("국내 전화번호만 걸 수 있습니다(긴급·060·국제전화 제외).")
    return number


def run_call(record: CallRecord, phone, start_voice, stop: threading.Event, sleep=time.sleep, now=time.monotonic):
    """통화 한 건을 끝까지 진행하며 record 를 갱신합니다.

    start_voice(on_line) 은 시작된 VoiceSession 을 돌려줍니다. stop 이 켜지면 어느 단계에서든 끊습니다.
    """
    voice = None
    try:
        phone.connect()
        record.status = "dialing"
        call_path = phone.dial(record.number)
        deadline = now() + RING_SECONDS
        while (state := phone.call_state(call_path)) != "active":
            if stop.is_set():
                record.outcome = "stopped"
                return
            if state == "disconnected" or now() > deadline:
                record.outcome = "not_answered"
                return
            sleep(POLL)

        record.status = "talking"
        voice = start_voice(lambda who, text: record.transcript.append({"who": who, "text": text}))
        while True:
            if stop.is_set():
                record.outcome = "stopped"
            elif voice.ended.is_set():
                record.outcome = "failed" if voice.failure else "completed"
                record.error = voice.failure
            elif phone.call_state(call_path) == "disconnected":
                record.outcome = "callee_hung_up"
            else:
                sleep(POLL)
                continue
            return
    except Exception as e:
        record.outcome = "failed"
        record.error = str(e) if isinstance(e, PhoneError) else f"{type(e).__name__}: {e}"
    finally:
        if voice:
            voice.end()
        phone.hangup()
        phone.disconnect()
        record.status = "ended"
        record.ended_at = datetime.now().isoformat(timespec="seconds")


def _calls_dir():
    return config.DATA_DIR / "calls"


def save_record(record: CallRecord):
    _calls_dir().mkdir(parents=True, exist_ok=True)
    path = _calls_dir() / f"{record.id}.json"
    path.write_text(json.dumps(asdict(record), ensure_ascii=False, indent=2), encoding="utf-8")


def load_record(call_id: str):
    if not re.fullmatch(r"[0-9\-]+", call_id):
        return None
    path = _calls_dir() / f"{call_id}.json"
    if not path.exists():
        return None
    return CallRecord(**json.loads(path.read_text(encoding="utf-8")))


def recent_records(limit=20):
    paths = sorted(_calls_dir().glob("*.json"), reverse=True)[:limit]
    return [CallRecord(**json.loads(p.read_text(encoding="utf-8"))) for p in paths]


class Busy(Exception):
    pass


class Calls:
    """한 번에 한 통화만 진행합니다. 웹 화면과 명령줄이 함께 씁니다."""

    def __init__(self, cfg, run=None):
        self._cfg = cfg
        self._run = run or self._run_real
        self._lock = threading.Lock()
        self._active = None
        self._stop = threading.Event()

    def start(self, number: str, topic: str, details: str) -> CallRecord:
        with self._lock:
            if self._active and self._active.status != "ended":
                raise Busy("이미 통화가 진행 중입니다.")
            started = datetime.now()
            record = CallRecord(
                id=started.strftime("%Y%m%d-%H%M%S"),
                number=normalize_number(number),
                topic=topic.strip(),
                details=details.strip(),
                started_at=started.isoformat(timespec="seconds"),
            )
            self._active = record
            self._stop = threading.Event()
            threading.Thread(target=self._thread, args=(record, self._stop), daemon=True).start()
            return record

    def _thread(self, record, stop):
        try:
            self._run(record, stop)
        except Exception as e:  # 연결 준비 단계의 오류도 기록에 남깁니다
            record.error = str(e) if isinstance(e, PhoneError) else f"{type(e).__name__}: {e}"
            record.outcome, record.status = "failed", "ended"
        save_record(record)

    def _run_real(self, record, stop):
        from .audio import CallAudio, check_routing
        from .phone import Phone
        from .voice import VoiceSession, check_ready

        check_routing()
        check_ready(self._cfg)
        phone = Phone(self._cfg.phone_address)
        try:
            def start_voice(on_line):
                voice = VoiceSession(self._cfg, CallAudio(), record.topic, record.details, on_line)
                voice.start()
                return voice

            run_call(record, phone, start_voice, stop)
        finally:
            phone.close()

    def get(self, call_id: str):
        active = self._active
        if active and active.id == call_id:
            return active
        return load_record(call_id)

    def stop(self, call_id: str):
        if self._active and self._active.id == call_id:
            self._stop.set()
