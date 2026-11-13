import subprocess

import pytest

from phone_agent import config


@pytest.fixture
def bus(monkeypatch):
    """테스트 전용 D-Bus. 시스템 버스(BlueZ)와 세션 버스(PipeWire) 역할을 한 버스가 겸합니다."""
    daemon = subprocess.Popen(
        ["dbus-daemon", "--session", "--nofork", "--print-address"], stdout=subprocess.PIPE, text=True
    )
    address = daemon.stdout.readline().strip()
    monkeypatch.setenv("DBUS_SESSION_BUS_ADDRESS", address)
    monkeypatch.setenv("DBUS_SYSTEM_BUS_ADDRESS", address)
    yield address
    daemon.terminate()
    daemon.wait()


@pytest.fixture(autouse=True)
def data_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA_DIR", tmp_path / "data")
    monkeypatch.setattr(config, "CONFIG_PATH", tmp_path / "config.json")
    return tmp_path
