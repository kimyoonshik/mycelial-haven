// 빌드 후처리: 페이지별 HTML(제목·설명·SNS 미리보기 메타·구조화 데이터 JSON-LD), 404.html, sitemap.xml, robots.txt 생성.
// - 검색엔진·카카오톡·페이스북 등 미리보기가 페이지마다 올바르게 나오게 한다 (JS를 실행하지 않는 수집기 대응)
// - 주소마다 실제 파일이 생기므로, 주소 재작성(rewrite)을 지원하지 않는 호스팅에서도 새로고침·직접 접속이 동작한다
// 사용: npm run build (vite build 후 자동 실행). 사이트 주소는 SITE_URL 환경변수로 바꿀 수 있다.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// 첫 번째 인자(옵션이 아닌 것)는 빌드 폴더 (기본 dist)
const distArg = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "dist";
const dist = join(root, distArg);
const read = (p) => JSON.parse(readFileSync(join(root, "src/content/data", p), "utf8"));

if (!existsSync(join(dist, "index.html"))) {
  console.error(`prerender: ${dist}/index.html 이 없습니다. 먼저 vite build 를 실행하세요.`);
  process.exit(1);
}

const seo = read("seo.json");
const products = read("products.json");
const commerce = read("commerce.json");
// 시험용 빌드: node scripts/prerender.mjs --staging https://new.saveearth.kr
//   → 모든 페이지 noindex, robots.txt 전체 차단, sitemap 없음 (검색엔진에 잡히지 않게)
const stagingIdx = process.argv.indexOf("--staging");
const staging = stagingIdx !== -1;
const siteUrl = ((staging && process.argv[stagingIdx + 1]) || process.env.SITE_URL || seo.siteUrl).replace(/\/$/, "");
const template = readFileSync(join(dist, "index.html"), "utf8");

// 서버 렌더링 결과(dist-ssr) — 페이지 본문을 HTML에 미리 담는다. 없으면 본문 없이(기존 방식) 진행
const ssrEntry = join(root, "dist-ssr", "entry-server.js");
const ssr = existsSync(ssrEntry) ? await import(pathToFileURL(ssrEntry).href) : null;
if (!ssr) console.warn("prerender: dist-ssr 가 없어 페이지 본문 없이 생성합니다 (npm run build 로 실행하세요)");
let ssrCount = 0;
const renderBody = (path) => {
  if (!ssr) return "";
  try {
    const html = ssr.render(path);
    ssrCount++;
    return html;
  } catch (e) {
    console.warn(`prerender: ${path} 본문 렌더링 실패 — 본문 없이 생성 (${e.message})`);
    return "";
  }
};
// 입력 양식·주문 화면은 방문자마다 내용이 달라 미리 그리지 않는다
const NO_BODY = ["/shop/po", "/shop/cart", "/shop/checkout"];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const isNoindex = (path) => staging || seo.noindex.some((p) => path.startsWith(p));

// ---------- 구조화 데이터 (Google 검색 결과의 회사 정보·상품 정보) ----------
const seller = commerce.seller;
const sameAs = Object.values(seo.social ?? {}).filter(Boolean);
const orgId = `${siteUrl}/#organization`;
const organization = {
  "@type": "Organization",
  "@id": orgId,
  name: seller.company,
  alternateName: ["Mycerra", "세이브어스"],
  url: siteUrl,
  email: seller.email,
  telephone: seller.phone,
  address: { "@type": "PostalAddress", streetAddress: seller.address, addressCountry: "KR" },
  brand: { "@type": "Brand", name: "Mycerra" },
  description:
    "SAVE EARTH Inc. develops and manufactures Mycerra™, a 100% pure mycelium mat leather alternative with no textile or polymer backing, cultivated, stabilized and finished in Korea.",
  slogan: "Grown, not manufactured.",
  knowsAbout: ["mycelium leather", "mycelium mat", "leather alternative", "biobased materials", "vegan leather", "biofabrication"],
  foundingLocation: { "@type": "Place", name: "Anseong, Gyeonggi-do, Republic of Korea" },
  ...(sameAs.length && { sameAs }),
};
const website = { "@type": "WebSite", "@id": `${siteUrl}/#website`, url: siteUrl, name: seo.siteName, publisher: { "@id": orgId }, inLanguage: ["en", "ko"] };
const jsonLd = (nodes) =>
  `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replace(/</g, "\\u003c")}</script>`;

// 검색엔진 소유 확인 태그 (값이 있을 때만)
const verify = seo.verification ?? {};
const verifyTags = [
  verify.google && `<meta name="google-site-verification" content="${esc(verify.google)}" />`,
  verify.naver && `<meta name="naver-site-verification" content="${esc(verify.naver)}" />`,
  verify.bing && `<meta name="msvalidate.01" content="${esc(verify.bing)}" />`,
]
  .filter(Boolean)
  .join("\n    ");

