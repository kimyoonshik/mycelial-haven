"""중복 파일: find files with identical content and send the extra copies to the recycle bin."""

import hashlib
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from tkinter import messagebox, ttk

from ..plugin_api import (CheckTable, Plugin, ask, button_bar, chosen_folder, default_folder, folder_picker,
                          human_size, intro, open_location, run_in_background, send_to_trash, status_line,
                          walk_files)

SKIP_DIRS = {"AppData", "$Recycle.Bin", "System Volume Information", "node_modules", "Windows",
             "Program Files", "Program Files (x86)", "ProgramData"}
QUICK = 64 * 1024


@dataclass
class Group:
    size: int
    paths: list[Path]  # oldest first


def _hash(path: Path, limit: int | None = None) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        if limit:
            digest.update(f.read(limit))
        else:
            for chunk in iter(lambda: f.read(1 << 20), b""):
                digest.update(chunk)
    return digest.hexdigest()


def _split(paths, key) -> list[list[Path]]:
    buckets = defaultdict(list)
    for path in paths:
        try:
            buckets[key(path)].append(path)
        except OSError:
            continue
    return [b for b in buckets.values() if len(b) > 1]


def find_duplicates(folder: Path, min_size: int = 1) -> list[Group]:
    by_size, seen = defaultdict(list), set()
    skip = lambda name: name in SKIP_DIRS or name.startswith(".")
    for path, st in walk_files(folder, skip):
        if st.st_ino and (st.st_dev, st.st_ino) in seen:  # hard links are one file, not duplicates
            continue
        seen.add((st.st_dev, st.st_ino))
        if st.st_size >= min_size:
            by_size[st.st_size].append((path, st.st_mtime))
    groups = []
    for size, entries in by_size.items():
        if len(entries) < 2:
            continue
        mtimes = dict(entries)
        for same_start in _split(mtimes, lambda p: _hash(p, QUICK)):
            same = [same_start] if size <= QUICK else _split(same_start, _hash)
            groups += [Group(size, sorted(g, key=mtimes.get)) for g in same]
    return sorted(groups, key=lambda g: g.size * (len(g.paths) - 1), reverse=True)


class DuplicatesPlugin(Plugin):
    id = "duplicates"
    title = "중복 파일"
    order = 20

    def build(self, parent):
        intro(parent, "내용이 완전히 같은 파일을 찾습니다. 묶음마다 가장 오래된 파일 1개는 남기고 나머지를 선택해 둡니다. "
                      "선택한 파일은 휴지통으로 보내므로 필요하면 휴지통에서 되살릴 수 있습니다. 줄을 두 번 누르면 파일 위치가 열립니다.")
        folder = folder_picker(parent, default_folder("Downloads"))
        bar = button_bar(parent)
        table = CheckTable(parent, ["묶음", "파일 (선택한 폴더 기준)", "크기", "수정한 날"],
                           widths={"묶음": 60, "파일 (선택한 폴더 기준)": 560, "크기": 90, "수정한 날": 130})
        table.pack(fill="both", expand=True)
        table.on_double_click(open_location)
        status = status_line(parent)
        state = {"groups": [], "base": None}

        def show(groups):
            state["groups"] = groups
            rows = []
            for n, group in enumerate(groups, 1):
                for i, path in enumerate(group.paths):
                    try:
                        when = datetime.fromtimestamp(path.stat().st_mtime).strftime("%Y-%m-%d %H:%M")
                    except OSError:
                        when = "-"
                    shown = path.relative_to(state["base"]) if path.is_relative_to(state["base"]) else path
                    rows.append((path, (n, str(shown), human_size(group.size), when), i > 0))
            table.set_rows(rows)
            saving = sum(g.size * (len(g.paths) - 1) for g in groups)
            status.set(f"중복 {len(groups)}묶음 · 정리하면 {human_size(saving)} 확보" if groups else "중복 파일이 없습니다.")

        def search():
            path = chosen_folder(folder)
            if path:
                state["base"] = path
                run_in_background(parent, lambda: find_duplicates(path), show, status,
                                  "파일을 비교하는 중... (파일이 많으면 몇 분 걸릴 수 있습니다)", buttons)

        def trash():
            chosen = set(table.checked_keys())
            if not chosen:
                messagebox.showinfo("중복 파일", "휴지통으로 보낼 파일을 선택해 주세요.")
                return
            whole = [n for n, g in enumerate(state["groups"], 1) if all(p in chosen for p in g.paths)]
            if whole:
                messagebox.showwarning("중복 파일", f"묶음 {', '.join(map(str, whole[:10]))}의 파일이 모두 선택되어 있습니다.\n"
                                                    "묶음마다 최소 1개는 남겨 주세요.")
                return
            if not ask(f"선택한 파일 {len(chosen)}개를 휴지통으로 보낼까요?"):
                return

            def done(result):
                count, failed = result
                text = f"{count}개 파일을 휴지통으로 보냈습니다."
                if failed:
                    text += f"\n\n보내지 못한 파일 {len(failed)}개:\n" + "\n".join(failed[:10])
                messagebox.showinfo("중복 파일", text)
                search()

            run_in_background(parent, lambda: send_to_trash(chosen), done, status, "휴지통으로 보내는 중...", buttons)

        buttons = [ttk.Button(bar, text="중복 파일 찾기", command=search),
                   ttk.Button(bar, text="선택한 파일 휴지통으로", command=trash)]
        for button in buttons:
            button.pack(side="left", padx=(0, 6))


PLUGIN = DuplicatesPlugin
