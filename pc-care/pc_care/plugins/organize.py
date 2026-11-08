"""폴더 정리: move the files directly inside a folder into sub-folders by type (문서, 이미지, ...).

Sub-folders and files of unknown type stay where they are. The last run can be undone.
"""

import json
from dataclasses import dataclass
from pathlib import Path
from tkinter import messagebox, ttk

from ..plugin_api import (CheckTable, Plugin, app_data_dir, ask, button_bar, chosen_folder, default_folder,
                          folder_picker, human_size, intro, run_in_background, status_line)

CATEGORIES = {
    "문서": {".pdf", ".doc", ".docx", ".hwp", ".hwpx", ".xls", ".xlsx", ".csv", ".ppt", ".pptx",
             ".txt", ".rtf", ".odt", ".ods", ".odp", ".md"},
    "이미지": {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".heic", ".tif", ".tiff", ".svg", ".psd", ".ai"},
    "동영상": {".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", ".m4v"},
    "음악": {".mp3", ".wav", ".flac", ".aac", ".m4a", ".ogg", ".wma"},
    "압축파일": {".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".alz", ".egg"},
    "설치파일": {".exe", ".msi", ".dmg", ".pkg", ".apk"},
}
EXT_TO_CATEGORY = {ext: cat for cat, exts in CATEGORIES.items() for ext in exts}
HIDDEN_OR_SYSTEM = 0x2 | 0x4  # Windows file attributes


@dataclass(frozen=True)
class Move:
    src: Path
    dst: Path
    size: int


def category_of(path: Path) -> str | None:
    if path.name.startswith((".", "~$")):  # hidden files and Office lock files stay put
        return None
    return EXT_TO_CATEGORY.get(path.suffix.lower())


def free_name(path: Path, taken: set) -> Path:
    candidate, n = path, 1
    while candidate.exists() or candidate in taken:
        candidate = path.with_name(f"{path.stem} ({n}){path.suffix}")
        n += 1
    return candidate


def plan(folder: Path) -> list[Move]:
    moves, taken = [], set()
    for path in sorted(folder.iterdir(), key=lambda p: p.name.lower()):
        if not path.is_file() or path.is_symlink():
            continue
        category = category_of(path)
        st = path.stat()
        if category is None or getattr(st, "st_file_attributes", 0) & HIDDEN_OR_SYSTEM:
            continue
        dst = free_name(folder / category / path.name, taken)
        taken.add(dst)
        moves.append(Move(path, dst, st.st_size))
    return moves


def undo_file() -> Path:
    return app_data_dir() / "organize-undo.json"


def apply(moves) -> tuple[list[Move], list[str]]:
    done, failed = [], []
    for move in moves:
        try:
            move.dst.parent.mkdir(exist_ok=True)
            if move.dst.exists():
                raise FileExistsError("옮길 위치에 같은 이름의 파일이 있습니다")
            move.src.rename(move.dst)
            done.append(move)
        except OSError as e:
            failed.append(f"{move.src.name}: {e}")
    if done:
        pairs = [[str(m.src), str(m.dst)] for m in done]
        undo_file().write_text(json.dumps(pairs, ensure_ascii=False, indent=1), encoding="utf-8")
    return done, failed


def undo() -> tuple[int, list[str]]:
    path = undo_file()
    if not path.exists():
        return 0, []
    pairs = [(Path(src), Path(dst)) for src, dst in json.loads(path.read_text(encoding="utf-8"))]
    restored, problems = 0, []
    for src, dst in reversed(pairs):
        if not dst.exists():
            problems.append(f"{dst.name}: 옮겨 둔 위치에 파일이 없습니다")
        elif src.exists():
            problems.append(f"{src.name}: 원래 위치에 같은 이름의 파일이 있습니다")
        else:
            try:
                dst.rename(src)
                restored += 1
            except OSError as e:
                problems.append(f"{dst.name}: {e}")
    for folder in {dst.parent for _, dst in pairs}:
        try:
            folder.rmdir()  # only removes folders this run left empty
        except OSError:
            pass
    path.unlink()
    return restored, problems


class OrganizePlugin(Plugin):
    id = "organize"
    title = "폴더 정리"
    order = 10

    def build(self, parent):
        intro(parent, "폴더 바로 안에 있는 파일을 종류별 하위 폴더(문서·이미지·동영상·음악·압축파일·설치파일)로 옮깁니다. "
                      "종류를 모르는 파일과 하위 폴더는 그대로 둡니다. '미리보기'로 먼저 확인하고, 옮긴 뒤에도 마지막 정리는 되돌릴 수 있습니다.")
        folder = folder_picker(parent, default_folder("Downloads"))
        bar = button_bar(parent)
        table = CheckTable(parent, ["파일", "옮길 폴더", "크기"], widths={"파일": 520, "옮길 폴더": 120, "크기": 90})
        table.pack(fill="both", expand=True)
        status = status_line(parent)

        def show(moves):
            table.set_rows((m, (m.src.name, m.dst.parent.name, human_size(m.size)), True) for m in moves)
            status.set(f"옮길 파일 {len(moves)}개" if moves else "옮길 파일이 없습니다. 이미 정리된 폴더입니다.")

        def preview():
            path = chosen_folder(folder)
            if path:
                run_in_background(parent, lambda: plan(path), show, status, "파일을 살펴보는 중...", buttons)

        def run():
            moves = table.checked_keys()
            if not moves:
                messagebox.showinfo("폴더 정리", "옮길 파일을 먼저 '미리보기'로 불러오고 선택해 주세요.")
                return
            if not ask(f"선택한 파일 {len(moves)}개를 종류별 폴더로 옮길까요?"):
                return

            def done(result):
                moved, failed = result
                text = f"{len(moved)}개 파일을 옮겼습니다."
                if failed:
                    text += f"\n\n옮기지 못한 파일 {len(failed)}개:\n" + "\n".join(failed[:10])
                messagebox.showinfo("폴더 정리", text)
                preview()

            run_in_background(parent, lambda: apply(moves), done, status, "옮기는 중...", buttons)

        def revert():
            if not undo_file().exists():
                messagebox.showinfo("되돌리기", "되돌릴 정리 기록이 없습니다.")
                return
            if not ask("마지막으로 정리한 파일들을 원래 위치로 되돌릴까요?"):
                return

            def done(result):
                restored, problems = result
                text = f"{restored}개 파일을 원래 위치로 되돌렸습니다."
                if problems:
                    text += f"\n\n되돌리지 못한 파일 {len(problems)}개:\n" + "\n".join(problems[:10])
                messagebox.showinfo("되돌리기", text)
                preview()

            run_in_background(parent, undo, done, status, "되돌리는 중...", buttons)

        buttons = [ttk.Button(bar, text="미리보기", command=preview),
                   ttk.Button(bar, text="정리 실행", command=run),
                   ttk.Button(bar, text="마지막 정리 되돌리기", command=revert)]
        for button in buttons:
            button.pack(side="left", padx=(0, 6))


PLUGIN = OrganizePlugin
