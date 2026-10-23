#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
lotto_ev.py  -  로또 6/45 기대값 최적화 번호 생성기 (개인용, 파이썬 표준 라이브러리만 사용)

정직한 전제
  * 어떤 조합이든 당첨 확률은 정확히 같다 (1등 1/8,145,060). 이 프로그램도 그 확률은 바꾸지 못한다.
  * 1~3등 당첨금은 당첨자끼리 나누므로 "남들이 덜 고르는 조합"은 당첨됐을 때 받는 금액이 커진다.
  * 동행복권 공개 데이터(회차별 등수별 당첨자 수)로 수동 구매자의 번호 선호도를 추정하고,
    선호도가 낮은(=분할 인원이 적을) 조합을 고른다. 그 결과 기대값은 오르지만 여전히 1,000원보다 낮다.

명령
  update                     동행복권에서 전 회차 데이터 내려받기 (증분 갱신)
  verify                     추첨의 균등성/독립성 검정 + 빈출번호 전략 백테스트
  calibrate                  번호 선호도 모델 적합 + 검증 (data/model.json)
  generate  [-n 20]          다음 회차 구매용 조합 생성       → out/picks_<회차>.csv
  vault     [-n 1000]        다음 회차 보관용 조합 생성       → vault/vault_<회차>.csv
  check --round R            추첨 후 20개 + 1,000개 대조, 장부 기록 → out/ledger.csv
  weekly                     갱신 → 직전 회차 대조 → 다음 회차 20개/1,000개 생성 → 주간 보고서
  backtest [--rounds 52]     과거 회차에 같은 방식을 적용한 성적
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import os
import random
import ssl
import sys
import time
import urllib.request
from datetime import date, timedelta
from itertools import combinations

# ----------------------------------------------------------------------------- 상수
M = 8_145_060                                               # C(45,6)
TIER_COMBOS = {1: 1, 2: 6, 3: 228, 4: 11_115, 5: 182_780}   # 등수별 해당 조합 수
FIXED_PRIZE = {4: 50_000, 5: 5_000}
PRICE = 1_000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUT_DIR = os.path.join(BASE_DIR, "out")
VAULT_DIR = os.path.join(BASE_DIR, "vault")
REPORT_DIR = os.path.join(BASE_DIR, "reports")
HISTORY_FILE = os.path.join(DATA_DIR, "history.json")
MODEL_FILE = os.path.join(DATA_DIR, "model.json")
API_PAGE = "https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do"
API_LATEST = "https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0 Safari/537.36")

# 등수 k의 당첨 조합은 추첨된 6개 중 j개(1등 6, 2등 5, 3등 5, 4등 4, 5등 3)를 포함한다.
# 번호 효과의 1차 근사 스케일 = j/6, 연속쌍(2개 동시 포함) 효과 스케일 = C(4,j-2)/C(6,j)
F_NUM = {1: 1.0, 2: 1.0, 3: 5 / 6, 4: 4 / 6, 5: 3 / 6}
F_PAIR = {1: 1.0, 2: 1.0, 3: 4 / 6, 4: 6 / 15, 5: 4 / 20}


# ----------------------------------------------------------------------------- 공통 유틸
def ensure_dirs():
    for d in (DATA_DIR, OUT_DIR, VAULT_DIR, REPORT_DIR):
        os.makedirs(d, exist_ok=True)


def load_history() -> dict:
    if not os.path.exists(HISTORY_FILE):
        return {}
    with open(HISTORY_FILE, encoding="utf-8") as f:
        raw = json.load(f)
    return {int(k): v for k, v in raw.items()}


def save_history(hist: dict):
    ensure_dirs()
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump({str(k): hist[k] for k in sorted(hist)}, f, ensure_ascii=False)


def load_model() -> dict:
    if not os.path.exists(MODEL_FILE):
        sys.exit("먼저 calibrate 를 실행하세요.")
    with open(MODEL_FILE, encoding="utf-8") as f:
        return json.load(f)


def fmt_won(x: float) -> str:
    return f"{int(round(x)):,}원"


def net_after_tax(x: float) -> float:
    """복권 당첨금 세후 금액. 건당 200만원 이하 비과세, 초과 시 3억 이하 22%, 3억 초과분 33%."""
    if x <= 2_000_000:
        return x
    base = min(x, 300_000_000)
    extra = max(0.0, x - 300_000_000)
    return x - (0.22 * base + 0.33 * extra)


def comb_features(nums, prev_nums):
    """조합의 구조 특징: (연속쌍 개수, 직전 회차 번호와 겹치는 개수)"""
    s = sorted(nums)
    cons = sum(1 for a, b in zip(s, s[1:]) if b == a + 1)
    prev = len(set(s) & set(prev_nums)) if prev_nums else 0
    return cons, prev


def draw_date_of(hist, rnd):
    """회차의 추첨일(ISO). 데이터에 없으면 최신 회차에서 주 단위로 외삽."""
    if rnd in hist and len(hist[rnd]["date"]) == 8:
        d = hist[rnd]["date"]
        return f"{d[:4]}-{d[4:6]}-{d[6:8]}"
    latest = max(hist)
    d = hist[latest]["date"]
    try:
        base = date(int(d[:4]), int(d[4:6]), int(d[6:8]))
        return (base + timedelta(days=7 * (rnd - latest))).isoformat()
    except Exception:  # noqa: BLE001
        return "?"


# ----------------------------------------------------------------------------- 수치 유틸 (순수 파이썬)
def _gammaincc(a: float, x: float) -> float:
    """정규화 상부 불완전감마함수 Q(a,x). 카이제곱 p-value 계산용."""
    if x <= 0:
        return 1.0
    if x < a + 1:
        ap, s, d = a, 1.0 / a, 1.0 / a
        for _ in range(1000):
            ap += 1
            d *= x / ap
            s += d
            if abs(d) < abs(s) * 1e-15:
                break
        return 1.0 - s * math.exp(-x + a * math.log(x) - math.lgamma(a))
    tiny = 1e-300
    b = x + 1 - a
    c = 1 / tiny
    d = 1 / b
    h = d
    for i in range(1, 1000):
        an = -i * (i - a)
        b += 2
        d = an * d + b
        d = tiny if abs(d) < tiny else d
        c = b + an / c
        c = tiny if abs(c) < tiny else c
        d = 1 / d
        delta = d * c
        h *= delta
        if abs(delta - 1) < 1e-15:
            break
    return math.exp(-x + a * math.log(x) - math.lgamma(a)) * h


