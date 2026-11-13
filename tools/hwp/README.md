# HWP 문서 생성 도구

정부·R&D 사업 문서를 한글(HWP 5.0) 파일로 만드는 도구입니다.
문서 내용을 중간 JSON으로 만든 뒤, Java 빌더(hwplib 기반)가 HWP로 씁니다.

이 폴더는 claude.ai 스킬 `008-hwp-document`의 원본이기도 합니다. 사용법은 `SKILL.md`에 있습니다.

## 준비 확인

```bash
python3 make_hwp.py --check
```

처음 실행하면 `java/build.sh`가 Maven Central에서 hwplib 1.1.11과 gson 2.10.1을 받아 컴파일합니다(Java 11 이상).
Java가 없으면 PyPI의 `jdk4py`를 설치해 씁니다.

## 만드는 방법

새 문서는 `hwpdsl.py`로 내용을 짜고 `make_hwp.build()`로 저장합니다(`example.py`, `SKILL.md` 참고).
저장할 때 구조 검증까지 자동으로 합니다. 한글 파일명도 그대로 쓸 수 있습니다.

```bash
python3 make_hwp.py 입력.json 출력.hwp    # 중간 JSON → HWP
python3 make_hwp.py 입력.docx 출력.hwp    # Word → HWP
```

## 스킬 묶음 만들기

```bash
python3 package_skill.py
```

`dist/008-hwp-document.zip`이 만들어집니다. claude.ai 설정의 스킬 메뉴에 올리면 모든 대화에서 쓸 수 있습니다.
도구를 고친 뒤에는 이 명령으로 다시 묶어 새로 올립니다.

## 파일

| 파일 | 역할 |
|---|---|
| `SKILL.md` | 스킬 설명서 (Claude가 읽는 사용법) |
| `make_hwp.py` | 한 번에 만들기: JSON·Word → HWP, 구조 검증, Java 확인 |
| `package_skill.py` | 스킬 zip 묶기 |
| `hwpdsl.py` | 공문서 양식(□ ○ - ※, 표, 제목 띠, A4, 쪽 번호)으로 중간 JSON을 만드는 작성 도구 |
| `docx2json.py` | Word(.docx) → 중간 JSON (글자·문단 서식, 글머리, 표 병합·테두리·음영, 쪽 번호) |
| `java/src/main/java/Json2Hwp.java` | 중간 JSON → HWP 5.0 |
| `validate_hwp.py` | HWP 구조 검증기 (한글이 "손상된 파일"로 판정하는 불일치 검사) 및 본문 추출 |
| `hwp2txt.py`, `hwp2md.py` | HWP 본문을 텍스트·마크다운(표 포함)으로 읽기 |
| `java/src/main/java/Profile.java` | HWP 서식 분석(글꼴·문단·표·셀)을 JSON으로 출력 |
| `java/src/main/java/Dump.java`, `ReadBack.java` | 디버깅용 구조 덤프·재읽기 |

## 알려진 한계

- 글꼴은 맑은 고딕 한 가지이며 장평·자간은 지정하지 않습니다.
- 중첩 표, 그림, 머리말은 지원하지 않습니다.
- 셀 높이는 추정값이며 한글이 열 때 다시 배치합니다.
- 검증기는 구조만 확인합니다. 최종 모양은 한글에서 열어 확인해야 합니다.
