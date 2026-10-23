@echo off
chcp 65001 >nul
title 로또 6/45 기대값 최적화 번호 생성기
cd /d "%~dp0"

rem ---- Python 3 찾기 (py 런처 → python → python3) ----
set "PY="
py -3 -c "import sys" >nul 2>&1 && set "PY=py -3"
if not defined PY ( python -c "import sys" >nul 2>&1 && set "PY=python" )
if not defined PY ( python3 -c "import sys" >nul 2>&1 && set "PY=python3" )
if not defined PY (
    echo.
    echo  [오류] Python 3 가 설치되어 있지 않습니다.
    echo         https://www.python.org/downloads/ 에서 설치하고,
    echo         설치 화면에서 "Add python.exe to PATH" 를 반드시 체크하세요.
    echo.
    start "" "https://www.python.org/downloads/"
    pause
    exit /b 1
)

rem ---- 인수가 있으면 메뉴 없이 바로 실행 (예: lotto.bat weekly / lotto.bat check --round 1247) ----
if not "%~1"=="" (
    %PY% lotto_ev.py %*
    exit /b %errorlevel%
)

:menu
cls
echo.
echo  ==================================================
echo    로또 6/45 기대값 최적화 번호 생성기 (개인용)
echo  ==================================================
echo    [1] 데이터 갱신          동행복권 최신 회차 받기
echo    [2] 구매 조합 20개       이번 주 추천 조합 생성
echo    [3] 보관용 조합 1,000개  추첨 후 대조용 (실구매 없음)
echo    [4] 결과 대조            추첨 후 20개 + 1,000개 채점
echo    [5] 주간 루틴 전체       갱신 - 대조 - 생성 - 보고서
echo    [6] 통계 검정            추첨 균등성/독립성/전략 백테스트
echo    [7] 모델 재보정          번호 선호도 모델 다시 적합
echo    [8] 백테스트             최근 52회차 모의 성적
echo    [0] 종료
echo.
echo    * 당첨 확률은 어떤 조합이든 같습니다. 이 프로그램은 당첨 시
echo      분할 인원이 적을 조합을 골라 기대 당첨금을 높일 뿐입니다.
echo.
set "sel="
set /p "sel= 선택: "
if "%sel%"=="1" goto update
if "%sel%"=="2" goto generate
if "%sel%"=="3" goto vault
if "%sel%"=="4" goto check
if "%sel%"=="5" goto weekly
if "%sel%"=="6" goto verify
if "%sel%"=="7" goto calibrate
if "%sel%"=="8" goto backtest
if "%sel%"=="0" exit /b 0
goto menu

:update
%PY% lotto_ev.py update
goto done

:generate
if not exist "data\model.json" %PY% lotto_ev.py calibrate
%PY% lotto_ev.py generate -n 20
goto done

:vault
if not exist "data\model.json" %PY% lotto_ev.py calibrate
%PY% lotto_ev.py vault -n 1000
goto done

:check
set "r="
set /p "r= 대조할 회차 번호: "
if "%r%"=="" goto menu
%PY% lotto_ev.py update
%PY% lotto_ev.py check --round %r%
goto done

:weekly
%PY% lotto_ev.py weekly
goto done

:verify
%PY% lotto_ev.py verify
goto done

:calibrate
%PY% lotto_ev.py calibrate
goto done

:backtest
%PY% lotto_ev.py backtest --rounds 52
goto done

:done
echo.
pause
goto menu
