// 빌드 후처리: 페이지별 HTML(제목·설명·SNS 미리보기 메타), 404.html, sitemap.xml, robots.txt 생성.
// - 검색엔진·카카오톡·페이스북 등 미리보기가 페이지마다 올바르게 나오게 한다 (JS를 실행하지 않는 수집기 대응)
// - 주소마다 실제 파일이 생기므로, 주소 재작성(rewrite)을 지원하지 않는 호스팅에서도 새로고침·직접 접속이 동작한다
// 사용: npm run build (vite build 후 자동 실행). 사이트 주소는 SITE_URL 환경변수로 바꿀 수 있다.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, process.argv[2] ?? "dist");
const read = (p) => JSON.parse(readFileSync(join(root, "src/content/data", p), "utf8"));

if (!existsSync(join(dist, "index.html"))) {
  console.error(`prerender: ${dist}/index.html 이 없습니다. 먼저 vite build 를 실행하세요.`);
  process.exit(1);
}

const seo = read("seo.json");
const products = read("products.json");
const commerce = read("commerce.json");
const siteUrl = (process.env.SITE_URL ?? seo.siteUrl).replace(/\/$/, "");
const template = readFileSync(join(dist, "index.html"), "utf8");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const isNoindex = (path) => seo.noindex.some((p) => path.startsWith(p));

const render = (path, { title, description, image }, { noindex = isNoindex(path) } = {}) => {
  const url = `${siteUrl}${path}`;
  const img = `${siteUrl}${image ?? seo.defaultImage}`;
  const set = (html, re, value) => {
    if (!re.test(html)) throw new Error(`prerender: index.html 에서 ${re} 를 찾지 못했습니다`);
    return html.replace(re, value);
  };
  let html = template;
  html = set(html, /<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = set(html, /(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`);
  html = set(html, /(<meta name="robots" content=")[^"]*(")/, `$1${noindex ? "noindex, nofollow" : "index, follow"}$2`);
  html = set(html, /(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
  html = set(html, /(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`);
  html = set(html, /(<meta property="og:description" content=")[^"]*(")/, `$1${esc(description)}$2`);
  html = set(html, /(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`);
  html = set(html, /(<meta property="og:image" content=")[^"]*(")/, `$1${img}$2`);
  html = set(html, /(<meta name="twitter:image" content=")[^"]*(")/, `$1${img}$2`);
  return html;
};

const write = (path, html) => {
  if (path === "/") return writeFileSync(join(dist, "index.html"), html);
  const dir = join(dist, path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
};

const pages = [];

// 1) seo.json 에 등록된 페이지
for (const [path, meta] of Object.entries(seo.routes)) {
  write(path, render(path, { title: meta.title.en, description: meta.description.en }));
  pages.push(path);
}

// 2) 상품 상세
const conditionTitle = Object.fromEntries(commerce.conditions.map((c) => [c.id, c.title.en]));
for (const p of products) {
  const path = `/shop/p/${p.sku}`;
  write(
    path,
    render(path, {
      title: `${p.name} (${p.sku}) — ${conditionTitle[p.condition]} | Mycerra™ Shop`,
      description: `${p.description.en} Samples 30 × 30 cm and regular sheets from SAVE EARTH Inc.`,
      image: p.image,
    }),
  );
  pages.push(path);
}

// 3) 검색 제외 페이지 (장바구니·결제) — 직접 접속 대비 파일만 생성
for (const path of ["/shop/cart", "/shop/checkout"]) {
  write(path, render(path, { title: "Mycerra™ Shop", description: "Mycerra™ shop" }, { noindex: true }));
}

// 4) 404 — 호스팅이 없는 주소에 404.html 을 응답하면 앱이 404 화면을 그린다
writeFileSync(
  join(dist, "404.html"),
  render("/404", { title: "404 — Mycerra™", description: "Page not found." }, { noindex: true }),
);

// 5) sitemap.xml · robots.txt
const today = new Date().toISOString().slice(0, 10);
const indexable = pages.filter((p) => !isNoindex(p));
writeFileSync(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable
    .map((p) => `  <url><loc>${siteUrl}${p}</loc><lastmod>${today}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`,
);
writeFileSync(
  join(dist, "robots.txt"),
  [
    "User-agent: *",
    "Allow: /",
    ...seo.noindex.map((p) => `Disallow: ${p}`),
    "",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "",
  ].join("\n"),
);

console.log(`prerender: ${pages.length + 2} pages, sitemap ${indexable.length} URLs, site ${siteUrl}`);
