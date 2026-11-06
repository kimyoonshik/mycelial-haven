// 소식·블로그 글: 서버 DB에 저장하고, 사이트를 빌드할 때 content/site.json 에 합칩니다.
// site.json 파일 자체는 고치지 않습니다(대표님 편집본이 원본). 블로그 메뉴 추가도 빌드할 때만 적용합니다.
import fs from 'node:fs';
import path from 'node:path';
import { build, loadContent, ROOT } from '../src/build.mjs';

export const KINDS = { news: '소식', blog: '블로그' };
export const UPLOADS = path.join(ROOT, 'server/data/uploads');

export function initPosts(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL CHECK (kind IN ('news', 'blog')),
    date TEXT NOT NULL, category TEXT, title TEXT NOT NULL, summary TEXT, body TEXT, image TEXT,
    published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)');
  // 처음 한 번: site.json 에 있던 기존 소식을 DB로 옮김
  if (!db.prepare("SELECT 1 FROM settings WHERE key = 'imported_news'").get()) {
    const ins = db.prepare('INSERT INTO posts (kind, date, category, title, summary, body) VALUES (?,?,?,?,?,?)');
    for (const n of loadContent().news || []) {
      if (!n.hidden) ins.run('news', n.date, n.category?.ko || '', n.title?.ko || '', n.summary?.ko || '', n.summary?.ko || '');
    }
    db.prepare("INSERT INTO settings VALUES ('imported_news', datetime('now'))").run();
  }
}

const ko = (v) => ({ ko: v || '', en: '' }); // shortcut: 한국어만 입력, 영어 페이지는 한국어로 표시. 영문 글이 필요해지면 en 칸 추가

// site.json + DB 글 → 빌드용 사이트 객체 (메모리에서만)
export function siteWithPosts(site, posts) {
  const s = structuredClone(site);
  const pages = s.pages;
  const news = pages.find((p) => p.id === 'news');
  if (!pages.some((p) => p.id === 'blog')) {
    const cta = news?.sections.find((x) => x.type === 'cta');
    pages.splice(pages.indexOf(news) + 1 || pages.length, 0, {
      id: 'blog', slug: 'blog', parent: '', navLabel: { ko: '블로그', en: 'Blog' }, title: { ko: '블로그', en: 'Blog' },
      description: { ko: '균사체 배양과 소재·식품 이야기를 전하는 마이코젠 블로그입니다.', en: 'The Mycogen blog on mycelium, materials and food.' },
      sections: [
        { type: 'news', source: 'blog', tone: 'paper', limit: 0, more: false, eyebrow: { ko: 'BLOG', en: 'BLOG' },
          title: { ko: '마이코젠 블로그', en: 'Mycogen Blog' }, text: { ko: '균사체로 키우는 소재와 식품 이야기.', en: 'Stories on mycelium materials and food.' } },
        ...(cta ? [cta] : []),
      ],
    });
    const nav = s.navigation || (s.navigation = []);
    const at = nav.findIndex((n) => n.page === 'news');
    nav.splice(at >= 0 ? at + 1 : nav.length, 0, { page: 'blog', children: false, button: false });
  }
  if (process.env.TURNSTILE_SITE_KEY) s.company = { ...s.company, turnstileSiteKey: process.env.TURNSTILE_SITE_KEY };
  s.news = []; s.blog = [];
  for (const p of posts.filter((x) => x.published)) {
    const id = `${p.kind === 'news' ? 'notice' : 'blog'}-${p.id}`;
    const item = { date: p.date, category: ko(p.category), title: ko(p.title), summary: ko(p.summary), image: p.image || '', link: `page:${id}` };
    s[p.kind].push(item);
    pages.push({ id, slug: String(p.id), parent: p.kind, navLabel: ko(p.title), title: ko(`${p.title} | ${KINDS[p.kind]}`),
      description: ko(p.summary), ogImage: p.image || undefined,
      sections: [{ type: 'post', source: p.kind, tone: 'paper', date: p.date, updated: p.updated_at?.slice(0, 10), category: ko(p.category),
        title: ko(p.title), summary: ko(p.summary), body: ko(p.body), image: p.image || '' }] });
  }
  return s;
}

export function publish(db, outDir) {
  const posts = db.prepare('SELECT * FROM posts ORDER BY date DESC, id DESC').all();
  const res = build({ content: siteWithPosts(loadContent(), posts), outDir });
  if (res.ok && fs.existsSync(UPLOADS)) fs.cpSync(UPLOADS, path.join(res.outDir, 'media/posts'), { recursive: true });
  return res;
}

// 대표 이미지: 관리 페이지에서 base64 로 받아 저장 (jpg/png/webp, 5MB 이하)
export function saveImage(dataUrl) {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 5 * 1024 * 1024) return null;
  fs.mkdirSync(UPLOADS, { recursive: true });
  const name = `${Date.now().toString(36)}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  fs.writeFileSync(path.join(UPLOADS, name), buf);
  return `media/posts/${name}`;
}
