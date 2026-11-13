"""아이폰과 블루투스 페어링. 이 기기를 검색 가능 상태로 두고, 아이폰 쪽에서 눌러 연결합니다."""
import time

from jeepney import DBusAddress, HeaderFields, MatchRule, Properties, new_error, new_method_call, new_method_return
from jeepney.io.blocking import open_dbus_connection
from jeepney.wrappers import DBusErrorResponse

from .phone import BLUEZ, DEVICE_IFACE, PhoneError, call, managed_objects

ADAPTER_IFACE = "org.bluez.Adapter1"
AGENT_IFACE = "org.bluez.Agent1"
AGENT_PATH = "/phone_agent/pairing"
DEVICE_NAME = "Phone Agent"


def _answer(conn, msg, say):
    """BlueZ 가 페어링 도중 묻는 것에 답합니다. 화면·키보드가 없으므로 번호를 보여 주고 수락합니다."""
    member = msg.header.fields[HeaderFields.member]
    if member == "RequestConfirmation":
        say(f"아이폰에 표시된 번호가 {msg.body[1]:06d} 인지 확인하고 '쌍으로 연결'을 누르세요.")
    if member in ("RequestPinCode", "RequestPasskey"):
        conn.send(new_error(msg, "org.bluez.Error.Rejected"))
    else:  # RequestConfirmation, RequestAuthorization, AuthorizeService, Display*, Cancel, Release
        conn.send(new_method_return(msg))


def _paired(objects):
    return {path for path, ifaces in objects.items() if ifaces.get(DEVICE_IFACE, {}).get("Paired", ("b", False))[1]}


def pair(previous_address="", timeout=180, say=print):
    """새로 페어링된 휴대폰의 (주소, 이름)을 돌려줍니다."""
    conn = open_dbus_connection(bus="SYSTEM")
    try:
        objects = managed_objects(conn, BLUEZ, "/")
        adapter_path = next((p for p, ifaces in objects.items() if ADAPTER_IFACE in ifaces), None)
        if not adapter_path:
            raise PhoneError("블루투스 어댑터를 찾지 못했습니다.")
        adapter = DBusAddress(adapter_path, bus_name=BLUEZ, interface=ADAPTER_IFACE)

        # 같은 휴대폰을 다시 페어링하려면 이쪽의 옛 기록부터 지워야 합니다.
        for path, ifaces in objects.items():
            device = ifaces.get(DEVICE_IFACE)
            if device and previous_address and device["Address"][1].upper() == previous_address.upper():
                call(conn, new_method_call(adapter, "RemoveDevice", "o", (path,)))
        already = _paired(managed_objects(conn, BLUEZ, "/"))

        for name, signature, value in (
            ("Powered", "b", True), ("Alias", "s", DEVICE_NAME), ("Pairable", "b", True),
            ("DiscoverableTimeout", "u", 0), ("Discoverable", "b", True),
        ):
            call(conn, Properties(adapter).set(name, signature, value))

        manager = DBusAddress("/org/bluez", bus_name=BLUEZ, interface="org.bluez.AgentManager1")
        call(conn, new_method_call(manager, "RegisterAgent", "os", (AGENT_PATH, "DisplayYesNo")))
        call(conn, new_method_call(manager, "RequestDefaultAgent", "o", (AGENT_PATH,)))
        say(f"아이폰에서 설정 > Bluetooth 를 열고 '{DEVICE_NAME}'를 누르세요. ({timeout}초 동안 기다립니다)")
        try:
            with conn.filter(MatchRule(type="method_call", interface=AGENT_IFACE), bufsize=20) as requests:
                def pump(seconds):
                    try:
                        conn.recv_messages(timeout=seconds)
                    except TimeoutError:
                        pass
                    while requests:
                        _answer(conn, requests.popleft(), say)

                deadline = time.monotonic() + timeout
                while time.monotonic() < deadline:
                    pump(1.0)
                    objects = managed_objects(conn, BLUEZ, "/")
                    new = _paired(objects) - already
                    if not new:
                        continue
                    path = new.pop()
                    device = DBusAddress(path, bus_name=BLUEZ, interface=DEVICE_IFACE)
                    call(conn, Properties(device).set("Trusted", "b", True))
                    # 페어링 직후 아이폰이 바로 통화 연결을 시도하므로 잠시 더 응답한 뒤 끊어 둡니다.
                    for _ in range(5):
                        pump(1.0)
                    try:
                        call(conn, new_method_call(device, "Disconnect"))
                    except DBusErrorResponse:
                        pass
                    props = objects[path][DEVICE_IFACE]
                    return props["Address"][1], props.get("Name", ("s", "휴대폰"))[1]
                raise PhoneError("시간 안에 페어링되지 않았습니다. 아이폰 블루투스 목록에 이 기기가 보이는지 확인하세요.")
        finally:
            call(conn, Properties(adapter).set("Discoverable", "b", False))
            call(conn, new_method_call(manager, "UnregisterAgent", "o", (AGENT_PATH,)))
    finally:
        conn.close()
