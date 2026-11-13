"""설정 파일(~/.config/phone-agent/config.json)과 통화 기록 폴더."""
import json
import os
from dataclasses import asdict, dataclass, fields
from pathlib import Path

CONFIG_PATH = Path(os.environ.get("PHONE_AGENT_CONFIG", "~/.config/phone-agent/config.json")).expanduser()
DATA_DIR = Path(os.environ.get("PHONE_AGENT_DATA", "~/.local/share/phone-agent")).expanduser()


@dataclass
class Config:
    owner_name: str = ""          # AI가 "○○○ 님을 대신해"라고 말할 이름
    web_pin: str = ""             # 웹 화면 비밀번호
    elevenlabs_api_key: str = ""
    agent_id: str = ""            # setup 이 만든 ElevenLabs 에이전트
    phone_address: str = ""       # pair 가 기록한 아이폰의 블루투스 주소
    phone_name: str = ""


def load() -> Config:
    if not CONFIG_PATH.exists():
        return Config()
    data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    known = {f.name for f in fields(Config)}
    return Config(**{k: v for k, v in data.items() if k in known})


def save(cfg: Config) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    # API 키가 들어 있으므로 본인만 읽게 합니다.
    fd = os.open(CONFIG_PATH, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(asdict(cfg), f, ensure_ascii=False, indent=2)
