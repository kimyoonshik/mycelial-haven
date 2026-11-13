"""휴대폰 브라우저로 여는 화면: 용건 입력 → 내용 확인·승인 → 통화 진행 상황과 대화 내용.

같은 네트워크(아이폰 핫스팟이나 사무실 와이파이)에서만 접속합니다. 비밀번호(PIN)로 잠급니다.
"""
import hmac
import secrets
import time
import urllib.parse
from html import escape
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .call import OUTCOMES, STATUS, Busy, normalize_number, recent_records
from .voice import opening_line

WHO = {"ai": "AI 비서", "callee": "상대방"}

PAGE = """<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">{head}
<title>전화 비서</title>
<style>
:root {{ --bg:#f6f5f1; --card:#fff; --ink:#1d1d1b; --muted:#6b6a64; --line:#dddbd3; --accent:#1f6f54; --warn:#a4372c; --on:#fff; }}
@media (prefers-color-scheme: dark) {{
  :root {{ --bg:#161614; --card:#21211e; --ink:#eeede8; --muted:#a3a299; --line:#3a3a35; --accent:#58b894; --warn:#e2857a; --on:#10201a; }}
}}
* {{ box-sizing:border-box; }}
body {{ margin:0; background:var(--bg); color:var(--ink); font:16px/1.6 -apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;
  word-break:keep-all; overflow-wrap:anywhere; }}
main {{ max-width:34rem; margin:0 auto; padding:1.25rem 1rem 3rem; }}
h1 {{ font-size:1.25rem; margin:.25rem 0 1rem; }}
h2 {{ font-size:1rem; margin:1.75rem 0 .5rem; color:var(--muted); font-weight:600; }}
.card {{ background:var(--card); border:1px solid var(--line); border-radius:12px; padding:1rem; margin-bottom:.75rem; }}
label {{ display:block; font-size:.875rem; color:var(--muted); margin:.75rem 0 .25rem; }}
input, textarea {{ width:100%; padding:.7rem .75rem; font:inherit; color:inherit; background:var(--bg); border:1px solid var(--line); border-radius:8px; }}
textarea {{ min-height:6.5rem; resize:vertical; }}
button {{ width:100%; margin-top:1rem; padding:.85rem; font:inherit; font-weight:600; color:var(--on); background:var(--accent); border:0; border-radius:8px; }}
button.stop {{ background:var(--warn); }}
a {{ color:var(--accent); }}
.muted {{ color:var(--muted); font-size:.875rem; }}
.notice {{ border-color:var(--warn); }}
.quote {{ border-left:3px solid var(--accent); padding-left:.75rem; margin:.5rem 0; }}
.line {{ margin:.6rem 0; }}
.line b {{ display:block; font-size:.8rem; color:var(--muted); font-weight:600; }}
.row {{ display:flex; justify-content:space-between; gap:.75rem; }}
a.row {{ color:inherit; text-decoration:none; }}
.row span:last-child {{ color:var(--muted); font-size:.875rem; white-space:nowrap; }}
</style></head><body><main><h1>전화 비서</h1>{body}</main></body></html>"""


def _page(body, head=""):
    return PAGE.format(body=body, head=head).encode("utf-8")


def _login(error=""):
    note = f'<p class="muted">{escape(error)}</p>' if error else ""
    return _page(
        '<form class="card" method="post" action="/login"><label for="pin">비밀번호</label>'
        '<input id="pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password" autofocus>'
        f"{note}<button>들어가기</button></form>"
    )


def _home(cfg, error="", form=None):
    form = form or {}
    missing = [
        text for ok, text in (
            (cfg.agent_id, "AI 에이전트가 없습니다. 기기에서 `phone-agent setup`을 실행하세요."),
            (cfg.phone_address, "페어링된 휴대폰이 없습니다. 기기에서 `phone-agent pair`를 실행하세요."),
        ) if not ok
    ]
    notices = "".join(f'<div class="card notice">{escape(text)}</div>' for text in missing + ([error] if error else []))
    value = lambda name: escape(form.get(name, ""))
    history = "".join(
        f'<a class="card row" href="/calls/{r.id}"><span>{escape(r.topic)} · {escape(r.number)}</span>'
        f"<span>{escape(OUTCOMES.get(r.outcome, r.outcome))}</span></a>"
        for r in recent_records()
    )
    return _page(
        f'{notices}<form class="card" method="post" action="/confirm">'
        f'<label for="number">전화번호</label><input id="number" name="number" type="tel" required value="{value("number")}">'
        f'<label for="topic">용건 한 줄 (AI가 첫마디에 말합니다)</label>'
        f'<input id="topic" name="topic" required maxlength="40" placeholder="예: 내일 저녁 예약 문의" value="{value("topic")}">'
        f'<label for="details">자세한 요청</label><textarea id="details" name="details" required '
        f'placeholder="예: 내일(금) 저녁 7시, 4명, 김○○ 이름으로 예약. 7시가 안 되면 8시도 괜찮음.">{value("details")}</textarea>'
        f"<button>내용 확인하기</button></form>"
        + (f"<h2>최근 통화</h2>{history}" if history else "")
    )


