#!/usr/bin/env node
// REA Site Cloner — 웹사이트를 오프라인 열람 가능한 정적 사본으로 복제하는 CLI.
// 사용법: node tools/site-cloner/clone.mjs <url> [--out dir] [--depth n] [--max-pages n]
//         [--delay ms] [--render] [--include-external-pages]
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const HELP = `REA Site Cloner

사용법:
  node tools/site-cloner/clone.mjs <url> [옵션]

옵션:
  --out <dir>         출력 폴더 (기본: clones/<host>)
  --depth <n>         링크 추적 깊이 (기본: 2, 0 = 시작 페이지만)
  --max-pages <n>     최대 페이지 수 (기본: 50)
  --max-assets <n>    최대 에셋 수 (기본: 2000)
  --delay <ms>        요청 간 대기 시간 (기본: 300)
  --render            Playwright(Chromium)로 JS 렌더링 후 저장 (SPA 사이트용)
  --user-agent <ua>   User-Agent 지정
  -h, --help          도움말
`;

function parseArgs(argv) {
  const opts = {
    url: null,
    out: null,
    depth: 2,
    maxPages: 50,
    maxAssets: 2000,
    delay: 300,
    render: false,
    userAgent: "REA-SiteCloner/1.0 (+offline archive)",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} 옵션에 값이 필요합니다`);
      return argv[++i];
    };
    if (a === "-h" || a === "--help") opts.help = true;
    else if (a === "--out") opts.out = next();
    else if (a === "--depth") opts.depth = toInt(a, next());
    else if (a === "--max-pages") opts.maxPages = toInt(a, next());
    else if (a === "--max-assets") opts.maxAssets = toInt(a, next());
    else if (a === "--delay") opts.delay = toInt(a, next());
    else if (a === "--render") opts.render = true;
    else if (a === "--user-agent") opts.userAgent = next();
    else if (a.startsWith("-")) throw new Error(`알 수 없는 옵션: ${a}`);
    else if (!opts.url) opts.url = a;
    else throw new Error(`URL은 하나만 지정할 수 있습니다: ${a}`);
  }
  return opts;
}

function toInt(name, v) {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${name} 값이 올바르지 않습니다: ${v}`);
  return n;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- URL ↔ 로컬 경로 매핑 ----------

