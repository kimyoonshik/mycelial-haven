// 문의 접수·관리 서버: 홈페이지 문의 양식을 PostgreSQL에 기록하고 메일로도 보냅니다. Node 20 이상(권장 22 LTS).
// 포트 두 개를 엽니다(둘 다 127.0.0.1 에서만 받음). 관리 페이지는 본 사이트 도메인에서 아예 닿지 않습니다.
//   PORT (4780)        POST /api/contact  문의 접수 (nginx 가 www.mycogen.co.kr/api/contact 를 이 포트로 넘김)
//                      그 밖의 GET         사이트 정적 파일 (로컬 점검용. 운영에서는 nginx 가 직접 서비스)
//   ADMIN_PORT (4781)  관리 페이지: 문의 목록, 소식·블로그 글쓰기, AI 블로그 초안 (Cloudflare Tunnel: info.mycogen.co.kr → 이 포트)
// 설정은 환경변수로 받습니다. server/server.env.example 참고.
import http from 'node:http';
import tls from 'node:tls';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { pool, q, one, migrate } from './db.mjs';
import { KINDS, POST_COLUMNS, editorNews, publish, saveImage } from './posts.mjs';
import { draftPost, draftError } from './draft.mjs';

const env = process.env;
const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.resolve(env.DIST_DIR || path.join(ROOT, 'dist'));
const PORT = Number(env.PORT) || 4780;
const ADMIN_PORT = Number(env.ADMIN_PORT) || 4781;
const SITE_URL = (env.SITE_URL || 'https://www.mycogen.co.kr').replace(/\/$/, '');
const RETAIN_DAYS = Number(env.RETAIN_DAYS) || 365; // 개인정보처리방침 3항: 1년 보관 후 파기

if (!env.DATABASE_URL) { console.error('DATABASE_URL 이 없습니다. server.env 를 확인하세요.'); process.exit(1); }
await migrate();
const purge = () => q('DELETE FROM inquiries WHERE created_at < now() - make_interval(days => $1)', [RETAIN_DAYS])
  .catch((e) => console.error('문의 파기 실패:', e.message));
const first = await publish(DIST); // DB 글을 반영해 사이트를 최신으로
console.log('사이트 빌드:', first.ok ? `완료 → ${DIST}` : `실패 ${first.errors.join(', ')}`);
await purge();
setInterval(purge, 864e5).unref();

// ---------- 입력 검사 ----------
const LIMITS = { name: 100, company: 200, email: 200, phone: 50, topic: 100, message: 5000 };
export function clean(body) {
  const d = {};
  for (const [k, max] of Object.entries(LIMITS)) d[k] = String(body?.[k] ?? '').trim().slice(0, max);
  if (!d.name || !d.message) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return null;
  if (!body.agree) return null; // 개인정보 수집 동의 없이는 저장하지 않음
  return d;
}

// IP당 10분에 max건. 메모리에만 기록(재시작 시 초기화)하고 10분마다 오래된 기록을 지웁니다.
const limiters = [];
const limiter = (max) => {
  const hits = new Map();
  limiters.push(hits);
  return (ip) => {
    const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 6e5);
    list.push(now); hits.set(ip, list);
    return list.length > max;
  };
};
setInterval(() => { const now = Date.now(); for (const m of limiters) for (const [k, v] of m) if (v.every((t) => now - t >= 6e5)) m.delete(k); }, 6e5).unref();
const tooManyInquiries = limiter(5);
const tooManyLogins = limiter(10);
const tooManyDrafts = limiter(20); // AI 초안은 비용이 들어 10분에 20건까지

