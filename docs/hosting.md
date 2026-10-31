# Mycerra 웹사이트 호스팅·이전 가이드

> 목적: 새 사이트로 기존 www.saveearth.kr 을 **중단 없이** 교체하고, 이후 어떤 호스팅에서도 문제없이 운영한다.
> 최종 갱신: 2026-10-31

---

## 1. 사이트 구조 (호스팅 관점)

| 항목 | 내용 |
|------|------|
| 형태 | **정적 사이트** (HTML·JS·CSS·이미지). 서버 프로그램·DB가 없어 어떤 웹호스팅에서도 동작 |
| 빌드 | `npm run build` → `dist/` 폴더 생성 (Node.js 18 이상) |
| 페이지 파일 | 모든 공개 주소가 실제 HTML 파일로 생성됨 (`/mycerra/index.html`, `/shop/p/EM-01/index.html` …). 주소 재작성 기능이 없는 호스팅에서도 직접 접속·새로고침이 된다 |
| 검색·SNS | 페이지별 제목·설명·대표 이미지, `sitemap.xml`, `robots.txt`, `404.html` 자동 생성 |
| 결제 | PayPal (브라우저에서 PayPal로 직접 연결). 서버 불필요 |
| 내부 도구 | 인보이스 작성기·운영 도구는 **공개 빌드에 포함되지 않음** (관리자 PC에서만 실행) |

### 빌드 시 자동 검사

`npm run build`는 콘텐츠 데이터(`src/content/data/*.json`)를 먼저 검사한다. 오류가 있으면 **빌드를 중단**하므로 깨진 사이트가 배포되지 않는다.

검사 항목:
- 상품코드 중복
- 없는 사진 파일 참조
- 잘못된 가격·물량 규칙

---

## 2. 호스팅 선택지

| 방식 | 배포 방법 | 장점 | 이 저장소에 준비된 설정 |
|------|----------|------|------------------------|
| **A. Lovable** (현재 프로젝트 연결) | GitHub에 푸시 → Lovable에서 Publish → 커스텀 도메인 연결 | 지금 쓰는 방식 그대로, 운영 도구의 "게시" 버튼과 바로 연동 | 별도 설정 불필요 (Lovable의 SPA 처리) |
| **B. Netlify / Cloudflare Pages** | GitHub 저장소 연결, 빌드 명령 `npm run build`, 출력 폴더 `dist` | 무료, GitHub 푸시마다 자동 배포, 전 세계 CDN | `public/_headers`, `public/_redirects` |
| **C. Vercel** | GitHub 연결, Framework: Vite | 위와 같음 | `vercel.json` |
| **D. 국내 웹호스팅** (카페24·가비아 등 Apache) | `npm run build` 후 `dist/` 안의 **모든 파일**(숨김 파일 `.htaccess` 포함)을 FTP로 웹 루트에 업로드 | 국내 업체 지원, 기존 계약 활용 | `public/.htaccess` |

**권장:** B(Cloudflare Pages 또는 Netlify) 또는 A(Lovable)입니다. 운영 도구에서 "게시"를 누르면 GitHub 푸시 → 자동 배포까지 한 번에 이어집니다. D는 매번 빌드 후 FTP 업로드가 필요합니다.

### D 방식(Apache) 검증 결과 — 실제 Apache 2.4로 시험함

| 요청 | 결과 |
|------|------|
| `/`, `/mycerra`, `/mycerra/`, `/shop/p/EM-01` | 200, 이동(redirect) 없이 페이지별 제목 |
| 없는 주소 (`/abc`, `/shop/p/ZZ-99`, `/admin/...`) | **404 상태** + 사이트의 404 화면 |
| `/assets/`, `/media/` 폴더 목록 | 403 (목록 노출 차단) |
| `.htaccess` | 403 (외부 열람 차단) |
| JS·CSS (`/assets/*`) | gzip 압축 + 1년 캐시 (파일명에 해시가 붙어 갱신 시 자동 교체) |
| 이미지·성적서 (`/media/*`) | 1시간 캐시 (운영 도구로 교체 가능) |
| HTML | `no-cache` (항상 최신 확인) |

---

## 3. 기존 saveearth.kr 교체 절차 (중단 없는 이전)

