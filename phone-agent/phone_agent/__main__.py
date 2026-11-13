"""명령줄: phone-agent setup | pair | status | probe | call | serve"""
import argparse
import array
import getpass
import math
import subprocess
import sys
import threading
import time
import wave

from . import config
from .call import OUTCOMES, STATUS, Calls, CallRecord, normalize_number, run_call
from .phone import BLUEZ, DEVICE_IFACE, PhoneError


def _restart_web():
    """실행 중인 웹 화면이 바뀐 설정을 다시 읽게 합니다."""
    subprocess.run(["systemctl", "--user", "try-restart", "phone-agent.service"], capture_output=True)


def cmd_setup(cfg, args):
    from .voice import create_agent

    cfg.owner_name = input(f"통화에서 밝힐 이름 [{cfg.owner_name}]: ").strip() or cfg.owner_name
    cfg.web_pin = getpass.getpass("웹 화면 비밀번호(그대로 두려면 Enter): ").strip() or cfg.web_pin
    cfg.elevenlabs_api_key = getpass.getpass("ElevenLabs API 키(그대로 두려면 Enter): ").strip() or cfg.elevenlabs_api_key
    config.save(cfg)
    if not (cfg.owner_name and cfg.web_pin and cfg.elevenlabs_api_key):
        sys.exit("이름, 비밀번호, API 키가 모두 필요합니다. 다시 실행해 주세요.")
    if cfg.agent_id and input("AI 에이전트가 이미 있습니다. 새로 만들까요? [y/N]: ").strip().lower() != "y":
        return _restart_web()
    try:
        cfg.agent_id = create_agent(cfg.elevenlabs_api_key)
    except Exception as e:
        sys.exit(f"AI 에이전트를 만들지 못했습니다: {e}")
    config.save(cfg)
    _restart_web()
    print(f"AI 에이전트를 만들었습니다({cfg.agent_id}). ElevenLabs 화면에서 한국어 목소리를 골라 주세요.")


def cmd_pair(cfg, args):
    from .pairing import pair

    cfg.phone_address, cfg.phone_name = pair(cfg.phone_address)
    config.save(cfg)
    _restart_web()
    print(f"페어링했습니다: {cfg.phone_name} ({cfg.phone_address})")


def cmd_status(cfg, args):
    from jeepney.io.blocking import open_dbus_connection

    from .audio import default_node
    from .phone import TELEPHONY, TELEPHONY_PATH, managed_objects

    def check(label, probe):
        try:
            ok, detail = probe()
        except Exception as e:
            ok, detail = False, f"{type(e).__name__}: {e}"
        print(f"[{'확인' if ok else '문제'}] {label}: {detail}")

    def bluetooth():
        objects = managed_objects(open_dbus_connection(bus="SYSTEM"), BLUEZ, "/")
        for ifaces in objects.values():
            device = ifaces.get(DEVICE_IFACE)
            if device and device["Address"][1].upper() == cfg.phone_address.upper():
                paired, trusted = device["Paired"][1], device["Trusted"][1]
                return paired and trusted, f"{cfg.phone_name} 페어링={paired} 신뢰={trusted}"
        return False, "페어링된 휴대폰이 없습니다 (phone-agent pair)"

    def telephony():
        gateways = managed_objects(open_dbus_connection(bus="SESSION"), TELEPHONY, TELEPHONY_PATH)
        return True, f"실행 중 (연결된 휴대폰 {len(gateways)}대)"

    check("설정", lambda: (bool(cfg.owner_name and cfg.web_pin and cfg.elevenlabs_api_key and cfg.agent_id),
                         f"이름={cfg.owner_name or '없음'} 에이전트={cfg.agent_id or '없음'}"))
    def pipewire():
        version = subprocess.run(["pw-cat", "--version"], capture_output=True, text=True).stdout.split()[-1]
        return tuple(map(int, version.split(".")[:2])) >= (1, 4), f"{version} (1.4 이상 필요)"

    check("PipeWire", pipewire)
    check("통화 서비스", telephony)
    check("받는 소리 장치", lambda: ((name := default_node("@DEFAULT_AUDIO_SINK@")) == "phone_agent_rx", name))
    check("보내는 소리 장치", lambda: ((name := default_node("@DEFAULT_AUDIO_SOURCE@")) == "phone_agent_tx", name))
    check("블루투스", bluetooth)


