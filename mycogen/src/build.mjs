// Static site builder.
//   node src/build.mjs            -> builds dist/ from content/site.json
// Used by the editor too (import { build } from './build.mjs').

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { renderPage, render404, pagePath, langPrefix, hyphaeSvg, MARK_SVG, tx, pageText, socialUrls } from './render.mjs';
import { LANGS } from './schema.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');
export const CONTENT_FILE = path.join(ROOT, 'content', 'site.json');
export const MEDIA_DIR = path.join(ROOT, 'content', 'media');
const ASSETS_DIR = path.join(HERE, 'assets');

export function loadContent(file = CONTENT_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Returns a list of problems; an empty list means the content can be built.
export function validate(site) {
  const errors = [];
  const warnings = [];
  if (!site || typeof site !== 'object') return { errors: ['콘텐츠가 비어 있습니다.'], warnings };
  if (!Array.isArray(site.pages) || !site.pages.length) errors.push('페이지가 하나도 없습니다.');
  const ids = new Set();
  const paths = new Set();
  const byId = Object.fromEntries((site.pages || []).map((p) => [p.id, p]));
  if (!byId.home) errors.push('id가 home인 첫 페이지가 필요합니다.');
  for (const p of site.pages || []) {
    if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) errors.push(`페이지 id "${p.id}"는 영문 소문자·숫자·-만 쓸 수 있습니다.`);
    if (ids.has(p.id)) errors.push(`페이지 id "${p.id}"가 중복됩니다.`);
    ids.add(p.id);
    if (p.id !== 'home' && !/^[a-z0-9-]+$/.test(p.slug || '')) errors.push(`"${tx(p.navLabel, 'ko') || p.id}" 페이지 주소(slug)는 영문 소문자·숫자·-로 입력하세요.`);
    if (p.parent && !byId[p.parent]) errors.push(`"${p.id}"의 상위 페이지 "${p.parent}"가 없습니다.`);
    let seen = new Set([p.id]); let cur = p;
    while (cur && cur.parent) { if (seen.has(cur.parent)) { errors.push(`"${p.id}" 상위 페이지 연결이 순환합니다.`); break; } seen.add(cur.parent); cur = byId[cur.parent]; }
    if (!p.hidden && !errors.length) {
      const pp = pagePath(p, byId);
      if (paths.has(pp)) errors.push(`주소 "/${pp}"를 쓰는 페이지가 둘 이상입니다.`);
      paths.add(pp);
    }
    if (!tx(p.title, 'en')) warnings.push(`"${tx(p.navLabel, 'ko') || p.id}" 영문 제목이 비어 있습니다(한국어로 대체 표시).`);
  }
  if (!site.company?.email && !site.company?.formEndpoint) warnings.push('문의를 받을 이메일이 비어 있습니다(사이트 정보 → 대표 이메일).');
  return { errors, warnings };
}

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return 0;
  let n = 0;
  fs.mkdirSync(dst, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()) { n += copyDir(s, d); continue; }
    const st = fs.statSync(s);
    if (fs.existsSync(d)) {
      const dt = fs.statSync(d);
      if (dt.size === st.size && dt.mtimeMs >= st.mtimeMs) continue;
    }
    fs.copyFileSync(s, d);
    n++;
  }
  return n;
}

function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

