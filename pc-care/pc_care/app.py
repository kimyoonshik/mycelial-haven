"""The main window: one tab per plugin (built-in ones plus add-ons from the 'plugins' folder next to the app)."""

import importlib.util
import logging
import sys
import tkinter as tk
import traceback
from pathlib import Path
from tkinter import font as tkfont
from tkinter import messagebox, ttk

from . import APP_NAME, VERSION
from .plugin_api import Plugin, app_data_dir, open_location
from .plugins import BUILTIN

log = logging.getLogger(__name__)


def addon_dir() -> Path:
    """'plugins' next to PC-Care.exe (or next to run.py when started from source)."""
    base = Path(sys.executable).parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parent.parent
    return base / "plugins"


def load_plugins(folder: Path | None = None) -> tuple[list[Plugin], list[str]]:
    """Built-in plugins plus add-ons; an add-on with a built-in's id replaces it. Returns (plugins, errors)."""
    found = {}
    for module in BUILTIN:
        plugin = module.PLUGIN()
        found[plugin.id] = plugin
    errors = []
    folder = addon_dir() if folder is None else folder
    for path in sorted(folder.glob("*.py")) if folder.is_dir() else []:
        try:
            spec = importlib.util.spec_from_file_location(f"pc_care_addon_{path.stem}", path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            plugin = module.PLUGIN()
            if not isinstance(plugin, Plugin) or not plugin.id:
                raise TypeError("PLUGIN 은 id 가 있는 Plugin 클래스여야 합니다")
            found[plugin.id] = plugin
        except Exception as e:
            log.exception("add-on %s failed to load", path.name)
            errors.append(f"{path.name}: {type(e).__name__}: {e}")
    return sorted(found.values(), key=lambda p: (p.order, p.title)), errors


def _setup_logging() -> None:
    logging.basicConfig(filename=app_data_dir() / "pc-care.log", level=logging.INFO, encoding="utf-8",
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def _setup_look(root: tk.Tk) -> None:
    if sys.platform == "win32":
        for name in ("TkDefaultFont", "TkTextFont", "TkHeadingFont", "TkMenuFont"):
            tkfont.nametofont(name).configure(family="Malgun Gothic", size=10)
    ttk.Style(root).configure("Treeview", rowheight=26)


def main(argv=None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    report = argv[argv.index("--selftest") + 1] if "--selftest" in argv else None
    _setup_logging()
    if sys.platform == "win32":
        try:
            import ctypes
            ctypes.windll.shcore.SetProcessDpiAwareness(1)  # sharp text on high-DPI screens
        except Exception:
            pass

    root = tk.Tk()
    root.title(f"{APP_NAME} {VERSION}")
    root.geometry("1100x720")
    root.minsize(800, 500)
    _setup_look(root)

    def on_error(exc_type, exc, tb):
        log.error("".join(traceback.format_exception(exc_type, exc, tb)))
        messagebox.showerror("오류", f"예상하지 못한 문제가 생겼습니다.\n\n{exc}\n\n자세한 내용: {app_data_dir() / 'pc-care.log'}")
    root.report_callback_exception = on_error

    plugins, errors = load_plugins()
    tabs = ttk.Notebook(root)
    tabs.pack(fill="both", expand=True, padx=8, pady=(8, 0))
    for plugin in plugins:
        frame = ttk.Frame(tabs, padding=12)
        tabs.add(frame, text=f"  {plugin.title}  ")
        try:
            plugin.build(frame)
        except Exception as e:
            log.exception("plugin %s failed to build", plugin.id)
            errors.append(f"{plugin.title}: {type(e).__name__}: {e}")
            ttk.Label(frame, text=f"이 기능을 여는 중 문제가 생겼습니다.\n{e}").pack(anchor="w")

    footer = ttk.Frame(root, padding=(8, 4))
    footer.pack(fill="x")
    folder = addon_dir()
    ttk.Label(footer, text=f"추가 기능 폴더: {folder}", foreground="#666").pack(side="left")

    def open_addons():
        folder.mkdir(exist_ok=True)
        open_location(folder)

    ttk.Button(footer, text="추가 기능 폴더 열기", command=open_addons).pack(side="right")

    if report is not None:  # used by the automated build check: open every tab, write what happened, quit
        root.update()
        lines = [f"ok {p.id}" for p in plugins] + [f"error {e}" for e in errors]
        Path(report).write_text("\n".join(lines) + "\n", encoding="utf-8")
        root.destroy()
        return 1 if errors else 0
    if errors:
        root.after(500, lambda: messagebox.showwarning("추가 기능", "불러오지 못한 기능이 있습니다:\n\n" + "\n".join(errors)))
    root.mainloop()
    return 0
