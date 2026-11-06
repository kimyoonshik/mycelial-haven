# MYCOGEN 로고 CI 파일

웹사이트 머리글의 로고(균사 네트워크 심볼과 MYCOGEN 글자)를 실제 CI로 쓸 수 있게 만든 원본 파일입니다.
사용 규칙은 **`mycogen_CI_guide.pdf`**(A4 2쪽)에 정리했습니다.

| 폴더 | 형식 | 용도 |
|---|---|---|
| `svg/` | 벡터 | 웹사이트, 디자인 프로그램(일러스트레이터·피그마) |
| `pdf/` | 벡터 | 인쇄소 전달용. 일러스트레이터에서 열어 AI·EPS로 저장할 수 있음 |
| `png/` | 투명 배경 고해상도 | 문서·PPT·SNS |

PNG 크기는 다음과 같습니다.

- 가로형: 가로 4000px
- 세로형: 가로 3000px
- 심볼: 2048×2048px
- SNS 프로필(`mycogen_sns-profile_1080.png`): 1080×1080px, 어두운 바탕에 금색 심볼

파일 이름 규칙은 `mycogen_[레이아웃]_[색상]`입니다.

- 레이아웃
  - `horizontal`: 가로형(기본)
  - `vertical`: 세로형
  - `symbol`: 심볼만
  - `wordmark`: 글자만
- 색상
  - `color`: 밝은 배경용 — 금색 심볼과 먹색 글자
  - `reverse`: 어두운 배경용 — 금색 심볼과 미색 글자, 웹사이트 첫 화면과 같음
  - `black`: 단색 검정
  - `white`: 단색 흰색

## 기준값

| 항목 | 값 |
|---|---|
| 심볼 | 웹사이트 `src/render.mjs`의 `MARK_SVG`와 같은 형태입니다. 선은 면으로 변환했습니다. |
| 글자 | Jost SemiBold(600), 대문자, 자간 +260입니다. 윤곽선으로 변환해 서체를 설치하지 않아도 됩니다. Jost는 SIL OFL이라 상업적 사용이 무료입니다. |
| 색 | Spore Gold `#E2A93B`, Ink `#23201B`, Off-white `#FBF8F2` |

## 다시 만들기(개발자용)

`source/` 폴더의 스크립트로 이 폴더의 파일을 모두 다시 만들 수 있습니다.

- 필요한 것: Python 3, `fonttools`, `uharfbuzz`, `skia-python`, Node와 Playwright(가이드 PDF용)
- 글꼴: npm `@fontsource/jost`(Jost 600 woff), npm `pretendard`(가이드 본문용)
  - 글꼴 폴더 안에 Jost 패키지는 `package/`로, Pretendard 패키지는 `pret/package/`로 풀어 둡니다.

```bash
python3 source/make_ci.py <jost-latin-600-normal.woff 경로> <출력 폴더>
node source/make_guide.cjs <출력 폴더 절대경로> <글꼴 폴더 절대경로>
```