export function build({ content, outDir = path.join(ROOT, 'dist'), preview = false, clean = true } = {}) {
  const t0 = Date.now();
  const site = content || loadContent();
  const { errors, warnings } = validate(site);
  if (errors.length) return { ok: false, errors, warnings };

  if (clean) {
    // keep media (copied incrementally) but drop old pages
    for (const ent of fs.existsSync(outDir) ? fs.readdirSync(outDir) : []) {
      if (ent === 'media') continue;
      rmrf(path.join(outDir, ent));
    }
  }
  fs.mkdirSync(outDir, { recursive: true });

  // assets
  const css = fs.readFileSync(path.join(ASSETS_DIR, 'site.css'), 'utf8');
  const js = fs.readFileSync(path.join(ASSETS_DIR, 'site.js'), 'utf8');
  const assetsVersion = crypto.createHash('sha1').update(css + js).digest('hex').slice(0, 8);
  write(path.join(outDir, 'assets', 'site.css'), css);
  write(path.join(outDir, 'assets', 'site.js'), js);
  write(path.join(outDir, 'assets', 'hyphae.svg'), hyphaeSvg('mycogen'));
  const moss = site.brand?.colors?.moss || '#5f6b3a';
  const logoSvg = MARK_SVG.replace('class="mark"', `xmlns="http://www.w3.org/2000/svg" width="64" height="64" color="${moss}"`).replace(' aria-hidden="true" focusable="false"', '');
  write(path.join(outDir, 'assets', 'logo.svg'), logoSvg);
  write(path.join(outDir, 'assets', 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${moss}"/>${MARK_SVG.replace(/<svg[^>]*>/, '<g color="#fbf8f2">').replace('</svg>', '</g>')}</svg>`);
  if (preview) write(path.join(outDir, 'assets', 'preview-bridge.js'), fs.readFileSync(path.join(ASSETS_DIR, 'preview-bridge.js'), 'utf8'));

  const mediaCopied = copyDir(MEDIA_DIR, path.join(outDir, 'media'));

  // pages
  const byId = Object.fromEntries(site.pages.map((p) => [p.id, p]));
  const pages = site.pages.filter((p) => !p.hidden);
  let count = 0;
  for (const lang of LANGS) {
    for (const page of pages) {
      const rel = langPrefix(lang, site) + pagePath(page, byId);
      write(path.join(outDir, rel, 'index.html'), renderPage(site, page, lang, { preview, assetsVersion }));
      count++;
    }
  }
  write(path.join(outDir, '404.html'), render404(site, site.meta?.defaultLang || 'ko', { assetsVersion }));

  // search engines
  const base = (site.meta?.siteUrl || '').replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages.map((p) => {
    const alts = LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${base}/${langPrefix(l, site)}${pagePath(p, byId)}"/>`).join('\n');
    return LANGS.map((l) => `  <url>\n    <loc>${base}/${langPrefix(l, site)}${pagePath(p, byId)}</loc>\n    <lastmod>${today}</lastmod>\n${alts}\n  </url>`).join('\n');
  }).join('\n');
  write(path.join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`);
  write(path.join(outDir, 'robots.txt'), preview ? 'User-agent: *\nDisallow: /\n' : robotsTxt(site, base));
  if (!preview) {
    write(path.join(outDir, 'llms.txt'), llmsTxt(site, base, byId, pages));
    write(path.join(outDir, 'llms-full.txt'), llmsFull(site, base, byId, pages));
    write(path.join(outDir, 'rss.xml'), rssXml(site, base, byId));
  }
  // Apache hosting (Cafe24, Gabia, etc.): 404 page and caching
  write(path.join(outDir, '.htaccess'), [
    'ErrorDocument 404 /404.html',
    'AddDefaultCharset UTF-8',
    'AddType image/webp .webp',
    'AddType image/svg+xml .svg',
    '<IfModule mod_expires.c>',
    '  ExpiresActive On',
    '  ExpiresByType text/html "access plus 0 seconds"',
    '  ExpiresByType text/css "access plus 1 year"',
    '  ExpiresByType application/javascript "access plus 1 year"',
    '  ExpiresByType image/webp "access plus 1 month"',
    '  ExpiresByType image/jpeg "access plus 1 month"',
    '  ExpiresByType image/png "access plus 1 month"',
    '  ExpiresByType image/svg+xml "access plus 1 month"',
    '</IfModule>',
    '',
  ].join('\n'));

  return { ok: true, pages: count, mediaCopied, ms: Date.now() - t0, warnings, outDir };
}

// ---------- search engines & AI assistants ----------
// Search and AI crawlers that are explicitly welcome (all others are allowed by "*" too).
const CRAWLERS = [
  'Googlebot', 'Google-Extended', 'Bingbot', 'Yeti', 'Daumoa', 'DuckDuckBot', 'Applebot', 'Applebot-Extended',
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User', 'meta-externalagent', 'Amazonbot', 'CCBot', 'cohere-ai',
  'DuckAssistBot', 'MistralAI-User', 'YouBot', 'Bytespider',
];

function robotsTxt(site, base) {
  const daum = String(site.meta?.daumVerification || '').trim();
  const daumLine = daum ? (daum.startsWith('#') ? daum : `#DaumWebMasterTool:${daum}`) : '';
  return [
    'User-agent: *', 'Allow: /', '',
    '# Search engines and AI assistants are welcome to read and cite this site.',
    ...CRAWLERS.map((c) => `User-agent: ${c}`), 'Allow: /', '',
    `Sitemap: ${base}/sitemap.xml`,
    daumLine, '',
  ].join('\n');
}

const pageUrl = (base, site, byId, p, lang) => `${base}/${langPrefix(lang, site)}${pagePath(p, byId)}`;
const one = (v) => String(v || '').replace(/\s*\n\s*/g, ' ').trim();

// llms.txt — a short, factual map of the site for AI assistants (https://llmstxt.org)
function llmsTxt(site, base, byId, pages) {
  const c = site.company || {};
  const nameKo = tx(c.name, 'ko'); const nameEn = tx(c.name, 'en');
  const biz = site.pages.filter((p) => p.parent === 'business' && !p.hidden);
  const facts = [
    `- 회사명 / Company: ${nameKo}${nameEn ? ` (${nameEn})` : ''}`,
    tx(c.founded, 'ko') ? `- 설립 / Founded: ${tx(c.founded, 'ko')}` : '',
    biz.length ? `- 사업 분야 / Business: ${biz.map((p) => `${tx(p.navLabel, 'ko')} (${tx(p.navLabel, 'en')})`).join(', ')}` : '',
    tx(c.ceo, 'ko') ? `- 대표 / CEO: ${tx(c.ceo, 'ko')}` : '',
    one(tx(c.address, 'ko')) ? `- 주소 / Address: ${one(tx(c.address, 'ko'))}` : '',
    c.email ? `- 이메일 / Email: ${c.email}` : '',
    c.tel ? `- 전화 / Tel: ${c.tel}` : '',
    `- 웹사이트 / Website: ${base}/`,
    ...socialUrls(site).map((u) => `- SNS: ${u}`),
  ].filter(Boolean);
  const list = (lang) => pages.map((p) => `- [${one(tx(p.title, lang) || tx(p.navLabel, lang))}](${pageUrl(base, site, byId, p, lang)})${one(tx(p.description, lang)) ? `: ${one(tx(p.description, lang))}` : ''}`);
  const news = [...(site.news || [])].filter((n) => !n.hidden).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 10)
    .map((n) => `- ${n.date} ${one(tx(n.title, 'ko'))}${one(tx(n.summary, 'ko')) ? ` — ${one(tx(n.summary, 'ko'))}` : ''}`);
  return [
    `# ${nameKo}${nameEn ? ` (${nameEn})` : ''}`, '',
    `> ${one(tx(site.meta?.description, 'ko'))}`, '',
    one(tx(site.meta?.description, 'en')), '',
    '## 회사 개요 / Company facts', ...facts, '',
    '## 주요 페이지 (한국어)', ...list('ko'), '',
    '## Key pages (English)', ...list('en'), '',
    ...(news.length ? ['## 최근 소식 / Latest news', ...news, ''] : []),
    '## 전체 본문 / Full text',
    `- [llms-full.txt](${base}/llms-full.txt): 모든 페이지의 본문(한국어·영어) / full text of every page`,
    '',
  ].join('\n');
}

// llms-full.txt — every page as plain text, Korean then English
function llmsFull(site, base, byId, pages) {
  const parts = [`# ${tx(site.company?.name, 'ko')} (${tx(site.company?.name, 'en')}) — ${base}/`, ''];
  for (const lang of LANGS) {
    for (const p of pages) {
      parts.push(`# ${one(tx(p.title, lang) || tx(p.navLabel, lang))}`, `URL: ${pageUrl(base, site, byId, p, lang)}`, '');
      if (one(tx(p.description, lang))) parts.push(one(tx(p.description, lang)), '');
      parts.push(pageText(site, p, lang), '', '---', '');
    }
  }
  return parts.join('\n');
}

// rss.xml — news feed (submit to Naver Search Advisor → 요청 › RSS 제출)
function rssXml(site, base, byId) {
  const x = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]));
  const newsPage = byId.news && !byId.news.hidden ? pageUrl(base, site, byId, byId.news, 'ko') : `${base}/`;
  const link = (l) => {
    if (!l) return newsPage;
    if (l.startsWith('page:')) { const p = byId[l.slice(5).split('#')[0]]; return p ? pageUrl(base, site, byId, p, 'ko') : newsPage; }
    if (l.startsWith('media/')) return `${base}/${l}`;
    return /^https?:/.test(l) ? l : newsPage;
  };
  const items = [...(site.news || [])].filter((n) => !n.hidden).sort((a, b) => String(b.date).localeCompare(String(a.date))).map((n, k) => {
    const d = new Date(`${n.date}T09:00:00+09:00`);
    return `  <item>
    <title>${x(tx(n.title, 'ko'))}</title>
    <link>${x(link(n.link))}</link>
    <guid isPermaLink="false">${x(`${base}/news/${n.date}-${k}`)}</guid>
    ${isNaN(d) ? '' : `<pubDate>${d.toUTCString()}</pubDate>`}
    <description>${x(tx(n.summary, 'ko'))}</description>
  </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${x(tx(site.meta?.siteName, 'ko') || tx(site.company?.name, 'ko'))} 소식</title>
  <link>${x(newsPage)}</link>
  <description>${x(tx(site.meta?.description, 'ko'))}</description>
  <language>ko</language>
  <atom:link href="${x(base)}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>
`;
}

// CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const res = build();
  if (!res.ok) {
    console.error('빌드 실패:\n - ' + res.errors.join('\n - '));
    process.exit(1);
  }
  for (const w of res.warnings) console.warn('주의: ' + w);
  console.log(`완료: ${res.pages}개 페이지, 미디어 ${res.mediaCopied}개 복사, ${res.ms}ms → ${path.relative(process.cwd(), res.outDir) || res.outDir}`);
}
