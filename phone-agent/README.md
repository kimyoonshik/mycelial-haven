# 전화 비서 (phone-agent)

아이폰 옆에 두는 작은 리눅스 기기(Raspberry Pi)가 **블루투스 핸즈프리**로 아이폰에 붙어, 본인 010 번호로 전화를 걸고 AI가 대신 통화합니다.
마이코젠 홈페이지(`mycogen/`)와는 관계없는 별도 프로그램입니다.

```
아이폰 Safari ──(같은 와이파이·핫스팟)──▶ 기기의 웹 화면 :8080   용건 입력 → 확인·승인
                                              │
        아이폰 ◀──블루투스 HFP: 발신·통화 음성──▶ 기기 (PipeWire) ◀──인터넷──▶ ElevenLabs Agents (두뇌: Claude)
           │
           └── 이동통신망 ──▶ 상대방 (발신번호 = 본인 010 번호)
```

- 차량 핸즈프리와 같은 방식이라 전화는 아이폰이 직접 겁니다. 그래서 상대방에게 본인 번호가 표시됩니다.
- 통화할 때만 블루투스를 연결하고 끝나면 끊습니다. 평소 통화에는 영향을 주지 않습니다.
- AI는 첫마디에 "○○○ 님을 대신해 전화드린 AI 비서"라고 밝힙니다. 전화는 화면에서 승인해야만 걸립니다.
- 긴급전화(112·119 등), 060, 국제전화는 걸지 않습니다. 통화는 최대 10분입니다.

## 검증 상태

**실제 기기에서는 아직 한 번도 돌려 보지 못했습니다.** 개발 환경에는 블루투스와 아이폰이 없기 때문입니다.

| 구분 | 내용 |
|---|---|
| 확인함 | 통화 진행·웹 화면·페어링 절차·음성 입출력의 자동 테스트 52개 |
| 확인함 | 실제 PipeWire 1.4.7 + WirePlumber 0.5.10 에서 가상 장치 설정이 읽히고, 양방향 음성이 섞이지 않고 흐름 |
| 확인함 | PipeWire 통화 서비스(Telephony)가 이 설정으로 뜨고, 프로그램이 거기에 붙음 |
| 기기에서 확인 필요 | 아이폰 블루투스 목록에 기기가 보이고 페어링되는지 |
| 기기에서 확인 필요 | 아이폰으로 발신이 되고 통화 음성이 양쪽으로 오가는지 (`phone-agent probe`) |
| 기기에서 확인 필요 | ElevenLabs 에이전트 생성과 한국어 대화 품질 (API 키가 없어 호출해 보지 못함) |
| 기기에서 확인 필요 | 아이폰 핫스팟에 물린 상태에서 Safari 로 웹 화면이 열리는지 |

설치 순서가 곧 확인 순서입니다. 막히는 단계의 화면 글자를 그대로 알려 주시면 됩니다.

## 준비물

| 품목 | 권장 | 비고 |
|---|---|---|
| 본체 | Raspberry Pi 4 Model B (1GB 또는 2GB) | 5GHz 와이파이를 쓸 수 있어 블루투스(2.4GHz)와 간섭이 없습니다 |
| 저장장치 | microSD 32GB (A1 등급) | PC에 SD 슬롯이 없으면 리더기도 |
| 전원 | USB-C 5V 3A 어댑터(실내) + USB-C 5V 3A 출력 보조배터리(휴대) | |
| 케이스 | 방열판이 달린 케이스 | 가방에 넣어 다니므로 필요합니다 |
| (선택) | USB 블루투스 동글 | 내장 블루투스로 음성이 끊길 때만 |

Raspberry Pi Zero 2 W 는 더 작고 싸지만 와이파이가 2.4GHz 전용이라, 와이파이와 블루투스를 함께 쓸 때 소리가 끊긴다는 보고가 있습니다.
같은 프로그램이 그대로 돌아가므로, Pi 4 로 먼저 성공시킨 뒤 소형화할 때 검토하는 것을 권합니다.

## 설치

### 1. SD 카드 만들기 (PC)

