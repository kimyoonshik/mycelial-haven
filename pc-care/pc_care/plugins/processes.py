"""무거운 프로그램: show which programs use the most memory and CPU right now, and end them."""

import os
import time
from dataclasses import dataclass, field
from tkinter import messagebox, ttk

import psutil

from ..plugin_api import CheckTable, Plugin, ask, button_bar, human_size, intro, run_in_background, status_line

# Ending these would crash or log out Windows (or close this app).
PROTECTED = {"system", "registry", "smss.exe", "csrss.exe", "wininit.exe", "winlogon.exe", "services.exe",
             "lsass.exe", "lsaiso.exe", "svchost.exe", "dwm.exe", "explorer.exe", "fontdrvhost.exe",
             "memory compression", "secure system", "spoolsv.exe", "audiodg.exe", "pc-care.exe"}


@dataclass
class Program:
    name: str
    count: int = 0
    memory: int = 0
    cpu: float = 0.0  # percent of the whole CPU
    pids: list[int] = field(default_factory=list)


def is_protected(name: str) -> bool:
    return name.lower() in PROTECTED


def snapshot(sample_seconds: float = 0.5) -> list[Program]:
    """Programs grouped by name (e.g. all chrome.exe together), biggest memory first."""
    procs = []
    for proc in psutil.process_iter(["name"]):
        if proc.pid == 0:  # 'System Idle Process' is idle time, not a program
            continue
        try:
            proc.cpu_percent(None)
            procs.append(proc)
        except psutil.Error:
            pass
    time.sleep(sample_seconds)
    cores = psutil.cpu_count() or 1
    groups = {}
    for proc in procs:
        try:
            with proc.oneshot():
                name = proc.info["name"] or f"PID {proc.pid}"
                cpu = proc.cpu_percent(None) / cores
                memory = proc.memory_info().rss
        except psutil.Error:
            continue
        program = groups.setdefault(name.lower(), Program(name))
        program.count += 1
        program.memory += memory
        program.cpu += cpu
        program.pids.append(proc.pid)
    return sorted(groups.values(), key=lambda p: p.memory, reverse=True)


def end_program(program: Program) -> tuple[int, int]:
    """Ask every process of the program to end. Returns (ended, still running)."""
    procs = []
    for pid in program.pids:
        if pid == os.getpid():
            continue
        try:
            proc = psutil.Process(pid)
            if proc.name().lower() == program.name.lower():  # the PID may have been reused since the snapshot
                proc.terminate()
                procs.append(proc)
        except psutil.Error:
            pass
    gone, alive = psutil.wait_procs(procs, timeout=3)
    return len(gone), len(alive)


class ProcessesPlugin(Plugin):
    id = "processes"
    title = "무거운 프로그램"
    order = 60

    def build(self, parent):
        intro(parent, "지금 메모리와 CPU를 많이 쓰는 프로그램입니다. 같은 프로그램의 창·탭은 한 줄로 묶어 보여 줍니다. "
                      "종료하면 저장하지 않은 작업은 사라지니 먼저 저장해 주세요. Windows 핵심 프로그램은 종료할 수 없게 막아 두었습니다.")
        bar = button_bar(parent)
        table = CheckTable(parent, ["프로그램", "개수", "메모리", "CPU"], checkable=False,
                           widths={"프로그램": 320, "개수": 70, "메모리": 120, "CPU": 90})
        table.pack(fill="both", expand=True)
        status = status_line(parent)

        def show(programs):
            table.set_rows((p, (p.name, p.count, human_size(p.memory), f"{p.cpu:.1f}%"), False) for p in programs[:60])
            memory = psutil.virtual_memory()
            status.set(f"메모리 사용률 {memory.percent:.0f}% (전체 {human_size(memory.total)}) · 실행 중인 프로그램 {len(programs)}개")

        def refresh():
            run_in_background(parent, lambda: snapshot(1.0), show, status, "측정하는 중...", buttons)

        def end():
            chosen = table.selected_keys()
            if not chosen:
                messagebox.showinfo("무거운 프로그램", "종료할 프로그램을 목록에서 선택해 주세요.")
                return
            blocked = [p.name for p in chosen if is_protected(p.name)]
            if blocked:
                messagebox.showwarning("종료할 수 없음", "Windows 핵심 프로그램이라 종료할 수 없습니다:\n" + "\n".join(blocked))
                return
            names = ", ".join(p.name for p in chosen)
            if not ask(f"{names}을(를) 종료할까요?\n저장하지 않은 작업은 사라집니다."):
                return

            def done(results):
                still = sum(alive for _, alive in results)
                if still:
                    messagebox.showwarning("무거운 프로그램", f"{still}개 프로세스는 종료되지 않았습니다. (권한 부족일 수 있습니다)")
                refresh()

            run_in_background(parent, lambda: [end_program(p) for p in chosen], done, status, "종료하는 중...", buttons)

        buttons = [ttk.Button(bar, text="새로고침", command=refresh),
                   ttk.Button(bar, text="선택한 프로그램 종료", command=end)]
        for button in buttons:
            button.pack(side="left", padx=(0, 6))


PLUGIN = ProcessesPlugin
