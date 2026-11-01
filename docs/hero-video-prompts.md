# 히어로 모핑 영상 제작 가이드 · 프롬프트 팩

> 작성: 2026-11-01 · 목적: 홈 첫 화면(히어로)에 쓸 공정 모핑 영상
> 흐름: 분쇄 배지 → 배양 포트 적재 → 배양실 케이스 적재 → 균사 활성화 → 두꺼운 균사 매트 → 수득 → 가소(도식) → 염색 → 후가공 완성 원단
> 관련 문서: `docs/hero-concepts.md` (A안 · C안)

---

## 1. 추천 앱 (2026년 11월 기준)

| 순위 | 앱 | 이 작업에 맞는 이유 | 쓰는 방법 | 비용 (대략) |
|:---:|-----|------------------|----------|------|
| **1** | **Kling 4.0** — kling.ai (웹·앱) | **다중 키프레임**: 장면 사진 여러 장을 순서대로 넣으면 그 사이를 이어 **최대 약 30초 한 편**으로 생성 (2026-09 출시). 공정 순서 모핑에 가장 직접적 | 키프레임 8장 업로드 → 구간별 동작 문구 입력 → 생성 | 무료 체험 일일 크레딧 / Pro 월 $37 권장 (1080p·생성 횟수) |
| **2** | **Google Veo 3.1** — Google Flow(labs.google/flow) 또는 Gemini 앱 | **시작·끝 프레임 보간** 품질과 실사감이 가장 좋음, 8초 구간 4K 가능, 참고 이미지 3장으로 색감·소재 일관성 유지 | 구간마다 "시작 프레임 = 장면 n, 끝 프레임 = 장면 n+1" 로 7번 생성 → 편집 앱에서 연결 | Google AI Pro/Ultra 구독 또는 API 초당 과금 |
| 키프레임 제작 | Kling Image 3.0(4K) · Gemini 이미지(Nano Banana) · Midjourney | 영상 앱에 넣을 장면 사진 8장 생성 | 아래 3장 프롬프트 사용 | 각 앱 구독 |
| 편집 | **CapCut**(무료·한글) 또는 DaVinci Resolve(무료) | 구간 연결·속도 조절·루프·색 보정·내보내기 | 6장 사양대로 출력 | 무료 |

- **권장 경로**: 장면 사진 8장 → **Kling 4.0 다중 키프레임으로 1차 시안**(빠르고 저렴) → 품질이 아쉬운 구간만 **Veo 3.1 시작·끝 프레임**으로 다시 생성해 교체.
- 앱 안의 키프레임 최대 장수가 8장보다 적으면 **K1–K5, K5–K8 두 편**으로 나눠 생성 후 연결합니다.
- 앱 기능·가격은 빠르게 바뀝니다. 결제 전 앱 화면에서 "Multiple keyframes / Start & end frame" 메뉴를 확인하세요.

## 2. 보안 원칙 (반드시)

| 구분 | 원칙 |
|------|------|
| 실제 사진 업로드 | **가소·염색 설비, 약품, 용기 라벨, 온도·시간 표시가 보이는 사진은 절대 올리지 않습니다.** 클라우드 AI(특히 무료 요금제)는 업로드 이미지를 학습에 쓸 수 있습니다 |
| 실물 사진 가능 범위 | 배지·포트 겉모습, 완성 매트, 완성 원단 — 공개해도 되는 것만 |
| 가소(안정화) 장면 | **도식으로만**: 매트가 빛의 면을 통과하며 단단해지는 표현. 액체·약품·장비 묘사 금지 |
| 염색 장면 | 색이 매트 위로 번지는 표현만 (드럼·염료 통·약품 금지) |

## 3. 공통 스타일 (모든 이미지·영상 프롬프트 끝에 붙임)

```
Cinematic macro product film for a luxury leather-alternative brand. Warm neutral palette of bone, cream, umber and deep burgundy (#4b1420). Soft directional key light from upper left, gentle falloff, shallow depth of field, 35mm anamorphic look, subtle film grain, clean minimal set on a warm grey surface. Photorealistic, 4K, no text, no logos, no labels, no human faces.
```

**네거티브 프롬프트** (입력 칸이 있는 앱만)
```
text, watermark, logo, labels, numbers, gauges, chemical bottles, lab equipment, human faces, cartoon, CGI look, plastic sheen, green or black mold spots, dirty, low resolution, flicker, distorted hands, extra fingers
```

## 4. 키프레임 8장 — 이미지 생성 프롬프트

> 16:9(1920×1080)로 생성. 휴대폰용은 같은 프롬프트로 9:16 한 벌 더 (중앙 피사체 유지).