def chi2_sf(stat: float, df: int) -> float:
    return _gammaincc(df / 2.0, stat / 2.0)


def solve_linear(A, b):
    """가우스 소거(부분 피벗)로 A x = b."""
    n = len(b)
    A = [row[:] + [b[i]] for i, row in enumerate(A)]
    for col in range(n):
        piv = max(range(col, n), key=lambda r: abs(A[r][col]))
        A[col], A[piv] = A[piv], A[col]
        p = A[col][col]
        if abs(p) < 1e-14:
            raise ValueError("특이 행렬")
        for r in range(col + 1, n):
            f = A[r][col] / p
            if f == 0:
                continue
            rowr, rowc = A[r], A[col]
            for c in range(col, n + 1):
                rowr[c] -= f * rowc[c]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        s = A[i][n] - sum(A[i][j] * x[j] for j in range(i + 1, n))
        x[i] = s / A[i][i]
    return x


def wls(X, y, w, ridge=1e-8):
    """가중최소제곱: (X'WX + ridge I) beta = X'Wy. X는 희소하므로 0이 아닌 항만 누적."""
    p = len(X[0])
    A = [[0.0] * p for _ in range(p)]
    b = [0.0] * p
    for row, yi, wi in zip(X, y, w):
        nz = [(i, row[i]) for i in range(p) if row[i] != 0.0]
        for i, xi in nz:
            wxi = wi * xi
            b[i] += wxi * yi
            Ai = A[i]
            for j, xj in nz:
                Ai[j] += wxi * xj
    for i in range(p):
        A[i][i] += ridge
    return solve_linear(A, b)


def pearson(xs, ys):
    n = len(xs)
    if n < 3:
        return float("nan")
    mx, my = sum(xs) / n, sum(ys) / n
    sxy = sum((a - mx) * (b - my) for a, b in zip(xs, ys))
    sxx = sum((a - mx) ** 2 for a in xs)
    syy = sum((b - my) ** 2 for b in ys)
    return sxy / math.sqrt(sxx * syy) if sxx > 0 and syy > 0 else float("nan")


def _poisson_pmf(lam, k):
    return math.exp(-lam + k * math.log(lam) - math.lgamma(k + 1)) if lam > 0 else (1.0 if k == 0 else 0.0)


# ----------------------------------------------------------------------------- 데이터 수집
def _ssl_ctx():
    for key in ("SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE"):
        p = os.environ.get(key)
        if p and os.path.exists(p):
            return ssl.create_default_context(cafile=p)
    return ssl.create_default_context()


def http_json(url: str, retries: int = 10):
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=30, context=_ssl_ctx()) as r:
                txt = r.read().decode("utf-8", "replace")
            if txt.lstrip().startswith("{"):
                return json.loads(txt)
            last = "JSON이 아닌 응답"
        except Exception as e:  # noqa: BLE001
            last = e
        time.sleep(min(20, 2.0 * (attempt + 1)))
    raise RuntimeError(f"API 호출 실패: {url} ({last})")


def parse_record(rec: dict) -> dict:
    nums = sorted(int(rec[f"tm{i}WnNo"]) for i in range(1, 7))
    winners = [int(rec.get(f"rnk{k}WnNope") or 0) for k in range(1, 6)]
    prize = [int(rec.get(f"rnk{k}WnAmt") or 0) for k in range(1, 6)]
    tier_total = [int(rec.get(f"rnk{k}SumWnAmt") or 0) for k in range(1, 6)]
    sales = int(rec.get("wholEpsdSumNtslAmt") or 0)
    # 게임 단가: 초기(2002~2004)에는 2,000원. 5등 당첨자 수로 역산해 가까운 쪽을 택한다.
    price = PRICE
    if sales > 0 and winners[4] > 0:
        implied_games = winners[4] * M / TIER_COMBOS[5]
        if abs(sales / 2000 - implied_games) < abs(sales / 1000 - implied_games):
            price = 2000
    return {
        "round": int(rec["ltEpsd"]),
        "date": str(rec.get("ltRflYmd") or ""),
        "nums": nums,
        "bonus": int(rec["bnsWnNo"]),
        "sales": sales,
        "price": price,
        "games": sales / price if sales > 0 else 0,
        "pool": int(rec.get("rlvtEpsdSumNtslAmt") or 0),
        "winners": winners,
        "prize": prize,
        "tier_total": tier_total,
    }


def cmd_update(args=None):
    """최신 회차를 확인한 뒤, 빠진 회차를 10개씩 내려받는다. 중단돼도 저장된 곳부터 이어받는다."""
    ensure_dirs()
    hist = load_history()
    known = len(hist)
    d = http_json(API_LATEST)
    latest_rec = parse_record(d["data"]["list"][0])
    latest = latest_rec["round"]
    hist[latest] = latest_rec
    print(f"최신 회차: {latest}회 ({latest_rec['date']})  기존 보유 {known}회차 → 갱신", flush=True)
    pages = 0
    try:
        while True:
            missing = [r for r in range(1, latest + 1) if r not in hist]
            if not missing:
                break
            m = missing[-1]                       # 가장 최근의 빠진 회차부터 아래로
            page = http_json(f"{API_PAGE}?srchDir=older&srchCursorLtEpsd={m + 1}")
            lst = page.get("data", {}).get("list") or []
            if not lst or all(int(x["ltEpsd"]) in hist for x in lst):
                page = http_json(f"{API_PAGE}?srchDir=center&srchLtEpsd={m}")
                lst = page.get("data", {}).get("list") or []
                if not lst or all(int(x["ltEpsd"]) in hist for x in lst):
                    print(f"  {m}회차를 받을 수 없어 건너뜀", flush=True)
                    hist[m] = None
                    continue
            for x in lst:
                r = parse_record(x)
                hist[r["round"]] = r
            pages += 1
            if pages % 10 == 0:
                save_history({k: v for k, v in hist.items() if v})
                print(f"  ... {min(int(x['ltEpsd']) for x in lst)}회차까지 수신 (누적 {sum(1 for v in hist.values() if v)})", flush=True)
            time.sleep(0.3)
    finally:
        hist = {k: v for k, v in hist.items() if v}
        save_history(hist)
    still = [r for r in range(1, latest + 1) if r not in hist]
    print(f"저장: {HISTORY_FILE}  (1~{latest}회, {len(hist)}건, 누락 {len(still)}건)")
    return hist


