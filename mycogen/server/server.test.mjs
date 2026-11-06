// 실행: node --test server/server.test.mjs  (openssl 필요: 가짜 SMTP 서버용 임시 인증서)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import tls from 'node:tls';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import http from 'node:http';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'contact-test-'));
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost',
  '-keyout', `${dir}/k.pem`, '-out', `${dir}/c.pem`], { stdio: 'ignore' });

// 가짜 SMTP: 받은 메일 원문을 모아 둠
const mails = [];
const smtp = tls.createServer({ key: fs.readFileSync(`${dir}/k.pem`), cert: fs.readFileSync(`${dir}/c.pem`) }, (s) => {
  let data = false, buf = '';
  s.write('220 hi\r\n');
  s.on('data', (c) => {
    buf += c;
    if (data) { if (buf.endsWith('\r\n.\r\n')) { mails.push(buf); data = false; buf = ''; s.write('250 ok\r\n'); } return; }
    for (const line of buf.split('\r\n').slice(0, -1)) {
      if (/^EHLO/.test(line)) s.write('250-hi\r\n250 AUTH LOGIN\r\n');
      else if (line === 'AUTH LOGIN') s.write('334 VXNlcm5hbWU6\r\n');
      else if (/^(MAIL|RCPT)/.test(line)) s.write('250 ok\r\n');
      else if (line === 'DATA') { data = true; s.write('354 go\r\n'); }
      else if (line === 'QUIT') s.end('221 bye\r\n');
      else s.write(mails.authed ? '235 ok\r\n' : ((mails.authed = 1), '334 UGFzc3dvcmQ6\r\n'));
    }
    if (!data) buf = '';
  });
}).listen(0);

// 가짜 Claude API: 받은 요청을 기록하고 정해진 초안을 돌려줌
const apiCalls = [];
const fakeApi = http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
    apiCalls.push({ url: req.url, headers: req.headers, body: JSON.parse(b) });
    const draft = { title: '폐배지의 두 번째 삶', category: '소재', summary: '버섯 폐배지가 건축자재가 되기까지.', body: '도입 문단입니다.\n\n## 폐배지란\n\n- 버섯을 키우고 남은 배지' };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'end_turn', stop_details: null,
      content: [{ type: 'text', text: JSON.stringify(draft) }], usage: { input_tokens: 1, output_tokens: 1 } }));
  });
}).listen(0);

const port = 47000 + Math.floor(Math.random() * 1000);
const env = { ...process.env, PORT: port, ADMIN_PORT: port + 1, DB_PATH: `${dir}/t.db`, DIST_DIR: `${dir}/dist`, ADMIN_PASSWORD: 'pw', SESSION_SECRET: 'x',
  SMTP_HOST: 'localhost', SMTP_PORT: smtp.address().port, SMTP_USER: 'u@test', SMTP_PASS: 'p', MAIL_TO: 'to@test', NODE_TLS_REJECT_UNAUTHORIZED: '0',
  ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_BASE_URL: `http://127.0.0.1:${fakeApi.address().port}` };