[Raspberry Pi Imager](https://www.raspberrypi.com/software/)에서 다음과 같이 고릅니다.

- 운영체제: **Raspberry Pi OS Lite (64-bit)** (Debian 13 "Trixie" 기반)
- 설정: 호스트 이름 `phoneagent`, 사용자 이름·비밀번호, 사무실 와이파이, **SSH 사용**

SD 카드를 꽂고 전원을 넣은 뒤 1~2분 기다립니다.

### 2. 접속해서 설치 (PC의 PowerShell)

```
ssh 사용자이름@phoneagent.local
curl -fsSL https://raw.githubusercontent.com/kimyoonshik/mycelial-haven/claude/youthful-hamilton-8pwl6s/phone-agent/install.sh | bash
```

### 3. 설정 → 페어링 → 점검 → 시험 발신

```
phone-agent setup      # 통화에서 밝힐 이름, 웹 화면 비밀번호, ElevenLabs API 키
phone-agent pair       # 아이폰: 설정 > Bluetooth 에서 'Phone Agent' 선택
phone-agent status     # 모든 줄이 [확인]이어야 합니다
phone-agent probe 0212345678    # 내 다른 전화나 사무실 전화 번호
```

- ElevenLabs API 키는 [elevenlabs.io](https://elevenlabs.io) 가입 후 발급합니다. `setup` 이 "Phone Agent"라는 에이전트를 만들어 주며,
  그 뒤 ElevenLabs 화면에서 **한국어 목소리**를 골라 주세요. 요금제와 무료 한도는 가입 화면에서 확인하세요.
- `probe` 는 AI 없이 발신과 음성만 시험합니다. 받은 전화에서 "삐-" 소리가 2초 들리고, 이어서 한 말이 기기에 녹음되면(최대 크기가 0이 아니면) 성공입니다.

### 4. AI 통화

같은 와이파이에 있는 아이폰 Safari 에서 `http://phoneagent.local:8080` 을 엽니다.
전화번호, 용건 한 줄, 자세한 요청을 적고 → 확인 화면에서 AI의 첫마디를 본 뒤 → **승인하고 전화 걸기**를 누릅니다.
통화 중에는 대화 내용이 2초마다 갱신되고, **통화 중단**으로 언제든 끊을 수 있습니다.

명령줄로도 걸 수 있습니다.

```
phone-agent call 0212345678 --topic "내일 저녁 예약 문의" --details "내일(금) 저녁 7시, 4명. 7시가 안 되면 8시도 괜찮음."
```

## 밖에서 쓰기

기기를 아이폰 핫스팟에 한 번 등록해 둡니다(아이폰에서 설정 > 개인용 핫스팟 화면을 연 상태로).

```
sudo nmcli device wifi connect "핫스팟 이름" password "핫스팟 비밀번호"
```

- 핫스팟 이름에 한글이나 따옴표가 있으면 연결이 안 될 수 있습니다. 아이폰 이름을 영문으로 바꾸는 편이 안전합니다(설정 > 일반 > 정보 > 이름).
- 밖에서는 보조배터리로 기기를 켜고, 아이폰의 개인용 핫스팟 화면을 한 번 열어 기기가 붙게 한 뒤 Safari 로 접속합니다.
- 통화 중에는 아이폰이 기기에서 10m 안에 있어야 합니다.

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| `status` 의 소리 장치가 [문제] | `systemctl --user restart pipewire wireplumber` 후 다시 확인. 계속되면 `wpctl status` 결과를 보내 주세요 |
| 아이폰 목록에 'Phone Agent'가 안 보임 | `pair` 가 기다리는 동안에만 보입니다. `bluetoothctl show` 의 Powered 가 yes 인지 확인 |
| 같은 아이폰을 다시 페어링 | 아이폰에서 '이 기기 지우기'를 한 뒤 `phone-agent pair` |
| `probe` 에서 발신은 되는데 소리가 없음 | 내장 블루투스의 통화 음성 경로 문제일 수 있습니다. `journalctl --user -u wireplumber -n 50` 결과를 보내 주세요 |
| 웹 화면이 안 열림 | `systemctl --user status phone-agent`, 그리고 `hostname -I` 로 나온 주소로 `http://주소:8080` 시도 |

코드를 새로 받으려면 설치 명령을 다시 실행합니다. 설정(`~/.config/phone-agent/config.json`)과 통화 기록(`~/.local/share/phone-agent/calls/`)은 그대로 남습니다.

## 구조

| 파일 | 역할 |
|---|---|
| `phone_agent/phone.py` | 블루투스 연결(BlueZ)과 발신·종료(PipeWire Telephony) |
| `phone_agent/pairing.py` | 아이폰 페어링 |
| `phone_agent/audio.py` | 통화 음성 입출력(`pw-cat`)과 경로 점검 |
| `phone_agent/voice.py` | ElevenLabs 에이전트 생성, 통화 중 대화, AI에게 주는 지침 |
| `phone_agent/call.py` | 통화 한 건의 진행과 기록 |
| `phone_agent/web.py` | 웹 화면 |
| `system/` | PipeWire·WirePlumber 설정과 자동 실행 등록 파일 |

테스트는 `pip install -e ".[test]"` 후 `pytest` 로 돌립니다(`dbus-daemon` 필요).