class _ProbeVoice:
    """AI 대신 시험음을 2초 내보내고 상대 소리를 녹음합니다. run_call 이 VoiceSession 처럼 다룹니다."""

    SECONDS = 8

    def __init__(self):
        from .audio import RATE, CallAudio

        self.ended = threading.Event()
        self.failure = ""
        self.received = bytearray()
        self._audio = CallAudio()
        self._tone = array.array("h", (int(9000 * math.sin(2 * math.pi * 1000 * i / RATE)) for i in range(2 * RATE)))

    def start(self):
        self._audio.start(self.received.extend)
        self._audio.play(self._tone.tobytes())
        threading.Timer(self.SECONDS, self.ended.set).start()
        return self

    def end(self):
        self._audio.stop()


def cmd_probe(cfg, args):
    from .audio import RATE, check_routing
    from .phone import Phone

    check_routing()
    record = CallRecord(id="probe", number=normalize_number(args.number), topic="", details="", started_at="")
    probe = _ProbeVoice()
    print("발신합니다. 받으면 '삐-' 소리가 2초 들려야 하고, 그 뒤 몇 초 동안 아무 말이나 해 주세요.")
    phone = Phone(cfg.phone_address)
    try:
        run_call(record, phone, lambda on_line: probe.start(), threading.Event())
    finally:
        phone.close()
    print(f"결과: {OUTCOMES[record.outcome]} {record.error}")
    samples = array.array("h", bytes(probe.received[: len(probe.received) // 2 * 2]))
    if samples:
        path = config.DATA_DIR / "probe.wav"
        path.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(path), "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(RATE)
            wav.writeframes(samples.tobytes())
        peak = max(abs(s) for s in samples)
        print(f"받은 소리: {len(samples) / RATE:.1f}초, 최대 크기 {peak} (0이면 소리가 들어오지 않은 것) → {path}")


def cmd_call(cfg, args):
    calls = Calls(cfg)
    record = calls.start(args.number, args.topic, args.details)
    shown, status = 0, ""
    try:
        while record.status != "ended" or shown < len(record.transcript):
            if record.status != status:
                status = record.status
                print(f"[{STATUS[status]}]")
            for line in record.transcript[shown:]:
                print(f"  {line['who']}: {line['text']}")
            shown = len(record.transcript)
            time.sleep(0.3)
    except KeyboardInterrupt:
        calls.stop(record.id)
        while record.status != "ended":
            time.sleep(0.1)
    print(f"결과: {OUTCOMES[record.outcome]} {record.error}")


def cmd_serve(cfg, args):
    from .web import make_server

    if not cfg.web_pin:
        sys.exit("웹 화면 비밀번호가 없습니다. `phone-agent setup`을 먼저 실행하세요.")
    print(f"웹 화면: http://<이 기기 주소>:{args.port}")
    make_server(cfg, Calls(cfg), args.port).serve_forever()


def main():
    parser = argparse.ArgumentParser(prog="phone-agent")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("setup", help="이름·비밀번호·API 키를 입력하고 AI 에이전트를 만듭니다").set_defaults(run=cmd_setup)
    sub.add_parser("pair", help="아이폰과 블루투스로 페어링합니다").set_defaults(run=cmd_pair)
    sub.add_parser("status", help="설치 상태를 점검합니다").set_defaults(run=cmd_status)
    probe = sub.add_parser("probe", help="AI 없이 발신과 음성 경로만 시험합니다")
    probe.add_argument("number")
    probe.set_defaults(run=cmd_probe)
    call = sub.add_parser("call", help="AI가 대신 통화합니다")
    call.add_argument("number")
    call.add_argument("--topic", required=True, help="용건 한 줄")
    call.add_argument("--details", required=True, help="자세한 요청")
    call.set_defaults(run=cmd_call)
    serve = sub.add_parser("serve", help="웹 화면을 실행합니다")
    serve.add_argument("--port", type=int, default=8080)
    serve.set_defaults(run=cmd_serve)
    args = parser.parse_args()
    try:
        args.run(config.load(), args)
    except (PhoneError, ValueError) as e:
        sys.exit(str(e))


if __name__ == "__main__":
    main()
