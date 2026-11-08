"""What a plugin is, plus the helpers every plugin shares.

A plugin is a Python module with a ``PLUGIN`` class (a subclass of ``Plugin``).
The app creates one tab per plugin and calls ``build`` with the tab's frame.
"""

import logging
import os
import subprocess
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

log = logging.getLogger(__name__)


class Plugin:
    id = ""       # unique; an add-on with the same id replaces the built-in plugin
    title = ""    # tab label
    order = 100   # tabs are sorted by this number

    def build(self, parent: ttk.Frame) -> None:
        raise NotImplementedError


def human_size(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def app_data_dir() -> Path:
    base = os.environ.get("LOCALAPPDATA") or Path.home() / ".local" / "share"
    path = Path(base) / "PCCare"
    path.mkdir(parents=True, exist_ok=True)
    return path


def default_folder(name: str) -> Path:
    path = Path.home() / name
    return path if path.is_dir() else Path.home()


def is_link(path: Path) -> bool:
    """Symlinks and Windows junctions: never walked into, so nothing outside the chosen folder is touched."""
    return path.is_symlink() or (hasattr(os.path, "isjunction") and os.path.isjunction(path))


def walk_files(root: Path, skip_dir=lambda name: False):
    """Yield (path, stat) for every regular file under root, without following links."""
    for dirpath, dirs, names in os.walk(root):
        dirs[:] = [d for d in dirs if not skip_dir(d) and not is_link(Path(dirpath, d))]
        for name in names:
            path = Path(dirpath, name)
            try:
                st = path.lstat()
            except OSError:
                continue
            if not path.is_symlink():
                yield path, st


def send_to_trash(paths) -> tuple[int, list[str]]:
    from send2trash import send2trash

    done, failed = 0, []
    for path in paths:
        try:
            send2trash(str(path))
            done += 1
        except Exception as e:  # send2trash raises several error types
            failed.append(f"{path}: {e}")
    return done, failed


def open_location(path: Path) -> None:
    if sys.platform == "win32":
        if path.is_dir():
            os.startfile(path)
        else:
            subprocess.Popen(["explorer", "/select,", str(path)])
    else:
        subprocess.Popen(["xdg-open", str(path if path.is_dir() else path.parent)])


def ask(text: str, title: str = "확인") -> bool:
    return messagebox.askyesno(title, text)


def run_in_background(widget, work, on_done, status: tk.StringVar | None = None,
                      busy_text: str = "작업 중입니다...", buttons=()):
    """Run work() on a thread so the window stays responsive, then call on_done(result) on the UI thread."""
    for button in buttons:
        button.state(["disabled"])
    if status is not None:
        status.set(busy_text)
    box = {}

    def target():
        try:
            box["value"] = work()
        except Exception as e:
            log.exception("background task failed")
            box["error"] = e

    thread = threading.Thread(target=target, daemon=True)
    thread.start()

    def poll():
        if thread.is_alive():
            widget.after(150, poll)
            return
        for button in buttons:
            button.state(["!disabled"])
        if status is not None:
            status.set("")
        if "error" in box:
            messagebox.showerror("오류", f"작업 중 문제가 생겼습니다.\n\n{box['error']}")
        else:
            on_done(box["value"])

    widget.after(150, poll)


def folder_picker(parent, initial: Path) -> tk.StringVar:
    """A '폴더: [path] [찾아보기]' row; returns the variable holding the chosen path."""
    var = tk.StringVar(value=str(initial))
    row = ttk.Frame(parent)
    row.pack(fill="x", pady=(8, 0))
    ttk.Label(row, text="폴더:").pack(side="left")
    ttk.Entry(row, textvariable=var).pack(side="left", fill="x", expand=True, padx=6)

    def browse():
        chosen = filedialog.askdirectory(initialdir=var.get(), mustexist=True)
        if chosen:
            var.set(chosen)

    ttk.Button(row, text="찾아보기", command=browse).pack(side="left")
    return var


def chosen_folder(var: tk.StringVar) -> Path | None:
    path = Path(var.get().strip())
    if not path.is_dir():
        messagebox.showerror("폴더 확인", f"폴더를 찾을 수 없습니다:\n{path}")
        return None
    return path


BOX = {True: "☑", False: "☐"}


class CheckTable(ttk.Frame):
    """A table; with checkable=True the first column is a tick box (click it, or the heading to tick all)."""

    def __init__(self, parent, columns, widths=None, checkable=True, height=14):
        super().__init__(parent)
        self.checkable = checkable
        cols = (["sel"] if checkable else []) + list(columns)
        self.tree = ttk.Treeview(self, columns=cols, show="headings", height=height)
        if checkable:
            self.tree.heading("sel", text="선택", command=self._toggle_all)
            self.tree.column("sel", width=50, anchor="center", stretch=False)
        for col in columns:
            self.tree.heading(col, text=col)
            self.tree.column(col, width=(widths or {}).get(col, 140), anchor="w")
        bar = ttk.Scrollbar(self, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=bar.set)
        self.tree.pack(side="left", fill="both", expand=True)
        bar.pack(side="right", fill="y")
        self.keys = {}
        self.checked = set()
        if checkable:
            self.tree.bind("<Button-1>", self._click)
            self.tree.bind("<space>", lambda e: [self._toggle(i) for i in self.tree.selection()])

    def set_rows(self, rows) -> None:
        """rows: iterable of (key, values, checked)."""
        self.tree.delete(*self.tree.get_children())
        self.keys.clear()
        self.checked.clear()
        for key, values, checked in rows:
            prefix = [BOX[bool(checked)]] if self.checkable else []
            iid = self.tree.insert("", "end", values=prefix + list(values))
            self.keys[iid] = key
            if checked:
                self.checked.add(iid)

    def _toggle(self, iid, value=None) -> None:
        value = iid not in self.checked if value is None else value
        (self.checked.add if value else self.checked.discard)(iid)
        self.tree.set(iid, "sel", BOX[value])

    def _toggle_all(self) -> None:
        items = self.tree.get_children()
        value = len(self.checked) < len(items)
        for iid in items:
            self._toggle(iid, value)

    def _click(self, event) -> None:
        if self.tree.identify_region(event.x, event.y) == "cell" and self.tree.identify_column(event.x) == "#1":
            iid = self.tree.identify_row(event.y)
            if iid:
                self._toggle(iid)

    def checked_keys(self) -> list:
        return [self.keys[i] for i in self.tree.get_children() if i in self.checked]

    def selected_keys(self) -> list:
        return [self.keys[i] for i in self.tree.selection()]

    def on_double_click(self, callback) -> None:
        def handler(event):
            iid = self.tree.identify_row(event.y)
            if iid:
                callback(self.keys[iid])
        self.tree.bind("<Double-1>", handler)


def intro(parent, text: str) -> None:
    ttk.Label(parent, text=text, wraplength=920, justify="left").pack(anchor="w")


def button_bar(parent) -> ttk.Frame:
    bar = ttk.Frame(parent)
    bar.pack(fill="x", pady=8)
    return bar


def status_line(parent) -> tk.StringVar:
    var = tk.StringVar()
    ttk.Label(parent, textvariable=var, foreground="#555").pack(anchor="w", pady=(6, 0))
    return var
