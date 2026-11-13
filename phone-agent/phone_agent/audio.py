"""통화 음성을 16 kHz·16비트·모노 PCM으로 주고받습니다.

PipeWire 는 휴대폰(HFP 게이트웨이)의 통화 음성을 "앱 스트림"으로 내놓습니다. 받는 소리는 기본 출력 장치로
흘러가고, 보내는 소리는 기본 입력 장치에서 가져갑니다. 그래서 가상 장치를 기본 장치로 만들어 둡니다(system/pipewire.conf).
  phone_agent_rx    (기본 출력): 상대방 목소리가 들어옴 → 여기서 녹음해 AI로 보냄
  phone_agent_tx_in (출력)     : AI 목소리를 여기에 재생 → phone_agent_tx(기본 입력)를 거쳐 상대방에게 나감
"""
import fcntl
import os
import struct
import subprocess
import termios
import threading
import time
from typing import Callable

from .phone import PhoneError

RATE = 16000
FRAME = 640  # 20ms


def _pw_cat(*args):
    return ["pw-cat", *args, "--raw", "--rate", str(RATE), "--channels", "1", "--format", "s16", "-"]


RECORD_CMD = _pw_cat("--record", "--target", "phone_agent_rx", "-P", "{ stream.capture.sink = true }")
PLAY_CMD = _pw_cat("--playback", "--target", "phone_agent_tx_in")


def default_node(which: str) -> str:
    """기본 장치의 이름. which 는 "@DEFAULT_AUDIO_SINK@"(출력) 또는 "@DEFAULT_AUDIO_SOURCE@"(입력)."""
    out = subprocess.run(["wpctl", "inspect", which], capture_output=True, text=True).stdout
    return next((line.split('"')[1] for line in out.splitlines() if "node.name" in line), "없음")


def check_routing():
    """통화 음성이 가상 장치로 흐르게 되어 있는지 확인합니다.

    어긋난 채로 걸면 소리가 가지 않거나, 상대방 목소리가 상대방에게 되돌아갑니다.
    """
    sink, source = default_node("@DEFAULT_AUDIO_SINK@"), default_node("@DEFAULT_AUDIO_SOURCE@")
    if (sink, source) != ("phone_agent_rx", "phone_agent_tx"):
        raise PhoneError(f"오디오 기본 장치가 맞지 않습니다(출력 {sink}, 입력 {source}). `phone-agent status`로 확인하세요.")


def _unread(fd) -> int:
    """파이프에 쌓여 아직 읽히지 않은 바이트 수."""
    return struct.unpack("i", fcntl.ioctl(fd, termios.FIONREAD, b"\0\0\0\0"))[0]


class CallAudio:
    def __init__(self, record_cmd=RECORD_CMD, play_cmd=PLAY_CMD):
        self._record_cmd = record_cmd
        self._play_cmd = play_cmd
        self._pending = bytearray()
        self._lock = threading.Lock()
        self._stopped = threading.Event()
        self._procs = []
        self._threads = []

    def start(self, on_audio: Callable[[bytes], None], chunk: int = 8000):
        """on_audio 는 상대방 음성이 chunk 바이트(기본 250ms)씩 모일 때마다 불립니다."""
        recorder = subprocess.Popen(self._record_cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        player = subprocess.Popen(self._play_cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
        self._procs = [recorder, player]
        self._threads = [
            threading.Thread(target=self._read_loop, args=(recorder.stdout, on_audio, chunk), daemon=True),
            threading.Thread(target=self._write_loop, args=(player.stdin.fileno(),), daemon=True),
        ]
        for thread in self._threads:
            thread.start()

    def play(self, pcm: bytes):
        with self._lock:
            self._pending += pcm

    def flush(self):
        """아직 내보내지 않은 음성을 버립니다(상대방이 말을 끊었을 때)."""
        with self._lock:
            self._pending.clear()

    def stop(self):
        if self._stopped.is_set():
            return
        self._stopped.set()
        for proc in self._procs:
            proc.terminate()
        for proc in self._procs:
            proc.wait()
        # 파이프는 스레드가 끝난 뒤에 닫습니다. stop 은 on_audio 안(읽기 스레드)에서 불릴 수도 있습니다.
        for thread in self._threads:
            if thread is not threading.current_thread():
                thread.join(timeout=2)
        self._procs[0].stdout.close()
        self._procs[1].stdin.close()

    def _read_loop(self, stdout, on_audio, chunk):
        while not self._stopped.is_set():
            data = stdout.read(chunk)
            if not data:
                return
            on_audio(data)

    def _write_loop(self, fd):
        # 재생 프로그램이 읽어 가는 만큼만 채웁니다. 파이프에 음성을 쌓아 두면 그만큼 늦게 들리고
        # flush 로도 못 지우기 때문입니다. 보낼 말이 없을 때는 무음을 보내 스트림을 유지합니다.
        while not self._stopped.is_set():
            try:
                if _unread(fd) >= 2 * FRAME:
                    time.sleep(0.005)
                    continue
                with self._lock:
                    frame = bytes(self._pending[:FRAME])
                    del self._pending[:FRAME]
                os.write(fd, frame.ljust(FRAME, b"\0"))
            except OSError:
                return  # 재생 프로그램이 종료됨
