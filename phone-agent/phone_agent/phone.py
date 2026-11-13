"""페어링된 휴대폰으로 전화를 걸고 끊습니다.

D-Bus 서비스 두 개를 씁니다.
- BlueZ (시스템 버스): 블루투스 연결·해제.
- PipeWire Telephony (세션 버스, PipeWire 1.4 이상): 핸즈프리 프로파일(HFP)로 발신·종료.
  API 문서는 PipeWire 소스의 spa/plugins/bluez5/README-Telephony.md 입니다.

통화할 때만 연결하고 끝나면 끊습니다. 계속 붙어 있으면 아이폰이 평소 통화 음성까지 이 기기로 보냅니다.
"""
import time

from jeepney import DBusAddress, Properties, new_method_call
from jeepney.io.blocking import open_dbus_connection
from jeepney.wrappers import DBusErrorResponse, unwrap_msg

BLUEZ = "org.bluez"
DEVICE_IFACE = "org.bluez.Device1"
TELEPHONY = "org.pipewire.Telephony"
TELEPHONY_PATH = "/org/pipewire/Telephony"
GATEWAY_IFACE = "org.pipewire.Telephony.AudioGateway1"
CALL_IFACE = "org.pipewire.Telephony.Call1"
OBJECT_MANAGER = "org.freedesktop.DBus.ObjectManager"


class PhoneError(Exception):
    """사용자에게 그대로 보여 줄 수 있는 한국어 메시지를 담습니다."""


def call(conn, msg, timeout=10):
    return unwrap_msg(conn.send_and_get_reply(msg, timeout=timeout))


def managed_objects(conn, bus_name, path):
    """{객체 경로: {인터페이스: {속성: (타입, 값)}}}"""
    manager = DBusAddress(path, bus_name=bus_name, interface=OBJECT_MANAGER)
    return call(conn, new_method_call(manager, "GetManagedObjects"))[0]


class Phone:
    def __init__(self, address: str):
        self.address = address.upper()
        self._system = open_dbus_connection(bus="SYSTEM")
        self._session = open_dbus_connection(bus="SESSION")
        self._gateway = None

    def close(self):
        self._system.close()
        self._session.close()

    def _device(self):
        for path, ifaces in managed_objects(self._system, BLUEZ, "/").items():
            device = ifaces.get(DEVICE_IFACE)
            if device and device["Address"][1].upper() == self.address:
                return DBusAddress(path, bus_name=BLUEZ, interface=DEVICE_IFACE)
        raise PhoneError("페어링된 휴대폰을 찾지 못했습니다. `phone-agent pair`를 먼저 실행하세요.")

    def _find_gateway(self):
        try:
            objects = managed_objects(self._session, TELEPHONY, TELEPHONY_PATH)
        except DBusErrorResponse as e:
            raise PhoneError(f"PipeWire 통화 서비스에 연결하지 못했습니다 ({e.name}). `phone-agent status`로 확인하세요.")
        for path, ifaces in objects.items():
            gateway = ifaces.get(GATEWAY_IFACE)
            if gateway and gateway["Address"][1].upper() == self.address:
                return path
        return None

    def connect(self, timeout=30.0):
        """핸즈프리로 연결하고, 발신할 수 있는 상태가 될 때까지 기다립니다."""
        try:
            call(self._system, new_method_call(self._device(), "Connect"), timeout=timeout)
        except (DBusErrorResponse, TimeoutError) as e:
            reason = e.name if isinstance(e, DBusErrorResponse) else "시간 초과"
            raise PhoneError(f"휴대폰에 블루투스로 연결하지 못했습니다 ({reason}). 휴대폰이 가까이 있고 블루투스가 켜져 있는지 확인하세요.")
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            self._gateway = self._find_gateway()
            if self._gateway:
                return
            time.sleep(0.3)
        raise PhoneError("블루투스는 연결됐지만 핸즈프리(통화) 연결이 되지 않았습니다.")

    def dial(self, number: str) -> str:
        """발신하고 통화 객체 경로를 돌려줍니다."""
        gateway = DBusAddress(self._gateway, bus_name=TELEPHONY, interface=GATEWAY_IFACE)
        try:
            return call(self._session, new_method_call(gateway, "Dial", "s", (number,)), timeout=30)[0]
        except (DBusErrorResponse, TimeoutError) as e:
            reason = e.name if isinstance(e, DBusErrorResponse) else "시간 초과"
            raise PhoneError(f"발신하지 못했습니다 ({reason}).")

    def call_state(self, call_path: str) -> str:
        """dialing → alerting → active → disconnected. 통화가 끝나면 객체가 사라지므로 그때도 disconnected."""
        target = DBusAddress(call_path, bus_name=TELEPHONY, interface=CALL_IFACE)
        try:
            return call(self._session, Properties(target).get("State"), timeout=5)[0][1]
        except DBusErrorResponse:
            return "disconnected"

    def hangup(self):
        if not self._gateway:
            return
        gateway = DBusAddress(self._gateway, bus_name=TELEPHONY, interface=GATEWAY_IFACE)
        try:
            call(self._session, new_method_call(gateway, "HangupAll"))
        except (DBusErrorResponse, TimeoutError):
            pass  # 이미 끊긴 통화

    def disconnect(self):
        self._gateway = None
        try:
            call(self._system, new_method_call(self._device(), "Disconnect"))
        except (PhoneError, DBusErrorResponse, TimeoutError):
            pass
