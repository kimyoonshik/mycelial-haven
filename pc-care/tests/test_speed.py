import os
import sys
import time

import psutil
import pytest

from pc_care.plugins import diagnose, junk, processes, startup
from pc_care.plugins.processes import Program


def test_junk_scan_only_counts_old_files_and_clean_deletes_them(tmp_path):
    old, new = tmp_path / "old.tmp", tmp_path / "sub" / "new.tmp"
    new.parent.mkdir()
    old.write_bytes(b"x" * 100)
    new.write_bytes(b"y" * 50)
    past = time.time() - 3 * 86400
    os.utime(old, (past, past))
    (found,) = junk.scan(where=[junk.Target("test", [tmp_path, tmp_path / "missing"])])
    assert found.files == [old] and found.size == 100
    assert junk.clean(found.files) == (100, 0)
    assert not old.exists() and new.exists()


def test_junk_targets_exist_as_a_list():
    assert junk.targets()[0].name == "사용자 임시 파일"


def test_startup_switch_bytes():
    assert startup.is_enabled(None) and startup.is_enabled(b"")
    assert startup.is_enabled(startup.switch_value(True))
    assert not startup.is_enabled(startup.switch_value(False))
    assert startup.is_enabled(bytes([6]) + bytes(11))
    value = startup.switch_value(False, now=0)
    assert len(value) == 12 and value[:4] == bytes([3, 0, 0, 0])
    assert int.from_bytes(value[4:], "little") == 11644473600 * 10_000_000


@pytest.mark.skipif(sys.platform != "win32", reason="Windows registry")
def test_startup_switch_round_trip_in_registry():
    import winreg
    name = "PCCareTestItem"
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, startup.RUN) as key:
        winreg.SetValueEx(key, name, 0, winreg.REG_SZ, "cmd /c exit")
    try:
        find = lambda: next(i for i in startup.list_items() if i.name == name)
        item = find()
        assert item.enabled and item.where == "현재 사용자"
        startup.set_enabled(item, False)
        assert not find().enabled
        startup.set_enabled(item, True)
        assert find().enabled
    finally:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, startup.RUN, 0, winreg.KEY_SET_VALUE) as key:
            winreg.DeleteValue(key, name)
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, startup.APPROVED + r"\Run", 0, winreg.KEY_SET_VALUE) as key:
            winreg.DeleteValue(key, name)


def test_process_snapshot_includes_this_process():
    me = psutil.Process().name().lower()
    programs = processes.snapshot(0.1)
    assert any(p.name.lower() == me and os.getpid() in p.pids for p in programs)
    assert programs == sorted(programs, key=lambda p: p.memory, reverse=True)


def test_protected_programs_and_own_process_are_never_ended():
    assert processes.is_protected("Explorer.EXE") and processes.is_protected("PC-Care.exe")
    assert not processes.is_protected("chrome.exe")
    me = psutil.Process()
    assert processes.end_program(Program(me.name(), pids=[me.pid])) == (0, 0)


def base_metrics(**changes):
    m = {"cpu": 10, "memory_percent": 40, "memory_total": 16 * diagnose.GB, "uptime_days": 1,
         "disks": [{"name": "C:\\", "free": 200 * diagnose.GB, "total": 500 * diagnose.GB}],
         "top_memory": Program("chrome.exe", memory=3 * diagnose.GB), "top_cpu": Program("chrome.exe", cpu=60),
         "startup_count": 5, "junk_size": 0}
    m.update(changes)
    return m


def test_findings_healthy_pc():
    assert [f.level for f in diagnose.findings(base_metrics())] == ["양호"]


def test_findings_name_each_cause_worst_first():
    m = base_metrics(cpu=55, memory_percent=90, uptime_days=12, startup_count=30, junk_size=2 * diagnose.GB,
                     memory_total=4 * diagnose.GB,
                     disks=[{"name": "C:\\", "free": 20 * diagnose.GB, "total": 500 * diagnose.GB}])
    found = diagnose.findings(m)
    assert [(f.level, f.title) for f in found] == [
        ("높음", "C:\\ 여유 공간 부족"), ("높음", "메모리 사용률 높음"), ("높음", "시작프로그램이 많음"),
        ("보통", "CPU 사용률 높음"), ("보통", "임시파일이 많이 쌓임"), ("보통", "오랫동안 다시 시작하지 않음"),
        ("참고", "메모리 용량이 작음")]
    assert "chrome.exe" in found[1].detail


def test_collect_runs_on_this_machine():
    m = diagnose.collect()
    assert m["memory_total"] > 0 and m["disks"]
    assert diagnose.findings(m)
