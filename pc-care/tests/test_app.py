import shutil
from pathlib import Path

from pc_care.app import load_plugins

TEMPLATE = Path(__file__).resolve().parent.parent / "plugin_template.py"


def test_built_in_tabs_in_order(tmp_path):
    plugins, errors = load_plugins(tmp_path / "no-addons")
    assert [p.title for p in plugins] == ["폴더 정리", "중복 파일", "PC 진단", "임시파일 정리", "시작프로그램", "무거운 프로그램"]
    assert errors == []


def test_add_ons_are_added_replace_built_ins_and_bad_ones_are_reported(tmp_path):
    shutil.copy(TEMPLATE, tmp_path / "hello.py")
    (tmp_path / "better_junk.py").write_text(
        "from pc_care.plugin_api import Plugin\n"
        "class P(Plugin):\n    id = 'junk'\n    title = '새 임시파일 정리'\n    order = 40\n"
        "    def build(self, parent): pass\n"
        "PLUGIN = P\n", encoding="utf-8")
    (tmp_path / "broken.py").write_text("PLUGIN = 1/0\n", encoding="utf-8")
    plugins, errors = load_plugins(tmp_path)
    titles = [p.title for p in plugins]
    assert titles[-1] == "견본"
    assert "새 임시파일 정리" in titles and "임시파일 정리" not in titles
    assert len(titles) == 7
    assert len(errors) == 1 and errors[0].startswith("broken.py: ZeroDivisionError")
