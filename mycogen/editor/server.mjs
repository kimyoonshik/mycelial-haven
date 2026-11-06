// Mycogen 홈페이지 편집기 — local editing server.
//   node editor/server.mjs          (opens http://127.0.0.1:4777 in your browser)
//   node editor/server.mjs --no-open
// Closes by itself ~10 s after the last editor/homepage browser tab is closed (--stay keeps it running).
//   node editor/server.mjs --site       (opens the finished website at /site/ instead of the editor)
// Needs only Node.js 18+. Listens on 127.0.0.1, so it is reachable from this computer only.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { build, validate, loadContent, ROOT, CONTENT_FILE, MEDIA_DIR } from '../src/build.mjs';

const UI_DIR = path.join(ROOT, 'editor', 'ui');
const SRC_DIR = path.join(ROOT, 'src');
const PREVIEW_DIR = path.join(ROOT, '.preview');
const DIST_DIR = path.join(ROOT, 'dist');
const HISTORY_DIR = path.join(ROOT, 'content', '.history');
const TRASH_DIR = path.join(ROOT, 'content', '.trash');
const KEEP_HISTORY = 80;
const MAX_UPLOAD = 200 * 1024 * 1024; // videos can be large; the editor warns above 60MB
const UPLOAD_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.pdf', '.mp4', '.webm']);
const VERSION = '1.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2',
};

// ---------- helpers ----------
function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
  res.end(data);
}

function readBody(req, limit = MAX_UPLOAD) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error(`파일이 너무 큽니다(최대 ${Math.round(limit / 1048576)}MB).`), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const buf = await readBody(req, 30 * 1024 * 1024);
  try { return JSON.parse(buf.toString('utf8')); } catch { throw Object.assign(new Error('JSON 형식이 올바르지 않습니다.'), { status: 400 }); }
}

function inside(base, p) {
  const rel = path.relative(base, p);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function serveFile(res, base, rel, inject = '') {
  let file = path.resolve(base, '.' + path.sep + decodeURIComponent(rel));
  if (!inside(base, file)) return send(res, 403, 'forbidden', 'text/plain');
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) {
    const nf = path.join(base, '404.html');
    if (fs.existsSync(nf)) return send(res, 404, fs.readFileSync(nf), MIME['.html']);
    return send(res, 404, '찾을 수 없습니다: ' + rel, 'text/plain; charset=utf-8');
  }
  const ext = path.extname(file).toLowerCase();
  if (inject && ext === '.html') {
    const html = fs.readFileSync(file, 'utf8');
    return send(res, 200, html.includes('</body>') ? html.replace('</body>', `${inject}</body>`) : html + inject, MIME['.html']);
  }
  send(res, 200, fs.readFileSync(file), MIME[ext] || 'application/octet-stream');
}

// ---------- close by itself when the browser windows are closed ----------
// Editor and homepage tabs report "alive" every 15 s and say "bye" when they close.
// When no tab is left (after a short grace period for page reloads), the server exits
// and the black launcher window closes with it.
const ALIVE_SNIPPET = '<script src="/__alive.js"></script>';
const ALIVE_JS = `(function(){var id=Math.random().toString(36).slice(2)+Date.now().toString(36);
function ping(){try{fetch('/api/alive?id='+id,{method:'POST',keepalive:true}).catch(function(){});}catch(e){}}
ping();setInterval(ping,15000);
document.addEventListener('visibilitychange',function(){if(!document.hidden)ping();});
addEventListener('pageshow',function(e){if(e.persisted)ping();});
addEventListener('pagehide',function(){try{navigator.sendBeacon('/api/bye?id='+id);}catch(e){}});})();`;
const clients = new Map(); // tab id -> last seen
let everSeen = false;
let closing = null;
const STALE_MS = 3.5 * 60 * 1000; // background tabs may ping only once a minute
const GRACE_MS = 8000;            // a reloading page registers again well within this

function alive(id) {
  if (!id) return;
  clients.set(id, Date.now());
  everSeen = true;
  if (closing) { clearTimeout(closing); closing = null; }
}
function bye(id) {
  clients.delete(id);
  maybeClose();
}
function maybeClose() {
  if (!everSeen || clients.size || closing || process.argv.includes('--stay')) return;
  closing = setTimeout(() => {
    closing = null;
    if (clients.size) return;
    console.log('\n 브라우저 창이 모두 닫혀 편집기를 종료합니다.');
    setTimeout(() => process.exit(0), 200);
  }, GRACE_MS);
}
setInterval(() => {
  const now = Date.now();
  for (const [id, t] of clients) if (now - t > STALE_MS) clients.delete(id);
  maybeClose();
}, 15000).unref();

function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function backupCurrent() {
  if (!fs.existsSync(CONTENT_FILE)) return null;
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
  const name = `site-${stamp()}.json`;
  fs.copyFileSync(CONTENT_FILE, path.join(HISTORY_DIR, name));
  const all = fs.readdirSync(HISTORY_DIR).filter((f) => f.endsWith('.json')).sort();
  for (const old of all.slice(0, Math.max(0, all.length - KEEP_HISTORY))) fs.rmSync(path.join(HISTORY_DIR, old));
  return name;
}

