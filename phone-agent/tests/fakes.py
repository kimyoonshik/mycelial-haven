"""가짜 BlueZ + PipeWire Telephony. 실제 D-Bus 메시지로 phone.py·pairing.py 를 시험합니다.

메서드 이름·인자 형식은 PipeWire 1.4.2 의 telephony.c 와 BlueZ 문서를 따랐습니다.
"""
import threading
import time

from jeepney import DBusAddress, HeaderFields, MessageType, new_error, new_method_call, new_method_return
from jeepney.bus_messages import message_bus
from jeepney.io.blocking import open_dbus_connection

from phone_agent.pairing import AGENT_IFACE, AGENT_PATH
from phone_agent.phone import BLUEZ, CALL_IFACE, GATEWAY_IFACE, OBJECT_MANAGER, TELEPHONY, TELEPHONY_PATH

ADDRESS = "AA:BB:CC:DD:EE:FF"
ADAPTER = "/org/bluez/hci0"
DEVICE = ADAPTER + "/dev_AA_BB_CC_DD_EE_FF"
GATEWAY = TELEPHONY_PATH + "/ag0"
CALL = GATEWAY + "/call0"
PROPERTIES = "org.freedesktop.DBus.Properties"


class Fail(Exception):
    """D-Bus 오류 응답으로 바뀝니다."""


class World(threading.Thread):
    def __init__(self, paired=True, states=("dialing", "alerting", "active"), gateway_appears=True):
        super().__init__(daemon=True)
        self.adapter = {"Powered": False, "Pairable": False, "Discoverable": False}
        self.device = {"Address": ADDRESS, "Name": "Test iPhone", "Paired": paired, "Trusted": False}
        self.has_device = True
        self.connected = False
        self.connect_error = None
        self.gateway_appears = gateway_appears
        self.script = list(states)   # 상태를 물을 때마다 하나씩 진행. 마지막 상태에서 멈춤
        self.call_states = None      # 통화가 없으면 None
        self.dialed = []
        self.log = []                # 순서 확인용
        self.confirm_passkey = None  # 숫자면, 에이전트가 등록됐을 때 그 번호로 페어링 확인을 요청
        self.agent_replied = threading.Event()
        self._halt = threading.Event()  # Thread 가 _stop 이라는 이름을 내부에서 씁니다
        self._conn = open_dbus_connection(bus="SESSION")
        for name in (BLUEZ, TELEPHONY):
            self._conn.send_and_get_reply(message_bus.RequestName(name))

    def run(self):
        while not self._halt.is_set():
            try:
                msg = self._conn.receive(timeout=0.05)
            except TimeoutError:
                continue
            if msg.header.message_type != MessageType.method_call:
                continue
            fields = msg.header.fields
            try:
                signature, body = self._respond(
                    fields[HeaderFields.path], fields.get(HeaderFields.interface), fields[HeaderFields.member],
                    msg.body, fields[HeaderFields.sender],
                )
                self._conn.send(new_method_return(msg, signature, body))
            except Fail as e:
                self._conn.send(new_error(msg, str(e)))

    def close(self):
        self._halt.set()
        self.join()
        self._conn.close()

    def _respond(self, path, iface, member, body, sender):
        self.log.append(member)
        if iface == OBJECT_MANAGER and path == "/":
            objects = {ADAPTER: {"org.bluez.Adapter1": _variants(self.adapter)}}
            if self.has_device:
                objects[DEVICE] = {"org.bluez.Device1": _variants(self.device)}
            return "a{oa{sa{sv}}}", (objects,)
        if iface == OBJECT_MANAGER and path == TELEPHONY_PATH:
            objects = {}
            if self.connected and self.gateway_appears:
                objects[GATEWAY] = {GATEWAY_IFACE: {"Address": ("s", ADDRESS)}}
            return "a{oa{sa{sv}}}", (objects,)
        if iface == PROPERTIES and member == "Set":
            target = self.adapter if path == ADAPTER else self.device
            target[body[1]] = body[2][1]
            return None, ()
        if iface == PROPERTIES and member == "Get" and body == (CALL_IFACE, "State"):
            if path != CALL or self.call_states is None:
                raise Fail("org.freedesktop.DBus.Error.UnknownObject")
            state = self.call_states.pop(0) if len(self.call_states) > 1 else self.call_states[0]
            if state == "gone":
                self.call_states = None
                raise Fail("org.freedesktop.DBus.Error.UnknownObject")
            return "v", (("s", state),)
        if member == "Connect":
            if self.connect_error:
                raise Fail(self.connect_error)
            self.connected = True
            return None, ()
        if member == "Disconnect":
            self.connected = False
            return None, ()
        if member == "Dial":
            self.dialed.append(body[0])
            self.call_states = list(self.script)
            return "o", (CALL,)
        if member == "HangupAll":
            if self.call_states is None:
                raise Fail("org.pipewire.Telephony.Error.InvalidState")
            self.call_states = None
            return None, ()
        if member == "RemoveDevice":
            self.has_device = False
            return None, ()
        if member == "RegisterAgent":
            if self.confirm_passkey is not None:
                threading.Thread(target=self._pair_from_phone, args=(sender,), daemon=True).start()
            return None, ()
        if member in ("RequestDefaultAgent", "UnregisterAgent"):
            return None, ()
        raise Fail("org.freedesktop.DBus.Error.UnknownMethod")

    def _pair_from_phone(self, agent_bus_name):
        """아이폰에서 이 기기를 눌렀을 때 BlueZ 가 하는 일: 에이전트에게 확인을 받고 페어링됨으로 표시."""
        time.sleep(0.3)
        conn = open_dbus_connection(bus="SESSION")
        agent = DBusAddress(AGENT_PATH, bus_name=agent_bus_name, interface=AGENT_IFACE)
        self.has_device = True
        reply = conn.send_and_get_reply(
            new_method_call(agent, "RequestConfirmation", "ou", (DEVICE, self.confirm_passkey)), timeout=10
        )
        if reply.header.message_type == MessageType.method_return:
            self.device["Paired"] = True
            self.agent_replied.set()
        conn.close()


def _variants(props):
    kind = lambda value: "b" if isinstance(value, bool) else "u" if isinstance(value, int) else "s"
    return {name: (kind(value), value) for name, value in props.items()}
