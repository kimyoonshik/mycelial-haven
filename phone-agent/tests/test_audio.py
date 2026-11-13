import sys
import time

import pytest

from phone_agent.audio import FRAME, CallAudio, check_routing
from phone_agent.phone import PhoneError

# 재생 프로그램 대역: 실제 음성 속도(초당 32,000바이트)로만 읽어 파일에 적습니다.
CONSUMER = """
import sys, time
out = open(sys.argv[1], "wb", buffering=0)
while True:
    data = sys.stdin.buffer.raw.read(640)
    if not data:
        break
    out.write(data)
    time.sleep(0.02)
"""


def speech(byte, frames):
    return bytes([byte]) * (FRAME * frames)


def start(tmp_path, record_cmd):
    out = tmp_path / "played.raw"
    audio = CallAudio(record_cmd=record_cmd, play_cmd=[sys.executable, "-c", CONSUMER, str(out)])
    heard = []
    audio.start(heard.append, chunk=8000)
    return audio, heard, out


def test_incoming_audio_arrives_in_whole_chunks(tmp_path):
    audio, heard, _ = start(tmp_path, ["head", "-c", "20000", "/dev/zero"])
    time.sleep(0.5)
    audio.stop()
    assert [len(chunk) for chunk in heard] == [8000, 8000, 4000]


def test_speech_is_played_in_order_with_silence_around_it(tmp_path):
    audio, _, out = start(tmp_path, ["sleep", "30"])
    time.sleep(0.2)
    audio.play(speech(1, 5))
    audio.play(speech(2, 5))
    time.sleep(0.6)
    audio.stop()

    played = out.read_bytes()
    voiced = played.strip(b"\0")
    assert voiced == speech(1, 5) + speech(2, 5)
    assert played.startswith(b"\0" * FRAME) and played.endswith(b"\0" * FRAME)  # 말이 없을 때는 무음을 보냅니다


def test_only_a_little_audio_is_queued_ahead_so_flush_cuts_speech_short(tmp_path):
    audio, _, out = start(tmp_path, ["sleep", "30"])
    time.sleep(0.2)
    audio.play(speech(7, 100))  # 2초 분량
    time.sleep(0.4)
    audio.flush()               # 상대방이 말을 끊음
    time.sleep(0.4)
    audio.stop()

    voiced_frames = out.read_bytes().count(b"\x07") / FRAME
    assert 10 <= voiced_frames <= 30  # 0.4초 동안 나간 만큼만(여유 포함). 2초 분량이 다 나가면 100


def test_stop_can_be_called_from_the_incoming_audio_callback(tmp_path):
    out = tmp_path / "played.raw"
    audio = CallAudio(record_cmd=["head", "-c", "16000", "/dev/zero"], play_cmd=[sys.executable, "-c", CONSUMER, str(out)])
    calls = []

    def on_audio(chunk):
        calls.append(len(chunk))
        audio.stop()  # SDK 는 전송 오류가 나면 이 콜백 안에서 stop 을 부릅니다

    audio.start(on_audio, chunk=8000)
    time.sleep(0.5)
    assert calls == [8000]
    audio.stop()  # 두 번 불러도 됩니다


def fake_wpctl(tmp_path, monkeypatch, sink, source):
    script = tmp_path / "wpctl"
    script.write_text(
        "#!/bin/sh\n"
        f'[ "$2" = "@DEFAULT_AUDIO_SINK@" ] && name={sink} || name={source}\n'
        'echo "id 33, type PipeWire:Interface:Node"\n'
        'echo "  * media.class = \\"Audio/Sink\\""\n'
        'echo "  * node.name = \\"$name\\""\n'
    )
    script.chmod(0o755)
    monkeypatch.setenv("PATH", f"{tmp_path}:/usr/bin:/bin")


def test_routing_check_passes_when_the_virtual_devices_are_the_defaults(tmp_path, monkeypatch):
    fake_wpctl(tmp_path, monkeypatch, "phone_agent_rx", "phone_agent_tx")
    check_routing()


def test_routing_check_refuses_a_setup_that_would_echo_the_callee_back(tmp_path, monkeypatch):
    # 실제 PipeWire 에서 본 잘못된 상태: 기본 입력이 출력 장치(의 모니터)로 잡힘
    fake_wpctl(tmp_path, monkeypatch, "phone_agent_rx", "phone_agent_rx")
    with pytest.raises(PhoneError, match="입력 phone_agent_rx"):
        check_routing()