function listMedia(dir = MEDIA_DIR, prefix = 'media') {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const full = path.join(dir, ent.name);
    const rel = `${prefix}/${ent.name}`;
    if (ent.isDirectory()) out.push(...listMedia(full, rel));
    else {
      const st = fs.statSync(full);
      out.push({ path: rel, size: st.size, mtime: st.mtimeMs, ext: path.extname(ent.name).toLowerCase() });
    }
  }
  return out;
}

function safeName(name) {
  const ext = path.extname(name).toLowerCase();
  let base = path.basename(name, path.extname(name)).normalize('NFKC').toLowerCase()
    .replace(/[^a-z0-9가-힣._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  if (!base) base = 'file';
  return { base: base.slice(0, 60), ext };
}

function openInOs(target) {
  const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', target]]
    : process.platform === 'darwin' ? ['open', [target]] : ['xdg-open', [target]];
  try { spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore' }).unref(); } catch { /* no desktop */ }
}

// ---------- zip (deflate, no dependencies) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

function zipDir(dir) {
  const files = [];
  const walk = (d, rel) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name);
      const r = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) walk(full, r); else files.push([r, full]);
    }
  };
  walk(dir, '');
  const parts = []; const central = []; let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const [name, full] of files) {
    const data = fs.readFileSync(full);
    const crc = crc32(data);
    const already = /\.(webp|jpe?g|png|gif|avif|mp4|webm|pdf|woff2|zip)$/i.test(name);
    const comp = already ? data : zlib.deflateRawSync(data, { level: 9 });
    const method = already ? 0 : 8;
    const nameBuf = Buffer.from(name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(method, 8);
    local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    parts.push(local, nameBuf, comp);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8); cen.writeUInt16LE(method, 10);
    cen.writeUInt16LE(dosTime, 12); cen.writeUInt16LE(dosDate, 14); cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(comp.length, 20);
    cen.writeUInt32LE(data.length, 24); cen.writeUInt16LE(nameBuf.length, 28); cen.writeUInt32LE(offset, 42);
    central.push(cen, nameBuf);
    offset += 30 + nameBuf.length + comp.length;
  }
  const cenBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cenBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cenBuf, end]);
}

