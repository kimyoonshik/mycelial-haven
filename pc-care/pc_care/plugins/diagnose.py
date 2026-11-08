"""PC 진단: measure the usual causes of a slow PC and say what to do about each."""

import time
import tkinter as tk
from dataclasses import dataclass
from tkinter import font as tkfont
from tkinter import ttk

import psutil

from ..plugin_api import Plugin, button_bar, human_size, intro, run_in_background, status_line
from . import junk, processes, startup

GB = 1024 ** 3
LEVELS = ["높음", "보통", "참고", "양호"]
COLORS = {"높음": "#c62828", "보통": "#e65100", "참고": "#1565c0", "양호": "#2e7d32"}


@dataclass
class Finding:
    level: str
    title: str
    detail: str
    action: str


def collect() -> dict:
    disks = []
    for part in psutil.disk_partitions(all=False):
        if "cdrom" in part.opts or not part.fstype:
            continue
        try:
            usage = psutil.disk_usage(part.mountpoint)
        except OSError:
            continue
        disks.append({"name": part.mountpoint, "free": usage.free, "total": usage.total})
    psutil.cpu_percent(None)
    programs = processes.snapshot(1.0)
    memory = psutil.virtual_memory()
    return {
        "cpu": psutil.cpu_percent(None),
        "memory_percent": memory.percent,
        "memory_total": memory.total,
        "disks": disks,
        "uptime_days": (time.time() - psutil.boot_time()) / 86400,
        "top_memory": programs[0] if programs else None,
        "top_cpu": max(programs, key=lambda p: p.cpu, default=None),
        "startup_count": sum(i.enabled for i in startup.list_items()) if startup.IS_WINDOWS else None,
        "junk_size": sum(found.size for found in junk.scan()),
    }


def findings(m: dict) -> list[Finding]:
    out = []
    for disk in m["disks"]:
        pct = disk["free"] / disk["total"] * 100 if disk["total"] else 100
        if pct < 20:
            out.append(Finding("높음" if pct < 10 else "보통", f"{disk['name']} 여유 공간 부족",
                               f"남은 공간 {human_size(disk['free'])} ({pct:.0f}%)",
                               "디스크가 가득 차면 PC 전체가 느려집니다. '임시파일 정리'와 '중복 파일' 탭에서 공간을 확보하세요."))
    if m["memory_percent"] >= 70:
        top = m["top_memory"]
        out.append(Finding("높음" if m["memory_percent"] >= 85 else "보통", "메모리 사용률 높음",
                           f"사용률 {m['memory_percent']:.0f}%" + (f", 가장 많이 쓰는 프로그램: {top.name} ({human_size(top.memory)})" if top else ""),
                           "'무거운 프로그램' 탭에서 쓰지 않는 프로그램을 종료하세요."))
    if m["cpu"] >= 50:
        top = m["top_cpu"]
        out.append(Finding("높음" if m["cpu"] >= 80 else "보통", "CPU 사용률 높음",
                           f"사용률 {m['cpu']:.0f}%" + (f", 가장 많이 쓰는 프로그램: {top.name} ({top.cpu:.0f}%)" if top else ""),
                           "'무거운 프로그램' 탭에서 확인하고, 모르는 프로그램이면 백신 검사를 해 보세요."))
    count = m["startup_count"]
    if count is not None and count >= 15:
        out.append(Finding("높음" if count >= 25 else "보통", "시작프로그램이 많음", f"PC를 켤 때 자동 실행되는 프로그램 {count}개",
                           "'시작프로그램' 탭에서 매일 쓰지 않는 항목을 끄세요."))
    if m["junk_size"] >= GB:
        out.append(Finding("높음" if m["junk_size"] >= 5 * GB else "보통", "임시파일이 많이 쌓임",
                           f"지워도 되는 임시파일 {human_size(m['junk_size'])}", "'임시파일 정리' 탭에서 지우세요."))
    if m["uptime_days"] >= 7:
        out.append(Finding("보통", "오랫동안 다시 시작하지 않음", f"{m['uptime_days']:.0f}일째 켜져 있음",
                           "PC를 다시 시작하면 메모리가 정리되고 미뤄진 업데이트가 끝납니다."))
    if m["memory_total"] < 8 * GB:
        out.append(Finding("참고", "메모리 용량이 작음", f"설치된 메모리 {human_size(m['memory_total'])}",
                           "여러 프로그램을 함께 쓰면 느려질 수 있습니다. 메모리 증설(8GB 이상)을 고려하세요."))
    if not out:
        out.append(Finding("양호", "특별한 문제 없음", "점검한 항목이 모두 정상 범위입니다.", "-"))
    return sorted(out, key=lambda f: LEVELS.index(f.level))


class DiagnosePlugin(Plugin):
    id = "diagnose"
    title = "PC 진단"
    order = 30

    def build(self, parent):
        intro(parent, "PC가 느려지는 흔한 원인(디스크 공간, 메모리, CPU, 시작프로그램, 임시파일, 재시작 여부)을 점검하고 "
                      "원인별로 어느 탭에서 무엇을 하면 되는지 알려 드립니다. 점검만 하고 아무것도 바꾸지 않습니다.")
        bar = button_bar(parent)
        status = status_line(parent)
        summary = status_line(parent)
        results = ttk.Frame(parent)
        results.pack(fill="both", expand=True, pady=(6, 0))
        bold = tkfont.nametofont("TkDefaultFont").copy()
        bold.configure(weight="bold")

        def show(m):
            disks = ", ".join(f"{d['name']} {human_size(d['free'])} 남음" for d in m["disks"][:4])
            summary.set(f"CPU {m['cpu']:.0f}% · 메모리 {m['memory_percent']:.0f}% (전체 {human_size(m['memory_total'])}) · "
                        f"디스크 {disks} · 켜진 지 {m['uptime_days']:.1f}일")
            for widget in results.winfo_children():
                widget.destroy()
            for f in findings(m):
                row = ttk.Frame(results, padding=(0, 6))
                row.pack(fill="x")
                tk.Label(row, text=f.level, bg=COLORS[f.level], fg="white", width=5).pack(side="left", anchor="n", padx=(0, 10))
                ttk.Label(row, text=f"{f.title} — {f.detail}", font=bold).pack(anchor="w")
                ttk.Label(row, text=f"→ {f.action}", wraplength=900, justify="left").pack(anchor="w")
                ttk.Separator(results).pack(fill="x")

        button = ttk.Button(bar, text="진단 시작")
        button.configure(command=lambda: run_in_background(parent, collect, show, status,
                                                           "점검하는 중... (10초 정도 걸립니다)", [button]))
        button.pack(side="left")


PLUGIN = DiagnosePlugin