// ---------- 메일 (SMTP, SSL 465 포트) ----------
const oneLine = (s) => String(s).replace(/[\r\n]+/g, ' ');
const b64 = (s) => Buffer.from(s).toString('base64');
export function smtpSend({ from, to, replyTo, subject, text }) {
  return new Promise((resolve, reject) => {
    const sock = tls.connect({ host: env.SMTP_HOST, port: Number(env.SMTP_PORT) || 465, servername: env.SMTP_HOST });
    const body = text.replace(/\r?\n/g, '\r\n');
    const msg = [
      `From: ${from}`, `To: ${to}`, ...(replyTo ? [`Reply-To: ${oneLine(replyTo)}`] : []),
      `Subject: =?UTF-8?B?${b64(oneLine(subject))}?=`, `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@${(from.match(/@([^>\s]+)/) || [])[1] || 'localhost'}>`,
      'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64',
      '', b64(body).replace(/.{76}/g, '$&\r\n'), // base64 본문이라 줄머리 '.' 문제가 생기지 않음
    ].join('\r\n');
    const addr = (s) => s.match(/<([^>]+)>/)?.[1] || s;
    const steps = [
      [220, `EHLO ${os.hostname()}`], [250, 'AUTH LOGIN'], [334, b64(env.SMTP_USER)], [334, b64(env.SMTP_PASS)],
      [235, `MAIL FROM:<${addr(from)}>`], [250, `RCPT TO:<${addr(to)}>`], [250, 'DATA'], [354, `${msg}\r\n.`], [250, 'QUIT'],
    ];
    let buf = '';
    sock.setTimeout(20000, () => sock.destroy(new Error('SMTP timeout')));
    sock.on('error', reject);
    sock.on('data', (chunk) => { try {
      buf += chunk;
      const lines = buf.split('\r\n'); const last = lines[lines.length - 2];
      if (!last || last[3] === '-') return; // 여러 줄 응답이 끝날 때까지 대기
      buf = '';
      if (!steps.length) return; // QUIT 뒤의 221 등 남은 응답은 무시
      const code = Number(last.slice(0, 3)); const [want, cmd] = steps.shift();
      if (code !== want) { sock.destroy(); return reject(new Error(`SMTP ${last}`)); }
      if (!steps.length) { sock.end(cmd + '\r\n'); return resolve(); }
      sock.write(cmd + '\r\n');
    } catch (e) { sock.destroy(); reject(e); } }); // 메일 오류가 서버 전체를 멈추지 않도록
  });
}

async function notify(d, id) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.MAIL_TO) return 'skipped';
  const text = [
    `접수번호: ${id}`, `성함: ${d.name}`, `회사: ${d.company || '-'}`, `이메일: ${d.email}`,
    `연락처: ${d.phone || '-'}`, `유형: ${d.topic || '-'}`, '', d.message, '',
    `— 홈페이지 문의 양식에서 자동 발송. 전체 목록: ${env.ADMIN_URL || '관리 페이지'}`,
  ].join('\n');
  try {
    await smtpSend({ from: env.MAIL_FROM || env.SMTP_USER, to: env.MAIL_TO, replyTo: d.email,
      subject: `[홈페이지 문의] ${d.topic ? d.topic + ' - ' : ''}${d.company || d.name}`, text });
    return 'sent';
  } catch (e) {
    console.error(`문의 ${id} 메일 실패:`, e.message);
    return 'failed: ' + e.message.slice(0, 200);
  }
}

// ---------- 자동 등록 방지 (Cloudflare Turnstile) ----------
// TURNSTILE_SECRET 가 있으면 검사, 없으면 통과(키 발급 전)
async function humanCheck(token, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST',
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: String(token), remoteip: ip }), signal: AbortSignal.timeout(8000) });
    return (await r.json()).success === true;
  } catch (e) { console.error('Turnstile 확인 실패:', e.message); return false; }
}

// ---------- 공통 ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
// 두 서버 모두 127.0.0.1 에서만 받으므로(nginx·cloudflared 뒤) 프록시가 넘겨 준 방문자 IP를 씁니다.
const ipOf = (req) => req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.socket.remoteAddress;
function send(res, code, body, headers = {}) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}
/** 요청 본문 읽기. max 바이트를 넘으면 연결을 끊고 null */
function readBody(req, max) {
  return new Promise((resolve) => {
    let raw = '', over = false;
    req.on('data', (c) => { raw += c; if (raw.length > max && !over) { over = true; resolve(null); req.destroy(); } });
    req.on('end', () => { if (!over) resolve(raw); });
    req.on('error', () => resolve(null));
  });
}
// 처리 중 오류(DB 끊김 등)가 나도 서버가 죽지 않고 500으로 답합니다.
const safe = (handler, onError) => (req, res) => handler(req, res).catch((e) => {
  console.error(`${req.method} ${req.url} 처리 실패:`, e);
  if (!res.headersSent) onError(res); else res.end();
});

