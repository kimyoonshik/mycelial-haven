// 소식·블로그 글: 관리 페이지에서 쓴 글은 PostgreSQL에 저장하고, 사이트를 빌드할 때 content/site.json 에 합칩니다.
// site.json 파일 자체는 고치지 않습니다(대표님 PC 편집기 편집본이 원본).
//   - 소식: 편집기에서 쓴 소식(site.json) + 관리 페이지에서 쓴 소식(DB)을 날짜순으로 함께 보여 줍니다.
//   - 블로그: 관리 페이지에서만 씁니다. 블로그 메뉴와 페이지는 서버에서 빌드할 때만 생깁니다.
import fs from 'node:fs';
import path from 'node:path';
import { build, loadContent, ROOT } from '../src/build.mjs';
import { q } from './db.mjs';

export const KINDS = { news: '소식', blog: '블로그' };
export const UPLOADS = path.resolve(process.env.UPLOAD_DIR || path.join(ROOT, 'server/data/uploads'));

// 빌드·화면에 쓰는 형태로 읽기: 날짜는 'YYYY-MM-DD', 수정일은 한국 시간 기준 날짜
export const POST_COLUMNS = `id, kind, to_char(date, 'YYYY-MM-DD') AS date, category, title, summary, body, image, published,
  to_char(updated_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS updated`;

const ko = (v) => ({ ko: v || '', en: '' }); // 한국어만 입력, 영어 페이지는 한국어로 표시. 영문 글이 필요해지면 en 칸 추가

/** 편집기(site.json)에 있는 소식: 관리 페이지에서 '편집기에서 작성'으로 보여 주는 용도 */
export function editorNews(site = loadContent()) {
  return (site.news || []).filter((n) => !n.hidden).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

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
  // 문의 양식: 편집기에서 다른 전송 주소를 넣지 않았다면 이 서버(/api/contact)로 받습니다.
  s.company = { ...s.company, formEndpoint: s.company?.formEndpoint || '/api/contact' };
  if (process.env.TURNSTILE_SITE_KEY) s.company.turnstileSiteKey = process.env.TURNSTILE_SITE_KEY;
  s.news = [...(s.news || [])]; // 편집기 소식은 그대로 두고 DB 소식을 더함
  s.blog = [];
  for (const p of posts.filter((x) => x.published)) {
    const id = `${p.kind === 'news' ? 'notice' : 'blog'}-${p.id}`;
    s[p.kind].push({ date: p.date, category: ko(p.category), title: ko(p.title), summary: ko(p.summary), image: p.image || '', link: `page:${id}` });
    pages.push({ id, slug: String(p.id), parent: p.kind, navLabel: ko(p.title), title: ko(`${p.title} | ${KINDS[p.kind]}`),
      description: ko(p.summary), ogImage: p.image || undefined,
      sections: [{ type: 'post', source: p.kind, tone: 'paper', date: p.date, updated: p.updated, category: ko(p.category),
        title: ko(p.title), summary: ko(p.summary), body: ko(p.body), image: p.image || '' }] });
  }
  return s;
}

/** DB 글을 합쳐 outDir 에 사이트 전체를 다시 만듭니다. */
export async function publish(outDir) {
  const posts = await q(`SELECT ${POST_COLUMNS} FROM posts ORDER BY date DESC, id DESC`);
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
