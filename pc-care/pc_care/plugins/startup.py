"""시작프로그램: list the programs Windows starts at sign-in and switch them off or on.

Uses the same switch as Task Manager's '시작 앱' tab (the StartupApproved registry keys),
so nothing is deleted and Task Manager shows the same state.
"""

import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from tkinter import messagebox, ttk

from ..plugin_api import CheckTable, Plugin, button_bar, intro, status_line

IS_WINDOWS = sys.platform == "win32"
if IS_WINDOWS:
    import winreg

RUN = r"Software\Microsoft\Windows\CurrentVersion\Run"
RUN32 = r"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run"
APPROVED = r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved"
STARTUP_FOLDER = r"Microsoft\Windows\Start Menu\Programs\Startup"


@dataclass
class Item:
    name: str       # registry value name, or the file name in a Startup folder
    command: str
    where: str      # shown to the user
    hive: int       # the hive whose StartupApproved key holds this item's switch
    approved: str   # "Run", "Run32" or "StartupFolder"
    enabled: bool = True


def is_enabled(data) -> bool:
    """StartupApproved data: no value or an even first byte (02, 06) means on; odd (03) means off."""
    return not data or data[0] % 2 == 0


def switch_value(enabled: bool, now: float | None = None) -> bytes:
    if enabled:
        return bytes([2]) + bytes(11)
    filetime = int(((time.time() if now is None else now) + 11644473600) * 10_000_000)
    return bytes([3, 0, 0, 0]) + filetime.to_bytes(8, "little")


def _values(hive, path) -> dict:
    try:
        key = winreg.OpenKey(hive, path, 0, winreg.KEY_READ | winreg.KEY_WOW64_64KEY)
    except OSError:
        return {}
    values = {}
    with key:
        i = 0
        while True:
            try:
                name, data, _ = winreg.EnumValue(key, i)
            except OSError:
                break
            values[name] = data
            i += 1
    return values


def list_items() -> list[Item]:
    hkcu, hklm = winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE
    items = []
    for hive, path, approved, where in ((hkcu, RUN, "Run", "현재 사용자"),
                                        (hklm, RUN, "Run", "모든 사용자"),
                                        (hklm, RUN32, "Run32", "모든 사용자 (32비트)")):
        items += [Item(name, str(command), where, hive, approved)
                  for name, command in _values(hive, path).items() if name]
    for hive, env, where in ((hkcu, "APPDATA", "시작 폴더"), (hklm, "PROGRAMDATA", "시작 폴더 (모든 사용자)")):
        if not os.environ.get(env):
            continue
        folder = Path(os.environ[env]) / STARTUP_FOLDER
        if folder.is_dir():
            items += [Item(f.name, str(f), where, hive, "StartupFolder")
                      for f in sorted(folder.iterdir()) if f.is_file() and f.name.lower() != "desktop.ini"]
    switches = {}
    for item in items:
        key = (item.hive, item.approved)
        if key not in switches:
            switches[key] = _values(item.hive, APPROVED + "\\" + item.approved)
        item.enabled = is_enabled(switches[key].get(item.name))
    return items


def set_enabled(item: Item, enabled: bool) -> None:
    access = winreg.KEY_SET_VALUE | winreg.KEY_WOW64_64KEY
    with winreg.CreateKeyEx(item.hive, APPROVED + "\\" + item.approved, 0, access) as key:
        winreg.SetValueEx(key, item.name, 0, winreg.REG_BINARY, switch_value(enabled))
    item.enabled = enabled


class StartupPlugin(Plugin):
    id = "startup"
    title = "시작프로그램"
    order = 50

    def build(self, parent):
        intro(parent, "PC를 켤 때 자동으로 실행되는 프로그램입니다. 많을수록 부팅이 느려지고 메모리를 차지합니다. "
                      "끄더라도 프로그램은 지워지지 않고 자동 실행만 멈추며, 다음 로그인부터 적용됩니다. 작업 관리자의 '시작 앱'과 같은 설정입니다.")
        if not IS_WINDOWS:
            ttk.Label(parent, text="Windows에서만 쓸 수 있는 기능입니다.").pack(anchor="w", pady=20)
            return
        bar = button_bar(parent)
        table = CheckTable(parent, ["상태", "이름", "위치", "명령"], checkable=False,
                           widths={"상태": 60, "이름": 200, "위치": 170, "명령": 480})
        table.pack(fill="both", expand=True)
        status = status_line(parent)

        def refresh():
            items = sorted(list_items(), key=lambda i: (not i.enabled, i.name.lower()))
            table.set_rows((i, ("켜짐" if i.enabled else "꺼짐", i.name, i.where, i.command), False) for i in items)
            status.set(f"켜진 항목 {sum(i.enabled for i in items)}개 / 전체 {len(items)}개")

        def change(enabled):
            chosen = table.selected_keys()
            if not chosen:
                messagebox.showinfo("시작프로그램", "목록에서 항목을 선택해 주세요. (Ctrl을 누른 채 여러 개 선택 가능)")
                return
            denied = []
            for item in chosen:
                try:
                    set_enabled(item, enabled)
                except PermissionError:
                    denied.append(item.name)
            refresh()
            if denied:
                messagebox.showwarning("관리자 권한 필요",
                                       "'모든 사용자' 항목은 관리자 권한이 있어야 바꿀 수 있습니다:\n" + "\n".join(denied) +
                                       "\n\nPC-Care.exe를 마우스 오른쪽 버튼으로 눌러 '관리자 권한으로 실행'한 뒤 다시 해 주세요.")

        for text, command in (("선택 항목 끄기", lambda: change(False)), ("선택 항목 켜기", lambda: change(True)),
                              ("새로고침", refresh)):
            ttk.Button(bar, text=text, command=command).pack(side="left", padx=(0, 6))
        refresh()


PLUGIN = StartupPlugin
