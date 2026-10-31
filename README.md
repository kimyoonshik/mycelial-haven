# Mycerra™ 웹사이트 — SAVE EARTH Inc.

순수 균사 매트 Mycerra™의 브랜드·쇼핑몰 사이트 (www.saveearth.kr 교체용). 영문 기본, 한/영 전환.

- Lovable 프로젝트: https://lovable.dev/projects/c4403ac1-4493-42a2-93fc-5d93763c5fce
- 기술: Vite · React · TypeScript · Tailwind CSS (정적 사이트 — 어떤 웹호스팅에서도 동작)

## 빠른 시작

```sh
npm install        # 최초 1회 (Node.js 18 이상)
npm run dev        # 개발 미리보기  http://localhost:8080
npm run cms        # 운영 도구(콘텐츠 관리)  http://127.0.0.1:8080/admin/content
npm run admin      # 내부 인보이스 작성기   http://localhost:8080/admin/invoice
npm run build      # 공개 사이트 빌드 → dist/ (콘텐츠 검사 + 페이지별 HTML·sitemap 생성)
```

## 사이트 구성

| 주소 | 내용 |
|------|------|
| `/` | 홈 |
| `/mycerra` | 소재 라이브러리 |
| `/technology` | 기술 + 성능 시험 성적서(12개 지표) |
| `/impact` | 임팩트와 근거 문서 |
| `/shop` | 쇼핑몰 — 가공 조건 4종 × 원단 크기 4종 (샘플 30×30, 정규 150×100 / 100×100 / 90×60 cm) |
| `/shop/p/:sku` · `/shop/cart` · `/shop/checkout` | 상품 상세 · 장바구니 · PayPal 결제 |
| `/shop/po` | 발주희망서 (대량·기업 주문) |
| `/work-with-us` | 협업 안내·문의 |

## 폴더 안내

| 경로 | 내용 |
|------|------|
| `src/content/data/*.json` | **운영 도구로 편집하는 데이터** (상품, 크기·가격, 성적서, 소식, SEO) |
| `src/content/schema.ts` | 데이터 규칙 (저장·빌드 시 자동 검사) |
| `src/content/mycerra.ts` | 페이지 고정 문구 (영/한) |
| `public/media/` | 상품 사진·성적서 PDF (운영 도구 업로드) |
| `src/pages/site`, `src/pages/shop` | 공개 페이지 |
| `src/pages/admin` | 내부 도구 (공개 빌드에는 포함되지 않음) |
| `cms/plugin.ts` | 빌드 시 콘텐츠 검사 + 운영 도구 로컬 API |
| `scripts/prerender.mjs` | 페이지별 HTML·sitemap·robots·404 생성 |
| `public/.htaccess`, `public/_headers`, `vercel.json` | 호스팅별 설정 (Apache / Netlify·Cloudflare / Vercel) |
| `tools/site-cloner/` | REA 사이트 클로너 (레퍼런스 사이트 분석용) |

## 문서

- [호스팅·이전 가이드](docs/hosting.md) — 기존 saveearth.kr 교체 절차, 호스팅별 설정, 출시 점검표
- [운영 도구 사용 설명서](docs/cms.md) — 상품·가격·성적서·소식 수정과 게시
- [주문·인보이스·결제·발송 SOP](docs/order-process.md)

## 환경변수 (`.env`, 예시는 `.env.example`)

| 변수 | 용도 |
|------|------|
| `VITE_PAYPAL_CLIENT_ID` | PayPal Client ID. 비어 있으면 "PayPal 인보이스 요청"으로 동작 |
| `SITE_URL` | (빌드 시) sitemap·미리보기 주소 변경. 기본 `https://www.saveearth.kr` |
