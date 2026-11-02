#!/usr/bin/env node
/*
 * 화면 구성 기준선 검사 (2026-11-02 마이세라님 승인 상태)
 *
 *   npm run build && npm run check:layout            → 기준선과 비교 (다르면 실패)
 *   npm run build && npm run check:layout -- --update → 승인받은 변경일 때만 기준선 갱신
 *
 * 공개 페이지(영문·한글) × 화면 폭 3가지(PC 1440 / 확대 620 / 휴대폰 390)에서
 *   - 섹션 순서
 *   - 섹션마다 격자 배치 (한 줄에 몇 개씩: "3+2", "2+2" …)
 *   - 제목 글꼴·크기, 본문 글꼴
 *   - 가로 스크롤 발생 여부
 * 를 읽어 docs/design-baseline/layout.json 과 비교한다.
 * 개발 확인용 도구 — Playwright(Chromium)가 설치된 환경에서 실행한다.
 */
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const BASELINE = path.join(ROOT, "docs/design-baseline/layout.json");
const PORT = 8091;
const BASE = `http://127.0.0.1:${PORT}`;
const PAGES = ["/", "/mycerra", "/technology", "/impact", "/work-with-us", "/shop"];
const LANGS = ["", "/ko"];
const WIDTHS = [
  ["desktop", 1440, 900],
  ["zoomed", 620, 900],
  ["phone", 390, 844],
];
const SIZE_TOLERANCE = 1; // px

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright 가 없어 화면 검사를 건너뜁니다 (개발 환경 전용 도구).");
  process.exit(2);
}

if (!fs.existsSync(path.join(ROOT, "dist/index.html"))) {
  console.error("dist 가 없습니다. 먼저 npm run build 를 실행하세요.");
  process.exit(2);
}

const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(BASE + "/");
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("미리보기 서버가 시작되지 않았습니다.");
};

// 브라우저 안에서 실행: 화면 구성 지문
const fingerprint = () => {
  const first = (ff) => ff.split(",")[0].replace(/["']/g, "").trim();
  const head = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return `${first(cs.fontFamily)} ${Math.round(parseFloat(cs.fontSize))}`;
  };
  const rowPattern = (box) => {
    const kids = [...box.children].filter((k) => k.offsetWidth > 0 && k.offsetHeight > 0);
    if (kids.length < 2) return null;
    const rows = [];
    for (const k of kids) {
      const top = k.offsetTop;
      const row = rows.find((r) => Math.abs(r.top - top) <= 2);
      if (row) row.n++;
      else rows.push({ top, n: 1 });
    }
    return rows.map((r) => r.n).join("+");
  };
  const order = [];
  const sections = {};
  for (const s of document.querySelectorAll('[id^="sec-"]')) {
    const boxes = [...s.querySelectorAll("*")].filter((el) => {
      const cs = getComputedStyle(el);
      return cs.display === "grid" || (cs.display === "flex" && /auto|scroll/.test(cs.overflowX));
    });
    const id = s.id.replace(/^sec-/, "");
    order.push(id);
    sections[id] = {
      heading: head(s.querySelector("h1, h2, h3")),
      grids: boxes.map(rowPattern).filter(Boolean).join(" , "),
    };
  }
  return {
    body: first(getComputedStyle(document.querySelector("#root > *") || document.body).fontFamily),
    h1: head(document.querySelector("h1")),
    hscroll: document.documentElement.scrollWidth > window.innerWidth + 1,
    order: order.join(" > "),
    sections,
  };
};

const diff = (a, b, at, out) => {
  if (typeof a === "string" && typeof b === "string") {
    // "글꼴 크기" — 크기는 ±1px 허용
    const ma = a.match(/^(.*) (\d+)$/);
    const mb = b.match(/^(.*) (\d+)$/);
    if (ma && mb && ma[1] === mb[1] && Math.abs(+ma[2] - +mb[2]) <= SIZE_TOLERANCE) return;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) diff(a[k], b[k], at ? `${at} › ${k}` : k, out);
    return;
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${at}\n      기준: ${JSON.stringify(a)}\n      현재: ${JSON.stringify(b)}`);
};

(async () => {
  const vite = path.join(ROOT, "node_modules/vite/bin/vite.js");
  const server = spawn(process.execPath, [vite, "preview", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], {
    cwd: ROOT,
    stdio: "ignore",
  });
  const errors = [];
  const current = {};
  try {
    await waitForServer();
    const browser = await chromium.launch();
    for (const [name, w, h] of WIDTHS) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      page.on("pageerror", (e) => errors.push(`${name} ${page.url()}: ${e.message}`));
      for (const lang of LANGS) {
        for (const p of PAGES) {
          const url = lang + (p === "/" && lang ? "" : p);
          await page.goto(BASE + url, { waitUntil: "networkidle" });
          await page.waitForTimeout(300);
          current[`${name} ${url}`] = await page.evaluate(fingerprint);
        }
      }
      await page.close();
    }
    await browser.close();
  } finally {
    server.kill();
  }

  if (process.argv.includes("--update")) {
    fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
    fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2) + "\n");
    console.log(`기준선 갱신: ${path.relative(ROOT, BASELINE)} (${Object.keys(current).length}개 화면)`);
    if (errors.length) console.log(`화면 오류 ${errors.length}건:\n  ` + errors.join("\n  "));
    process.exit(errors.length ? 1 : 0);
  }

  if (!fs.existsSync(BASELINE)) {
    console.error("기준선 파일이 없습니다. 승인된 상태에서 --update 로 먼저 만드세요.");
    process.exit(1);
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
  const changes = [];
  diff(baseline, current, "", changes);
  if (errors.length) changes.push(...errors.map((e) => `화면 오류 ${e}`));
  if (changes.length) {
    console.error(`화면 구성이 기준선과 다릅니다 (${changes.length}건):\n  ` + changes.join("\n  "));
    console.error("\n의도하지 않은 변경이면 되돌리고, 마이세라님이 승인한 변경이면 --update 로 기준선을 갱신하세요.");
    process.exit(1);
  }
  console.log(`화면 구성 기준선과 동일 ✓ (${Object.keys(current).length}개 화면: 페이지 ${PAGES.length} × 언어 2 × 폭 3)`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
