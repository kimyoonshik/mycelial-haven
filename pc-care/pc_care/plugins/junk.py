"""임시파일 정리: delete old files from temp and browser-cache folders to free disk space."""

import os
import stat
import sys
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path
from tkinter import messagebox, ttk

from ..plugin_api import (CheckTable, Plugin, ask, button_bar, human_size, intro, run_in_background, status_line,
                          walk_files)

MIN_AGE_HOURS = 24  # newer files may still be in use (installers, open documents)


@dataclass
class Target:
    name: str
    roots: list[Path]


@dataclass
class Found:
    name: str
    files: list[Path] = field(default_factory=list)
    size: int = 0


def targets() -> list[Target]:
    found = [Target("사용자 임시 파일", [Path(tempfile.gettempdir())])]
    if sys.platform != "win32":
        return found
    found.append(Target("Windows 임시 파일", [Path(os.environ.get("WINDIR", r"C:\Windows")) / "Temp"]))
    local = os.environ.get("LOCALAPPDATA")
    if local:
        for name, rel in (("Chrome 캐시", r"Google\Chrome\User Data"), ("Edge 캐시", r"Microsoft\Edge\User Data")):
            base = Path(local) / rel
            caches = [p for pattern in ("*/Cache", "*/Code Cache", "*/GPUCache") for p in base.glob(pattern)]
            found.append(Target(name, caches))
    return found


def scan(min_age_hours: float = MIN_AGE_HOURS, where: list[Target] | None = None) -> list[Found]:
    cutoff = time.time() - min_age_hours * 3600
    results = []
    for target in targets() if where is None else where:
        found = Found(target.name)
        for root in target.roots:
            if root.is_dir():
                for path, st in walk_files(root):
                    if st.st_mtime < cutoff:
                        found.files.append(path)
                        found.size += st.st_size
        results.append(found)
    return results


def clean(files) -> tuple[int, int]:
    """Delete files permanently; files in use are skipped. Returns (bytes freed, files skipped)."""
    freed, skipped = 0, 0
    for path in files:
        try:
            size = path.lstat().st_size
            try:
                path.unlink()
            except PermissionError:
                os.chmod(path, stat.S_IWRITE)  # read-only files
                path.unlink()
            freed += size
        except OSError:
            skipped += 1
    return freed, skipped


class JunkPlugin(Plugin):
    id = "junk"
    title = "임시파일 정리"
    order = 40

    def build(self, parent):
        intro(parent, "임시 폴더와 브라우저 캐시에서 하루 넘게 지난 파일을 찾아 지웁니다. 이 파일들은 지워도 프로그램이 필요할 때 다시 만듭니다. "
                      "휴지통을 거치지 않고 바로 지워지며, 사용 중인 파일은 건너뜁니다. 브라우저를 닫고 실행하면 더 많이 지워집니다.")
        bar = button_bar(parent)
        table = CheckTable(parent, ["항목", "파일 수", "크기"], widths={"항목": 300, "파일 수": 100, "크기": 120})
        table.pack(fill="both", expand=True)
        status = status_line(parent)

        def show(results):
            table.set_rows((r, (r.name, f"{len(r.files):,}", human_size(r.size)), r.size > 0) for r in results)
            status.set(f"지울 수 있는 용량: {human_size(sum(r.size for r in results))}")

        def check():
            run_in_background(parent, scan, show, status, "임시파일을 찾는 중...", buttons)

        def delete():
            chosen = [r for r in table.checked_keys() if r.files]
            if not chosen:
                messagebox.showinfo("임시파일 정리", "먼저 '검사'를 누르고 지울 항목을 선택해 주세요.")
                return
            total = sum(r.size for r in chosen)
            if not ask(f"선택한 항목의 파일 {sum(len(r.files) for r in chosen):,}개({human_size(total)})를 지울까요?\n"
                       "휴지통을 거치지 않고 바로 지워집니다."):
                return

            def done(result):
                freed, skipped = result
                text = f"{human_size(freed)}를 확보했습니다."
                if skipped:
                    text += f"\n사용 중이거나 권한이 없는 파일 {skipped:,}개는 건너뛰었습니다."
                messagebox.showinfo("임시파일 정리", text)
                check()

            files = [p for r in chosen for p in r.files]
            run_in_background(parent, lambda: clean(files), done, status, "지우는 중...", buttons)

        buttons = [ttk.Button(bar, text="검사", command=check),
                   ttk.Button(bar, text="선택 항목 지우기", command=delete)]
        for button in buttons:
            button.pack(side="left", padx=(0, 6))


PLUGIN = JunkPlugin