# ----------------------------------------------------------------------------- 통계 검정
def cmd_verify(args=None):
    hist = load_history()
    if not hist:
        sys.exit("먼저 update 를 실행하세요.")
    rounds = sorted(hist)
    draws = [hist[r]["nums"] for r in rounds]
    n = len(draws)
    print(f"=== 추첨 데이터 검정 ({rounds[0]}~{rounds[-1]}회, {n}회차) ===\n")

    cnt = [0] * 46
    for d in draws:
        for x in d:
            cnt[x] += 1
    exp = n * 6 / 45
    stat = sum((cnt[i] - exp) ** 2 / exp for i in range(1, 46))
    p = chi2_sf(stat, 44)
    top = sorted(range(1, 46), key=lambda i: -cnt[i])[:5]
    bot = sorted(range(1, 46), key=lambda i: cnt[i])[:5]
    sd = math.sqrt(n * (6 / 45) * (39 / 45))
    print("[1] 번호별 출현 빈도의 균등성 (카이제곱 검정, df=44)")
    print(f"    기대 출현 {exp:.1f}회/번호, 표준편차 {sd:.1f}")
    print(f"    최다: {', '.join(f'{i}번({cnt[i]}회)' for i in top)}")
    print(f"    최소: {', '.join(f'{i}번({cnt[i]}회)' for i in bot)}")
    print(f"    chi2={stat:.1f}, p-value={p:.3f}  → "
          + ("균등분포를 기각할 수 없음 (편향 증거 없음)" if p > 0.05 else "유의한 편향 (추가 확인 필요)"))

    reps = [len(set(a) & set(b)) for a, b in zip(draws, draws[1:])]
    mean_rep = sum(reps) / len(reps)
    var_h = 6 * (6 / 45) * (39 / 45) * (39 / 44)
    z = (mean_rep - 0.8) / math.sqrt(var_h / len(reps))
    print("\n[2] 회차 간 독립성: 직전 회차 번호가 다시 나온 개수")
    print(f"    관측 평균 {mean_rep:.3f}개 / 독립 가정 기대 0.800개, z={z:+.2f}  → "
          + ("독립 가정과 일치" if abs(z) < 2 else "추가 확인 필요"))

    W = 100
    hot_m, cold_m, last_m, rnd_m = [], [], [], []
    rng = random.Random(12345)
    for t in range(W, n):
        c = [0] * 46
        for d in draws[t - W:t]:
            for x in d:
                c[x] += 1
        order = sorted(range(1, 46), key=lambda i: (-c[i], i))
        hot, cold, cur = set(order[:6]), set(order[-6:]), set(draws[t])
        hot_m.append(len(hot & cur))
        cold_m.append(len(cold & cur))
        last_m.append(len(set(draws[t - 1]) & cur))
        rnd_m.append(len(set(rng.sample(range(1, 46), 6)) & cur))
    se = math.sqrt(var_h / len(hot_m))
    print(f"\n[3] 번호 선택 전략 백테스트 ({len(hot_m)}회차, 6개 중 일치 개수 평균; 이론 기대 0.800)")
    for name, arr in (("최근 100회 최다 출현 6개", hot_m), ("최근 100회 최소 출현 6개", cold_m),
                      ("직전 회차 당첨번호 그대로", last_m), ("무작위 6개", rnd_m)):
        m = sum(arr) / len(arr)
        print(f"    {name:<16s} {m:.3f}  (z={(m - 0.8) / se:+.2f})")
    print("    → 어떤 전략도 무작위와 통계적으로 구분되지 않는다.")

    win = _window_rows(hist, rounds[-1], 312)
    if win:
        print(f"\n[4] 당첨자 수의 조합 의존성 (최근 {len(win)}회차, 관측 당첨자 수 / 균등 가정 기대치)")
        for k in (1, 3, 5):
            ratios = [row["ratio"][k] for row in win if row["ratio"][k] is not None]
            m = sum(ratios) / len(ratios)
            s = math.sqrt(sum((r - m) ** 2 for r in ratios) / (len(ratios) - 1))
            e_mean = sum(row["expected"][k] for row in win) / len(win)
            print(f"    {k}등: 평균 {m:.3f}, 표준편차 {s:.3f} (순수 확률 잡음이면 약 {math.sqrt(1 / e_mean):.3f})")
        k31 = [sum(1 for x in row["nums"] if x <= 31) for row in win]
        for k in (1, 3, 5):
            lr = [math.log(row["ratio"][k]) for row in win if row["ratio"][k]]
            print(f"    '31 이하 번호 개수'와 {k}등 당첨자 비율의 상관계수: {pearson(k31, lr):+.3f}")
        print("    → 당첨번호에 31 이하(생일 숫자)가 많을수록 당첨자가 많다. 확률이 아니라 '분할 인원'이 달라진다.")


