import threading

import pytest

from phone_agent.call import Busy, Calls, CallRecord, load_record, normalize_number, recent_records, run_call
from phone_agent.phone import PhoneError


class FakePhone:
    def __init__(self, states, connect_error=None):
        self.states = list(states)  # 물을 때마다 하나씩 진행, 마지막 상태에서 멈춤
        self.connect_error = connect_error
        self.log = []

    def connect(self):
        if self.connect_error:
            raise PhoneError(self.connect_error)
        self.log.append("connect")

    def dial(self, number):
        self.log.append(f"dial {number}")
        return "/call0"

    def call_state(self, path):
        return self.states.pop(0) if len(self.states) > 1 else self.states[0]

    def hangup(self):
        self.log.append("hangup")

    def disconnect(self):
        self.log.append("disconnect")


class FakeVoice:
    def __init__(self, on_line, ends_after=None, failure=""):
        self.ended = threading.Event()
        self.failure = failure
        self.stopped = False
        self._polls_left = ends_after
        on_line("ai", "안녕하세요.")
        on_line("callee", "네, 말씀하세요.")

    def end(self):
        self.stopped = True


def run(phone, voice_options=None, stop=None, clock=None):
    record = CallRecord(id="1", number="0212345678", topic="예약 문의", details="내일 7시 4명", started_at="")
    voices = []
    ticks = iter(clock or range(10_000))

    def start_voice(on_line):
        voices.append(FakeVoice(on_line, **(voice_options or {})))
        return voices[0]

    def sleep(seconds):
        # 통화가 진행되는 동안 AI가 끊는 시점을 흉내 냅니다.
        if voices and voices[0]._polls_left is not None:
            voices[0]._polls_left -= 1
            if voices[0]._polls_left <= 0:
                voices[0].ended.set()

    run_call(record, phone, start_voice, stop or threading.Event(), sleep=sleep, now=lambda: next(ticks))
    return record, voices


def test_ai_talks_once_the_callee_answers_and_hangs_up_when_done():
    phone = FakePhone(["dialing", "alerting", "active"])
    record, voices = run(phone, {"ends_after": 3})

    assert record.status == "ended" and record.outcome == "completed"
    assert record.transcript == [{"who": "ai", "text": "안녕하세요."}, {"who": "callee", "text": "네, 말씀하세요."}]
    assert voices[0].stopped
    assert phone.log == ["connect", "dial 0212345678", "hangup", "disconnect"]
    assert record.ended_at


def test_ai_does_not_start_until_the_call_is_answered():
    record, voices = run(FakePhone(["dialing", "alerting", "disconnected"]))
    assert record.outcome == "not_answered"
    assert voices == [] and record.transcript == []


def test_gives_up_when_nobody_answers_in_time():
    phone = FakePhone(["alerting"])
    record, voices = run(phone, clock=iter([0, 10, 20, 30, 40, 50, 60]))
    assert record.outcome == "not_answered"
    assert phone.log[-2:] == ["hangup", "disconnect"]  # 울리던 전화를 끊습니다


def test_callee_hanging_up_ends_the_ai_session():
    record, voices = run(FakePhone(["active", "active", "active", "disconnected"]))
    assert record.outcome == "callee_hung_up"
    assert voices[0].stopped


def test_stop_request_hangs_up_a_ringing_call():
    stop = threading.Event()
    stop.set()
    phone = FakePhone(["alerting"])
    record, voices = run(phone, stop=stop)
    assert record.outcome == "stopped" and voices == []
    assert phone.log[-2:] == ["hangup", "disconnect"]


def test_stop_request_ends_a_call_in_progress():
    stop = threading.Event()
    phone = FakePhone(["active"])
    record = CallRecord(id="2", number="0212345678", topic="t", details="d", started_at="")
    voices = []
    polls = []

    def sleep(seconds):
        polls.append(seconds)
        if len(polls) == 3:  # 통화 도중 중단 버튼을 누름
            stop.set()

    run_call(record, phone, lambda on_line: voices.append(FakeVoice(on_line)) or voices[0], stop, sleep=sleep)
    assert record.outcome == "stopped" and voices[0].stopped
    assert phone.log[-2:] == ["hangup", "disconnect"]


