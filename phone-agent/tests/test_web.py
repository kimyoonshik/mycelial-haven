import http.client
import threading
import urllib.parse

import pytest

from phone_agent.call import CallRecord, save_record
from phone_agent.config import Config
from phone_agent.web import make_server


class FakeCalls:
    def __init__(self):
        self.started = []
        self.stopped = []
        self.record = None

    def start(self, number, topic, details):
        self.started.append((number, topic, details))
        self.record = CallRecord(id="20261113-101500", number=number, topic=topic, details=details,
                                 started_at="2026-11-13T10:15:00", status="talking")
        return self.record

    def get(self, call_id):
        return self.record if self.record and self.record.id == call_id else None

    def stop(self, call_id):
        self.stopped.append(call_id)


class Browser:
    def __init__(self, port):
        self.port = port
        self.cookie = ""

    def request(self, method, path, form=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        body = urllib.parse.urlencode(form) if form is not None else None
        headers = {"Cookie": self.cookie}
        if body is not None:
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        conn.request(method, path, body, headers)
        response = conn.getresponse()
        text = response.read().decode("utf-8")
        if response.getheader("Set-Cookie"):
            self.cookie = response.getheader("Set-Cookie").split(";")[0]
        conn.close()
        return response.status, response.getheader("Location"), text


@pytest.fixture
def site():
    cfg = Config(owner_name="김세라", web_pin="246810", agent_id="agent_1", phone_address="AA:BB:CC:DD:EE:FF")
    calls = FakeCalls()
    server = make_server(cfg, calls, port=0, host="127.0.0.1")
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield Browser(server.server_address[1]), calls, cfg
    server.shutdown()
    server.server_close()


FORM = {"number": "02-123-4567", "topic": "내일 저녁 예약 문의", "details": "내일 7시 4명 <예약>"}


def login(browser):
    status, location, _ = browser.request("POST", "/login", {"pin": "246810"})
    assert (status, location) == (303, "/")


def test_nothing_works_without_the_pin(site, monkeypatch):
    browser, calls, _ = site
    monkeypatch.setattr("phone_agent.web.time.sleep", lambda seconds: None)

    status, _, text = browser.request("GET", "/")
    assert status == 200 and 'name="pin"' in text and "전화번호" not in text
    assert browser.request("POST", "/call", FORM)[0] == 403
    assert browser.request("POST", "/login", {"pin": "000000"})[0] == 403
    assert browser.request("POST", "/calls/20261113-101500/stop", {})[0] == 403
    assert calls.started == [] and calls.stopped == []


def test_call_goes_through_a_confirmation_screen_that_shows_what_the_ai_will_say(site):
    browser, calls, _ = site
    login(browser)

    status, _, text = browser.request("POST", "/confirm", FORM)
    assert status == 200
    assert "021234567" in text
    assert "김세라 님을 대신해 전화드린 AI 비서입니다. 내일 저녁 예약 문의 건으로" in text
    assert "&lt;예약&gt;" in text and "<예약>" not in text  # 입력한 글은 그대로 글자로만 보여 줍니다
    assert "승인하고 전화 걸기" in text
    assert calls.started == []  # 확인 화면에서는 아직 걸지 않습니다

    status, location, _ = browser.request("POST", "/call", FORM)
    assert (status, location) == (303, "/calls/20261113-101500")
    assert calls.started == [("021234567", "내일 저녁 예약 문의", "내일 7시 4명 <예약>")]


def test_bad_number_or_missing_request_returns_to_the_form_with_the_reason(site):
    browser, calls, _ = site
    login(browser)

    status, _, text = browser.request("POST", "/confirm", {**FORM, "number": "119"})
    assert status == 400 and "국내 전화번호만" in text and "내일 저녁 예약 문의" in text  # 적은 내용은 남겨 둡니다

    status, _, text = browser.request("POST", "/call", {**FORM, "details": " "})
    assert status == 400 and "모두 적어" in text
    assert calls.started == []


def test_live_call_page_refreshes_shows_the_talk_and_can_stop(site):
    browser, calls, _ = site
    login(browser)
    browser.request("POST", "/call", FORM)
    calls.record.transcript.append({"who": "callee", "text": "네, 7시 가능합니다."})

    status, _, text = browser.request("GET", "/calls/20261113-101500")
    assert status == 200 and "통화 중" in text and "네, 7시 가능합니다." in text and "상대방" in text
    assert 'http-equiv="refresh"' in text and "통화 중단" in text

    status, location, _ = browser.request("POST", "/calls/20261113-101500/stop", {})
    assert (status, location) == (303, "/calls/20261113-101500") and calls.stopped == ["20261113-101500"]

    calls.record.status, calls.record.outcome = "ended", "completed"
    _, _, text = browser.request("GET", "/calls/20261113-101500")
    assert "통화 완료" in text and 'http-equiv="refresh"' not in text and "통화 중단" not in text


def test_home_lists_past_calls_and_warns_when_setup_is_incomplete(site):
    browser, calls, cfg = site
    login(browser)
    save_record(CallRecord(id="20261112-090000", number="0311234567", topic="정비 예약", details="d",
                           started_at="2026-11-12T09:00:00", status="ended", outcome="not_answered"))

    _, _, text = browser.request("GET", "/")
    assert "정비 예약" in text and "받지 않음" in text and "phone-agent pair" not in text

    cfg.phone_address = ""
    _, _, text = browser.request("GET", "/")
    assert "phone-agent pair" in text

    assert browser.request("GET", "/calls/19990101-000000")[0] == 404