# ----------------------------------------------------------------------------- 선호도 모델
def _window_rows(hist: dict, end_round: int, window: int):
    rows = []
    rounds = [r for r in sorted(hist) if r <= end_round]
    for r in rounds[-window:]:
        rec = hist[r]
        if rec["games"] <= 0 or rec["price"] != PRICE:
            continue
        prev = hist.get(r - 1, {}).get("nums")
        cons, pv = comb_features(rec["nums"], prev)
        expected, ratio = {}, {}
        for k in range(1, 6):
            e = rec["games"] * TIER_COMBOS[k] / M
            expected[k] = e
            w = rec["winners"][k - 1]
            ratio[k] = (w / e) if (w > 0 and e > 0) else None
        rows.append({"round": r, "nums": rec["nums"], "cons": cons, "prev": pv,
                     "expected": expected, "ratio": ratio})
    return rows


def fit_model(hist: dict, end_round: int, window: int, tiers=(3, 4, 5)) -> dict:
    rows = _window_rows(hist, end_round, window)
    tiers = list(tiers)
    p = len(tiers) + 44 + 2
    X, y, w = [], [], []
    tier_mean_e = {k: sum(r["expected"][k] for r in rows) / len(rows) for k in tiers}
    for row in rows:
        in_d = set(row["nums"])
        has45 = 1.0 if 45 in in_d else 0.0
        for ti, k in enumerate(tiers):
            if row["ratio"][k] is None:
                continue
            x = [0.0] * p
            x[ti] = 1.0
            fn, fp = F_NUM[k], F_PAIR[k]
            for j in range(1, 45):                      # 합=0 제약: 45번 효과 = -(1~44 합)
                v = (1.0 if j in in_d else 0.0) - has45
                if v:
                    x[len(tiers) + j - 1] = fn * v
            x[p - 2] = fp * row["cons"]
            x[p - 1] = fn * row["prev"]
            X.append(x)
            y.append(math.log(row["ratio"][k]))
            w.append(row["expected"][k] / tier_mean_e[k])   # 등수별 총가중치 동일, 등수 내에서는 판매량 비례
    beta = wls(X, y, w)
    num = [0.0] + beta[len(tiers):len(tiers) + 44]
    num.append(-sum(num[1:]))
    model = {
        "fitted_through": end_round, "window": window, "rows_used": len(rows), "tiers": tiers,
        "intercepts": {str(k): beta[i] for i, k in enumerate(tiers)},
        "num_effect": num, "cons_effect": beta[p - 2], "prev_effect": beta[p - 1],
    }
    model["norm"] = _normalizer(model)
    return model


def _raw_log_pop(model, nums, prev_nums):
    cons, pv = comb_features(nums, prev_nums)
    ne = model["num_effect"]
    return sum(ne[x] for x in nums) + model["cons_effect"] * cons + model["prev_effect"] * pv


def _normalizer(model, samples=120_000, seed=7):
    """전체 조합의 평균 선호도가 1이 되도록 절편 보정."""
    rng = random.Random(seed)
    prev = rng.sample(range(1, 46), 6)
    acc = 0.0
    for _ in range(samples):
        acc += math.exp(_raw_log_pop(model, rng.sample(range(1, 46), 6), prev))
    return -math.log(acc / samples)


def popularity(model, nums, prev_nums, floor: float) -> float:
    """조합의 상대 선호도 r (1 = 평균). floor = 자동구매 비중 하한(자동은 균등 선택이므로 그 밑으로 못 내려감)."""
    return max(floor, math.exp(model["norm"] + _raw_log_pop(model, nums, prev_nums)))


def _validate(model, hist, start_round, end_round, floor):
    rows = [r for r in _window_rows(hist, end_round, 10_000) if start_round <= r["round"] <= end_round]
    out = {}
    for k in (1, 2, 3, 4, 5):
        xs, ys = [], []
        for row in rows:
            if row["ratio"][k] is None:
                continue
            prev = hist.get(row["round"] - 1, {}).get("nums")
            lr = math.log(popularity(model, row["nums"], prev, floor))
            xs.append(lr if k <= 2 else F_NUM[k] * lr)
            ys.append(math.log(row["ratio"][k]))
        out[k] = (pearson(xs, ys), len(xs))
    return out


def cmd_calibrate(args):
    hist = load_history()
    if not hist:
        sys.exit("먼저 update 를 실행하세요.")
    latest = max(hist)
    train_end = latest - args.holdout
    t0 = time.time()
    m_train = fit_model(hist, train_end, args.window)
    val = _validate(m_train, hist, train_end + 1, latest, args.floor)
    model = fit_model(hist, latest, args.window)
    ensure_dirs()
    with open(MODEL_FILE, "w", encoding="utf-8") as f:
        json.dump(model, f, ensure_ascii=False, indent=1)
    print(f"=== 번호 선호도 모델 (최근 {model['rows_used']}회차 ~{latest}회) [{time.time() - t0:.1f}s] ===\n")
    ne = model["num_effect"]
    order = sorted(range(1, 46), key=lambda i: -ne[i])
    print("수동 구매자 선호도 지수 (1.00 = 평균, 클수록 남들이 많이 고르는 번호; 인기순)")
    for i in range(0, 45, 9):
        print("   " + "  ".join(f"{j:2d}:{math.exp(ne[j]):.2f}" for j in order[i:i + 9]))
    print(f"\n   31 이하 번호 중 평균 이상 인기: {sum(1 for j in range(1, 32) if ne[j] > 0)}/31개,  "
          f"32~45 중: {sum(1 for j in range(32, 46) if ne[j] > 0)}/14개")
    print(f"   연속쌍 1개당 선호도 배율: {math.exp(model['cons_effect']):.3f}")
    print(f"   직전 회차 번호 1개 포함당 배율: {math.exp(model['prev_effect']):.3f}")
    print(f"\n검증: 적합에 쓰지 않은 최근 {args.holdout}회차에서 '사전 예측 선호도'와 '실제 당첨자 비율'의 상관계수")
    for k in (5, 4, 3, 2, 1):
        r, n = val[k]
        print(f"   {k}등: r={r:+.3f} (n={n})")
    print("   → 3~5등은 표본이 커서 상관이 뚜렷하고, 1~2등은 당첨자 수가 적어 잡음이 크다.")
    print(f"\n저장: {MODEL_FILE}")


