// Static site builder.
//   node src/build.mjs            -> builds dist/ from content/site.json
// Used by the editor too (import { build } from './build.mjs').

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { renderPage, render404, pagePath, langPrefix, hyphaeSvg, MARK_SVG, tx } from './render.mjs';
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
  write(path.join(outDir, 'robots.txt'), preview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
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