function normalizeUrl(raw, base) {
  try {
    const u = new URL(raw, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}

function shortHash(s) {
  return crypto.createHash("sha1").update(s).digest("hex").slice(0, 8);
}

function sanitizeSegment(seg) {
  const decoded = (() => {
    try {
      return decodeURIComponent(seg);
    } catch {
      return seg;
    }
  })();
  return decoded.replace(/[<>:"\\|?*\x00-\x1f]/g, "_").slice(0, 120) || "_";
}

// 같은 origin은 루트에, 외부 origin은 _ext/<host>/ 아래에 둔다.
function localPathFor(href, origin, kind) {
  const u = new URL(href);
  const raw = u.pathname.split("/");
  const last = raw.pop();
  let file = last ? sanitizeSegment(last) : "";
  const dir = raw.filter((s) => s && s !== "." && s !== "..").map(sanitizeSegment);
  const prefix = u.origin === origin ? [] : ["_ext", sanitizeSegment(u.host)];
  const query = u.search ? `_${shortHash(u.search)}` : "";

  if (kind === "page") {
    if (!file) {
      file = `index${query}.html`;
    } else if (!/\.html?$/i.test(file)) {
      dir.push(file);
      file = `index${query}.html`;
    } else if (query) {
      file = file.replace(/(\.html?)$/i, `${query}$1`);
    }
  } else {
    if (!file) file = "index";
    if (query) {
      const ext = path.posix.extname(file);
      file = ext ? `${file.slice(0, -ext.length)}${query}${ext}` : `${file}${query}`;
    }
  }
  return path.posix.join(...prefix, ...dir, file);
}

function relativeRef(fromLocal, toLocal) {
  const rel = path.posix.relative(path.posix.dirname(fromLocal), toLocal);
  return rel || path.posix.basename(toLocal);
}

// ---------- 링크 추출 ----------

const ATTR_RE = /(\s(?:href|src|poster|data-src|data-href|data-background|content))\s*=\s*(["'])(.*?)\2/gis;
const SRCSET_RE = /(\s(?:srcset|data-srcset|imagesrcset))\s*=\s*(["'])(.*?)\2/gis;
const CSS_URL_RE = /url\(\s*(["']?)([^"')]+?)\1\s*\)/gi;
const CSS_IMPORT_RE = /@import\s+(["'])([^"']+)\1/gi;
const ANCHOR_RE = /<a\b[^>]*?\shref\s*=\s*(["'])(.*?)\1/gis;
const META_CONTENT_OK = /^(https?:)?\/\/|^\//;

function decodeEntities(s) {
  return s.replace(/&amp;/g, "&").replace(/&#38;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function isSkippable(ref) {
  return !ref || /^(data:|blob:|javascript:|mailto:|tel:|#|about:)/i.test(ref.trim());
}

function extractPageLinks(html, base) {
  const out = new Set();
  for (const m of html.matchAll(ANCHOR_RE)) {
    const ref = decodeEntities(m[2].trim());
    if (isSkippable(ref)) continue;
    const abs = normalizeUrl(ref, base);
    if (abs) out.add(abs);
  }
  return out;
}

function parseSrcset(value) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [url, ...desc] = part.split(/\s+/);
      return { url, desc: desc.join(" ") };
    });
}

// ---------- 메인 클로너 ----------

class SiteCloner {
  constructor(opts) {
    this.opts = opts;
    this.start = normalizeUrl(opts.url);
    if (!this.start) throw new Error(`올바른 http(s) URL이 아닙니다: ${opts.url}`);
    this.origin = new URL(this.start).origin;
    this.outDir = path.resolve(opts.out ?? path.join("clones", new URL(this.start).host));
    this.pages = new Map(); // url -> { local, html, depth }
    this.assets = new Map(); // url -> local | null(실패)
    this.failures = [];
    this.disallow = [];
    this.lastRequest = 0;
    this.browser = null;
  }

  log(msg) {
    process.stdout.write(`${msg}\n`);
  }

  async throttle() {
    const wait = this.lastRequest + this.opts.delay - Date.now();
    if (wait > 0) await sleep(wait);
    this.lastRequest = Date.now();
  }

  async fetchRaw(url) {
    await this.throttle();
    const res = await fetch(url, {
      headers: { "user-agent": this.opts.userAgent, accept: "*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { buf, type: res.headers.get("content-type") ?? "", finalUrl: res.url };
  }

  async loadRobots() {
    try {
      const { buf } = await this.fetchRaw(`${this.origin}/robots.txt`);
      let applies = false;
      for (const rawLine of buf.toString("utf8").split(/\r?\n/)) {
        const line = rawLine.replace(/#.*/, "").trim();
        const [key, ...rest] = line.split(":");
        const value = rest.join(":").trim();
        if (/^user-agent$/i.test(key)) applies = value === "*" || this.opts.userAgent.toLowerCase().includes(value.toLowerCase());
        else if (applies && /^disallow$/i.test(key) && value) this.disallow.push(value);
      }
      if (this.disallow.length) this.log(`robots.txt: 차단 경로 ${this.disallow.length}건 적용`);
    } catch {
      // robots.txt가 없으면 제한 없음
    }
  }

  allowedByRobots(url) {
    const u = new URL(url);
    if (u.origin !== this.origin) return true;
    const p = u.pathname + u.search;
    return !this.disallow.some((rule) => {
      const re = new RegExp(
        "^" + rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"),
      );
      return re.test(p);
    });
  }

  async renderPage(url) {
    if (!this.browser) {
      const { chromium } = await loadPlaywright();
      this.browser = await chromium.launch();
    }
    await this.throttle();
    const page = await this.browser.newPage({ userAgent: this.opts.userAgent });
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
      return { html: await page.content(), finalUrl: page.url() };
    } finally {
      await page.close();
    }
  }

  async crawl() {
    const queue = [{ url: this.start, depth: 0 }];
    const seen = new Set([this.start]);

    while (queue.length && this.pages.size < this.opts.maxPages) {
      const { url, depth } = queue.shift();
      if (!this.allowedByRobots(url)) {
        this.log(`  건너뜀(robots) ${url}`);
        continue;
      }
      let html;
      try {
        if (this.opts.render) {
          ({ html } = await this.renderPage(url));
        } else {
          const { buf, type } = await this.fetchRaw(url);
          if (!/html/i.test(type)) {
            // 페이지 링크였지만 HTML이 아니면 에셋으로 취급
            await this.saveAsset(url, buf, type);
            continue;
          }
          html = buf.toString("utf8");
        }
      } catch (err) {
        this.failures.push({ url, kind: "page", error: String(err.message ?? err) });
        this.log(`  실패 ${url} (${err.message ?? err})`);
        continue;
      }

      this.pages.set(url, { local: localPathFor(url, this.origin, "page"), html, depth });
      this.log(`[페이지 ${this.pages.size}/${this.opts.maxPages}] ${url}`);

      if (depth < this.opts.depth) {
        for (const link of extractPageLinks(html, url)) {
          if (new URL(link).origin !== this.origin || seen.has(link)) continue;
          seen.add(link);
          queue.push({ url: link, depth: depth + 1 });
        }
      }
    }
  }

  async saveAsset(url, buf, type) {
    const local = localPathFor(url, this.origin, "asset");
    let data = buf;
    if (/text\/css/i.test(type) || /\.css$/i.test(new URL(url).pathname)) {
      data = Buffer.from(await this.rewriteCss(buf.toString("utf8"), url, local), "utf8");
    }
    await this.write(local, data);
    this.assets.set(url, local);
    return local;
  }

  // 에셋을 내려받고 로컬 경로를 돌려준다. 실패하면 null.
  async fetchAsset(url) {
    if (this.assets.has(url)) return this.assets.get(url);
    if (this.assets.size >= this.opts.maxAssets || !this.allowedByRobots(url)) return null;
    // 예정 경로를 먼저 등록해 순환 @import도 로컬 경로로 연결되게 한다
    this.assets.set(url, localPathFor(url, this.origin, "asset"));
    try {
      const { buf, type } = await this.fetchRaw(url);
      const local = await this.saveAsset(url, buf, type);
      this.log(`  에셋 ${url}`);
      return local;
    } catch (err) {
      this.assets.set(url, null);
      this.failures.push({ url, kind: "asset", error: String(err.message ?? err) });
      return null;
    }
  }

  async resolveRef(ref, base, fromLocal, { asPage = false } = {}) {
    if (isSkippable(ref)) return null;
    const decoded = decodeEntities(ref.trim());
    const abs = normalizeUrl(decoded, base);
    if (!abs) return null;
    const hash = (() => {
      try {
        return new URL(decoded, base).hash;
      } catch {
        return "";
      }
    })();

    if (asPage) {
      const page = this.pages.get(abs);
      if (page) return relativeRef(fromLocal, page.local) + hash;
      // 복제하지 않은 페이지는 절대 URL로 남겨 원본으로 연결
      return abs + hash;
    }
    const local = await this.fetchAsset(abs);
    return local ? relativeRef(fromLocal, local) : abs;
  }

  async rewriteCss(css, base, fromLocal) {
    const replacements = new Map();
    const refs = [...css.matchAll(CSS_URL_RE)].map((m) => m[2]);
    refs.push(...[...css.matchAll(CSS_IMPORT_RE)].map((m) => m[2]));
    for (const ref of refs) {
      if (replacements.has(ref)) continue;
      replacements.set(ref, await this.resolveRef(ref, base, fromLocal));
    }
    return css
      .replace(CSS_URL_RE, (all, q, ref) => {
        const r = replacements.get(ref);
        return r ? `url(${q}${r}${q})` : all;
      })
      .replace(CSS_IMPORT_RE, (all, q, ref) => {
        const r = replacements.get(ref);
        return r ? `@import ${q}${r}${q}` : all;
      });
  }

  async rewriteHtml(html, base, fromLocal) {
    // 재작성 후에는 SRI 해시·<base>가 맞지 않으므로 제거
    let out = html
      .replace(/\s(integrity|crossorigin)\s*=\s*(["']).*?\2/gis, "")
      .replace(/<base\b[^>]*>/gi, "");

    out = await replaceAsync(out, /<a\b[^>]*>/gis, async (tag) =>
      replaceAsync(tag, /(\shref\s*=\s*)(["'])(.*?)\2/is, async (all, pre, q, ref) => {
        const r = await this.resolveRef(ref, base, fromLocal, { asPage: true });
        return r ? `${pre}${q}${r}${q}` : all;
      }),
    );

    out = await replaceAsync(out, /<(?!a\b)[a-z][^>]*>/gis, async (tag) => {
      const tagName = tag.match(/^<([a-z0-9-]+)/i)?.[1]?.toLowerCase();
      let t = await replaceAsync(tag, ATTR_RE, async (all, attr, q, ref) => {
        const name = attr.trim().toLowerCase();
        if (name === "content" && !(tagName === "meta" && META_CONTENT_OK.test(ref) && /\.(png|jpe?g|gif|svg|webp|ico)(\?|$)/i.test(ref))) return all;
        // <link rel="canonical|alternate"> 등 문서 링크는 원본 URL 유지
        if (tagName === "link" && /rel\s*=\s*["']?(canonical|alternate|next|prev|preconnect|dns-prefetch)/i.test(tag)) return all;
        const r = await this.resolveRef(ref, base, fromLocal);
        return r ? `${attr}=${q}${r}${q}` : all;
      });
      t = await replaceAsync(t, SRCSET_RE, async (all, attr, q, value) => {
        const parts = [];
        for (const { url, desc } of parseSrcset(decodeEntities(value))) {
          const r = (await this.resolveRef(url, base, fromLocal)) ?? url;
          parts.push(desc ? `${r} ${desc}` : r);
        }
        return `${attr}=${q}${parts.join(", ")}${q}`;
      });
      t = await replaceAsync(t, /(\sstyle\s*=\s*)(["'])(.*?)\2/is, async (all, pre, q, css) => {
        const rewritten = await this.rewriteCss(decodeEntities(css), base, fromLocal);
        return `${pre}${q}${rewritten.replaceAll(q, q === '"' ? "&quot;" : "&#39;")}${q}`;
      });
      return t;
    });

    out = await replaceAsync(out, /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, async (all, open, css, close) =>
      `${open}${await this.rewriteCss(css, base, fromLocal)}${close}`,
    );
    return out;
  }

  async write(local, data) {
    const full = path.join(this.outDir, ...local.split("/"));
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  async run() {
    this.log(`복제 시작: ${this.start}`);
    this.log(`출력 폴더: ${this.outDir}`);
    await this.loadRobots();
    if (!this.allowedByRobots(this.start)) throw new Error("시작 URL이 robots.txt에 의해 차단되어 있습니다");

    try {
      await this.crawl();
      this.log(`\n페이지 ${this.pages.size}건 수집 완료. 에셋 다운로드 및 링크 재작성 중...`);
      for (const [url, page] of this.pages) {
        const html = await this.rewriteHtml(page.html, url, page.local);
        await this.write(page.local, html);
      }
    } finally {
      if (this.browser) await this.browser.close();
    }

    const manifest = {
      source: this.start,
      clonedAt: new Date().toISOString(),
      options: { ...this.opts, url: undefined },
      entry: this.pages.get(this.start)?.local ?? null,
      pages: [...this.pages].map(([url, p]) => ({ url, local: p.local, depth: p.depth })),
      assets: [...this.assets].filter(([, l]) => l).map(([url, local]) => ({ url, local })),
      failures: this.failures,
    };
    await this.write("_clone-manifest.json", JSON.stringify(manifest, null, 2));

    this.log(`\n완료: 페이지 ${manifest.pages.length}, 에셋 ${manifest.assets.length}, 실패 ${this.failures.length}`);
    if (manifest.entry) this.log(`시작 파일: ${path.join(this.outDir, manifest.entry)}`);
    return manifest;
  }
}

// 프로젝트 로컬 설치를 우선하고, 없으면 전역(NODE_PATH) 설치를 require로 찾는다
async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    try {
      return createRequire(import.meta.url)("playwright");
    } catch {
      throw new Error("--render 옵션에는 Playwright가 필요합니다: npm i -D playwright && npx playwright install chromium");
    }
  }
}

async function replaceAsync(str, re, fn) {
  const matches = [...str.matchAll(re.global ? re : new RegExp(re.source, re.flags + "g"))];
  if (!matches.length) return str;
  const results = [];
  for (const m of matches) results.push(await fn(...m));
  let out = "";
  let last = 0;
  matches.forEach((m, i) => {
    out += str.slice(last, m.index) + results[i];
    last = m.index + m[0].length;
  });
  return out + str.slice(last);
}

export { SiteCloner, localPathFor, relativeRef, parseSrcset };

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.help || !opts.url) {
      process.stdout.write(HELP);
      process.exit(opts.help ? 0 : 1);
    }
    await new SiteCloner(opts).run();
  } catch (err) {
    process.stderr.write(`오류: ${err.message ?? err}\n`);
    process.exit(1);
  }
}