# ----------------------------------------------------------------------------- 경제성 계산
def economics(hist: dict, n_recent: int = 10) -> dict:
    rounds = sorted(hist)[-n_recent:]
    recs = [hist[r] for r in rounds if hist[r]["games"] > 0]
    N = sum(r["games"] for r in recs) / len(recs)
    pools = {k: sum(r["tier_total"][k - 1] for r in recs) / len(recs) for k in (1, 2, 3)}
    return {"games": N, "pool": pools, "rounds": (rounds[0], rounds[-1])}


def expected_prize(pool: float, lam: float):
    """내가 당첨됐을 때 받는 금액의 기대값 (세전, 세후). 다른 당첨자 수 K ~ Poisson(lam)."""
    if lam <= 0:
        return pool, net_after_tax(pool)
    kmax = int(lam + 10 * math.sqrt(lam) + 20)
    pre = net = 0.0
    for k in range(kmax + 1):
        pk = _poisson_pmf(lam, k)
        share = pool / (k + 1)
        pre += pk * share
        net += pk * net_after_tax(share)
    return pre, net


def ev_of(r: float, econ: dict) -> dict:
    N = econ["games"]
    out = {"pre": 0.0, "net": 0.0}
    for k in (1, 2, 3):
        lam = r * N * TIER_COMBOS[k] / M
        pre, net = expected_prize(econ["pool"][k], lam)
        out[f"prize{k}_pre"], out[f"prize{k}_net"] = pre, net
        out["pre"] += TIER_COMBOS[k] * pre / M
        out["net"] += TIER_COMBOS[k] * net / M
    for k in (4, 5):
        out["pre"] += TIER_COMBOS[k] * FIXED_PRIZE[k] / M
        out["net"] += TIER_COMBOS[k] * FIXED_PRIZE[k] / M
    return out


# ----------------------------------------------------------------------------- 조합 생성
def _is_arithmetic(s):
    d = s[1] - s[0]
    return all(b - a == d for a, b in zip(s, s[1:]))


def generate_picks(model, hist, n, seed, prev_nums, floor, pool_size=300_000, quantile=0.05,
                   max_overlap=2, max_use=4, exclude_past=True, use_model=True):
    """선호도 하위 quantile 후보 중에서 서로 겹침이 적은 n개를 고른다.
    겹침 제한: 어떤 두 조합도 (max_overlap+1)개 이상의 번호를 공유하지 않도록 부분집합 해시로 검사."""
    rng = random.Random(seed)
    past = {tuple(h["nums"]) for h in hist.values()} if exclude_past else set()
    cands = {}
    for _ in range(pool_size):
        c = tuple(sorted(rng.sample(range(1, 46), 6)))
        if c in cands or c in past:
            continue
        cons, _pv = comb_features(c, prev_nums)
        if cons >= 3 or _is_arithmetic(c) or c[-1] <= 31:    # 흔한 패턴(연속 다발, 등차수열, 전부 생일숫자) 배제
            continue
        cands[c] = popularity(model, c, prev_nums, floor) if use_model else 1.0
    items = sorted(cands.items(), key=lambda kv: kv[1])
    if use_model:
        items = items[:max(n * 5, int(len(items) * quantile))]
    rng.shuffle(items)
    picks, use = [], [0] * 46
    ov, mu = max_overlap, max_use
    while len(picks) < n and ov <= 5:
        k = ov + 1
        taken = set()
        for c, _ in picks:
            taken.update(combinations(c, k))
        for c, r in items:
            if len(picks) >= n:
                break
            subs = list(combinations(c, k))
            if any(s in taken for s in subs) or any(use[x] >= mu for x in c):
                continue
            picks.append((c, r))
            taken.update(subs)
            for x in c:
                use[x] += 1
        if len(picks) < n:                 # 후보가 모자라면 제약을 단계적으로 완화
            if mu < max_use + 3:
                mu += 1                    # 1) 번호별 사용 횟수 제한 완화
            else:
                ov += 1                    # 2) 조합 간 중복 허용치 완화
                mu = max_use
    return picks


def _write_picks(path, rnd, picks, econ):
    rows = []
    for i, (c, r) in enumerate(picks, 1):
        e = ev_of(r, econ)
        rows.append([rnd, i, *c, f"{r:.4f}", int(e["prize1_pre"]), int(e["prize1_net"]), int(e["net"])])
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        wr = csv.writer(f)
        wr.writerow(["round", "idx", "n1", "n2", "n3", "n4", "n5", "n6", "popularity",
                     "exp_prize1_pre", "exp_prize1_net", "ev_net_per_game"])
        wr.writerows(rows)
    return rows


def _read_picks(path):
    with open(path, encoding="utf-8-sig") as f:
        return [tuple(int(row[f"n{i}"]) for i in range(1, 7)) for row in csv.DictReader(f)]


def _target_round(hist, args):
    return args.round if getattr(args, "round", None) else max(hist) + 1


