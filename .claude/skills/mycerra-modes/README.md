# mycerra-modes

Claude Code 대화창의 입력창 위에 MYCERRA 전문가 모드 버튼 3개를 띄우는 플러그인입니다.

- **균사체 기술**: 버섯균사체 매트 개발·후가공·피니싱 전문가 관점
- **M&A·ESG 금융**: VC·사모펀드·M&A·ESG 분석가 관점
- **PPT 디자인**: IR·제안서 슬라이드 설계·제작 전문가 관점

버튼을 누르면 해당 모드가 켜지고, 이후 답변의 시스템 프롬프트에 그 전문가 관점과 MECE 구조, 존댓말·호칭 규칙이 주입됩니다.
같은 버튼을 다시 누르거나 "해제" 버튼을 누르면 꺼집니다. 숫자 단축키 1, 2, 3, 0을 지원합니다.

버튼이 보이지 않는 화면에서는 슬래시 명령어로 같은 전환이 됩니다.

```
/mode mycelium   # 균사체 기술
/mode finance    # M&A·ESG 금융
/mode ppt        # PPT 디자인
/mode off        # 해제
/mode            # 현재 모드 확인
```

이 폴더는 저장소의 `.claude/skills/` 아래에 있으므로, 이 저장소에서 여는 Claude Code 세션에 자동으로 로드됩니다.
검증: `claude plugin validate .claude/skills/mycerra-modes`, 테스트: `claude plugin test .claude/skills/mycerra-modes`.
