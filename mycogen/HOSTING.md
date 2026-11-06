# 호스팅 안내 — www.mycogen.co.kr

## 한눈에 보기

| 항목 | 내용 |
|---|---|
| 서버 | 사내 Ubuntu 서버 **192.168.0.38** (Ubuntu 22.04 또는 24.04) |
| 인터넷 연결 | **Cloudflare Tunnel**. 서버가 Cloudflare 쪽으로 먼저 연결하므로 공유기 포트포워딩이나 공인 IP가 필요 없습니다. |
| 주소 | `www.mycogen.co.kr`은 홈페이지입니다. `mycogen.co.kr`은 www로 자동 이동합니다. `info.mycogen.co.kr`은 관리 페이지(문의 목록, 소식·블로그 글쓰기)입니다. |
| 도메인 | 후이즈에 등록해 두고, **네임서버만 Cloudflare**로 바꿉니다. Cloudflare는 .co.kr을 팔지 않지만(구매 화면에 "TLD is not supported"가 뜸) DNS 연결은 됩니다. |
| DB | PostgreSQL. 같은 서버에 있고 외부에서는 접속할 수 없습니다. |
| 공식 소스 | GitHub `kimyoonshik/mycelial-haven`의 `main` 브랜치, `mycogen/` 폴더입니다. 저장소 맨 위의 React·Vite 파일은 이전 시안이라 쓰지 않습니다. |

```
방문자 ──HTTPS──▶ Cloudflare (인증서·캐시·스팸 방지)
                     │  Tunnel (서버 → Cloudflare 방향 연결)
                     ▼
   사내 서버 192.168.0.38
     cloudflared ─┬─ www.mycogen.co.kr  → nginx 127.0.0.1:8080 ─┬─ 홈페이지 (/srv/mycogen/www)
                  │                                              └─ /api/contact → Node 4780 (문의 접수)
                  └─ info.mycogen.co.kr → Node 127.0.0.1:4781 (관리 페이지)
     Node 서버 ── PostgreSQL (문의, 소식·블로그 글)
```

## 1. Cloudflare에 도메인 연결 (한 번)

1. Cloudflare 대시보드에서 **이미 가진 도메인을 연결**하는 화면으로 들어갑니다.
   - 바로가기: https://dash.cloudflare.com/?to=/:account/add-site
   - 또는 계정 홈 → `+ Add` → `Connect a domain`
   - `Register domains`(도메인 구매) 화면이 아닙니다.
2. `mycogen.co.kr`을 입력하고 **Quick scan**을 고른 뒤 **Free** 요금제를 고릅니다.
3. 가져온 DNS 기록(`118.67.131.217`을 가리키는 A 기록 2개)은 모두 **Delete**합니다.
   - 사내 IP 192.168.0.38은 넣지 않습니다.
   - www·info 기록은 3단계에서 Tunnel이 자동으로 만듭니다.
4. **Continue to activation**을 누르고, 화면에 나오는 **Cloudflare 네임서버 2개**를 복사합니다.
5. **후이즈 → 도메인 관리 → mycogen.co.kr → 네임서버 변경**에서 기존 `ns1~4.whoisdomain.kr`을 지우고 위 2개를 넣습니다.
   - DNSSEC가 켜져 있으면 끕니다.
6. Cloudflare에서 **Check nameservers**를 누릅니다. "Active"가 되면 다음으로 넘어갑니다(보통 1시간 안).
7. 권장 설정: **SSL/TLS → Edge Certificates → Always Use HTTPS**를 켭니다.

## 2. 서버 설치 (한 번, 약 10분)

사내 서버에 sudo 권한 계정으로 접속해서 실행합니다.

```bash
curl -fsSLO https://raw.githubusercontent.com/kimyoonshik/mycelial-haven/main/mycogen/server/deploy/install.sh
```

```bash
sudo bash install.sh
```

`install.sh`가 하는 일은 다음과 같습니다. 여러 번 실행해도 안전합니다.