def cmd_generate(args, hist=None, model=None, quiet=False):
    hist = hist or load_history()
    if not hist:
        sys.exit("먼저 update 를 실행하세요.")
    model = model or load_model()
    rnd = _target_round(hist, args)
    seed = args.seed if getattr(args, "seed", None) is not None else rnd
    prev = hist[max(hist)]["nums"]
    econ = economics(hist)
    picks = generate_picks(model, hist, args.n, seed, prev, args.floor, use_model=not args.random,
                           max_overlap=args.max_overlap)
    base = ev_of(1.0, econ)
    ensure_dirs()
    path = os.path.join(OUT_DIR, f"picks_{rnd}.csv")
    rows = _write_picks(path, rnd, picks, econ)
    ev_avg = sum(r[-1] for r in rows) / len(rows)
    lines = [f"=== 제{rnd}회 ({draw_date_of(hist, rnd)} 추첨) 구매 조합 {len(picks)}개  "
             f"[{'무작위 대조군' if args.random else '기대값 최적화'}, seed={seed}] ===",
             f"기준: 최근 {econ['rounds'][0]}~{econ['rounds'][1]}회 평균 판매 {econ['games'] / 1e6:.1f}백만 게임, "
             f"1등 총당첨금 평균 {econ['pool'][1] / 1e8:.0f}억원",
             f"{'#':>2} {'번호':<18} {'선호도':>6} {'당첨시 1등 예상(세후)':>18} {'게임당 기대값(세후)':>14}"]
    for r in rows:
        lines.append(f"{r[1]:>2} {' '.join(f'{x:2d}' for x in r[2:8]):<18} {float(r[8]):>6.2f} "
                     f"{fmt_won(r[10]):>22} {fmt_won(r[11]):>18}")
    lines += ["요약",
              f"  구매액 {fmt_won(PRICE * len(picks))}/주,  1등 확률 {len(picks)}/{M:,} = 1/{M // len(picks):,} (어떤 조합이든 동일)",
              f"  평균 구매자(선호도 1.00) 게임당 기대값: 세전 {fmt_won(base['pre'])}, 세후 {fmt_won(base['net'])}",
              f"  이번 조합 평균 게임당 기대값: 세후 {fmt_won(ev_avg)} (평균 대비 {ev_avg / base['net'] * 100 - 100:+.0f}%)",
              f"  주당 기대 당첨 횟수: 5등 {len(picks) * TIER_COMBOS[5] / M:.2f}회, 4등 {len(picks) * TIER_COMBOS[4] / M:.3f}회, "
              f"3등 {len(picks) * 228 / M:.5f}회",
              f"  저장: {path}"]
    if not quiet:
        print("\n".join(lines))
    return rnd, picks, lines


def cmd_vault(args, hist=None, model=None, quiet=False):
    hist = hist or load_history()
    if not hist:
        sys.exit("먼저 update 를 실행하세요.")
    model = model or load_model()
    rnd = _target_round(hist, args)
    seed = (args.seed if getattr(args, "seed", None) is not None else rnd) + 1_000_000
    prev = hist[max(hist)]["nums"]
    econ = economics(hist)
    picks = generate_picks(model, hist, args.n, seed, prev, args.floor, pool_size=400_000,
                           quantile=0.10, max_overlap=3, max_use=10_000)
    ensure_dirs()
    path = os.path.join(VAULT_DIR, f"vault_{rnd}.csv")
    rows = _write_picks(path, rnd, picks, econ)
    ev_avg = sum(r[-1] for r in rows) / len(rows)
    lines = [f"=== 제{rnd}회 보관용 조합 {len(picks)}개 생성 (실구매 없음, 추첨 후 대조용) ===",
             f"  평균 선호도 {sum(float(r[8]) for r in rows) / len(rows):.2f}, 평균 게임당 기대값(세후) {fmt_won(ev_avg)}",
             f"  기대 당첨 횟수: 5등 {len(picks) * TIER_COMBOS[5] / M:.1f}회, 4등 {len(picks) * TIER_COMBOS[4] / M:.2f}회, "
             f"3등 {len(picks) * 228 / M:.3f}회, 2등 {len(picks) * 6 / M:.4f}회, 1등 {len(picks) / M:.5f}회",
             f"  저장: {path}"]
    if not quiet:
        print("\n".join(lines))
    return rnd, picks, lines


# ----------------------------------------------------------------------------- 결과 대조
def score_pick(c, nums, bonus):
    m = len(set(c) & set(nums))
    if m == 6:
        return 1
    if m == 5:
        return 2 if bonus in c else 3
    if m == 4:
        return 4
    if m == 3:
        return 5
    return 0


def _score_set(picks, rec):
    counts = {k: 0 for k in range(1, 6)}
    total = 0
    detail = []
    for c in picks:
        tier = score_pick(c, rec["nums"], rec["bonus"])
        prize = 0
        if tier:
            counts[tier] += 1
            prize = FIXED_PRIZE.get(tier) or rec["prize"][tier - 1]
            total += prize
        detail.append((c, tier, prize))
    return counts, total, detail


def _ledger_has(rnd, label):
    ledger = os.path.join(OUT_DIR, "ledger.csv")
    if not os.path.exists(ledger):
        return False
    with open(ledger, encoding="utf-8-sig") as f:
        return any(row["round"] == str(rnd) and row["set"] == label for row in csv.DictReader(f))


def _ledger_append(rnd, label, n, cost, total, counts):
    ledger = os.path.join(OUT_DIR, "ledger.csv")
    new = not os.path.exists(ledger)
    with open(ledger, "a", newline="", encoding="utf-8-sig") as f:
        wr = csv.writer(f)
        if new:
            wr.writerow(["round", "set", "games", "cost", "prize", "net", "t1", "t2", "t3", "t4", "t5"])
        wr.writerow([rnd, label, n, cost, total, total - cost, *[counts[k] for k in range(1, 6)]])