const proc = spawn(process.execPath, [path.join(import.meta.dirname, 'server.mjs')], { env, stdio: ['ignore', 'ignore', 'inherit'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (body) => fetch(`http://127.0.0.1:${port}/api/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const admin = `http://127.0.0.1:${port + 1}`;

test('문의·소식·블로그', async (t) => {
  t.after(() => { proc.kill(); smtp.close(); fakeApi.close(); });
  for (let i = 0; i < 150; i++) { try { await fetch(admin); break; } catch { await wait(100); } }

  assert.equal((await post({ name: '홍길동', email: 'bad', message: 'x', agree: 'on' })).status, 400, '이메일 형식 검사');
  assert.equal((await post({ name: '홍길동', email: 'a@b.co', message: 'x' })).status, 400, '동의 없으면 거부');
  const ok = await post({ name: '홍길동\r\nBcc: evil@x', company: '<b>테스트</b>', email: 'a@b.co', topic: '샘플 요청', message: '안녕하세요\n.\n끝', agree: 'on' });
  assert.equal(ok.status, 200);
  await wait(500);

  const row = new DatabaseSync(`${dir}/t.db`).prepare('SELECT * FROM inquiries').get();
  assert.equal(row.email, 'a@b.co');
  assert.equal(row.mail_status, 'sent');
  assert.equal(mails.length, 1);
  assert.match(mails[0], /^Reply-To: a@b\.co\r$/m);
  assert.doesNotMatch(mails[0], /^Bcc:/m, '헤더 주입 차단');

  const login = await (await fetch(admin)).text();
  assert.match(login, /비밀번호/);
  const bad = await fetch(`${admin}/login`, { method: 'POST', body: 'user=admin&password=no', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  assert.equal(bad.status, 401);
  const good = await fetch(`${admin}/login`, { method: 'POST', redirect: 'manual', body: 'user=admin&password=pw', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  assert.equal(good.status, 303);
  const cookie = good.headers.get('set-cookie').split(';')[0];
  const list = await (await fetch(`${admin}/inquiries`, { headers: { cookie } })).text();
  assert.match(list, /문의 접수 목록 \(1건\)/);
  assert.match(list, /&#60;b&#62;테스트/, 'HTML 이스케이프');
  assert.equal((await fetch(admin, { headers: { cookie: 'sid=9999999999999.forged' } }).then((r) => r.text())).includes('접수 목록'), false, '위조 쿠키 거부');
  assert.equal((await fetch(`http://127.0.0.1:${port}/`)).status, 200, '사이트 정적 파일');

  // 소식·블로그
  const site = (p) => fetch(`http://127.0.0.1:${port}${p}`).then((r) => r.text());
  const home = await site('/');
  assert.match(home, />소식</, '소식 메뉴');
  assert.match(home, />블로그</, '블로그 메뉴');
  assert.match(await site('/news/'), /공식 홈페이지를 열었습니다/, '기존 소식을 DB로 옮김');
  const form = (o) => ({ method: 'POST', redirect: 'manual', headers: { cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(o).toString() });
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const saved = await fetch(`${admin}/posts/save`, form({ kind: 'blog', title: '균사체 <첫> 글', date: '2026-11-06', category: '이야기',
    summary: '요약입니다', body: '## 소제목\n\n- 하나\n- 둘\n\n**굵게** 문단', published: 'on', imageData: png }));
  assert.equal(saved.status, 303);
  const blogList = await site('/blog/');
  assert.match(blogList, /균사체 &lt;첫&gt; 글/, '블로그 목록에 표시(이스케이프)');
  const id = blogList.match(/href="([^"]*blog\/(\d+)\/)"/)[2];
  const article = await site(`/blog/${id}/`);
  assert.match(article, /<h3>소제목<\/h3>/);
  assert.match(article, /<li>하나<\/li>/);
  assert.match(article, /BlogPosting/);
  assert.match(article, /media\/posts\/[a-z0-9]+\.png/, '대표 이미지');
  assert.equal((await fetch(`http://127.0.0.1:${port}/${article.match(/media\/posts\/[a-z0-9]+\.png/)[0]}`)).status, 200, '이미지 파일 복사');
  assert.match(await (await fetch(`${admin}/posts/${id}`, { headers: { cookie } })).text(), /네이버용 복사/);
  assert.equal((await fetch(`${admin}/posts/save`, form({ kind: 'blog', title: '', date: '2026-11-06' }))).status, 400, '제목 필수');
  assert.equal((await fetch(`${admin}/posts/save`, { ...form({ kind: 'blog', title: 'x', date: '2026-11-06' }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })).status, 303, '로그인 없으면 저장 안 됨(로그인으로)');
  assert.equal(new DatabaseSync(`${dir}/t.db`).prepare("SELECT count(*) n FROM posts WHERE title='x'").get().n, 0);
  // 주제 → AI 초안 (비공개로 저장)
  const dr = await fetch(`${admin}/posts/draft`, form({ topic: '폐배지 건축자재', notes: '경석 이야기 포함' }));
  assert.equal(dr.status, 303);
  assert.match(dr.headers.get('location'), /^\/posts\/\d+\?drafted=1$/);
  const call = apiCalls[0].body;
  assert.equal(call.model, 'claude-opus-5-5');
  assert.equal(call.fallbacks, 'default');
  assert.match(apiCalls[0].headers['anthropic-beta'], /server-side-fallback-2026-07-01/);
  assert.equal(call.output_config.format.type, 'json_schema');
  assert.match(call.messages[0].content, /폐배지 건축자재[\s\S]*경석 이야기 포함/);
  assert.match(call.system, /균사매트/, '회사 정보가 프롬프트에 들어감');
  const draftId = dr.headers.get('location').match(/\d+/)[0];
  const draftRow = new DatabaseSync(`${dir}/t.db`).prepare('SELECT * FROM posts WHERE id = ?').get(Number(draftId));
  assert.equal(draftRow.title, '폐배지의 두 번째 삶');
  assert.equal(draftRow.published, 0, '초안은 비공개');
  assert.equal((await fetch(`http://127.0.0.1:${port}/blog/${draftId}/`)).status, 404, '공개 전에는 사이트에 없음');
  assert.match(await (await fetch(`${admin}${dr.headers.get('location')}`, { headers: { cookie } })).text(), /AI 초안을 저장했습니다/);
  assert.equal((await fetch(`${admin}/posts/draft`, form({ topic: '' }))).status, 400, '주제 필수');

  await fetch(`${admin}/posts/${id}/delete`, form({}));
  assert.equal((await fetch(`http://127.0.0.1:${port}/blog/${id}/`)).status, 404, '삭제하면 페이지도 사라짐');
});
