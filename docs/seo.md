# 온라인 노출(SEO) · SNS 연결 운영 안내

> 작성: 2026-11-01 · 대상: www.saveearth.kr (Mycerra™)
> 설정 위치: 운영 도구 → **SEO** 탭 (페이지별 제목·설명, SNS 계정, 검색엔진 확인 코드)

---

## 1. 사이트에 이미 구축된 것 (자동)

| 구분 | 내용 | 효과 |
|------|------|------|
| 페이지별 HTML | 영문 66개 + **한국어 66개(/ko/…)** 주소마다 제목·설명·대표 이미지가 들어간 HTML 파일 생성 | JS를 실행하지 않는 검색엔진·카카오톡·페이스북도 내용을 읽음 |
| **한국어 주소** | `www.saveearth.kr/ko` · `/ko/technology` · `/ko/shop/p/EM-01` … 한국어 제목·설명·본문, `<html lang="ko">`. 영문·한국어 페이지를 서로 연결(hreflang)하고 사이트맵에 모두 등록 | **네이버·구글 한국어 검색**에 한국어 페이지가 노출. 영문 검색엔 영문 페이지 |
| 검색 결과 회사 정보 | 모든 페이지에 Organization·WebSite 구조화 데이터(JSON-LD) — 회사명, 주소, 전화, 이메일, 브랜드, SNS 계정 | Google 지식 패널·브랜드 검색 정확도 |
| 상품 정보 | 상품 페이지마다 Product(가격 범위·재고·원산지·소재)와 경로(BreadcrumbList) | Google 쇼핑·상품 리치 결과 후보 |
| sitemap.xml | 공개 페이지 64개 + 상품 사진 (이미지 검색) | 검색엔진이 새 페이지를 빨리 발견 |
| robots.txt | 장바구니·결제·관리 화면 제외, sitemap 위치 안내 | 불필요한 페이지 노출 방지 |
| SNS 미리보기 | Open Graph·X(트위터) 카드 — 제목·설명·이미지, 영문/한글 지역 표시 | 링크 공유 시 큰 이미지 카드 |
| SNS 아이콘 | 바닥글에 Instagram·Facebook·X·LinkedIn·YouTube (주소 입력한 것만 표시) | 사이트 → SNS 유입 |
| 공유 버튼 | 상품 상세: X·Facebook·LinkedIn·링크 복사(인스타그램·메신저용)·휴대폰 기본 공유 | 방문자 → SNS 확산 |
| **본문 미리 그리기** | 63개 페이지의 글·이미지·링크를 HTML 파일에 미리 담음 (주문 양식 3개 제외) | 자바스크립트를 실행하지 않는 **ChatGPT·Claude·Perplexity 등 AI 수집기**와 네이버도 전체 내용을 읽음 |
| **llms.txt** | `/llms.txt` — 회사·소재·가격·크기·주장과 근거·상품 목록 요약 (빌드마다 자동 갱신). 근거 문서가 준비 중인 수치는 "company figure"로 구분 표기 | AI 답변에 정확한 사실을 인용하도록 유도, 근거 없는 수치의 과장 인용 방지 |
| **AI 수집기 허용** | robots.txt 에 Google·Bing·네이버(Yeti)·OpenAI·Anthropic·Perplexity·Apple·Amazon·Meta 수집기를 명시적으로 허용 | AI 검색·답변 서비스에 노출 |
| **IndexNow** | 키 파일 자동 게시 + `npm run indexnow` 로 전체 주소 전송 | Bing(ChatGPT 검색이 활용)·네이버에 새 내용을 즉시 알림 |

## 2. 출시 직후 1회 등록 (검색엔진)

> www.saveearth.kr 로 정식 호스팅한 **뒤에** 진행합니다 (시험 주소로 등록하면 안 됨).

| 순서 | 검색엔진 | 할 일 |
|:---:|---------|------|
| 1 | **Google Search Console** (search.google.com/search-console) | 속성 추가 → URL 접두어 `https://www.saveearth.kr` → **HTML 태그** 방식 선택 → `content="…"` 값만 복사 → 운영 도구 SEO 탭 "Google" 칸에 붙여넣기 → 저장·게시 → 확인 버튼 → **Sitemaps** 메뉴에 `sitemap.xml` 제출 |
| 2 | **네이버 서치어드바이저** (searchadvisor.naver.com) | 사이트 등록 → HTML 태그 방식 → 값 복사 → "네이버" 칸 → 게시 → 소유 확인 → **요청 › 사이트맵 제출** `https://www.saveearth.kr/sitemap.xml` → **요청 › 웹 페이지 수집**에 `https://www.saveearth.kr/ko` 를 먼저 요청 |
| 3 | **Bing 웹마스터 도구** (bing.com/webmasters) | Google Search Console 계정으로 가져오기(가장 빠름) 또는 HTML 태그 → "Bing" 칸 |
| 4 | **다음(Daum) 검색 등록** (register.search.daum.net) | 사이트 등록 신청 (태그 불필요) |

- 네이버 노출을 더 키우려면: **네이버 스마트플레이스**(smartplace.naver.com)에 회사 정보(주소·전화·홈페이지 `https://www.saveearth.kr/ko`) 등록 — 네이버 지도·업체 검색에 표시됩니다. 네이버 블로그를 운영하면 블로그 글에서 `/ko` 페이지로 연결하세요.
- 등록 후 노출까지 보통 **며칠~몇 주**. Search Console의 "URL 검사 → 색인 생성 요청"으로 주요 페이지(/, /mycerra, /shop)를 먼저 요청하면 빨라집니다.
- 매달 Search Console에서 **검색어·클릭수·오류**를 확인합니다.
- **게시할 때마다** (상품·소식 추가 후): 사무실 PC에서 `npm run indexnow` 실행 → Bing·네이버에 즉시 알림 (정식 주소에 게시된 뒤에만)