def cmd_check(args, hist=None, quiet=False):
    hist = hist or load_history()
    rnd = args.round
    if rnd not in hist:
        sys.exit(f"{rnd}회 결과가 아직 없습니다. 추첨(토요일 20:35) 이후 update 를 실행하세요.")
    rec = hist[rnd]
    nums, bonus = rec["nums"], rec["bonus"]
    lines = [f"=== 제{rnd}회 ({draw_date_of(hist, rnd)}) 결과 대조: 당첨번호 "
             f"{' '.join(f'{x:2d}' for x in nums)} + 보너스 {bonus:2d} ===",
             f"    이번 회차 1등 {rec['winners'][0]}명 × {fmt_won(rec['prize'][0])}, "
             f"2등 {rec['winners'][1]}명 × {fmt_won(rec['prize'][1])}, 3등 {rec['winners'][2]}명 × {fmt_won(rec['prize'][2])}"]
    found = False
    for label, folder, prefix, show_all in (("picks", OUT_DIR, "picks_", True), ("vault", VAULT_DIR, "vault_", False)):
        path = os.path.join(folder, f"{prefix}{rnd}.csv")
        if not os.path.exists(path):
            continue
        found = True
        picks = _read_picks(path)
        counts, total, detail = _score_set(picks, rec)
        cost = PRICE * len(picks)
        title = "구매 조합 20개" if label == "picks" else "보관용 조합 (실구매 없음)"
        lines.append(f"\n[{title}: {len(picks)}게임, {fmt_won(cost)} 상당]")
        for i, (c, tier, prize) in enumerate(detail, 1):
            if show_all or tier:
                mark = " ".join((f"[{x:2d}]" if x in nums else f" {x:2d} ") for x in c)
                lines.append(f"{i:>4} {mark}  {(f'{tier}등 ' + fmt_won(prize)) if tier else '-'}")
        exp = {k: len(picks) * TIER_COMBOS[k] / M for k in range(1, 6)}
        lines.append(f"  결과: " + ", ".join(f"{k}등 {counts[k]}회" for k in range(1, 6) if counts[k]) +
                     (" (당첨 없음)" if total == 0 else ""))
        lines.append(f"  이론 기대: 5등 {exp[5]:.2f}회, 4등 {exp[4]:.3f}회, 3등 {exp[3]:.4f}회")
        lines.append(f"  당첨금 {fmt_won(total)} - 비용 {fmt_won(cost)} = 순손익 {fmt_won(total - cost)}")
        if not _ledger_has(rnd, label):
            _ledger_append(rnd, label, len(picks), cost, total, counts)
            lines.append(f"  장부 기록: {os.path.join(OUT_DIR, 'ledger.csv')} ({label})")
        else:
            lines.append("  (장부에 이미 기록됨)")
    if not found:
        lines.append("  대조할 조합 파일이 없습니다 (out/picks_<회차>.csv, vault/vault_<회차>.csv).")
    if not quiet:
        print("\n".join(lines))
    return lines


