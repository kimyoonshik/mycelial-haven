---
name: 008-hwp-document
description: 기본 문서 형식은 한글(HWP)이다. 보고서, 계획서, 시행계획서, 개요, 기획안, 제안서, 공문, 계약서, 회의록, 검토서, 정부·R&D 사업 서류 등 문서 파일을 만들거나 "문서화해줘", "정리해서 파일로 줘"라는 요청을 받으면, 사용자가 다른 형식을 지정하지 않는 한 항상 이 스킬로 .hwp 파일을 만든다. Word(.docx)를 HWP로 변환할 때와 HWP 파일 내용을 읽을 때도 사용한다. Default document format for this user is Hangul HWP; use for any written document deliverable unless another format is requested. Slides and spreadsheets are out of scope.
---

# HWP 문서 작성 (008-hwp-document)

이 사용자의 문서는 별도 지시가 없어도 **한글(.hwp) 파일**로 만든다.
사용자가 .docx·.md·PDF 등을 명시하면 그 형식을 따른다. 발표 자료(PPT)와 표 계산(엑셀)은 이 스킬 대상이 아니다.

아래에서 `SKILL_DIR`은 이 SKILL.md가 있는 폴더다.

## 1. 준비 확인 (대화에서 처음 쓸 때 한 번)

```bash
python3 SKILL_DIR/make_hwp.py --check
```

- `ready`가 나오면 진행한다.
- Java가 없으면 스크립트가 PyPI의 `jdk4py`(Java 실행 환경)를 설치해 쓴다. 그래도 실패하면 HWP를 만들 수 없다고 사용자에게 그대로 알리고, 다른 형식으로 만들지 여부를 묻는다. 몰래 .docx로 바꿔 내지 않는다.

## 2. 새 문서 작성

`hwpdsl.py`로 내용을 짜고 `make_hwp.build()`로 저장한다. 저장과 동시에 구조 검증이 돈다.

```python
import sys; sys.path.insert(0, 'SKILL_DIR')
from hwpdsl import *
from make_hwp import build

B = [
    title_bar('문서 제목', '부제 또는 기관명'),
    meta('2026. 11. 13. / 작성: ○○○'),
    h1('1. 추진 배경'),
    box('목적', '한 줄 요지'),
    circle('세부 내용', lead='핵심어'),
    dash('하위 항목'),
    note('참고·주석'),
    h1('2. 세부 계획'),
    table([2000, 7638], ['구분', '내용'], [
        ['1단계', '준비'],
        ['2단계', ['여러 줄 셀은', '리스트로 쓴다']],
    ]),
]
build(document(B), '출력경로/문서명.hwp')
```

### 작성 도구 요약

| 함수 | 모양 |
|---|---|
| `title_bar(제목, 부제=None)` | 남색 띠 제목 (표 1칸) |
| `meta(텍스트)` | 오른쪽 정렬 작성일·작성자 |
| `h1(텍스트)` | 장 제목 (예: `1. 추진 배경`) |
| `box(굵은 머리말, 이어지는 글=None)` | □ 단계 |
| `circle(텍스트, lead=None)` | ○ 단계, `lead`는 굵게 |
| `dash(텍스트)` | - 단계 |
| `note(텍스트)` | ※ 주석 (작은 회색) |
| `table(widths, header, rows, first_col=True, aligns=None)` | 표. `widths` 합계는 반드시 `TEXT_W`(9638), 셀에 리스트를 주면 여러 줄 |
| `spacer(pt)` | 빈 간격 |
| `para(runs, ...)`, `run(텍스트, sz=반포인트, b=굵게, color='RRGGBB')` | 자유 문단 |
| `document(blocks)` | A4, 여백 20mm, 하단 쪽 번호 |

### 문체·양식 (정부·R&D 문서 관행)

- □ → ○ → - → ※ 순서의 개조식으로 쓰고, 문장은 짧게 끊는다 (예: "~ 추진", "~ 필요").
- 날짜는 `2026. 11. 13.` 형식, 금액은 `1,234만원`·`12,345,000원`처럼 천 단위 쉼표를 쓴다.
- 비교·일정·예산은 표로 정리한다.
- 확인되지 않은 사실은 "확인 필요"로 표시한다.

## 3. Word(.docx) → HWP 변환

```bash
python3 SKILL_DIR/make_hwp.py 입력.docx 출력.hwp
```

## 4. HWP 읽기

```bash
python3 SKILL_DIR/hwp2md.py 파일.hwp     # 표 포함 마크다운
python3 SKILL_DIR/hwp2txt.py 파일.hwp    # 본문 텍스트
```

## 5. 저장과 전달

- 사용자에게 줄 파일은 이 환경이 파일을 전달하는 위치에 저장한다 (claude.ai 대화: `/mnt/user-data/outputs/`).
- 파일명은 한글로 내용을 알 수 있게 짓는다 (예: `마이코젠_연구개발전담부서_설치계획.hwp`).
- 전달할 때 구조 검증 결과(오류 0건)를 알리고, 한글 프로그램에서 직접 열어 확인하지는 못했다는 점을 함께 적는다.

## 한계

- 글꼴은 맑은 고딕 한 가지, 장평·자간 지정 없음
- 중첩 표, 그림, 머리말·꼬리말 문구 미지원 (하단 쪽 번호만 지원)
- 셀 높이는 추정값이며 한글이 열 때 다시 배치한다