def _confirm(cfg, number, topic, details):
    hidden = "".join(
        f'<input type="hidden" name="{name}" value="{escape(text)}">'
        for name, text in (("number", number), ("topic", topic), ("details", details))
    )
    return _page(
        f'<div class="card"><label>거는 곳</label><div>{escape(number)}</div>'
        f'<label>AI의 첫마디</label><div class="quote">{escape(opening_line(cfg.owner_name, topic))}</div>'
        f'<label>AI에게 맡기는 내용</label><div>{escape(details)}</div>'
        f'<form method="post" action="/call">{hidden}<button>승인하고 전화 걸기</button></form>'
        f'<p class="muted"><a href="/">고치러 돌아가기</a></p></div>'
    )


def _call(record):
    live = record.status != "ended"
    state = STATUS[record.status] if live else OUTCOMES.get(record.outcome, record.outcome)
    lines = "".join(
        f'<div class="line"><b>{WHO[line["who"]]}</b>{escape(line["text"])}</div>' for line in record.transcript
    ) or '<p class="muted">아직 대화 내용이 없습니다.</p>'
    error = f'<div class="card notice">{escape(record.error)}</div>' if record.error else ""
    stop = f'<form method="post" action="/calls/{record.id}/stop"><button class="stop">통화 중단</button></form>' if live else ""
    return _page(
        f'<div class="card"><div class="row"><span>{escape(record.topic)} · {escape(record.number)}</span>'
        f"<span>{escape(state)}</span></div>{stop}</div>{error}"
        f'<h2>대화 내용</h2><div class="card">{lines}</div><p class="muted"><a href="/">처음으로</a></p>',
        head='<meta http-equiv="refresh" content="2">' if live else "",
    )


def make_server(cfg, calls, port=8080, host="0.0.0.0"):
    sessions = set()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def _send(self, body, status=200, headers=()):
            self.send_response(status)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            for name, value in headers:
                self.send_header(name, value)
            self.end_headers()
            self.wfile.write(body)

        def _redirect(self, location, headers=()):
            self._send(b"", 303, [("Location", location), *headers])

        def _authed(self):
            cookie = SimpleCookie(self.headers.get("Cookie", ""))
            return "session" in cookie and cookie["session"].value in sessions

        def _form(self):
            length = int(self.headers.get("Content-Length", 0))
            fields = urllib.parse.parse_qs(self.rfile.read(length).decode("utf-8"))
            return {name: values[0].strip() for name, values in fields.items()}

        def do_GET(self):
            if not self._authed():
                return self._send(_login())
            if self.path == "/":
                return self._send(_home(cfg))
            record = calls.get(self.path.removeprefix("/calls/")) if self.path.startswith("/calls/") else None
            if record:
                return self._send(_call(record))
            self._send(_page('<div class="card">없는 화면입니다. <a href="/">처음으로</a></div>'), 404)

        def do_POST(self):
            form = self._form()
            if self.path == "/login":
                if cfg.web_pin and hmac.compare_digest(form.get("pin", "").encode(), cfg.web_pin.encode()):
                    token = secrets.token_urlsafe(24)
                    sessions.add(token)
                    return self._redirect("/", [("Set-Cookie", f"session={token}; HttpOnly; SameSite=Strict; Path=/")])
                time.sleep(1)  # 비밀번호 대입을 느리게
                return self._send(_login("비밀번호가 맞지 않습니다."), 403)
            if not self._authed():
                return self._send(_login(), 403)
            if self.path in ("/confirm", "/call"):
                try:
                    number = normalize_number(form.get("number", ""))
                    if not form.get("topic") or not form.get("details"):
                        raise ValueError("용건 한 줄과 자세한 요청을 모두 적어 주세요.")
                    if self.path == "/confirm":
                        return self._send(_confirm(cfg, number, form["topic"], form["details"]))
                    record = calls.start(number, form["topic"], form["details"])
                except (ValueError, Busy) as e:
                    return self._send(_home(cfg, str(e), form), 400)
                return self._redirect(f"/calls/{record.id}")
            if self.path.startswith("/calls/") and self.path.endswith("/stop"):
                call_id = self.path.split("/")[2]
                calls.stop(call_id)
                return self._redirect(f"/calls/{call_id}")
            self._send(b"", 404)

    return ThreadingHTTPServer((host, port), Handler)
