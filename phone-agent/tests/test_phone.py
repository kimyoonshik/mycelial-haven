import pytest

from phone_agent.phone import Phone, PhoneError

from .fakes import ADDRESS, World


@pytest.fixture
def world(bus):
    world = World()
    world.start()
    yield world
    world.close()


@pytest.fixture
def phone(world):
    phone = Phone(ADDRESS.lower())  # 주소의 대소문자는 가리지 않습니다
    yield phone
    phone.close()


def test_connect_dial_and_follow_the_call_until_it_ends(world, phone):
    world.script = ["dialing", "alerting", "active", "gone"]
    phone.connect(timeout=5)
    assert world.connected

    path = phone.dial("0212345678")
    assert world.dialed == ["0212345678"]
    assert [phone.call_state(path) for _ in range(4)] == ["dialing", "alerting", "active", "disconnected"]


def test_hangup_ends_the_call_and_disconnect_drops_the_link(world, phone):
    phone.connect(timeout=5)
    path = phone.dial("01012345678")
    phone.hangup()
    assert phone.call_state(path) == "disconnected"

    phone.hangup()  # 이미 끊긴 통화를 또 끊어도 오류가 아닙니다
    phone.disconnect()
    assert not world.connected


def test_connect_explains_when_the_phone_is_not_paired(world, phone):
    world.has_device = False
    with pytest.raises(PhoneError, match="pair"):
        phone.connect(timeout=1)


def test_connect_explains_when_bluetooth_refuses(world, phone):
    world.connect_error = "org.bluez.Error.Failed"
    with pytest.raises(PhoneError, match="org.bluez.Error.Failed"):
        phone.connect(timeout=1)


def test_connect_fails_when_the_hands_free_link_never_comes_up(world, phone):
    world.gateway_appears = False
    with pytest.raises(PhoneError, match="핸즈프리"):
        phone.connect(timeout=1)


def test_connect_explains_when_the_telephony_service_is_missing(bus):
    # BlueZ 만 있고 PipeWire Telephony 가 없는 상황: 이름을 가진 서비스가 없으면 D-Bus 가 오류를 돌려줍니다.
    from jeepney.bus_messages import message_bus
    from jeepney.io.blocking import open_dbus_connection

    world = World()
    world._conn.send_and_get_reply(message_bus.ReleaseName("org.pipewire.Telephony"))
    world.start()
    phone = Phone(ADDRESS)
    try:
        with pytest.raises(PhoneError, match="통화 서비스"):
            phone.connect(timeout=1)
    finally:
        phone.close()
        world.close()
