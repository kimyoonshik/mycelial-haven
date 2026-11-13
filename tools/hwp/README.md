# HWP 문서 생성 도구

정부·R&D 사업 문서를 한글(HWP 5.0) 파일로 만드는 도구입니다.
문서 내용을 중간 JSON으로 만든 뒤, Java 빌더(hwplib 기반)가 HWP로 씁니다.

## 준비 (세션마다 한 번)

```bash
pip install olefile
bash java/build.sh
```

`build.sh`는 처음 실행할 때 Maven Central에서 hwplib 1.1.11과 gson 2.10.1을 받습니다.
Java 17 이상이 필요합니다.

## 만드는 방법

새 문서 작성은 `hwpdsl.py`로 내용을 짭니다. `example.py`를 참고하세요.

```bash
python3 example.py example.json
java -cp "java/out:java/lib/*" Json2Hwp example.json example.hwp
python3 validate_hwp.py example.hwp
```

Word 문서를 HWP로 바꿀 때는 다음과 같이 실행합니다.

```bash
python3 docx2json.py 입력.docx 중간.json
java -cp "java/out:java/lib/*" Json2Hwp 중간.json 출력.hwp
python3 validate_hwp.py 출력.hwp
```

Java는 한글 파일명을 읽지 못할 수 있으므로 입력·출력 경로는 영문으로 쓰고, 다 만든 뒤 이름을 바꿉니다.

## 파일

| 파일 | 역할 |
|---|---|
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
