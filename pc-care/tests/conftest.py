import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture(autouse=True)
def isolated_app_data(tmp_path, monkeypatch):
    """Keep the undo log and other app data out of the real profile."""
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path / "appdata"))