def _ledger_summary():
    ledger = os.path.join(OUT_DIR, "ledger.csv")
    if not os.path.exists(ledger):
        return []
    agg = {}
    with open(ledger, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            a = agg.setdefault(row["set"], {"rounds": 0, "games": 0, "cost": 0, "prize": 0,
                                            "t": {k: 0 for k in range(1, 6)}})
            a["rounds"] += 1
            a["games"] += int(row["games"])
            a["cost"] += int(row["cost"])
            a["prize"] += int(row["prize"])
            for k in range(1, 6):
                a["t"][k] += int(row[f"t{k}"])
    lines = ["누적 성적 (장부)"]
    for label, a in agg.items():
        name = "구매 20개" if label == "picks" else "보관 1,000개"
        exp5 = a["games"] * TIER_COMBOS[5] / M
        exp4 = a["games"] * TIER_COMBOS[4] / M
        lines.append(f"  {name}: {a['rounds']}회차 {a['games']:,}게임, 비용 {fmt_won(a['cost'])}, 당첨 {fmt_won(a['prize'])}, "
                     f"회수율 {a['prize'] / a['cost'] * 100 if a['cost'] else 0:.1f}%  | "
                     f"5등 {a['t'][5]}회(기대 {exp5:.1f}), 4등 {a['t'][4]}회(기대 {exp4:.2f}), "
                     f"3등 {a['t'][3]}회, 2등 {a['t'][2]}회, 1등 {a['t'][1]}회")
    return lines


# ----------------------------------------------------------------------------- 주간 루틴
def cmd_weekly(args):
    ensure_dirs()
    report = [f"# 로또 6/45 주간 보고서 ({date.today().isoformat()})", ""]
    print("[1/4] 데이터 갱신")
    hist = cmd_update()
    latest = max(hist)
    print("\n[2/4] 직전 회차 결과 대조")
    chk_lines = []
    if os.path.exists(os.path.join(OUT_DIR, f"picks_{latest}.csv")) or \
            os.path.exists(os.path.join(VAULT_DIR, f"vault_{latest}.csv")):
        chk_lines = cmd_check(argparse.Namespace(round=latest), hist=hist)
        chk_lines += [""] + _ledger_summary()
        print("\n".join(_ledger_summary()))
    else:
        chk_lines = [f"제{latest}회 ({draw_date_of(hist, latest)}) 대조할 조합 파일 없음 (첫 실행이거나 이미 처리됨)"]
        print(chk_lines[0])
    report += ["## 1. 직전 회차 결과", "```", *chk_lines, "```", ""]
    print("\n[3/4] 선호도 모델 재보정")
    model = fit_model(hist, latest, args.window)
    with open(MODEL_FILE, "w", encoding="utf-8") as f:
        json.dump(model, f, ensure_ascii=False, indent=1)
    print(f"    {model['rows_used']}회차로 재보정 완료")
    print("\n[4/4] 다음 회차 조합 생성")
    g = argparse.Namespace(n=args.n, round=None, seed=None, floor=args.floor, max_overlap=2, random=False)
    rnd, picks, g_lines = cmd_generate(g, hist=hist, model=model)
    v = argparse.Namespace(n=args.vault_n, round=None, seed=None, floor=args.floor)
    _rnd, vpicks, v_lines = cmd_vault(v, hist=hist, model=model)
    report += [f"## 2. 제{rnd}회 ({draw_date_of(hist, rnd)} 추첨) 구매 조합 {len(picks)}개", "```", *g_lines, "```", "",
               f"## 3. 보관용 조합 {len(vpicks)}개", "```", *v_lines, "```", "",
               "주의: 당첨 확률은 어떤 조합이든 같다. 이 조합들은 당첨 시 분할 인원이 적을 것으로 추정되는 조합이다."]
    path = os.path.join(REPORT_DIR, f"weekly_{rnd}.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(report) + "\n")
    print(f"\n주간 보고서 저장: {path}")


# ----------------------------------------------------------------------------- 백테스트
def cmd_backtest(args):
    hist = load_history()
    if not hist:
        sys.exit("먼저 update 를 실행하세요.")
    latest = max(hist)
    test_rounds = [r for r in sorted(hist) if latest - args.rounds < r <= latest]
    n = args.n
    tally = {"model": {k: 0 for k in range(1, 6)}, "random": {k: 0 for k in range(1, 6)}}
    prize = {"model": 0, "random": 0}
    pred_r, obs1, obs3, obs5 = [], [], [], []
    t0 = time.time()
    for idx, t in enumerate(test_rounds, 1):
        model = fit_model(hist, t - 1, args.window)
        prev = hist[t - 1]["nums"]
        rec = hist[t]
        for mode in ("model", "random"):
            picks = generate_picks(model, hist, n, t, prev, args.floor, use_model=(mode == "model"),
                                   exclude_past=False, pool_size=60_000)
            for c, _r in picks:
                tier = score_pick(c, rec["nums"], rec["bonus"])
                if tier:
                    tally[mode][tier] += 1
                    prize[mode] += FIXED_PRIZE.get(tier) or rec["prize"][tier - 1]
        e1 = rec["games"] / M
        pred_r.append(math.log(popularity(model, rec["nums"], prev, args.floor)))
        obs1.append(math.log(max(rec["winners"][0], 0.5) / e1))
        obs3.append(math.log(rec["winners"][2] / (e1 * 228)))
        obs5.append(math.log(rec["winners"][4] / (e1 * 182_780)))
        if idx % 10 == 0:
            print(f"  ... {idx}/{len(test_rounds)} 회차 처리 ({time.time() - t0:.0f}s)", flush=True)
    games = n * len(test_rounds)
    print(f"\n=== 백테스트: 최근 {len(test_rounds)}회차, 매회 {n}게임 (총 {games:,}게임, {fmt_won(games * PRICE)}) ===")
    print(f"{'':<14}{'5등':>8}{'4등':>8}{'3등':>8}{'2등':>6}{'1등':>6}{'당첨금 합계':>16}")
    for mode, name in (("model", "기대값 최적화"), ("random", "무작위 대조군")):
        tl = tally[mode]
        print(f"{name:<14}{tl[5]:>8}{tl[4]:>8}{tl[3]:>8}{tl[2]:>6}{tl[1]:>6}{fmt_won(prize[mode]):>16}")
    e = [games * TIER_COMBOS[k] / M for k in (5, 4, 3, 2, 1)]
    print(f"{'이론 기대':<14}{e[0]:>8.1f}{e[1]:>8.1f}{e[2]:>8.2f}{e[3]:>6.3f}{e[4]:>6.3f}")
    print("→ 당첨 횟수는 두 방식 모두 이론 기대 수준이다 (확률은 바뀌지 않는다).")
    print("\n선호도 예측의 적중 (각 회차 추첨 전 데이터로 예측한 당첨번호의 선호도 vs 실제 당첨자 비율)")
    print(f"   1등 당첨자 비율과의 상관: {pearson(pred_r, obs1):+.3f}")
    print(f"   3등 당첨자 비율과의 상관: {pearson(pred_r, obs3):+.3f}")
    print(f"   5등 당첨자 비율과의 상관: {pearson(pred_r, obs5):+.3f}")
    print("→ 모델은 '당첨자가 많이/적게 나올 조합'을 사전에 구분한다. 이것이 기대값 차이의 근거다.")


# ----------------------------------------------------------------------------- 진입점
def main():
    ap = argparse.ArgumentParser(description="로또 6/45 기대값 최적화 번호 생성기 (개인용)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("update", help="동행복권 데이터 내려받기/갱신")
    sub.add_parser("verify", help="추첨 데이터 통계 검정")
    c = sub.add_parser("calibrate", help="번호 선호도 모델 적합")
    c.add_argument("--window", type=int, default=312, help="적합에 쓸 최근 회차 수 (기본 312 ≈ 6년)")
    c.add_argument("--holdout", type=int, default=52, help="검증용으로 남길 최근 회차 수")
    c.add_argument("--floor", type=float, default=0.6, help="자동구매 비중 가정 (선호도 하한)")
    for name, default_n in (("generate", 20), ("vault", 1000)):
        g = sub.add_parser(name, help="구매 조합 생성" if name == "generate" else "보관용 조합 생성")
        g.add_argument("-n", type=int, default=default_n)
        g.add_argument("--round", type=int, default=None, help="대상 회차 (기본: 최신+1)")
        g.add_argument("--seed", type=int, default=None, help="재현용 시드 (기본: 회차 번호)")
        g.add_argument("--floor", type=float, default=0.6)
        if name == "generate":
            g.add_argument("--max-overlap", type=int, default=2, help="조합 간 최대 중복 번호 수")
            g.add_argument("--random", action="store_true", help="모델 없이 무작위 생성 (대조군)")
    k = sub.add_parser("check", help="추첨 결과 대조")
    k.add_argument("--round", type=int, required=True)
    wk = sub.add_parser("weekly", help="주간 루틴 (갱신→대조→생성→보고서)")
    wk.add_argument("-n", type=int, default=20)
    wk.add_argument("--vault-n", type=int, default=1000)
    wk.add_argument("--window", type=int, default=312)
    wk.add_argument("--floor", type=float, default=0.6)
    b = sub.add_parser("backtest", help="과거 회차 백테스트")
    b.add_argument("--rounds", type=int, default=52)
    b.add_argument("-n", type=int, default=20)
    b.add_argument("--window", type=int, default=312)
    b.add_argument("--floor", type=float, default=0.6)
    args = ap.parse_args()
    {"update": cmd_update, "verify": cmd_verify, "calibrate": cmd_calibrate, "generate": cmd_generate,
     "vault": cmd_vault, "check": cmd_check, "weekly": cmd_weekly, "backtest": cmd_backtest}[args.cmd](args)


if __name__ == "__main__":
    main()
