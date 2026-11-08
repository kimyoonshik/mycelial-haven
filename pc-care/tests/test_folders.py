import os
import subprocess
import sys
import time

import pytest

from pc_care.plugins import duplicates, organize


def touch(path, data=b"x", age_days=0):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    if age_days:
        old = time.time() - age_days * 86400
        os.utime(path, (old, old))
    return path


def test_plan_sorts_known_types_and_leaves_the_rest(tmp_path):
    touch(tmp_path / "report.PDF")
    touch(tmp_path / "photo.jpg")
    touch(tmp_path / "setup.exe")
    touch(tmp_path / "notes.unknownext")
    touch(tmp_path / "~$draft.docx")   # Office lock file
    touch(tmp_path / ".hidden.png")
    (tmp_path / "sub").mkdir()
    moves = {m.src.name: m.dst.relative_to(tmp_path).as_posix() for m in organize.plan(tmp_path)}
    assert moves == {"report.PDF": "문서/report.PDF", "photo.jpg": "이미지/photo.jpg", "setup.exe": "설치파일/setup.exe"}


@pytest.mark.skipif(sys.platform != "win32", reason="Windows file attributes")
def test_plan_skips_windows_hidden_files(tmp_path):
    hidden = touch(tmp_path / "secret.jpg")
    subprocess.run(["attrib", "+h", str(hidden)], check=True)
    touch(tmp_path / "visible.jpg")
    assert [m.src.name for m in organize.plan(tmp_path)] == ["visible.jpg"]


def test_plan_never_overwrites(tmp_path):
    touch(tmp_path / "a.txt", b"new")
    touch(tmp_path / "문서" / "a.txt", b"old")
    (move,) = organize.plan(tmp_path)
    assert move.dst.name == "a (1).txt"


def test_apply_then_undo_restores_everything(tmp_path):
    folder = tmp_path / "Downloads"
    files = [touch(folder / n) for n in ("a.pdf", "b.mp3", "c.zip")]
    moved, failed = organize.apply(organize.plan(folder))
    assert len(moved) == 3 and not failed
    assert sorted(p.name for p in folder.iterdir()) == ["문서", "압축파일", "음악"]
    restored, problems = organize.undo()
    assert restored == 3 and not problems
    assert sorted(p.name for p in folder.iterdir()) == [f.name for f in files]  # empty category folders removed too
    assert organize.undo() == (0, [])


def test_duplicates_groups_identical_content_oldest_first(tmp_path):
    big = os.urandom(200_000)
    newer = touch(tmp_path / "copy" / "big.bin", big, age_days=1)
    older = touch(tmp_path / "big.bin", big, age_days=5)
    touch(tmp_path / "same-start.bin", big[:-1] + b"!")  # same size and first 64 KB, different end
    touch(tmp_path / "s1.txt", b"hello")
    touch(tmp_path / "s2.txt", b"hello")
    touch(tmp_path / "e1.txt", b"")  # empty files are ignored
    touch(tmp_path / "e2.txt", b"")
    touch(tmp_path / ".git" / "big.bin", big)  # skipped folder
    groups = duplicates.find_duplicates(tmp_path)
    assert [g.paths for g in groups] == [[older, newer], [tmp_path / "s1.txt", tmp_path / "s2.txt"]]


def test_duplicates_ignores_hard_links(tmp_path):
    original = touch(tmp_path / "a.bin", b"data")
    os.link(original, tmp_path / "b.bin")
    assert duplicates.find_duplicates(tmp_path) == []
