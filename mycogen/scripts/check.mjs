// Builds the site and checks that every internal link and image in dist/ points at a real file.
//   node scripts/check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { build, ROOT } from '../src/build.mjs';

const res = build();
if (!res.ok) { console.error('빌드 실패:\n - ' + res.errors.join('\n - ')); process.exit(1); }
const dist = path.join(ROOT, 'dist');
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); e.isDirectory() ? walk(f) : f.endsWith('.html') && files.push(f); } })(dist);

let broken = 0; let checked = 0;
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    let url = m[1].replace(/&amp;/g, '&');
    if (/^(https?:|mailto:|tel:|data:|#)/.test(url)) continue;
    url = url.split('#')[0].split('?')[0];
    if (!url) continue;
    const base = url.startsWith('/') ? dist : path.dirname(file);
    let target = path.join(base, decodeURIComponent(url));
    if (url.endsWith('/') || (fs.existsSync(target) && fs.statSync(target).isDirectory())) target = path.join(target, 'index.html');
    checked++;
    if (!fs.existsSync(target)) { broken++; console.log(`깨진 링크: ${path.relative(dist, file)} → ${m[1]}`); }
  }
}
for (const w of res.warnings) console.warn('주의: ' + w);
console.log(`${files.length}개 페이지, 링크·이미지 ${checked}개 확인, 깨진 링크 ${broken}개`);
process.exit(broken ? 1 : 0);