1. git, nginx, PostgreSQL, Node.js 22 LTS를 설치합니다.
2. 서버 전용 계정 `mycogen`과 폴더를 만듭니다.
3. GitHub에서 `mycogen` 폴더만 `/srv/mycogen/app`에 받아 옵니다.
4. PostgreSQL에 `mycogen` DB와 계정을 만듭니다. 비밀번호는 자동으로 만듭니다.
5. 설정 파일 `/etc/mycogen/server.env`를 만듭니다. DB 주소, 관리자 비밀번호, 세션 키가 자동으로 들어갑니다.
6. nginx를 `127.0.0.1:8080`(이 서버 안에서만 접속 가능)에 설정합니다.
7. 다음 세 가지를 자동 실행으로 등록합니다.
   - 서버 자동 실행(재부팅해도 켜짐)
   - **5분마다 GitHub main 확인 후 자동 반영**
   - **매일 새벽 3시 백업**

마지막에 **관리 페이지 비밀번호가 한 번 표시됩니다.** 안전한 곳에 적어 두세요. 다시 보려면:

```bash
sudo grep ^ADMIN_PASSWORD /etc/mycogen/server.env
```

설치가 끝나면 서버 안에서 아래 명령으로 홈페이지가 응답하는지 확인합니다. `200`이 나오면 정상입니다.

```bash
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: www.mycogen.co.kr' http://127.0.0.1:8080/
```

## 3. Cloudflare Tunnel 연결 (한 번)

1. Cloudflare 대시보드 → **Zero Trust → Networks → Tunnels → Create a tunnel**을 누릅니다.
2. 종류는 **Cloudflared**를 고르고, 이름은 `mycogen-server`로 저장합니다.
3. 설치 안내 화면에서 **Debian / 64-bit**를 고릅니다. 화면에 나오는 명령(설치와 `sudo cloudflared service install …`)을 **사내 서버에서 그대로 실행**합니다.
   - 서버가 연결되면 화면 아래에 "Connected"가 뜹니다.
4. **Public hostnames**에 아래 3개를 추가합니다. DNS 기록은 Cloudflare가 자동으로 만듭니다.
   - URL은 `localhost`가 아니라 **`127.0.0.1`**로 적어야 합니다(서버 프로그램이 IPv4 주소로만 받기 때문).

| Subdomain | Domain | Type | URL |
|---|---|---|---|
| `www` | mycogen.co.kr | HTTP | `127.0.0.1:8080` |
| (비움) | mycogen.co.kr | HTTP | `127.0.0.1:8080` |
| `info` | mycogen.co.kr | HTTP | `127.0.0.1:4781` |

5. 바깥에서 확인합니다. 휴대폰 데이터 연결 등 사내망이 아닌 곳에서 다음 세 주소를 열어 봅니다.
   - `https://www.mycogen.co.kr`: 홈페이지가 보여야 합니다.
   - `https://mycogen.co.kr`: www로 넘어가야 합니다.
   - `https://info.mycogen.co.kr`: 관리 로그인 화면이 보여야 합니다.

### 관리 페이지 이중 잠금 (권장)
**Zero Trust → Access → Applications → Add an application → Self-hosted**를 엽니다.
1. 도메인에 `info.mycogen.co.kr`을 넣습니다.
2. 정책은 Allow로 하고, 허용할 사람의 이메일을 넣습니다(예: 대표님·담당자 이메일).

이렇게 하면 비밀번호 화면에 오기 전에 Cloudflare가 이메일 인증번호로 한 번 더 확인합니다. 무료 요금제로 50명까지 됩니다.

## 4. 기능별 설정 (`/etc/mycogen/server.env`)

```bash
sudo nano /etc/mycogen/server.env
```

```bash
sudo systemctl restart mycogen
```