| 단계 | 작업 | 확인 |
|------|------|------|
| 1. 사전 확정 | 단가·배송비·개인 주문 상한, 판매자 정보, HS 코드 입력 (운영 도구 → 크기·가격) | 운영 도구 "검사" 통과 |
| 2. 임시 주소 배포 | 선택한 호스팅에 배포 (예: `mycerra.pages.dev`, Lovable 미리보기 주소) | 아래 **출시 점검표** 수행 |
| 3. PayPal 실결제 시험 | Sandbox 시험 후 Live Client ID 등록 → 소액 실결제 1건 → 환불 | PayPal 거래에 주문번호 표시 |
| 4. 사이트 주소 확인 | `src/content/data/seo.json`의 `siteUrl`이 `https://www.saveearth.kr` 인지 확인 | sitemap·canonical 주소 |
| 5. 도메인 연결 | DNS에서 `www` CNAME(또는 A 레코드)을 새 호스팅으로 변경. 루트 도메인 `saveearth.kr`은 `www`로 이동 설정 | 변경 전 TTL을 300초로 낮춰 두면 전환이 빠름 |
| 6. SSL | 호스팅에서 무료 인증서(Let's Encrypt) 발급 확인. Apache는 인증서 적용 후 `.htaccess`의 https 이동 규칙 주석 해제 | 주소창 자물쇠 |
| 7. 검색엔진 | Google Search Console·네이버 서치어드바이저에 `https://www.saveearth.kr/sitemap.xml` 제출 | 색인 요청 |
| 8. 롤백 대비 | 기존 Lovable 사이트(이전 프로젝트)는 **2주간 삭제하지 않고 유지**. 문제 시 DNS만 되돌리면 복구 | — |

### 기존 주소 호환

기존 사이트는 한 페이지 구조였습니다(`#home`, `#mycerra` 같은 앵커). 그래서 기존에 공유된 링크는 모두 새 홈으로 연결되며, 별도의 주소 이동 설정이 필요 없습니다.

---

## 4. 출시 점검표

- [ ] 모든 메뉴 페이지 직접 접속·새로고침 (`/mycerra`, `/technology`, `/impact`, `/shop`, `/work-with-us`)
- [ ] 없는 주소 → 404 화면
- [ ] 한/영 전환 후 새로고침해도 언어 유지
- [ ] 쇼핑: 스와치 브로셔 단독 주문(최대 4세트), 정규원단 20 sqft 미만 차단, 161.5 sqft 초과 시 발주서 안내
- [ ] PayPal 결제(또는 인보이스 요청) → 주문번호 확인
- [ ] 발주희망서 발송 → 인보이스 작성기로 가져오기
- [ ] 모바일(폭 390px) 가로 넘침 없음
- [ ] 카카오톡·페이스북에 링크 공유 시 미리보기 이미지·제목 표시
- [ ] `https://www.saveearth.kr/robots.txt`, `/sitemap.xml` 접속

---

## 5. nginx를 쓰는 경우 (자체 서버)

```nginx
server {
  listen 443 ssl http2;
  server_name www.saveearth.kr;
  root /var/www/mycerra;          # dist/ 내용
  index index.html;

  location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
  location /media/  { add_header Cache-Control "public, max-age=3600, must-revalidate"; }

  # 페이지별 HTML → 없으면 404.html (404 상태)
  location / { try_files $uri $uri/index.html =404; }
  error_page 404 /404.html;

  add_header X-Content-Type-Options nosniff always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;
  add_header X-Frame-Options SAMEORIGIN always;
  gzip on; gzip_types text/css text/javascript application/javascript application/json image/svg+xml application/xml;
}
```

---

## 6. 명령어 요약

| 명령 | 용도 |
|------|------|
| `npm install` | 최초 1회 (패키지 설치) |
| `npm run dev` | 개발 미리보기 (http://localhost:8080) |
| `npm run cms` | **운영 도구** — http://127.0.0.1:8080/admin/content ([운영 도구 설명서](./cms.md)) |
| `npm run admin` | 내부 인보이스 작성기 — http://localhost:8080/admin/invoice |
| `npm run build` | 공개 사이트 빌드 → `dist/` (콘텐츠 검사 + 페이지 생성 포함) |
| `npm run preview` | 빌드 결과 미리보기 |
| `SITE_URL=https://임시주소 npm run build` | 임시 주소로 sitemap·미리보기 주소를 바꿔 빌드 (macOS·Linux) |