def test_voice_connection_failure_is_reported_and_the_call_is_hung_up():
    phone = FakePhone(["active"])
    record, _ = run(phone, {"ends_after": 1, "failure": "연결이 끊겼습니다(코드 1006)"})
    assert record.outcome == "failed" and "1006" in record.error
    assert "hangup" in phone.log


def test_phone_errors_are_reported_in_plain_words():
    phone = FakePhone([], connect_error="휴대폰에 블루투스로 연결하지 못했습니다")
    record, _ = run(phone)
    assert record.status == "ended" and record.outcome == "failed"
    assert record.error == "휴대폰에 블루투스로 연결하지 못했습니다"
    assert phone.log == ["hangup", "disconnect"]  # 실패해도 정리는 합니다


def test_voice_start_failure_hangs_up_the_answered_call():
    phone = FakePhone(["active"])
    record = CallRecord(id="3", number="0212345678", topic="t", details="d", started_at="")

    def start_voice(on_line):
        raise RuntimeError("401 invalid api key")

    run_call(record, phone, start_voice, threading.Event())
    assert record.outcome == "failed" and "401" in record.error
    assert phone.log[-2:] == ["hangup", "disconnect"]


@pytest.mark.parametrize("raw, expected", [
    ("010-1234-5678", "01012345678"),
    ("02) 123-4567", "021234567"),
    ("031 123 4567", "0311234567"),
    ("0507-1234-5678", "050712345678"),  # 가게 안심번호
    ("1588-1234", "15881234"),            # 대표번호
])
def test_normalize_number_accepts_domestic_numbers(raw, expected):
    assert normalize_number(raw) == expected


@pytest.mark.parametrize("raw", ["112", "119", "114", "060-123-4567", "001-1-212-555-0100", "+82 10 1234 5678", "", "전화번호"])
def test_normalize_number_refuses_emergency_premium_and_international(raw):
    with pytest.raises(ValueError):
        normalize_number(raw)


def test_calls_runs_one_call_at_a_time_and_keeps_a_record():
    release = threading.Event()

    def fake_run(record, stop):
        record.status = "talking"
        release.wait(5)
        record.transcript.append({"who": "ai", "text": "안녕하세요."})
        record.status, record.outcome = "ended", "completed"

    calls = Calls(cfg=None, run=fake_run)
    record = calls.start("02-123-4567", " 예약 문의 ", "내일 7시")
    assert (record.number, record.topic) == ("021234567", "예약 문의")
    with pytest.raises(Busy):
        calls.start("021234567", "다른 용건", "내용")
    assert calls.get(record.id) is record

    release.set()
    for _ in range(100):
        if load_record(record.id):
            break
        threading.Event().wait(0.05)
    saved = load_record(record.id)
    assert saved.outcome == "completed" and saved.transcript[0]["text"] == "안녕하세요."
    assert [r.id for r in recent_records()] == [record.id]
    assert load_record("../../etc/passwd") is None


def test_calls_stop_reaches_the_running_call():
    seen = {}

    def fake_run(record, stop):
        seen["stopped"] = stop.wait(5)
        record.status, record.outcome = "ended", "stopped"

    calls = Calls(cfg=None, run=fake_run)
    record = calls.start("021234567", "용건", "내용")
    calls.stop(record.id)
    for _ in range(100):
        if record.status == "ended":
            break
        threading.Event().wait(0.05)
    assert seen["stopped"] is True


def test_a_crash_before_the_call_starts_is_recorded():
    def fake_run(record, stop):
        raise OSError("D-Bus 에 연결할 수 없음")

    calls = Calls(cfg=None, run=fake_run)
    record = calls.start("021234567", "용건", "내용")
    for _ in range(100):
        if load_record(record.id):
            break
        threading.Event().wait(0.05)
    assert record.status == "ended" and record.outcome == "failed" and "D-Bus" in record.error