// ---------- 관리 페이지 (로그인) ----------
const SESSION_HOURS = 12;
const secret = env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'); // 미설정 시 재시작하면 다시 로그인
const sign = (v) => crypto.createHmac('sha256', secret).update(v).digest('base64url');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const newSession = () => { const exp = String(Date.now() + SESSION_HOURS * 36e5); return `${exp}.${sign(exp)}`; };
function loggedIn(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)sid=([^;]+)/);
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  return !!sig && same(sig, sign(exp)) && Number(exp) > Date.now();
}
const cookie = (req, value, maxAge) => `sid=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`
  + (req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '');

const page = (title, body, tab = '', head = '') => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">${head}<title>${title} · 마이코젠 관리</title><style>
body{font:14px/1.5 system-ui,sans-serif;margin:0;color:#222;background:#fbfaf6}main{padding:24px;max-width:1100px;margin:auto}h1{font-size:20px}
nav.top{display:flex;gap:4px;align-items:center;background:#23201b;padding:8px 24px;flex-wrap:wrap}nav.top a{color:#ddd;text-decoration:none;padding:6px 12px;border-radius:6px}
nav.top a[aria-current]{background:#5b6436;color:#fff}nav.top form{margin-left:auto}nav.top button{background:transparent;border:1px solid #777}
table{border-collapse:collapse;width:100%;background:#fff}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}
th{background:#f0ede4}.m{white-space:pre-wrap;max-width:40ch}small{color:#666}.bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.login{max-width:320px;margin:12vh auto;background:#fff;padding:28px;border:1px solid #ddd;border-radius:8px}
label{display:block;margin:14px 0 4px;font-weight:600}input,textarea,select{width:100%;box-sizing:border-box;padding:10px;font:inherit;border:1px solid #bbb;border-radius:6px;background:#fff}
input[type=checkbox]{width:auto}textarea{min-height:360px;font-family:ui-monospace,monospace;line-height:1.6}
button,.btn{display:inline-block;padding:10px 16px;font:inherit;border:0;border-radius:6px;background:#5b6436;color:#fff;cursor:pointer;text-decoration:none}
.btn--line{background:#fff;color:#5b6436;border:1px solid #5b6436}.btn--danger{background:#fff;color:#b00020;border:1px solid #b00020}
.login button{width:100%;margin-top:18px}.row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}.actions{display:flex;gap:8px;margin-top:20px;flex-wrap:wrap}
.draftbox{background:#fff;border:1px solid #ddd;border-radius:8px;padding:4px 20px 20px;margin:20px 0}.draftbox h2{font-size:16px}button:disabled{opacity:.6;cursor:wait}
.err{color:#b00020}.ok{color:#2f6b2f}.hint{color:#666;font-size:13px;margin:4px 0 0}.draft{color:#a06b00}.ed{color:#6b5a48}
@media(max-width:700px){table,tr,td{display:block}th{display:none}tr{border:1px solid #ddd;margin-bottom:12px}.row{grid-template-columns:1fr}}
</style></head><body>${tab === null ? body : `<nav class="top">${[['inquiries', '문의'], ['news', '소식'], ['blog', '블로그']]
  .map(([k, l]) => `<a href="/${k === 'inquiries' ? k : `posts?kind=${k}`}"${k === tab ? ' aria-current="page"' : ''}>${l}</a>`).join('')}
<a href="${esc(SITE_URL)}" target="_blank" rel="noopener">사이트 보기 ↗</a>
<form method="post" action="/logout"><button type="submit">로그아웃</button></form></nav><main>${body}</main>`}</body></html>`;

const loginPage = (error) => page('로그인', `<form class="login" method="post" action="/login">
<h1>마이코젠 관리</h1>${error ? `<p class="err" role="alert">${error}</p>` : ''}
<label for="u">아이디</label><input id="u" name="user" autocomplete="username" required autofocus>
<label for="p">비밀번호</label><input id="p" name="password" type="password" autocomplete="current-password" required>
<button type="submit">로그인</button></form>`, null);

async function inquiriesPage() {
  const rows = await q(`SELECT id, to_char(created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') AS created, name, company, email, phone, topic, message, mail_status
    FROM inquiries ORDER BY id DESC`);
  const tr = rows.map((r) => `<tr><td>${r.id}</td><td>${esc(r.created)}</td><td>${esc(r.name)}<br><small>${esc(r.company)}</small></td>
<td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a><br><small>${esc(r.phone)}</small></td><td>${esc(r.topic)}</td>
<td class="m">${esc(r.message)}</td><td><small>${esc(r.mail_status)}</small></td></tr>`).join('');
  return page('문의', `<h1>문의 접수 목록 (${rows.length}건)</h1>
<p><small>접수 시각은 한국 시간입니다. ${RETAIN_DAYS}일이 지난 문의는 자동으로 파기됩니다.</small></p>
<table><tr><th>#</th><th>접수</th><th>성함·회사</th><th>연락처</th><th>유형</th><th>내용</th><th>메일 발송</th></tr>${tr}</table>`, 'inquiries');
}

const postUrl = (p) => `${SITE_URL}/${p.kind}/${p.id}/`;
async function postsPage(kind, msg) {
  const rows = await q(`SELECT ${POST_COLUMNS} FROM posts WHERE kind = $1 ORDER BY date DESC, id DESC`, [kind]);
  const tr = rows.map((p) => `<tr><td>${esc(p.date)}</td><td><a href="/posts/${p.id}">${esc(p.title)}</a>${p.published ? '' : ' <span class="draft">(비공개)</span>'}<br><small>${esc(p.summary)}</small></td>
<td>${esc(p.category)}</td><td>${p.published ? `<a href="${esc(postUrl(p))}" target="_blank" rel="noopener">보기 ↗</a>` : ''}</td></tr>`);
  // 대표님 PC 편집기에서 쓴 소식도 사이트에 함께 나갑니다. 여기서는 읽기만 합니다.
  const fromEditor = kind === 'news' ? editorNews().map((n) => `<tr class="ed"><td>${esc(n.date)}</td><td>${esc(n.title?.ko)} <span class="ed">(편집기 글 — PC 편집기에서 고칩니다)</span><br><small>${esc(n.summary?.ko)}</small></td>
<td>${esc(n.category?.ko)}</td><td></td></tr>`) : [];
  const all = [...tr, ...fromEditor];
  return page(KINDS[kind], `<div class="bar"><h1>${KINDS[kind]} (${all.length}건)</h1><a class="btn" href="/posts/new?kind=${kind}">새 글 쓰기</a></div>
${msg ? `<p class="ok" role="status">${esc(msg)}</p>` : ''}
${kind === 'news' ? '<p class="hint">사이트의 소식에는 여기서 쓴 글과 PC 편집기에서 쓴 글이 날짜순으로 함께 나옵니다.</p>' : ''}
${kind === 'blog' ? draftBox() : ''}
<table><tr><th>날짜</th><th>제목</th><th>분류</th><th>사이트</th></tr>${all.join('') || '<tr><td colspan="4">아직 글이 없습니다.</td></tr>'}</table>`, kind);
}

const draftBox = (error = '', topic = '', notes = '') => `<form class="draftbox" method="post" action="/posts/draft" id="draft">
<h2>주제로 초안 만들기</h2>
${env.ANTHROPIC_API_KEY ? '' : '<p class="err">Claude API 키가 설정되지 않아 지금은 쓸 수 없습니다(server.env 의 ANTHROPIC_API_KEY).</p>'}
${error ? `<p class="err" role="alert">${esc(error)}</p>` : ''}
<label for="topic">주제</label><input id="topic" name="topic" value="${esc(topic)}" required maxlength="300" placeholder="예: 버섯 폐배지가 건축자재가 되기까지">
<label for="notes">참고 메모 (선택)</label><textarea id="notes" name="notes" maxlength="3000" style="min-height:90px" placeholder="꼭 넣을 내용, 강조할 점, 피할 표현 등">${esc(notes)}</textarea>
<p class="hint">AI가 제목·요약·본문을 써서 <b>비공개 초안</b>으로 저장합니다. 내용을 확인하고 고친 뒤 '사이트에 공개'를 체크하고 저장하면 게시됩니다. 1~2분 걸립니다.</p>
<div class="actions"><button type="submit" id="draftBtn">초안 만들기</button></div>
<script>document.getElementById('draft').addEventListener('submit', function () { var b = document.getElementById('draftBtn'); b.disabled = true; b.textContent = '요청 중…'; });</script>
</form>`;

// 본문 → HTML (사이트와 같은 규칙: 빈 줄로 문단, ## 소제목, - 목록, **굵게**, [글자](주소))
function bodyHtml(body) {
  const inl = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>').replace(/\n/g, '<br>');
  return String(body || '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).map((b) => {
    if (b.startsWith('## ')) return `<h3>${inl(b.slice(3))}</h3>`;
    const lines = b.split('\n');
    if (lines.every((l) => l.startsWith('- '))) return `<ul>${lines.map((l) => `<li>${inl(l.slice(2))}</li>`).join('')}</ul>`;
    return `<p>${inl(b)}</p>`;
  }).join('');
}

function editPage(p, error, notice) {
  const isNew = !p.id;
  const naver = p.id && p.published ? `<h2>${esc(p.title)}</h2>${p.image ? `<p><img src="${esc(`${SITE_URL}/${p.image}`)}" alt=""></p>` : ''}${bodyHtml(p.body || p.summary)}
<p>원문: <a href="${esc(postUrl(p))}">${esc(postUrl(p))}</a></p>` : '';
  return page(isNew ? '새 글' : '글 고치기', `<h1>${KINDS[p.kind]} · ${isNew ? '새 글 쓰기' : '글 고치기'}</h1>
${error ? `<p class="err" role="alert">${esc(error)}</p>` : ''}
${notice ? `<p class="ok" role="status">${esc(notice)}</p>` : ''}
<form method="post" action="/posts/save" id="post">
<input type="hidden" name="id" value="${esc(p.id || '')}"><input type="hidden" name="kind" value="${esc(p.kind)}">
<input type="hidden" name="imageData" id="imageData">
<label for="t">제목</label><input id="t" name="title" value="${esc(p.title)}" required maxlength="200">
<div class="row">
<div><label for="d">날짜</label><input id="d" name="date" type="date" value="${esc(p.date || today())}" required></div>
<div><label for="c">분류</label><input id="c" name="category" value="${esc(p.category ?? (p.kind === 'news' ? '공지' : ''))}" maxlength="40" placeholder="예: 공지, 연구개발"></div>
<div><label for="i">대표 이미지 (jpg·png·webp, 5MB 이하)</label><input id="i" type="file" accept="image/jpeg,image/png,image/webp">
${p.image ? `<p class="hint">현재: ${esc(p.image)} <label style="display:inline;font-weight:400"><input type="checkbox" name="removeImage"> 삭제</label></p>` : ''}</div>
</div>
<label for="s">요약 (목록과 검색 결과에 보이는 한두 문장)</label><input id="s" name="summary" value="${esc(p.summary)}" maxlength="300">
<label for="b">본문</label>
<p class="hint">빈 줄로 문단을 나눕니다. <code>## 소제목</code>, <code>- 목록</code>, <code>**굵게**</code>, <code>[글자](https://주소)</code>를 쓸 수 있습니다.</p>
<textarea id="b" name="body" maxlength="50000">${esc(p.body)}</textarea>
<label><input type="checkbox" name="published"${p.published === false ? '' : ' checked'}> 사이트에 공개</label>
<div class="actions"><button type="submit">저장하고 게시</button><a class="btn btn--line" href="/posts?kind=${esc(p.kind)}">목록</a>
${naver ? '<button type="button" class="btn--line" id="naver">네이버용 복사</button>' : ''}</div>
</form>
${isNew ? '' : `<form method="post" action="/posts/${p.id}/delete" onsubmit="return confirm('이 글을 삭제할까요? 되돌릴 수 없습니다.')" style="margin-top:32px">
<button type="submit" class="btn--danger">글 삭제</button></form>`}
${naver ? `<template id="naverHtml">${naver}</template><p class="hint" id="naverMsg" role="status"></p>` : ''}
<script>
document.getElementById('i').addEventListener('change', function () {
  var f = this.files[0]; if (!f) return;
  if (f.size > 5 * 1024 * 1024) { alert('5MB 이하 이미지만 올릴 수 있습니다.'); this.value = ''; return; }
  var r = new FileReader(); r.onload = function () { document.getElementById('imageData').value = r.result; }; r.readAsDataURL(f);
});
var nb = document.getElementById('naver');
if (nb) nb.addEventListener('click', async function () {
  var html = document.getElementById('naverHtml').innerHTML, tmp = document.createElement('div'); tmp.innerHTML = html;
  var msg = document.getElementById('naverMsg');
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([tmp.innerText], { type: 'text/plain' }) })]);
    msg.textContent = '복사했습니다. 네이버 블로그 글쓰기 화면에 붙여넣으세요(Ctrl+V). 이미지는 따로 올려 주세요.';
  } catch (e) { msg.textContent = '복사하지 못했습니다: ' + e.message; }
});
</script>`, p.kind);
}

const today = () => new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10); // 한국 날짜
const getPost = (id) => one(`SELECT ${POST_COLUMNS} FROM posts WHERE id = $1`, [id]);

async function savePost(f) {
  const kind = f.get('kind');
  if (!KINDS[kind]) return { error: '종류가 잘못되었습니다.' };
  const p = { kind, title: (f.get('title') || '').trim().slice(0, 200), date: f.get('date') || '', category: (f.get('category') || '').trim().slice(0, 40),
    summary: (f.get('summary') || '').trim().slice(0, 300), body: (f.get('body') || '').replace(/\r\n/g, '\n').trim().slice(0, 50000),
    published: !!f.get('published') };
  const id = Number(f.get('id')) || null;
  const old = id && await getPost(id);
  if (id && !old) return { error: '글을 찾을 수 없습니다.' };
  p.id = id; p.image = old?.image || '';
  if (!p.title) return { error: '제목을 입력하세요.', p };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date) || Number.isNaN(Date.parse(p.date))) return { error: '날짜를 확인하세요.', p };
  if (f.get('removeImage')) p.image = '';
  if (f.get('imageData')) {
    const img = saveImage(f.get('imageData'));
    if (!img) return { error: '이미지는 jpg·png·webp, 5MB 이하만 됩니다.', p };
    p.image = img;
  }
  const vals = [p.title, p.date, p.category, p.summary, p.body, p.image, p.published];
  if (id) {
    await q('UPDATE posts SET title=$1, date=$2, category=$3, summary=$4, body=$5, image=$6, published=$7, updated_at=now() WHERE id=$8', [...vals, id]);
  } else {
    p.id = (await one('INSERT INTO posts (title, date, category, summary, body, image, published, kind) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id', [...vals, kind])).id;
  }
  return { p };
}

async function republish() {
  const r = await publish(DIST);
  if (!r.ok) console.error('사이트 빌드 실패:', r.errors);
  return r.ok ? '' : ' (사이트 갱신 실패: ' + r.errors.join(', ') + ')';
}

// AI 초안은 1~2분 걸립니다. Cloudflare는 100초가 넘는 응답을 끊으므로(524) 뒤에서 만들고, 화면은 몇 초마다 다시 확인합니다.
const drafts = new Map(); // 작업번호 → { status: 'working'|'done'|'failed', id, error, topic, notes, at }
function startDraft(topic, notes) {
  const job = crypto.randomUUID();
  drafts.set(job, { status: 'working', topic, notes, at: Date.now() });
  (async () => {
    try {
      const d = await draftPost({ topic, notes });
      const row = await one('INSERT INTO posts (kind, title, date, category, summary, body, published) VALUES ($1,$2,$3,$4,$5,$6,false) RETURNING id',
        ['blog', d.title, today(), d.category, d.summary, d.body]);
      drafts.set(job, { ...drafts.get(job), status: 'done', id: row.id });
    } catch (e) {
      console.error('초안 실패:', e);
      drafts.set(job, { ...drafts.get(job), status: 'failed', error: draftError(e) });
    }
  })();
  for (const [k, v] of drafts) if (Date.now() - v.at > 36e5) drafts.delete(k); // 1시간 지난 작업 기록 정리
  return job;
}
const draftWaitPage = (job) => page('블로그', `<h1>블로그 · AI 초안 작성 중</h1>
<p>Claude가 초안을 쓰고 있습니다. 1~2분 걸립니다. 이 화면은 5초마다 저절로 확인합니다.</p>
<p class="hint">창을 닫아도 초안은 계속 만들어져 블로그 목록에 <span class="draft">(비공개)</span>로 저장됩니다.</p>`, 'blog', `<meta http-equiv="refresh" content="5;url=/posts/drafting/${esc(job)}">`);

const HTML = { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store',
  'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' };
const go = (res, to) => send(res, 303, '', { ...HTML, Location: to });

async function admin(req, res) {
  const url = new URL(req.url, 'http://x');
  const { pathname } = url;
  if (pathname === '/robots.txt') return send(res, 200, 'User-agent: *\nDisallow: /\n', { 'Content-Type': 'text/plain' });
  if (req.method === 'POST' && pathname === '/login') {
    const f = new URLSearchParams(await readBody(req, 2000) ?? '');
    if (tooManyLogins(ipOf(req))) return send(res, 429, loginPage('시도가 너무 많습니다. 10분 뒤 다시 시도해 주세요.'), HTML);
    // 비밀번호를 설정하지 않으면 아무도 로그인할 수 없음. 아이디·비밀번호 둘 다 비교해 시간 차로 추측할 수 없게 함
    const userOk = same(f.get('user'), env.ADMIN_USER || 'admin'), passOk = same(f.get('password'), env.ADMIN_PASSWORD || '');
    if (!env.ADMIN_PASSWORD || !userOk || !passOk) return send(res, 401, loginPage('아이디 또는 비밀번호가 맞지 않습니다.'), HTML);
    return send(res, 303, '', { ...HTML, Location: '/', 'Set-Cookie': cookie(req, newSession(), SESSION_HOURS * 3600) });
  }
  if (req.method === 'POST' && pathname === '/logout') return send(res, 303, '', { ...HTML, Location: '/', 'Set-Cookie': cookie(req, '', 0) });
  if (!loggedIn(req)) return pathname === '/' && req.method === 'GET' ? send(res, 200, loginPage(), HTML) : go(res, '/');

  // ----- 로그인한 뒤 -----
  if (req.method === 'POST' && pathname === '/posts/save') {
    const raw = await readBody(req, 10e6);
    if (raw === null) return send(res, 413, '이미지가 너무 큽니다.', HTML);
    const { p, error } = await savePost(new URLSearchParams(raw));
    if (error) return send(res, 400, p ? editPage(p, error) : esc(error), HTML);
    return go(res, `/posts?kind=${p.kind}&saved=${encodeURIComponent(p.title + await republish())}`);
  }
  if (req.method === 'POST' && pathname === '/posts/draft') {
    const f = new URLSearchParams(await readBody(req, 20000) ?? '');
    const topic = (f.get('topic') || '').trim().slice(0, 300), notes = (f.get('notes') || '').trim().slice(0, 3000);
    const fail = (msg) => send(res, 400, page('블로그', `<h1>블로그</h1>${draftBox(msg, topic, notes)}`, 'blog'), HTML);
    if (!topic) return fail('주제를 입력하세요.');
    if (!env.ANTHROPIC_API_KEY) return fail('Claude API 키가 설정되지 않았습니다.');
    if (tooManyDrafts(ipOf(req))) return fail('초안 요청이 너무 많습니다. 10분 뒤 다시 시도해 주세요.');
    return go(res, `/posts/drafting/${startDraft(topic, notes)}`);
  }
  const del = req.method === 'POST' && pathname.match(/^\/posts\/(\d+)\/delete$/);
  if (del) {
    const p = await getPost(Number(del[1]));
    if (!p) return go(res, '/');
    await q('DELETE FROM posts WHERE id = $1', [p.id]);
    return go(res, `/posts?kind=${p.kind}&saved=${encodeURIComponent(`삭제: ${p.title}${await republish()}`)}`);
  }
  if (req.method !== 'GET') return send(res, 405, '', HTML);
  if (pathname === '/') return go(res, '/inquiries');
  if (pathname === '/inquiries') return send(res, 200, await inquiriesPage(), HTML);
  if (pathname === '/posts' && KINDS[url.searchParams.get('kind')]) {
    const saved = url.searchParams.get('saved');
    return send(res, 200, await postsPage(url.searchParams.get('kind'), saved && `저장했습니다: ${saved}`), HTML);
  }
  if (pathname === '/posts/new' && KINDS[url.searchParams.get('kind')]) return send(res, 200, editPage({ kind: url.searchParams.get('kind') }), HTML);
  const waiting = pathname.match(/^\/posts\/drafting\/([0-9a-f-]{36})$/);
  if (waiting) {
    const d = drafts.get(waiting[1]);
    if (!d) return go(res, '/posts?kind=blog');
    if (d.status === 'done') return go(res, `/posts/${d.id}?drafted=1`);
    if (d.status === 'failed') return send(res, 200, page('블로그', `<h1>블로그</h1>${draftBox(d.error, d.topic, d.notes)}`, 'blog'), HTML);
    return send(res, 200, draftWaitPage(waiting[1]), HTML);
  }
  const m = pathname.match(/^\/posts\/(\d+)$/);
  const p = m && await getPost(Number(m[1]));
  if (p) return send(res, 200, editPage(p, '', url.searchParams.get('drafted') ? 'AI 초안을 저장했습니다(비공개). 사실과 다른 내용이 없는지 확인하고, 고친 뒤 \'사이트에 공개\'를 체크하고 저장하세요.' : ''), HTML);
  return go(res, '/');
}

// ---------- 사이트 서버: 문의 접수 + 정적 파일(로컬 점검용) ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function serveStatic(req, res) {
  let file;
  try { file = path.join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname)); } catch { return send(res, 400, 'Bad request'); }
  if (!file.startsWith(DIST + path.sep) && file !== DIST) return send(res, 403, 'Forbidden');
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404, { 'Content-Type': TYPES['.html'] }); return fs.createReadStream(path.join(DIST, '404.html')).pipe(res); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

async function site(req, res) {
  const { pathname } = new URL(req.url, 'http://x');
  if (pathname === '/api/contact') {
    if (req.method !== 'POST') return send(res, 405, { ok: false });
    const raw = await readBody(req, 20000);
    let body = null;
    try { body = JSON.parse(raw); } catch { /* 아래에서 거부 */ }
    const d = body && clean(body);
    if (!d) return send(res, 400, { ok: false, error: 'invalid' });
    const ip = ipOf(req);
    if (tooManyInquiries(ip)) return send(res, 429, { ok: false, error: 'too many requests' });
    if (!(await humanCheck(body['cf-turnstile-response'], ip))) return send(res, 403, { ok: false, error: 'captcha' });
    let lang = 'ko';
    try { lang = /^\/en\//.test(new URL(req.headers.referer || 'http://x/').pathname) ? 'en' : 'ko'; } catch { /* 잘못된 referer 는 무시 */ }
    const { id } = await one('INSERT INTO inquiries (name, company, email, phone, topic, message, lang, ip) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      [d.name, d.company, d.email, d.phone, d.topic, d.message, lang, ip]);
    send(res, 200, { ok: true }); // DB에 기록되면 바로 응답, 메일은 그 뒤에 보냄(메일 실패해도 문의는 남음)
    await q('UPDATE inquiries SET mail_status = $1 WHERE id = $2', [await notify(d, id), id]);
    return;
  }
  if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
  send(res, 405, { ok: false });
}

const siteServer = http.createServer(safe(site, (res) => send(res, 500, { ok: false, error: 'server' })));
const adminServer = http.createServer(safe(admin, (res) => send(res, 500, page('오류', '<h1>처리하지 못했습니다</h1><p>잠시 뒤 다시 시도해 주세요. 계속되면 서버 기록(journalctl -u mycogen)을 확인하세요.</p>'), HTML)));
siteServer.listen(PORT, '127.0.0.1', () => console.log(`문의 접수: http://127.0.0.1:${PORT}  (메일 ${env.SMTP_HOST ? '사용' : '미설정'})`));
adminServer.listen(ADMIN_PORT, '127.0.0.1', () => console.log(`관리 페이지: http://127.0.0.1:${ADMIN_PORT}  (${env.ADMIN_PASSWORD ? '로그인 사용' : '비밀번호 미설정: 로그인 불가'})`));

// systemctl stop/restart 때 연결을 정리하고 끝냄
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    siteServer.close(); adminServer.close();
    pool.end().finally(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