const render = (path, { title, description, image, ld = [] }, { noindex = isNoindex(path), body = "" } = {}) => {
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
  const extra = [
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:locale:alternate" content="ko_KR" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    seo.xHandle && `<meta name="twitter:site" content="${esc(seo.xHandle)}" />`,
    verifyTags,
    !noindex && jsonLd([organization, website, ...ld]),
  ]
    .filter(Boolean)
    .join("\n    ");
  html = set(html, /<\/head>/, `    ${extra}\n  </head>`);
  if (body) html = set(html, /<div id="root"><\/div>/, `<div id="root" data-ssr>${body}</div>`);
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
  write(path, render(path, { title: meta.title.en, description: meta.description.en }, { body: NO_BODY.includes(path) ? "" : renderBody(path) }));
  pages.push(path);
}

// 2) 상품 상세
const conditionTitle = Object.fromEntries(commerce.conditions.map((c) => [c.id, c.title.en]));
const sqft = (s) => Math.round(((s.widthCm * s.heightCm) / 10000) * 10.7639104 * 100) / 100;
const unitPrice = (p, s) => {
  const o = commerce.priceOverrides[`${p.condition}:${s.id}`];
  if (o !== undefined) return o;
  const cond = commerce.conditions.find((c) => c.id === p.condition);
  return Math.round(sqft(s) * (s.kind === "brochure" ? s.pieces ?? 1 : 1) * cond.priceUSDPerSqft * 100) / 100;
};
const sizesOf = (p) => (p.sizes ? commerce.sizes.filter((s) => p.sizes.includes(s.id)) : commerce.sizes.filter((s) => s.kind === "regular"));
for (const p of products) {
  const path = `/shop/p/${p.sku}`;
  const brochure = sizesOf(p).every((s) => s.kind === "brochure");
  const prices = sizesOf(p).map((s) => unitPrice(p, s));
  const product = {
    "@type": "Product",
    name: `${p.name} — Mycerra™ ${brochure ? "swatch brochure" : "pure mycelium leather alternative"}`,
    sku: p.sku,
    description: p.description.en,
    ...(p.image && { image: `${siteUrl}${p.image}` }),
    brand: { "@type": "Brand", name: "Mycerra" },
    manufacturer: { "@id": orgId },
    material: "Mycelium",
    category: conditionTitle[p.condition],
    countryOfOrigin: "KR",
    ...(p.status === "available" && {
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: commerce.currency,
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        offerCount: prices.length,
        availability: "https://schema.org/InStock",
        url: `${siteUrl}${path}`,
        seller: { "@id": orgId },
      },
    }),
  };
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Shop", item: `${siteUrl}/shop` },
      { "@type": "ListItem", position: 2, name: conditionTitle[p.condition], item: `${siteUrl}/shop?cat=${p.condition}` },
      { "@type": "ListItem", position: 3, name: `${p.name} (${p.sku})`, item: `${siteUrl}${path}` },
    ],
  };
  write(
    path,
    render(path, {
      title: `${p.name} (${p.sku}) — ${conditionTitle[p.condition]} | Mycerra™ Shop`,
      description: brochure
        ? `${p.description.en} Swatch brochure of ten 30 × 30 cm swatches from SAVE EARTH Inc.`
        : `${p.description.en} Regular sheets and swatch brochures from SAVE EARTH Inc.`,
      image: p.image,
      ld: [product, breadcrumb],
    }, { body: renderBody(path) }),
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
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${indexable
    .map((p) => {
      // 상품 사진을 이미지 검색에 함께 알린다
      const prod = products.find((x) => `/shop/p/${x.sku}` === p && x.image);
      const img = prod ? `<image:image><image:loc>${siteUrl}${prod.image}</image:loc></image:image>` : "";
      return `  <url><loc>${siteUrl}${p}</loc><lastmod>${today}</lastmod>${img}</url>`;
    })
    .join("\n")}\n</urlset>\n`,
);
// 검색엔진과 AI 검색·답변 서비스 수집기를 명시적으로 허용한다 (각 묶음은 *의 규칙을 물려받지 않으므로 제외 경로를 반복)
const AI_BOTS = [
  "Googlebot", "Bingbot", "Yeti", "DuckDuckBot", "Applebot",
  "OAI-SearchBot", "ChatGPT-User", "GPTBot",
  "Claude-SearchBot", "Claude-User", "ClaudeBot",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot-Extended", "Amazonbot", "Meta-ExternalAgent", "CCBot",
];
const rules = ["Allow: /", ...seo.noindex.map((p) => `Disallow: ${p}`)];
writeFileSync(
  join(dist, "robots.txt"),
  staging ? "User-agent: *\nDisallow: /\n" : [
    "# Mycerra™ — search engines and AI assistants are welcome. Summary for AI: /llms.txt",
    "User-agent: *",
    ...rules,
    "",
    ...AI_BOTS.map((b) => `User-agent: ${b}`),
    ...rules,
    "",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "",
  ].join("\n"),
);

// ---------- llms.txt — AI 답변 서비스용 요약 (llmstxt.org 형식) ----------
if (!staging) {
  const site = read("site.json");
  const news = read("news.json");
  const tests = read("test-reports.json");
  const en = (l) => (l && typeof l === "object" ? l.en : l);
  const routes = seo.routes;
  const pageLine = (p, label) => `- [${label}](${siteUrl}${p}): ${en(routes[p]?.description) ?? ""}`;
  const claims = site.shared.claims.map((c) => {
    const proof =
      c.proof.status === "published"
        ? `verified — ${en(c.proof.title)}${c.proof.href ? ` (${siteUrl}${c.proof.href})` : ""}${c.proof.meta ? `; ${en(c.proof.meta)}` : ""}`
        : `company figure; supporting document (${en(c.proof.title)}) in preparation`;
    return `- ${c.value} ${en(c.label)}: ${en(c.detail)} [${proof}]`;
  });
  const reported = tests.filter((t) => t.result);
  const sizes = commerce.sizes.map((s) =>
    s.kind === "brochure"
      ? `swatch brochure (${s.pieces} × ${s.widthCm} × ${s.heightCm} cm)`
      : `${en(s.label)} ${s.widthCm} × ${s.heightCm} cm`,
  );
  const conds = commerce.conditions.map((c) => `${en(c.title)} (USD ${c.priceUSDPerSqft}/sqft)`);
  const available = products.filter((p) => p.status === "available");
  const lines = [
    "# Mycerra™ by SAVE EARTH Inc.",
    "",
    "> Mycerra™ is a leather alternative made from 100% pure mycelium — a self-supporting mycelium mat with no textile or polymer backing, no scaffold and no plastic layer. It is cultivated, stabilized and finished in Korea by SAVE EARTH Inc. and supplied as sheets and swatch brochures for fashion, accessories, footwear and interiors.",
    "",
    "## Key facts",
    "- Material: pure mycelium mat (no non-woven backing, no scaffold, no foreign substrate)",
    "- Process: Cultivate → Stabilize (proprietary) → Finish (aniline-style dyeing, embossing, protective finishing)",
    `- Maker: ${seller.company} (${seller.address} / ${seller.addressKo}); business registration no. ${seller.businessRegNo}`,
    `- Phone: ${seller.phone}`,
    `- Contact: ${seller.email}`,
    `- Processing conditions: ${conds.join("; ")}`,
    `- Sizes: ${sizes.join("; ")}`,
    `- Ordering: individual orders ${commerce.retail.minSqft}–${commerce.retail.maxSqft} sqft paid online; larger or business orders via purchase order request and approved invoice`,
    `- Range online: ${available.length} items available to order, ${products.length - available.length} more in preparation`,
    "",
    "## Claims and evidence",
    ...claims,
    ...reported.map((t) => `- Test result — ${en(t.name)}: ${t.result} ${t.unit} (${t.method}, ${t.lab}, ${t.reportDate})${t.reportUrl ? ` ${siteUrl}${t.reportUrl}` : ""}`),
    "",
    "## Pages",
    pageLine("/", "Home"),
    pageLine("/mycerra", "Material library"),
    pageLine("/technology", "Technology and test reports"),
    pageLine("/impact", "Impact and evidence"),
    pageLine("/shop", "Shop"),
    pageLine("/work-with-us", "Work with us"),
    "",
    "## Products available now",
    ...available.map((p) => `- [${p.name} (${p.sku})](${siteUrl}/shop/p/${p.sku}): ${p.description.en}`),
    "",
    "## News",
    ...news.map((n) => `- ${en(n.title)} — ${en(n.meta)}`),
    ...(sameAs.length ? ["", "## Official channels", ...sameAs.map((u) => `- ${u}`)] : []),
    "",
  ];
  writeFileSync(join(dist, "llms.txt"), lines.join("\n"));
  // IndexNow 공개 키 파일
  if (seo.indexNowKey) writeFileSync(join(dist, `${seo.indexNowKey}.txt`), seo.indexNowKey);
}
if (staging) {
  // 서버 설정과 별개로 응답 헤더에서도 검색 차단 (Apache)
  const ht = join(dist, ".htaccess");
  writeFileSync(ht, `# 시험용 사이트: 검색엔진 차단\n<IfModule mod_headers.c>\n  Header always set X-Robots-Tag "noindex, nofollow"\n</IfModule>\n\n` + readFileSync(ht, "utf8"));
}

console.log(`prerender${staging ? " [STAGING · noindex]" : ""}: ${pages.length + 2} pages (${ssrCount} with full content), sitemap ${staging ? 0 : indexable.length} URLs, site ${siteUrl}`);