| # | 장면 | 프롬프트 (영문 그대로 입력 + 3장 공통 스타일) |
|:-:|------|------|
| **K1** | 분쇄 배지를 포트에 적재 | `Macro shot: finely ground golden-brown sawdust and grain substrate pouring in a soft stream into a clear cylindrical glass cultivation pot, particles catching warm light, the pot two-thirds full, dark background.` |
| **K2** | 배양실 케이스에 적재 | `A row of identical clear glass cultivation pots filled with pale brown substrate, neatly arranged on a stainless steel shelf inside a calm, dim incubation cabinet, soft warm side light, symmetrical composition, slight haze, no labels.` |
| **K3** | 균사 활성화 | `Extreme close-up top view of the substrate surface inside a glass pot: fine white mycelium threads beginning to spread outward in delicate branching patterns, glowing softly in raking light, early growth stage.` |
| **K4** | 두꺼운 균사 매트 | `Top view of a glass cultivation pot completely covered by a thick, smooth, velvety white mycelium mat, slightly domed, uniform cotton-like texture, soft even light, pristine and clean.` |
| **K5** | 수득 | `Gloved hands in white nitrile gloves gently lifting a single intact sheet of cream-white mycelium mat out of a cultivation tray, the sheet bending softly under its own weight, shallow depth of field, hands only, no face.` |
| **K6** | 가소(도식) | `A single cream mycelium sheet floating horizontally in a dark minimal space, passing through a thin vertical plane of warm golden light; where the light has passed, the surface becomes smoother, denser and slightly lustrous, abstract and elegant, no equipment.` |
| **K7** | 염색 | `The cream mycelium sheet absorbing deep burgundy colour that spreads across it in a slow, organic wave from one edge, the boundary soft and feathered, half cream half burgundy, top light, macro detail of the fibres.` |
| **K8** | 후가공 완성 | `A finished deep burgundy leather-like sheet with a fine natural pebble grain, softly folding over itself, raking light revealing the grain texture, rich and luxurious, dark background.` ← 현재 사이트 히어로 사진과 같은 톤 |

## 5. 영상 프롬프트

### 5-1. Kling 4.0 — 다중 키프레임 한 편 (권장)

설정: 키프레임 K1→K8 순서대로 업로드 · 길이 최대(약 30초) · 1080p · 16:9 · **오디오 끔** · 카메라 움직임 "slow"

**전체 프롬프트**
```
One continuous, slow cinematic camera move that follows the transformation of a material: ground substrate fills a glass cultivation pot, the pots rest in a calm incubation cabinet, white mycelium grows across the surface into a thick velvety mat, gloved hands lift the mat as one intact sheet, the sheet passes through a plane of warm light and becomes smooth and dense, deep burgundy colour flows across it, and it becomes a finished pebble-grain leather-like sheet. Seamless morphing between every stage, no cuts, the camera always gently pushing in, elegant and calm, luxury brand film.
```

**구간별 동작** (키프레임 사이 입력 칸)
| 구간 | 동작 프롬프트 |
|------|------|
| K1→K2 | `The pouring substrate settles; the camera pulls back and the single pot multiplies into a neat row of pots on a steel shelf.` |
| K2→K3 | `The camera glides into one pot and tilts down to the substrate surface; first white threads appear and branch outward (time-lapse feel).` |
| K3→K4 | `Time-lapse: the white threads multiply and merge until the surface is a thick, smooth, velvety white mat.` |
| K4→K5 | `Gloved hands enter frame and lift the whole mat in one piece; it bends softly under its own weight.` |
| K5→K6 | `The lifted sheet morphs into a sheet floating in dark space, drifting slowly through a thin plane of golden light that smooths and densifies it.` |
| K6→K7 | `From one edge, deep burgundy colour flows across the sheet in a slow organic wave.` |
| K7→K8 | `The colour settles, a fine pebble grain emerges under raking light, and the sheet softly folds over itself — finished luxury material.` |

### 5-2. Veo 3.1 (Google Flow) — 구간별 7편

설정: **Frames to Video** · 시작 프레임 Kn · 끝 프레임 Kn+1 · 8초 · 1080p(최종 컷만 4K) · 16:9
각 구간 프롬프트 = 위 표의 해당 구간 문구 + 아래 꼬리 문구

```
Seamless continuous transformation from the first frame to the last frame, no cuts, slow gentle camera push-in, photorealistic macro, soft warm light, calm and elegant. Ambient: near silence.
```
- 소리는 편집에서 제거합니다 (사이트 영상은 무음 자동 재생).
- 색감이 구간마다 달라지면 **Ingredients(참고 이미지)** 에 K4·K8 과 현재 히어로 사진을 넣어 고정합니다.

## 6. 편집·출력 사양 (사이트 적용 기준)

| 항목 | 사양 |
|------|------|
| 길이 | 원본 25–30초 → 히어로용 **14–18초** (균사 성장 구간은 1.6–2배속, 수득·염색·완성은 원속도) |
| 끝 처리 | K8(완성 원단)에서 1.5초 정지 → 0.5초 디졸브로 K1 시작 (무한 반복이 이어 보이게) |
| 소리 | 제거 (무음) |
| 데스크톱 | 1920×1080, MP4(H.264, CRF 23–25, `+faststart`), **4 MB 이하** |
| 휴대폰 | 1080×1350(4:5) 또는 1080×1920(9:16), **2 MB 이하** |
| 포스터 | K8 정지 화면 1장 (WebP, 150 KB 이하) — 영상 로딩 전·동작 줄이기 설정 방문자용 |
| 글자 | 영상 안에 넣지 않음 (사이트 문구가 위에 올라가며 영/한 전환) |

CapCut 내보내기: 해상도 1080p · 프레임 24 또는 30 · 품질 "권장" → 용량이 크면 비트레이트 4–6 Mbps 로 낮춤.

## 7. 사이트 적용

완성 파일(데스크톱 영상·휴대폰 영상·포스터)을 주시면, 히어로에 영상 재생 기능과 운영 도구 업로드 칸(영상·포스터 교체)을 붙여 적용합니다. 영상이 없거나 '동작 줄이기' 설정 방문자에게는 지금의 원단 사진이 그대로 보입니다.
