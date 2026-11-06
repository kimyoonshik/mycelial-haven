# 호스팅 담당자 안내 — www.mycogen.co.kr

## 한눈에 보기

| 항목 | 내용 |
|---|---|
| 공식 홈페이지 | 이 저장소의 **`mycogen/` 폴더**입니다. 저장소 맨 위의 나머지 파일(React·Vite, Lovable)은 이전 시안이라 쓰지 않습니다. |
| 올릴 파일 | **`mycogen/dist/` 안의 파일 전부**입니다. 숨김 파일 `.htaccess`도 포함됩니다. |
| 사이트 형태 | 순수 정적 사이트(HTML·CSS·JS·이미지)입니다. 서버 프로그램, DB, PHP가 필요 없습니다. |
| 현재 `dist` 기준 | 대표님 편집본 `content/site.json`(2026-11-05 18:47 KST 저장본)으로 만들었습니다. 한국어·영어 22쪽이고, 내부 링크·이미지 699개를 검사해 깨진 곳이 없습니다. |
| 대표 주소 | `https://www.mycogen.co.kr`. canonical, sitemap, 공유 미리보기가 이 주소를 씁니다. |

## 방법 A — 일반 웹호스팅(가비아, 카페24 등 FTP)

1. GitHub에서 `main` 브랜치를 엽니다. **Code → Download ZIP**으로 내려받아 압축을 풀고 `mycogen/dist` 폴더를 엽니다.
2. `dist` **안의** 파일과 폴더를 모두 웹 루트(`www`, `public_html` 또는 `html`)에 올립니다.
   - FTP 프로그램에서 "숨김 파일 표시"를 켜야 `.htaccess`도 함께 올라갑니다.
   - `.htaccess`는 Apache 서버에서 404 페이지, UTF-8, webp 형식, 캐시를 설정합니다.
     Nginx 서버라면 `error_page 404 /404.html;`만 따로 설정해 주세요.
3. 주소창에 `https://www.mycogen.co.kr/`을 입력해 첫 화면, 메뉴, 영어(`/en/`)가 열리는지 확인합니다.

## 방법 B — GitHub 연동 호스팅(Netlify, Cloudflare Pages, Vercel)

저장소를 연결하고 아래처럼 설정하면, GitHub에 새 내용이 올라올 때마다 자동으로 다시 게시됩니다.

| 설정 | 값 |
|---|---|
| 저장소 / 브랜치 | `kimyoonshik/mycelial-haven` / `main` |
| Base(Root) directory | `mycogen` |
| Build command | `node src/build.mjs` |
| Publish(Output) directory | `dist` |
| Node 버전 | 18 이상(외부 패키지 없음, `npm install` 불필요) |

## 도메인과 HTTPS

1. 도메인 DNS에서 `www.mycogen.co.kr`을 호스팅으로 연결합니다(A 레코드 또는 CNAME).
2. SSL(https)을 켭니다.
3. `mycogen.co.kr`(www 없는 주소)과 `http://`로 들어온 접속은 `https://www.mycogen.co.kr`로 넘어가게 설정합니다. 호스팅 관리 화면의 리디렉션 기능을 쓰면 됩니다.

## 게시 후 할 일

- **검색 등록**: 네이버 서치어드바이저, 구글 서치콘솔, Bing 웹마스터 도구, Daum 웹마스터도구에 사이트를 등록하고 사이트맵(`https://www.mycogen.co.kr/sitemap.xml`)을 제출합니다.
  자세한 순서는 `README.md` 3장에 있습니다. 발급된 인증 코드는 대표님이 편집기의 `사이트 정보 → 검색·공유`에 넣고 저장합니다. 그 뒤 다시 게시합니다.
- **문의 양식**: 지금은 `문의 전송 주소`가 비어 있습니다. 그래서 방문자가 양식을 보내면 방문자 PC의 메일 프로그램이 열리고 `info@mycogen.co.kr`로 메일이 써집니다.
  - 이 메일함을 실제로 만들어야 합니다.
  - 웹에서 바로 전송되게 하려면 Formspree 같은 양식 수신 서비스 주소를 편집기의 `사이트 정보 → 회사 정보 → 문의 전송 주소`에 넣습니다.
- **검색·AI용 파일**: `robots.txt`, `sitemap.xml`, `rss.xml`, `llms.txt`, `llms-full.txt`는 `dist`에 이미 들어 있습니다. 함께 올리기만 하면 됩니다.

## 내용이 바뀌었을 때(업데이트 순서)

내용의 **원본은 대표님 PC의 편집 프로그램**이고, GitHub에는 그 사본이 올라갑니다.

1. 대표님이 편집기에서 수정하고 저장합니다.
   대표님 PC의 `mycogen` 폴더가 Google Drive에 동기화됩니다.
2. 그 동기화본을 GitHub의 `content/`로 옮기고, `dist`도 다시 만들어 올립니다.
   파트너(Claude)에게 "GitHub 동기화해줘"라고 요청하면 됩니다.
3. 게시 방법에 따라 마무리합니다.
   - 방법 A: 새 `dist`를 다시 FTP로 올립니다.
   - 방법 B: 자동으로 다시 게시됩니다.

주의할 점:

- `content/site.json`과 `content/media/`는 GitHub에서 직접 고치지 마세요. 다음 동기화 때 대표님 PC의 내용으로 덮어써집니다. 글과 사진은 편집기로만 고칩니다.
- 디자인이나 기능(`src/`, `editor/`)을 고쳤다면, 바뀐 파일만 대표님 PC의 같은 위치에도 넣어야 합니다. 그래야 편집기 미리보기와 실제 사이트가 같습니다.

## 직접 다시 만들기(선택)

Node.js 18 이상이 설치된 PC라면 `mycogen` 폴더에서 아래 명령으로 `dist`를 새로 만들고 검사할 수 있습니다.

```bash
node src/build.mjs
node scripts/check.mjs
```