| 기능 | 넣을 값 | 비워 두면 |
|---|---|---|
| 문의 알림 메일 | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_TO` (네이버웍스·Gmail 등은 "앱 비밀번호") | 문의는 DB에만 쌓이고 관리 페이지에서 봅니다. |
| 스팸 방지 | Cloudflare → **Turnstile** → 위젯 추가(`www.mycogen.co.kr`)에서 받은 `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` | 접수 횟수 제한(IP당 10분에 5건)만 적용됩니다. |
| 블로그 AI 초안 | console.anthropic.com에서 발급한 `ANTHROPIC_API_KEY` | 초안 버튼만 꺼지고, 직접 쓰는 것은 됩니다. |

- 메일을 쓰려면 `info@mycogen.co.kr` 메일함을 먼저 만들어야 합니다.
- 메일 업체가 알려 주는 **MX·SPF 기록은 Cloudflare DNS**에 추가합니다(네임서버를 옮겼으므로 후이즈가 아님).

## 5. 내용이 바뀌는 흐름

| 무엇을 | 어디서 고치나 | 사이트 반영 |
|---|---|---|
| 페이지 글·사진·메뉴·**소식(편집기)** | 대표님 PC 편집기 | 대표님이 저장하면 파트너(Claude)에게 "GitHub 동기화"를 요청해 main에 올립니다. 서버가 5분 안에 자동으로 받아 반영합니다. |
| **소식(관리 페이지)·블로그** | `info.mycogen.co.kr` | 저장하는 즉시 반영됩니다(DB). |
| 문의 | 홈페이지 문의 양식 | DB에 저장되고(1년 뒤 자동 파기) 메일이 갑니다. |
| 디자인·기능 코드 | GitHub main (`src/`, `server/`) | 서버가 5분 안에 자동 반영합니다. 대표님 PC에도 바뀐 파일만 넣습니다. |

- 사이트의 **소식** 목록에는 편집기에서 쓴 소식과 관리 페이지에서 쓴 소식이 날짜순으로 함께 나옵니다.
  - 관리 페이지 목록에는 편집기 소식이 "(편집기 글)"로 표시되지만, 고치는 것은 PC 편집기에서만 됩니다.
- **블로그 메뉴는 서버에서만** 생깁니다. PC 편집기의 미리보기에는 블로그가 나오지 않습니다.
- 서버의 `/srv/mycogen/app`은 직접 고치지 마세요. 자동 반영 때 main과 똑같이 덮어씁니다.

## 6. 운영 명령

| 하려는 일 | 명령 |
|---|---|
| 상태 보기 | `systemctl status mycogen` |
| 실시간 기록 | `journalctl -u mycogen -f` |
| 다시 켜기 | `sudo systemctl restart mycogen` |
| GitHub 내용 바로 반영 | `sudo systemctl start mycogen-update` |
| 자동 반영 끄기·켜기 | `sudo systemctl disable --now mycogen-update.timer` / `sudo systemctl enable --now mycogen-update.timer` |
| 지금 백업 | `sudo systemctl start mycogen-backup` |
| 백업 목록 | `sudo ls -l /var/backups/mycogen` |
| DB 되살리기 | `sudo -u mycogen bash -c 'set -a; . /etc/mycogen/server.env; pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" /var/backups/mycogen/db-날짜.dump'` → `sudo systemctl restart mycogen` |

백업에 대해:
- DB와 관리 페이지에서 올린 이미지를 매일 백업하고, **30일**이 지난 백업은 지웁니다.
- 서버 디스크 고장에 대비해 `/var/backups/mycogen`을 NAS 등 다른 곳에도 주기적으로 복사해 두기를 권합니다.

## 7. 문제가 생겼을 때

| 증상 | 확인할 것 |
|---|---|
| 사이트가 안 열림(Cloudflare 오류 1033·502) | `systemctl status cloudflared`, `systemctl status nginx`, 서버 인터넷 연결 |
| 사이트는 열리는데 문의 전송 실패 | `systemctl status mycogen`, `journalctl -u mycogen -n 50` |
| 관리 페이지 오류 | `journalctl -u mycogen -n 50` (DB 연결 실패면 `systemctl status postgresql`) |
| GitHub 변경이 반영 안 됨 | `journalctl -u mycogen-update -n 20` |
| 저장소를 비공개로 바꾼 뒤 자동 반영이 멈춤 | `sudo REPO_URL=git@github.com:kimyoonshik/mycelial-haven.git bash install.sh`로 배포 키를 만들고 GitHub에 등록한 뒤, `sudo -u mycogen git -C /srv/mycogen/app remote set-url origin git@github.com:kimyoonshik/mycelial-haven.git` |

## 참고: 서버 없이 임시로 띄우기

저장소의 `mycogen/dist`는 정적 사본입니다(블로그·문의 DB 제외, 문의는 메일 앱으로 열림). 서버를 쓸 수 없을 때는 이 폴더를 아무 정적 호스팅에 올리면 임시로 홈페이지를 띄울 수 있습니다. 운영 서버는 이 폴더를 쓰지 않고 `/srv/mycogen/www`에 직접 만듭니다.
