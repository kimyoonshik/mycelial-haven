import pytest

from phone_agent.pairing import pair
from phone_agent.phone import PhoneError

from .fakes import ADDRESS, World


@pytest.fixture
def world(bus):
    world = World(paired=False)
    world.has_device = False  # 아직 본 적 없는 휴대폰
    world.start()
    yield world
    world.close()


def test_pair_shows_the_code_accepts_and_trusts_the_phone(world):
    world.confirm_passkey = 4821
    said = []

    address, name = pair(timeout=10, say=said.append)

    assert (address, name) == (ADDRESS, "Test iPhone")
    assert world.agent_replied.is_set()
    assert any("004821" in line for line in said)  # 아이폰 화면의 6자리 번호와 비교할 수 있게 보여 줌
    assert world.device["Trusted"] is True
    assert world.adapter["Powered"] and world.adapter["Pairable"]
    assert world.adapter["Discoverable"] is False  # 끝나면 검색 가능 상태를 끕니다
    assert world.log[-1] == "UnregisterAgent"
    assert not world.connected  # 페어링 뒤에는 연결을 끊어 둡니다


def test_pair_forgets_the_previous_phone_first(world):
    world.has_device, world.device["Paired"] = True, True
    world.confirm_passkey = 1

    pair(previous_address=ADDRESS, timeout=10, say=lambda line: None)

    assert world.log.index("RemoveDevice") < world.log.index("RegisterAgent")


def test_pair_times_out_when_nothing_pairs(world):
    with pytest.raises(PhoneError, match="페어링되지"):
        pair(timeout=2, say=lambda line: None)
    assert world.adapter["Discoverable"] is False
