# 레퍼런스 분석 — `Craft Anything\mycoiq-com` → (주)마이코젠 홈페이지

작성일 2026-11-05

## 1. 분석 대상

| 항목 | 내용 |
|---|---|
| 폴더 | `C:\Users\user\Documents\Craft Anything\mycoiq-com` (같은 프로젝트의 OneDrive 사본 `Mycerra\code\codex\21_Site clone 2` 를 Google Drive 동기화본으로 확인) |
| 성격 | Craft Anything 0.2~0.3 이 **www.mycoiq.com**(미국 MycoTechnology, Inc.)을 캡처한 결과물 |
| 구성 | `reference/capture`(page.html, how-it-works.md, routes, states, states-390), `reference/app`(Vite 재현본), `checks/round-0~7`(화면 비교), `feed.json`(요청 기록), `build-activity.log` |
| 요청 기록(feed.json) | “이 사이트를 복제한 후 Mycogen 홈페이지로 변경 / 신설법인 Mycogen Inc.·(주)마이코젠 / www.mycogen.co.kr / 4개 사업(균사매트 배양·후가공 제외, 폐배지+경석 불연 건축자재, 상황·영지 균사발효 대체육, 영지 발효 메주콩+산양유 유청 계란파우더)” |
| 미완료 원인 | `codex isn't installed or isn't on your PATH` — Craft Anything 의 빌더(Codex CLI)가 설치되어 있지 않아 생성 단계가 실행되지 않음 |

## 2. 레퍼런스 사이트 구조

| 구분 | 내용 |
|---|---|
| 기술 | WordPress + Astra 테마 + Elementor(Pro, Anywhere Elementor), WP Rocket, CookieYes, HubSpot, Site Kit |
| 페이지 | 홈 / Nature’s Tech(Mycelia, Fermentation) / Our Ingredients(제품 3종) / About(MyCulinary, Culinary Science, Newsroom, Leadership, Careers) / Contact |
| 홈 흐름 | 히어로 → 핵심 메시지(“More delicious. More nutritious.”) → 대표 제품 카드 2 → 색 띠(Brands·Health·Earth 타일) → 과제별 솔루션 카드 8 → 파트너 로고 → 언론 로고 → 문의 유도 |
| 기술 페이지 흐름 | 히어로 → 균사체 설명 → 발효 설명 → 5단계 공정(균주→스타터→발효→원료화→응용) → 적용 분야 → 제품 → 문의 |
| 디자인 토큰 | 토프 `#7c6d5f`, 올리브 `#7f8144`, 포인트 `#ffcd57`, 남색 `#1e293b` / Futura Bold 제목, Roboto Slab 본문 / 찢긴 종이형 섹션 경계, 사진 카드 + 알약형 라벨 |

## 3. 적용 방식 (MECE)

| 구분 | 레퍼런스에서 가져온 것 | 가져오지 않은 것 | 마이코젠 방식 |
|---|---|---|---|
| 정보 구조 | 기술 → 공정 5단계 → 제품 → 문의 흐름 | 레퍼런스 메뉴명·제품명 | 회사소개 / 기술 / 사업분야(4) / 소식 / 문의 |
| 디자인 | 흙·이끼 계열 색감, 섹션 경계 장식, 사진 카드 + 라벨 | 로고, 사진, Futura·Rustigh(상용·데모 라이선스) 폰트, 레이아웃 코드 | 자체 팔레트(이끼 `#5f6b3a`·흙 `#6b5a48`·포자 `#e2a93b`), 균사매트 가장자리를 본뜬 ‘섬유 가장자리’, 균사 네트워크 그래픽, Pretendard + Jost(오픈 라이선스) |
| 글 | 없음 | 전 문장 | 세이브어스 연구자료 기반 신규 작성(한·영) |
| 기술 스택 | 없음 | WordPress·플러그인 | 의존성 없는 정적 생성기 + 로컬 편집기 → 보안 패치·호스팅비 부담 없음 |

> 다른 회사 사이트를 그대로 복제해 이름만 바꾸면 저작권(글·사진·코드)과 트레이드드레스 분쟁 위험이 있어, 구조와 분위기만 참고하고 모든 요소를 새로 만들었습니다.

## 4. 콘텐츠 근거 자료

| 사업 | 근거 | 홈페이지 반영 원칙 |
|---|---|---|
| 균사매트 배양 | 세이브어스 Mycerra 공정 사진 | 후가공 제외, 생지 매트 B2B 공급으로 정의 |
| 불연 건축자재 | 「경석혼합물 연구노트 #1·#2」(2026-04~05, 4차 조성), 「연구노트_폐배지와 경석 혼합배양물 조성」 | 개발 단계로 명시, 공인 시험 기준(KS F ISO 1182 / 5660-1, KS F 2271)만 표기 |
| 대체육·계란파우더 | 「RPT-202610-SoySSF-SOP-v4」(콩 기질 균사체 고체배양 SOP), 대체육 선행연구(2022) | 원료·균주·공정 개념만 공개 |
| 계란파우더 시장 | 조류인플루엔자 시기 달걀 수급 불안(국내 2017·2021 긴급 수입, 2025 미국 가격 최고치), 녹두·유청 단백 기능 | 정성적 서술, 수치 미기재 |

**공개하지 않은 정보**: 배합 비율(폐배지:경석, 대두:곡물), 접종률, 멸균 시간, 배양 온도·기간 등 SOP 세부 수치 — 영업비밀이자 특허 신규성 보호 대상이므로 사이트에 싣지 않았습니다.

## 5. 확인이 필요한 사항

1. **상호 ‘Mycogen’ 상표 검토** — ‘Mycogen’은 해외 종자 브랜드(Mycogen Seeds)로 알려진 이름입니다. 식품(29·30류)·건축자재(19류) 지정상품 기준으로 KIPRIS 선행상표 조사를 권합니다.
2. 세이브어스(주)와의 관계 표현(“Mycerra Lab 연구를 바탕으로 설립”)
3. 사업별 개발 단계 표현
4. 균사체(영지·상황) 식품원료 인정 여부 — 식품공전 원료 목록·한시적 기준 인정 필요성 검토