// ---------- routes ----------
async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const m = req.method;

  // Only accept requests addressed to this machine (blocks DNS-rebinding style access).
  const host = (req.headers.host || '').split(':')[0];
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) return send(res, 403, 'forbidden', 'text/plain');
  if (m !== 'GET' && m !== 'HEAD') {
    const origin = req.headers.origin;
    if (origin && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) return send(res, 403, { error: '허용되지 않은 요청입니다.' });
  }

  if (p === '/' || p === '/index.html') return serveFile(res, UI_DIR, 'index.html', ALIVE_SNIPPET);
  if (p === '/__alive.js') return send(res, 200, ALIVE_JS, MIME['.js']);
  if (p === '/api/alive' && m === 'POST') { alive(url.searchParams.get('id')); res.writeHead(204); return res.end(); }
  if (p === '/api/bye' && m === 'POST') { bye(url.searchParams.get('id')); res.writeHead(204); return res.end(); }
  if (p.startsWith('/ui/')) return serveFile(res, UI_DIR, p.slice(4));
  if (p.startsWith('/src/') && p.endsWith('.mjs')) return serveFile(res, SRC_DIR, p.slice(5));
  if (p.startsWith('/preview/')) return serveFile(res, PREVIEW_DIR, p.slice(9) || 'index.html');
  if (p === '/preview') { res.writeHead(302, { Location: '/preview/' }); return res.end(); }
  if (p.startsWith('/site/')) return serveFile(res, DIST_DIR, p.slice(6) || 'index.html', ALIVE_SNIPPET);
  if (p === '/site') { res.writeHead(302, { Location: '/site/' }); return res.end(); }
  if (p.startsWith('/media/') && m === 'GET') return serveFile(res, MEDIA_DIR, p.slice(7));

  if (p === '/api/info') {
    return send(res, 200, { version: VERSION, node: process.version, root: ROOT, platform: process.platform });
  }

  if (p === '/api/content' && m === 'GET') {
    return send(res, 200, fs.readFileSync(CONTENT_FILE, 'utf8'));
  }

  if (p === '/api/content' && m === 'PUT') {
    const site = await readJson(req);
    const { errors, warnings } = validate(site);
    if (errors.length) return send(res, 400, { ok: false, errors, warnings });
    const backup = backupCurrent();
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(site, null, 2) + '\n');
    const result = build({ content: site });
    return send(res, 200, { ok: true, backup, build: result, warnings });
  }

  if (p === '/api/draft' && m === 'POST') {
    const site = await readJson(req);
    const result = build({ content: site, outDir: PREVIEW_DIR, preview: true });
    return send(res, result.ok ? 200 : 400, result);
  }

  if (p === '/api/build' && m === 'POST') {
    const result = build({ content: loadContent() });
    return send(res, result.ok ? 200 : 400, result);
  }

  if (p === '/api/export' && m === 'GET') {
    const result = build({ content: loadContent() });
    if (!result.ok) return send(res, 400, result);
    const zip = zipDir(DIST_DIR);
    return send(res, 200, zip, 'application/zip', { 'Content-Disposition': `attachment; filename="mycogen-site-${stamp().slice(0, 8)}.zip"` });
  }

  if (p === '/api/history' && m === 'GET') {
    const list = fs.existsSync(HISTORY_DIR)
      ? fs.readdirSync(HISTORY_DIR).filter((f) => f.endsWith('.json')).sort().reverse().map((f) => ({ name: f, size: fs.statSync(path.join(HISTORY_DIR, f)).size }))
      : [];
    return send(res, 200, list);
  }

  if (p === '/api/history/file' && m === 'GET') {
    const name = url.searchParams.get('name') || '';
    if (!/^site-[0-9-]+\.json$/.test(name)) return send(res, 400, { error: '잘못된 파일명' });
    const file = path.join(HISTORY_DIR, name);
    if (!fs.existsSync(file)) return send(res, 404, { error: '기록이 없습니다.' });
    return send(res, 200, fs.readFileSync(file, 'utf8'));
  }

  if (p === '/api/media' && m === 'GET') {
    return send(res, 200, listMedia().sort((a, b) => b.mtime - a.mtime));
  }

  if (p === '/api/media' && m === 'POST') {
    const { base, ext } = safeName(url.searchParams.get('name') || 'upload');
    if (!UPLOAD_EXT.has(ext)) return send(res, 400, { error: `올릴 수 없는 파일 형식입니다(${ext || '확장자 없음'}).` });
    const folder = (url.searchParams.get('folder') || 'uploads').replace(/[^a-z0-9-]/gi, '') || 'uploads';
    const buf = await readBody(req);
    if (!buf.length) return send(res, 400, { error: '빈 파일입니다.' });
    const dir = path.join(MEDIA_DIR, folder);
    fs.mkdirSync(dir, { recursive: true });
    let name = `${base}${ext}`;
    for (let i = 2; fs.existsSync(path.join(dir, name)); i++) name = `${base}-${i}${ext}`;
    fs.writeFileSync(path.join(dir, name), buf);
    return send(res, 200, { ok: true, path: `media/${folder}/${name}`, size: buf.length });
  }

  if (p === '/api/media' && m === 'DELETE') {
    const rel = url.searchParams.get('path') || '';
    const file = path.resolve(ROOT, 'content', rel);
    if (!rel.startsWith('media/') || !inside(MEDIA_DIR, file) || !fs.existsSync(file)) return send(res, 400, { error: '파일을 찾을 수 없습니다.' });
    const saved = fs.readFileSync(CONTENT_FILE, 'utf8');
    if (saved.includes(`"${rel}"`) || saved.includes(`(${rel})`)) return send(res, 409, { error: '저장된 콘텐츠에서 사용 중인 파일입니다. 먼저 사용처를 바꾸고 저장하세요.' });
    fs.mkdirSync(TRASH_DIR, { recursive: true });
    fs.renameSync(file, path.join(TRASH_DIR, `${stamp()}-${path.basename(file)}`));
    return send(res, 200, { ok: true });
  }

  if (p === '/api/open-folder' && m === 'POST') {
    const { which } = await readJson(req);
    const target = { dist: DIST_DIR, media: MEDIA_DIR, root: ROOT, history: HISTORY_DIR }[which];
    if (!target) return send(res, 400, { error: '알 수 없는 폴더' });
    fs.mkdirSync(target, { recursive: true });
    openInOs(target);
    return send(res, 200, { ok: true, path: target });
  }

  if (p === '/api/quit' && m === 'POST') {
    send(res, 200, { ok: true });
    console.log('\n편집기를 종료합니다.');
    setTimeout(() => process.exit(0), 200);
    return;
  }

  send(res, 404, { error: 'not found' });
}

// ---------- start ----------
function start(port, attempts = 0) {
  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error(err);
      if (!res.headersSent) send(res, err.status || 500, { ok: false, error: err.message, errors: [err.message] });
    });
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempts < 10) return start(port + 1, attempts + 1);
    console.error('편집기를 시작할 수 없습니다:', err.message);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}/`;
    // fresh preview + published build on start
    try {
      const site = loadContent();
      build({ content: site, outDir: PREVIEW_DIR, preview: true });
      const r = build({ content: site });
      if (!r.ok) console.warn('주의: 저장된 콘텐츠에 오류가 있습니다 →', r.errors.join(' / '));
    } catch (e) { console.warn('초기 빌드 실패:', e.message); }
    console.log('');
    console.log('  ┌──────────────────────────────────────────────┐');
    console.log('  │  마이코젠 홈페이지 편집기                     │');
    console.log(`  │  ${url.padEnd(44)}│`);
    console.log('  │  이 창을 닫으면 편집기가 종료됩니다.          │');
    console.log('  └──────────────────────────────────────────────┘');
    console.log('');
    // --site: open the finished website instead of the editor
    if (!process.argv.includes('--no-open')) openInOs(process.argv.includes('--site') ? `${url}site/` : url);
  });
}

start(Number(process.env.PORT) || 4777);
