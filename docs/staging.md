# 시험용 사이트 (new.saveearth.kr) 설정 안내

> 목적: 새 사이트를 **어디서나(휴대폰·외부)** 열어 볼 수 있게, 기존 서버에 **암호를 건 시험용 주소**로 올린다.
> 검색엔진에는 잡히지 않는다 (robots 차단 + 모든 페이지 noindex + X-Robots-Tag 헤더).
> 작성: 2026-11-01

---

## 0. 현재 구성 (2026-11-01 조회)

| 항목 | 값 | 의미 |
|------|-----|------|
| 도메인 관리 (네임서버) | `ns11.whois.co.kr`, `ns11.whoisweb.net` | **후이즈(whois.co.kr)** 에서 DNS 관리 |
| 웹 서버 IP | `146.56.175.219` | **Oracle Cloud 서울 리전** 가상 서버 (직접 관리형) |
| 메일 | `aspmx.whoisworks.com` | 후이즈 메일 — **이번 작업에서 건드리지 않음** |
| 현재 사이트 | React(Vite) 정적 사이트 | 기존 www.saveearth.kr — 그대로 유지 |

---

## 1. 도메인: 시험용 주소 만들기 (후이즈, 5분)

1. [whois.co.kr](https://www.whois.co.kr) 로그인 → **도메인 관리** → `saveearth.kr` → **DNS 레코드 관리 (네임서버 고급설정)**
2. 레코드 추가

   | 유형 | 호스트 | 값 | TTL |
   |------|--------|-----|-----|
   | A | `new` | `146.56.175.219` | 기본값 |

3. 저장. 반영까지 몇 분~1시간. 확인: 명령 프롬프트에서 `nslookup new.saveearth.kr` → `146.56.175.219`

> 기존 `www`, `@`, MX(메일) 레코드는 절대 수정·삭제하지 않습니다.

---

## 2. 서버: 시험용 사이트 자리 만들기 (Oracle 서버, 1회, 약 15분)

서버에 SSH로 접속할 수 있는 담당자가 진행합니다. 접속 예:
```
ssh -i "C:\Users\user\.ssh\oracle-saveearth.key" ubuntu@146.56.175.219
```

### 2-1. 웹 서버 종류 확인
```
sudo systemctl is-active nginx apache2 httpd
```
`active` 로 나오는 것이 사용 중인 웹 서버입니다. 아래에서 해당 절만 따릅니다.

### 2-2. 폴더와 암호 만들기 (공통)
```
sudo mkdir -p /var/www/new.saveearth.kr
sudo chown $USER:$USER /var/www/new.saveearth.kr
echo '<h1>new.saveearth.kr ready</h1>' > /var/www/new.saveearth.kr/index.html

# 시험용 아이디 mycerra (암호는 물어볼 때 입력, 채팅·메일에 적지 말 것)
sudo apt-get install -y apache2-utils          # Oracle Linux 는: sudo dnf install -y httpd-tools
sudo htpasswd -c /etc/mycerra-staging.htpasswd mycerra
```

### 2-3a. nginx 인 경우
`/etc/nginx/sites-available/new.saveearth.kr` (Oracle Linux 는 `/etc/nginx/conf.d/new.saveearth.kr.conf`)
```nginx
server {
  listen 80;
  server_name new.saveearth.kr;
  root /var/www/new.saveearth.kr;
  index index.html;

  # 시험용: 암호 + 검색 차단
  auth_basic "Mycerra staging";
  auth_basic_user_file /etc/mycerra-staging.htpasswd;
  add_header X-Robots-Tag "noindex, nofollow" always;

  # 페이지별 HTML → 없으면 앱이 처리
  location / { try_files $uri $uri/index.html $uri.html /index.html; }
  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; add_header X-Robots-Tag "noindex, nofollow" always; }
  error_page 404 /404.html;
}
```
```
sudo ln -s /etc/nginx/sites-available/new.saveearth.kr /etc/nginx/sites-enabled/   # Ubuntu 만
sudo nginx -t && sudo systemctl reload nginx
```

### 2-3b. Apache 인 경우
`/etc/apache2/sites-available/new.saveearth.kr.conf`
```apache
<VirtualHost *:80>
  ServerName new.saveearth.kr
  DocumentRoot /var/www/new.saveearth.kr
  <Directory /var/www/new.saveearth.kr>
    AllowOverride All
    AuthType Basic
    AuthName "Mycerra staging"
    AuthUserFile /etc/mycerra-staging.htpasswd
    Require valid-user
  </Directory>
</VirtualHost>
```
```
sudo a2enmod headers rewrite && sudo a2ensite new.saveearth.kr && sudo apachectl configtest && sudo systemctl reload apache2
```
(사이트 쪽 `.htaccess` 는 업로드 파일에 포함되어 있습니다 — 라우팅·캐시·검색 차단 헤더)

### 2-4. HTTPS 인증서 (무료, Let's Encrypt)
```
sudo apt-get install -y certbot python3-certbot-nginx    # Apache 는 python3-certbot-apache
sudo certbot --nginx -d new.saveearth.kr                 # Apache 는 --apache
```
확인: 휴대폰에서 `https://new.saveearth.kr` → 아이디·암호 창 → "ready" 문구

---

## 3. 사이트 올리기 (사무실 PC, 매번 1분)

### 3-1. 처음 한 번: 접속 정보 파일
1. 저장소 폴더의 `deploy.example.json` 을 복사해 **`deploy.local.json`** 으로 이름 변경
2. 값 채우기

   | 항목 | 예 | 설명 |
   |------|-----|------|
   | `host` | `146.56.175.219` | 서버 IP |
   | `user` | `ubuntu` (Oracle Linux 는 `opc`) | SSH 사용자 |
   | `keyFile` | `C:/Users/user/.ssh/oracle-saveearth.key` | 서버 접속 키 파일 (슬래시 `/` 로 적기) |
   | `remoteDir` | `/var/www/new.saveearth.kr` | 2-2에서 만든 폴더 |
   | `siteUrl` | `https://new.saveearth.kr` | 시험용 주소 |

> `deploy.local.json` 과 키 파일(`*.key`, `*.pem`)은 GitHub에 올라가지 않도록 막아 두었습니다. 키 파일은 OneDrive 폴더에 두지 말고 `C:\Users\user\.ssh\` 에 둡니다.

### 3-2. 올리기
```
npm run deploy:staging
```
1) 검색 차단 빌드 → 2) 서버 임시 폴더로 복사 → 3) 한 번에 교체 (직전 버전은 `new.saveearth.kr.old` 로 보관)

되돌리기 (서버에서): `cd /var/www && mv new.saveearth.kr new.saveearth.kr.bad && mv new.saveearth.kr.old new.saveearth.kr`

---

## 4. 나중에 정식 교체할 때 (www.saveearth.kr)

- 시험용에서 점검을 마친 뒤, 같은 서버의 www 설정에서 `root` 를 새 빌드(`npm run build`, 검색 허용) 폴더로 바꾸면 끝입니다.
- 기존 사이트 폴더는 지우지 말고 이름만 바꿔 보관 (문제 시 즉시 되돌림).
- 세부 점검표: `docs/hosting.md`

## 5. 보안 메모

- 시험용 사이트에는 공개 빌드만 올라갑니다 (관리 화면·인보이스 작성기·계좌번호 없음).
- 암호는 아는 사람만 들어오게 하는 용도입니다. 외부 공유 시 아이디·암호를 따로 전달하고, 공유가 끝나면 `sudo htpasswd /etc/mycerra-staging.htpasswd mycerra` 로 바꿉니다.
- 서버 접속 키는 채팅·메일·GitHub에 올리지 않습니다.