**AI 노출 확인 방법 (월 1회)**: ChatGPT·Perplexity·Gemini·Claude 에 "mycelium leather made in Korea", "pure mycelium leather without backing", "Mycerra" 를 물어보고 사이트가 인용되는지 기록합니다. 정식 호스팅 후 보통 수 주가 걸립니다.

> AI 학습용 수집기(GPTBot·Google-Extended·CCBot 등)도 허용해 두었습니다 (브랜드가 AI 모델 지식에 포함되도록). 원치 않으면 `scripts/prerender.mjs` 의 AI_BOTS 목록에서 빼면 됩니다.

## 3. SNS 계정 개설·연결

| 항목 | 권장 |
|------|------|
| 계정 이름 | 모든 SNS 동일하게 — 예: `@mycerra` (선점 여부 먼저 확인) |
| 우선순위 | **Instagram**(소재·색감) · **LinkedIn**(B2B 브랜드·태너리) → Facebook → X → YouTube(공정 영상) |
| 프로필 이미지 | BI 확정 전에는 정사각형 워드마크 (BI 확정 후 교체) |
| 소개문 | EN: `Mycerra™ — 100% pure mycelium leather alternative. No backing, no plastic. Grown in Korea by SAVE EARTH Inc.` / KO: `Mycerra™ — 100% 순수 균사 가죽 대체 소재. 배접·플라스틱 없음. 세이브어스(주)` |
| 프로필 링크 | `https://www.saveearth.kr` (상품 홍보 시 해당 상품 주소) |
| 사이트 연결 | 운영 도구 → SEO 탭 → 각 SNS 주소 입력 → 저장 → 게시 → 바닥글 아이콘·검색엔진 회사 정보·llms.txt 에 자동 반영 |
| LinkedIn | 개설용 문구·커버·로고·첫 게시물 3개: [linkedin.md](./linkedin.md) |

## 4. 꾸준한 노출을 위한 운영 루틴

| 주기 | 할 일 |
|------|------|
| 새 소식·성적서·전시 | 운영 도구 **소식** 탭에 추가 → 게시 → 같은 내용을 SNS에 올리고 사이트 주소 연결 |
| 새 상품 | 상품 탭에서 사진·설명(영문 2문장 이상) 작성 → 게시 → 상품 페이지 공유 버튼으로 SNS 게시 |
| 매달 | Search Console 검색어 확인 → 잘 나오는 검색어를 페이지 설명(SEO 탭)에 반영 |

**목표 검색어 (설명·소식 문구에 자연스럽게 포함)**
- 영문: mycelium leather, mycelium leather alternative, pure mycelium mat, vegan leather alternative, biobased leather, plastic-free leather, animal-free leather, sustainable leather material
- 한글: 균사 가죽, 균사체 가죽, 버섯 가죽, 비건 가죽, 친환경 가죽 대체 소재, 바이오 가죽

## 5. 방문자 분석 (구축 완료 — 측정 ID만 넣으면 시작)

| 도구 | 용도 | 발급 (무료, 약 5분) |
|------|------|------|
| **Google Analytics 4** | 국가별·경로별 방문, 인기 페이지, 장바구니·발주·문의·결제 전환 | analytics.google.com → 관리 → **속성 만들기** (이름 `Mycerra`, 시간대 대한민국, 통화 USD) → 플랫폼 **웹** → 주소 `https://www.saveearth.kr` → 생성된 **측정 ID `G-…`** 복사 |
| **네이버 애널리틱스** | 국내(네이버 검색) 유입 분석 | analytics.naver.com → 사이트 등록 → 발급된 **사이트 ID** 복사 |

1. 운영 도구 → **SEO** 탭 → "방문자 분석" 칸에 ID 입력 → 저장 → 게시
2. 자동 동작
   - 페이지 이동마다 방문 기록 (영문/한글 언어도 함께 기록)
   - **전환 이벤트**: `add_to_cart`(장바구니 담기·금액), `generate_lead`(발주희망서·문의 보내기), `purchase`(PayPal 결제 완료·금액·주문번호). 성적서 PDF 내려받기와 외부 링크 클릭은 GA4 기본 기능(향상된 측정)으로 자동 기록
   - **쿠키 동의 배너**: 첫 방문 시 하단에 표시 (동의/거부). EU·영국·스위스 방문자는 동의 전까지 쿠키를 쓰지 않음(Google 동의 모드), 그 밖의 지역은 기본 측정하되 거부하면 중단
   - 광고용 쿠키·광고 연동은 사용하지 않음
3. GA4에서 꼭 볼 화면: **실시간**(게시 직후 작동 확인) · **보고서 › 획득**(어디서 왔나: Google·네이버·LinkedIn·ChatGPT 등) · **참여도 › 이벤트**(전환) · **사용자 › 국가**
4. GA4 관리 → **Search Console 연결**을 켜면 검색어별 유입도 함께 봅니다.
5. AI 서비스에서 온 방문은 GA4 획득 보고서에 `chatgpt.com`, `perplexity.ai`, `gemini.google.com` 등의 출처로 표시됩니다.

> **개인정보처리방침**: 분석 쿠키를 쓰므로, 정식 공개 전 사이트에 개인정보처리방침 페이지(수집 항목: 방문 기록·쿠키, 이용 목적: 사이트 개선, 위탁: Google·네이버)를 두는 것을 권장합니다 (open-items F5).

## 6. 다음 단계 (결정 필요 — open-items.md F절)

| 항목 | 내용 | 비고 |
|------|------|------|
| SNS 자동 게시 | 소식 게시 시 SNS에 자동 업로드 | 계정 개설 후 검토 |
