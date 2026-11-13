"""Example: write a one-page public-document style overview with hwpdsl.

    python3 example.py example.json
    java -cp "java/out:java/lib/*" Json2Hwp example.json example.hwp
    python3 validate_hwp.py example.hwp
"""
import json
import sys
from hwpdsl import *

B = [
    title_bar('사업 개요(예시)', '작성 예시 문서'),
    meta('2026. 11. 작성'),
    h1('1. 사업 개요'),
    box('목적', '균사체 소재 교육 프로그램 운영'),
    circle('교육 대상과 규모를 정한다', lead='대상'),
    dash('세부 항목은 하이픈 단계로 적는다'),
    note('주석은 작은 회색 글씨로 표시된다'),
    h1('2. 추진 일정'),
    table([2000, 7638], ['기간', '내용'], [
        ['1주차', '사전 준비'],
        ['2~3주차', ['교육 운영', '실습 결과 정리']],
    ]),
]

if __name__ == '__main__':
    json.dump(document(B), open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False)
