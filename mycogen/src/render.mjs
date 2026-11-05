// HTML renderer: turns content/site.json into static pages.
// No dependencies; every string that comes from content is escaped here.

import { LANGS } from './schema.mjs';

// ---------- small helpers ----------
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function tx(v, lang) {
  if (v == null) return '';
  if (typeof v === 'object') return String(v[lang] || v.ko || '');
  return String(v);
}

export function get(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// Seeded random so generated graphics stay identical between builds.
export function rng(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  s = s || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// ---------- URLs ----------
export function pagePath(page, pagesById) {
  if (!page || page.id === 'home' || !page.slug) return '';
  const parent = page.parent && pagesById[page.parent];
  const prefix = parent ? pagePath(parent, pagesById) : '';
  return `${prefix}${page.slug}/`;
}

export function langPrefix(lang, site) {
  return lang === (site.meta?.defaultLang || 'ko') ? '' : `${lang}/`;
}

function makeCtx(site, lang, page, opts) {
  const pagesById = Object.fromEntries(site.pages.map((p) => [p.id, p]));
  const own = langPrefix(lang, site) + pagePath(page, pagesById);
  const depth = own.split('/').filter(Boolean).length;
  const root = '../'.repeat(depth);
  const ctx = {
    site, lang, page, pagesById, root, preview: !!opts.preview, h1: false,
    t: (v) => tx(v, lang),
    pageHref(id, forLang = lang) {
      const p = pagesById[id];
      if (!p || p.hidden) return null;
      const href = ctx.root + langPrefix(forLang, site) + pagePath(p, pagesById);
      return href || './';
    },
    href(link) {
      if (!link) return null;
      if (link.startsWith('page:')) {
        const [id, hash] = link.slice(5).split('#');
        const h = ctx.pageHref(id);
        return h ? h + (hash ? `#${hash}` : '') : null;
      }
      if (link.startsWith('media/')) return ctx.root + link;
      return link;
    },
    media: (p) => (p ? (/^https?:/.test(p) ? p : ctx.root + p) : ''),
    abs(id, forLang = lang) {
      const p = pagesById[id];
      const base = (site.meta?.siteUrl || '').replace(/\/$/, '');
      return `${base}/${langPrefix(forLang, site)}${pagePath(p, pagesById)}`;
    },
  };
  return ctx;
}

// Inline formatting: **bold**, [label](link), line breaks. Input is escaped first.
function inline(s, ctx) {
  let out = esc(s);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, link) => {
    const raw = link.replace(/&amp;/g, '&');
    const h = ctx.href(raw);
    if (!h) return label;
    const ext = /^https?:/.test(h);
    return `<a href="${esc(h)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
  });
  return out.replace(/\n/g, '<br>');
}

const T = (v, ctx) => inline(tx(v, ctx.lang), ctx);

function heading(v, ctx, cls = 'sec__title', level = 2) {
  const s = tx(v, ctx.lang);
  if (!s) return '';
  let tag = `h${level}`;
  if (!ctx.h1) { tag = 'h1'; ctx.h1 = true; }
  return `<${tag} class="${cls}">${inline(s, ctx)}</${tag}>`;
}

function eyebrow(v, ctx) {
  const s = tx(v, ctx.lang);
  return s ? `<p class="eyebrow">${esc(s)}</p>` : '';
}

function para(v, ctx, cls = 'sec__text') {
  const s = tx(v, ctx.lang);
  return s ? `<p class="${cls}">${inline(s, ctx)}</p>` : '';
}

function linkAttrs(link, ctx) {
  const h = ctx.href(link);
  if (!h) return null;
  const ext = /^https?:/.test(h);
  return `href="${esc(h)}"${ext ? ' target="_blank" rel="noopener"' : ''}`;
}

function buttons(list, ctx, extra = '') {
  const items = (list || []).map((b) => {
    const a = linkAttrs(b.link, ctx);
    const label = tx(b.label, ctx.lang);
    if (!a || !label) return '';
    return `<a class="btn btn--${esc(b.style || 'solid')}" ${a}>${esc(label)}<span class="btn__arrow" aria-hidden="true">→</span></a>`;
  }).join('');
  return items ? `<div class="btns ${extra}">${items}</div>` : '';
}

function img(src, alt, ctx, attrs = '') {
  if (!src) return '';
  return `<img src="${esc(ctx.media(src))}" alt="${esc(alt || '')}" loading="lazy" decoding="async" ${attrs}>`;
}

// Organic fibrous edge, like the soft torn edge of a mycelium mat:
// an irregular contour plus fine hairs that stick out of it.
export function fiberEdge(seed, { flip = false, cls = '' } = {}) {
  const r = rng(seed);
  const W = 1440, H = 44, base = 26;
  const p1 = r() * 6, p2 = r() * 6;
  const yAt = (x) => base + Math.sin(x / 190 + p1) * 4.5 + Math.sin(x / 61 + p2) * 2 + Math.sin(x / 23 + p1 * 3) * 1;
  const pts = [];
  for (let x = 0; x <= W; x += 4) pts.push([x, yAt(x) + (r() - 0.5) * 2.2]);
  const d = `M0 ${H} L` + pts.map(([x, y]) => `${x} ${y.toFixed(1)}`).join(' L') + ` L${W} ${H} Z`;
  let hairs = '';
  for (let i = 0; i < 170; i++) {
    const x = r() * W;
    const y = yAt(x) + 1.5;
    const len = 2.5 + Math.pow(r(), 2.2) * 9;
    const a = -Math.PI / 2 + (r() - 0.5) * 1.5;
    const cx = x + Math.cos(a) * len * 0.5 + (r() - 0.5) * 3;
    const cy = y + Math.sin(a) * len * 0.5;
    const ex = x + Math.cos(a) * len;
    const ey = y + Math.sin(a) * len;
    hairs += `M${x.toFixed(1)} ${y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  }
  return `<svg class="edge ${flip ? 'edge--flip' : ''} ${cls}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="${d}"/><path class="edge__hair" d="${hairs}" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
}

// Branching hyphae drawing used as a hero overlay (written to assets/hyphae.svg).
export function hyphaeSvg(seed = 'mycogen', W = 1600, H = 900) {
  const r = rng(seed);
  const paths = [];
  const grow = (x, y, ang, len, width, depth) => {
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    for (let i = 0; i < len; i++) {
      ang += (r() - 0.5) * 0.5;
      const step = 7 + r() * 6;
      x += Math.cos(ang) * step; y += Math.sin(ang) * step;
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      if (depth < 4 && r() < 0.09) grow(x, y, ang + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.7), Math.floor(len * (0.4 + r() * 0.4)), width * 0.7, depth + 1);
      if (x < -50 || x > W + 50 || y < -50 || y > H + 50) break;
    }
    paths.push(`<path d="${d}" stroke-width="${width.toFixed(2)}" stroke-opacity="${(0.25 + 0.5 * (width / 2.4)).toFixed(2)}"/>`);
  };
  for (let i = 0; i < 9; i++) {
    const fromLeft = i % 2 === 0;
    grow(fromLeft ? -10 : W + 10, H * (0.15 + r() * 0.8), fromLeft ? -0.1 + r() * 0.3 : Math.PI + (r() - 0.5) * 0.3, 70 + Math.floor(r() * 60), 2.4, 0);
  }
  const dots = Array.from({ length: 60 }, () => `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * H).toFixed(0)}" r="${(0.8 + r() * 1.8).toFixed(1)}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">${paths.join('')}</g><g fill="#fff" fill-opacity=".55">${dots}</g></svg>`;
}

export const MARK_SVG = `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M16 16 C 12 12, 8 11, 4 6"/><path d="M8 11 C 7 8, 8 6, 7 3"/><path d="M16 16 C 20 11, 24 10, 28 7"/><path d="M23 10 C 25 7, 25 5, 27 3"/><path d="M16 16 C 15 21, 12 24, 6 27"/><path d="M11 23 C 8 22, 5 22, 3 20"/><path d="M16 16 C 19 21, 23 23, 28 25"/></g><circle cx="16" cy="16" r="3.4" fill="currentColor"/></svg>`;

// ---------- SNS / channels ----------
// Simple monochrome marks (currentColor) used to link to the company's own channels.
export const SOCIAL = [
  { key: 'x', label: 'X', svg: '<path d="M4 4l7.2 9.1L4.3 20H6l6.1-5.9L17 20h3l-7.5-9.5L19.1 4h-1.7l-5.7 5.5L7 4z"/>' },
  { key: 'facebook', label: 'Facebook', svg: '<path d="M13.6 21v-7.2h2.4l.4-2.8h-2.8V9.3c0-.8.2-1.4 1.4-1.4H16.5V5.4c-.3 0-1.1-.1-2.1-.1-2.1 0-3.6 1.3-3.6 3.7V11H8.4v2.8h2.4V21z"/>' },
  { key: 'instagram', label: 'Instagram', svg: '<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="17.2" cy="6.8" r="1.2"/>' },
  { key: 'linkedin', label: 'LinkedIn', svg: '<circle cx="6.3" cy="6.4" r="1.8"/><rect x="4.8" y="9.4" width="3" height="10"/><path d="M10.4 9.4h2.9v1.4c.5-.9 1.6-1.7 3.2-1.7 2.7 0 3.5 1.7 3.5 4.3v6h-3v-5.3c0-1.3-.3-2.3-1.6-2.3-1.4 0-2 1-2 2.3v5.3h-3z"/>' },
  { key: 'youtube', label: 'YouTube', svg: '<path fill-rule="evenodd" d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.6 2.6 0 0 0-1.8 1.8A27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8zM10 15V9l5.2 3z"/>' },
  { key: 'naverBlog', label: { ko: '네이버 블로그', en: 'Naver Blog' }, svg: '<path fill-rule="evenodd" d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 4.5v9h2.6v-4.8l3.4 4.8h2.6v-9H14v4.8l-3.4-4.8z"/>' },
  { key: 'kakao', label: { ko: '카카오톡 채널', en: 'KakaoTalk Channel' }, svg: '<path d="M12 4C7 4 3 7.1 3 11c0 2.5 1.7 4.7 4.2 5.9l-.8 3.6 4-2.6c.5.1 1 .1 1.6.1 5 0 9-3.1 9-7s-4-7-9-7z"/>' },
];

export function socialUrls(site) {
  const so = site.social || {};
  return SOCIAL.map((x) => String(so[x.key] || '').trim()).filter((u) => /^https?:\/\//i.test(u));
}

function socialList(ctx, cls) {
  const so = ctx.site.social || {};
  const name = tx(ctx.site.company?.name, ctx.lang) || 'Mycogen';
  const soon = ctx.lang === 'ko' ? '준비 중' : 'coming soon';
  const items = SOCIAL.map((x) => {
    const url = String(so[x.key] || '').trim();
    const ok = /^https?:\/\//i.test(url);
    if (!ok && so.hideEmpty) return '';
    const label = tx(x.label, ctx.lang);
    const icon = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${x.svg}</svg>`;
    // no address yet: show the icon without a link until one is entered in the editor
    if (!ok) return `<li><span class="is-empty" role="img" aria-label="${esc(`${label} (${soon})`)}" title="${esc(`${label} · ${soon}`)}">${icon}</span></li>`;
    return `<li><a href="${esc(url)}" target="_blank" rel="noopener me" aria-label="${esc(`${name} ${label}`)}" title="${esc(label)}">${icon}</a></li>`;
  }).join('');
  return items ? `<ul class="social ${cls}">${items}</ul>` : '';
}

// Plain-text version of a page, used for llms-full.txt (AI assistants) — no markup, links reduced to their labels.
const plain = (v, lang) => tx(v, lang).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '').trim();

export function pageText(site, page, lang) {
  const out = [];
  const P = (v) => plain(v, lang);
  const line = (t) => { if (t) out.push(t); };
  for (const s of page.sections || []) {
    if (s.hidden) continue;
    if (P(s.title)) out.push('', '## ' + P(s.title).replace(/\n/g, ' '));
    line(P(s.text));
    let items = s.items || [];
    if (s.type === 'cards' && s.source === 'business') {
      items = site.pages.filter((p) => p.parent === 'business' && !p.hidden).map((p) => ({ title: p.navLabel, text: p.cardText }));
    }
    if (s.type === 'steps') items.forEach((it, n) => line(`${it.tag || n + 1}. ${P(it.title)}${P(it.text) ? ' — ' + P(it.text) : ''}`));
    else if (s.type === 'stats') items.forEach((it) => line(`- ${it.value}${P(it.unit) ? ' ' + P(it.unit) : ''}: ${P(it.label)}`));
    else if (['cards', 'band'].includes(s.type)) items.forEach((it) => line(`- ${P(it.title)}${P(it.text) ? ': ' + P(it.text) : ''}`));
    (s.bullets || []).forEach((b) => line('- ' + P(b.text)));
    (s.rows || []).forEach((r) => { if (P(r.value)) line(`- ${P(r.label)}: ${P(r.value).replace(/\n/g, ' ')}`); });
    line(P(s.note));
    if (s.type === 'richText') line(P(s.body));
    if (s.type === 'news') {
      [...(site.news || [])].filter((n) => !n.hidden).sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .forEach((n) => line(`- ${n.date} ${P(n.title)}${P(n.summary) ? ' — ' + P(n.summary) : ''}`));
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ---------- sections ----------
const R = {};

R.hero = (s, ctx, i, next) => {
  const overlay = Math.max(0, Math.min(90, Number(s.overlay ?? 45))) / 100;
  const title = tx(s.title, ctx.lang);
  let h = '';
  if (title) { h = `<h1 class="hero__title">${inline(title, ctx)}</h1>`; ctx.h1 = true; }
  return `<section class="hero hero--${esc(s.size || 'tall')} hero--${esc(s.align || 'left')}" style="--overlay:${overlay}">
  <div class="hero__media">${s.image ? `<img src="${esc(ctx.media(s.image))}" alt="" fetchpriority="high" decoding="async">` : ''}</div>
  ${s.network !== false ? '<div class="hero__net" aria-hidden="true"></div>' : ''}
  <div class="wrap hero__inner">
    ${eyebrow(s.eyebrow, ctx)}${h}${para(s.text, ctx, 'hero__text')}${buttons(s.buttons, ctx)}
  </div>
  ${fiberEdge(`hero-${ctx.page.id}-${i}`, { cls: `edge--hero tone-${esc(next?.tone || 'paper')}-fill` })}
</section>`;
};

R.statement = (s, ctx) => `<div class="wrap wrap--narrow center">
  ${eyebrow(s.eyebrow, ctx)}${heading(s.title, ctx, 'sec__title sec__title--xl')}${para(s.text, ctx, 'sec__lead')}
</div>`;

function cardItems(s, ctx) {
  if (s.source === 'business') {
    return ctx.site.pages.filter((p) => p.parent === 'business' && !p.hidden).map((p) => ({
      image: p.cardImage, title: p.navLabel, text: p.cardText, link: `page:${p.id}`,
    }));
  }
  return s.items || [];
}

R.cards = (s, ctx) => {
  const items = cardItems(s, ctx);
  const style = s.style || 'photo';
  const cards = items.map((it, n) => {
    const a = linkAttrs(it.link, ctx);
    const tag = a ? 'a' : 'div';
    const title = tx(it.title, ctx.lang);
    const text = tx(it.text, ctx.lang);
    const media = it.image ? `<div class="card__img">${img(it.image, title, ctx)}</div>` : '';
    if (style === 'text') {
      return `<${tag} class="card card--text" ${a || ''}>
        <span class="card__num">${String(n + 1).padStart(2, '0')}</span>${media}
        ${title ? `<h3 class="card__title">${esc(title)}</h3>` : ''}${text ? `<p class="card__text">${inline(text, ctx)}</p>` : ''}
        ${a ? '<span class="card__more" aria-hidden="true">→</span>' : ''}</${tag}>`;
    }
    if (style === 'tile') {
      return `<${tag} class="card card--tile" ${a || ''}>${media}
        <div class="card__over">${title ? `<h3 class="card__title">${esc(title)}</h3>` : ''}${text ? `<p class="card__text">${inline(text, ctx)}</p>` : ''}</div></${tag}>`;
    }
    return `<${tag} class="card card--photo" ${a || ''}>${media}
      ${title ? `<span class="pill">${esc(title)}</span>` : ''}${text ? `<p class="card__text">${inline(text, ctx)}</p>` : ''}</${tag}>`;
  }).join('');
  const head = s.title || s.text || s.eyebrow
    ? `<div class="sec__head center">${eyebrow(s.eyebrow, ctx)}${heading(s.title, ctx)}${para(s.text, ctx, 'sec__lead')}</div>` : '';
  return `<div class="wrap">${head}<div class="grid grid--${esc(s.columns || '3')} cards--${esc(style)}">${cards}</div></div>`;
};

R.split = (s, ctx) => {
  const bullets = (s.bullets || []).map((b) => tx(b.text, ctx.lang)).filter(Boolean);
  return `<div class="wrap split ${s.reverse ? 'split--reverse' : ''}">
  <div class="split__body">
    ${eyebrow(s.eyebrow, ctx)}${heading(s.title, ctx)}
    ${tx(s.text, ctx.lang).split(/\n{2,}/).filter(Boolean).map((p) => `<p class="sec__text">${inline(p, ctx)}</p>`).join('')}
    ${bullets.length ? `<ul class="ticks">${bullets.map((b) => `<li>${inline(b, ctx)}</li>`).join('')}</ul>` : ''}
    ${buttons(s.buttons, ctx)}
  </div>
  <div class="split__media">${s.image ? `<figure class="frame">${img(s.image, tx(s.title, ctx.lang).replace(/\n/g, ' '), ctx)}</figure>` : ''}</div>
</div>`;
};

R.steps = (s, ctx) => {
  const items = (s.items || []).map((it, n) => `<li class="step">
    <span class="step__tag">${esc(it.tag || String(n + 1).padStart(2, '0'))}</span>
    <div class="step__body"><h3 class="step__title">${esc(tx(it.title, ctx.lang))}</h3>${para(it.text, ctx, 'step__text')}</div>
  </li>`).join('');
  return `<div class="wrap">
  <div class="sec__head center">${eyebrow(s.eyebrow, ctx)}${heading(s.title, ctx)}${para(s.text, ctx, 'sec__lead')}</div>
  <ol class="steps steps--${esc(s.layout || 'row')}" style="--n:${(s.items || []).length}">${items}</ol>
</div>`;
};

R.stats = (s, ctx) => `<div class="wrap">
  ${s.title || s.eyebrow ? `<div class="sec__head center">${eyebrow(s.eyebrow, ctx)}${heading(s.title, ctx)}</div>` : ''}
  <dl class="stats">${(s.items || []).map((it) => `<div class="stat"><dt class="stat__value">${esc(it.value)}<span class="stat__unit">${esc(tx(it.unit, ctx.lang))}</span></dt><dd class="stat__label">${esc(tx(it.label, ctx.lang))}</dd></div>`).join('')}</dl>
</div>`;

R.specs = (s, ctx) => {
  const rows = (s.rows || []).filter((r) => tx(r.value, ctx.lang));
  return `<div class="wrap wrap--mid">
  <div class="sec__head">${eyebrow(s.eyebrow, ctx)}${heading(s.title, ctx)}${para(s.text, ctx, 'sec__lead')}</div>
  <dl class="specs">${rows.map((r) => `<div class="specs__row"><dt>${esc(tx(r.label, ctx.lang))}</dt><dd>${inline(tx(r.value, ctx.lang), ctx)}</dd></div>`).join('')}</dl>
  ${para(s.note, ctx, 'specs__note')}
</div>`;
};

R.band = (s, ctx, i) => {
  const tiles = (s.items || []).map((it) => {
    const a = linkAttrs(it.link, ctx);
    const tag = a ? 'a' : 'div';
    const title = tx(it.title, ctx.lang);
    return `<${tag} class="band__tile" ${a || ''}>${img(it.image, title, ctx)}${title ? `<span class="pill pill--light">${esc(title)}</span>` : ''}</${tag}>`;
  }).join('');
  return `${fiberEdge(`band-top-${ctx.page.id}-${i}`, { cls: 'edge--top' })}
<div class="wrap center">
  ${eyebrow(s.eyebrow, ctx)}${heading(s.title, ctx, 'sec__title sec__title--xl')}${para(s.text, ctx, 'sec__lead')}
  ${tiles ? `<div class="band__tiles" style="--n:${(s.items || []).length}">${tiles}</div>` : ''}
  ${buttons(s.buttons, ctx, 'btns--center')}
</div>
${fiberEdge(`band-bot-${ctx.page.id}-${i}`, { flip: true, cls: 'edge--bottom' })}`;
};

function sortedNews(site) {
  return [...(site.news || [])].filter((n) => !n.hidden).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

R.news = (s, ctx) => {
  const limit = Number(s.limit ?? 3);
  const all = sortedNews(ctx.site);
  const items = limit > 0 ? all.slice(0, limit) : all;
  const newsPage = ctx.site.pages.find((p) => p.id === 'news');
  const moreHref = s.more && newsPage && ctx.page.id !== 'news' ? ctx.pageHref('news') : null;
  const list = items.map((n) => {
    const a = linkAttrs(n.link, ctx);
    const title = esc(tx(n.title, ctx.lang));
    return `<article class="news__item">
      ${n.image ? `<div class="news__img">${img(n.image, tx(n.title, ctx.lang), ctx)}</div>` : ''}
      <div class="news__body">
        <p class="news__meta"><time datetime="${esc(n.date)}">${esc(String(n.date || '').replace(/-/g, '.'))}</time>${tx(n.category, ctx.lang) ? `<span class="tag">${esc(tx(n.category, ctx.lang))}</span>` : ''}</p>
        <h3 class="news__title">${a ? `<a ${a}>${title}</a>` : title}</h3>
        ${para(n.summary, ctx, 'news__summary')}
      </div>
    </article>`;
  }).join('') || `<p class="muted center">${ctx.lang === 'ko' ? '등록된 소식이 없습니다.' : 'No news yet.'}</p>`;
  return `<div class="wrap wrap--mid">
  <div class="sec__head center">${eyebrow(s.eyebrow, ctx)}${heading(s.title, ctx)}${para(s.text, ctx, 'sec__lead')}</div>
  <div class="news">${list}</div>
  ${moreHref ? `<div class="btns btns--center"><a class="btn btn--outline" href="${esc(moreHref)}">${ctx.lang === 'ko' ? '소식 전체 보기' : 'All news'}<span class="btn__arrow" aria-hidden="true">→</span></a></div>` : ''}
</div>`;
};

R.cta = (s, ctx) => `<div class="wrap wrap--narrow center cta">
  ${heading(s.title, ctx, 'sec__title sec__title--xl')}${para(s.text, ctx, 'sec__lead')}${buttons(s.buttons, ctx, 'btns--center')}
</div>`;

R.contact = (s, ctx) => {
  const c = ctx.site.company || {};
  const ko = ctx.lang === 'ko';
  const L = ko
    ? { name: '성함', org: '회사·기관명', email: '이메일', tel: '연락처', topic: '문의 유형', msg: '문의 내용', send: '문의 보내기', req: '필수', agree: '개인정보 수집·이용에 동의합니다.', mail: '이메일', phone: '전화', addr: '주소' }
    : { name: 'Name', org: 'Company / organization', email: 'Email', tel: 'Phone', topic: 'Topic', msg: 'Message', send: 'Send inquiry', req: 'required', agree: 'I agree to the collection and use of my personal information.', mail: 'Email', phone: 'Phone', addr: 'Address' };
  const info = [
    c.email ? `<li><span>${L.mail}</span><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>` : '',
    c.tel ? `<li><span>${L.phone}</span><a href="tel:${esc(c.tel.replace(/[^0-9+]/g, ''))}">${esc(c.tel)}</a></li>` : '',
    tx(c.address, ctx.lang) ? `<li><span>${L.addr}</span>${inline(tx(c.address, ctx.lang), ctx)}</li>` : '',
  ].join('');
  const topics = (s.topics || []).map((t) => tx(t.label, ctx.lang)).filter(Boolean);
  return `<div class="wrap contact">
  <div class="contact__intro">
    ${eyebrow(s.eyebrow, ctx)}${heading(s.title, ctx)}${para(s.text, ctx, 'sec__lead')}
    ${info ? `<ul class="contact__info">${info}</ul>` : ''}
    ${socialList(ctx, 'social--dark')}
  </div>
  <form class="form" data-contact data-email="${esc(c.email || '')}" data-endpoint="${esc(c.formEndpoint || '')}" data-lang="${ctx.lang}" novalidate>
    <div class="form__row">
      <label class="field"><span>${L.name} <em>${L.req}</em></span><input name="name" required autocomplete="name"></label>
      <label class="field"><span>${L.org}</span><input name="company" autocomplete="organization"></label>
    </div>
    <div class="form__row">
      <label class="field"><span>${L.email} <em>${L.req}</em></span><input name="email" type="email" required autocomplete="email"></label>
      <label class="field"><span>${L.tel}</span><input name="phone" type="tel" autocomplete="tel"></label>
    </div>
    ${topics.length ? `<label class="field"><span>${L.topic}</span><select name="topic">${topics.map((t) => `<option>${esc(t)}</option>`).join('')}</select></label>` : ''}
    <label class="field"><span>${L.msg} <em>${L.req}</em></span><textarea name="message" rows="6" required></textarea></label>
    ${tx(s.consent, ctx.lang) ? `<div class="consent"><p>${inline(tx(s.consent, ctx.lang), ctx)}</p></div>` : ''}
    <label class="check"><input type="checkbox" name="agree" required><span>${L.agree}</span></label>
    <button class="btn btn--solid" type="submit">${L.send}<span class="btn__arrow" aria-hidden="true">→</span></button>
    <p class="form__status" role="status" aria-live="polite"></p>
  </form>
</div>`;
};

R.richText = (s, ctx) => {
  const body = tx(s.body, ctx.lang);
  const blocks = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).map((b) => {
    if (b.startsWith('## ')) return `<h3>${inline(b.slice(3), ctx)}</h3>`;
    const lines = b.split('\n');
    if (lines.every((l) => l.startsWith('- '))) return `<ul>${lines.map((l) => `<li>${inline(l.slice(2), ctx)}</li>`).join('')}</ul>`;
    return `<p>${inline(b, ctx)}</p>`;
  }).join('');
  return `<div class="wrap wrap--narrow prose">${heading(s.title, ctx)}${blocks}</div>`;
};

const hasHead = (s) => ['title', 'eyebrow', 'text'].some((k) => tx(s[k], 'ko') || tx(s[k], 'en'));

function renderSection(s, ctx, i, next, prev) {
  const fn = R[s.type];
  if (!fn || s.hidden) return '';
  const inner = fn(s, ctx, i, next);
  // a header-less section that continues the previous one (same background) sits closer to it
  const join = prev && prev.type !== 'hero' && (prev.tone || 'paper') === (s.tone || 'paper') && !hasHead(s) ? ' sec--join' : '';
  const edit = ctx.preview ? ` data-edit="${esc(ctx.page.id)}:${i}"` : '';
  if (s.type === 'hero') return inner.replace('<section class="hero', `<section${edit} class="hero`);
  const tone = s.tone || (s.type === 'band' ? 'moss' : 'paper');
  return `<section class="sec sec--${s.type} tone-${esc(tone)}${join}"${edit} id="${esc(s.anchor || `s${i + 1}`)}">${inner}</section>`;
}

// ---------- chrome ----------
function navItems(ctx) {
  return (ctx.site.navigation || []).map((n) => {
    const p = ctx.pagesById[n.page];
    if (!p || p.hidden) return null;
    const kids = n.children ? ctx.site.pages.filter((c) => c.parent === p.id && !c.hidden) : [];
    return { page: p, kids, button: !!n.button };
  }).filter(Boolean);
}

function isCurrent(ctx, p) {
  let cur = ctx.page;
  while (cur) { if (cur.id === p.id) return true; cur = cur.parent && ctx.pagesById[cur.parent]; }
  return false;
}

function logo(ctx) {
  const b = ctx.site.brand || {};
  const name = tx(ctx.site.company?.name, ctx.lang) || 'Mycogen';
  if (b.logoImage) return `<img class="logo__img" src="${esc(ctx.media(b.logoImage))}" alt="${esc(name)}">`;
  return `${MARK_SVG}<span class="logo__word">${esc(b.wordmark || 'MYCOGEN')}</span><span class="sr-only">${esc(name)}</span>`;
}

function header(ctx) {
  const items = navItems(ctx);
  const otherLangs = LANGS.filter((l) => l !== ctx.lang);
  const langLinks = LANGS.map((l) => l === ctx.lang
    ? `<span class="lang__cur" aria-current="true">${l.toUpperCase()}</span>`
    : `<a href="${esc(ctx.pageHref(ctx.page.id, l))}" hreflang="${l}" lang="${l}">${l.toUpperCase()}</a>`).join('<span class="lang__sep">/</span>');
  const menu = items.map(({ page, kids, button }) => {
    const label = esc(tx(page.navLabel || page.title, ctx.lang));
    const cur = isCurrent(ctx, page) ? ' aria-current="page"' : '';
    if (button) return `<li class="nav__item nav__item--btn"><a class="btn btn--solid btn--sm" href="${esc(ctx.pageHref(page.id))}"${cur}>${label}</a></li>`;
    if (!kids.length) return `<li class="nav__item"><a class="nav__link" href="${esc(ctx.pageHref(page.id))}"${cur}>${label}</a></li>`;
    return `<li class="nav__item nav__item--has">
      <a class="nav__link" href="${esc(ctx.pageHref(page.id))}"${cur}>${label}</a>
      <button class="nav__toggle" type="button" aria-expanded="false" aria-label="${label} ${ctx.lang === 'ko' ? '하위 메뉴' : 'submenu'}"><span aria-hidden="true"></span></button>
      <ul class="nav__sub">${kids.map((k) => `<li><a href="${esc(ctx.pageHref(k.id))}"${k.id === ctx.page.id ? ' aria-current="page"' : ''}>${esc(tx(k.navLabel || k.title, ctx.lang))}</a></li>`).join('')}</ul>
    </li>`;
  }).join('');
  return `<a class="skip" href="#main">${ctx.lang === 'ko' ? '본문 바로가기' : 'Skip to content'}</a>
<header class="hdr" data-hdr>
  <div class="wrap hdr__inner">
    <a class="logo" href="${esc(ctx.pageHref('home'))}" aria-label="${esc(tx(ctx.site.company?.name, ctx.lang))} home">${logo(ctx)}</a>
    <button class="burger" type="button" aria-expanded="false" aria-controls="nav" aria-label="${ctx.lang === 'ko' ? '메뉴 열기' : 'Open menu'}"><span></span><span></span><span></span></button>
    <nav class="nav" id="nav" aria-label="${ctx.lang === 'ko' ? '주 메뉴' : 'Main'}">
      <ul class="nav__list">${menu}</ul>
      <div class="lang">${otherLangs.length ? langLinks : ''}</div>
      ${socialList(ctx, 'social--nav')}
    </nav>
  </div>
</header>`;
}

function footer(ctx) {
  const s = ctx.site;
  const c = s.company || {};
  const items = navItems(ctx);
  const cols = items.filter((i) => !i.button).map(({ page, kids }) => `<div class="ftr__col">
    <a class="ftr__head" href="${esc(ctx.pageHref(page.id))}">${esc(tx(page.navLabel || page.title, ctx.lang))}</a>
    ${kids.length ? `<ul>${kids.map((k) => `<li><a href="${esc(ctx.pageHref(k.id))}">${esc(tx(k.navLabel || k.title, ctx.lang))}</a></li>`).join('')}</ul>` : ''}
  </div>`).join('');
  const ko = ctx.lang === 'ko';
  const facts = [
    [ko ? '대표' : 'CEO', tx(c.ceo, ctx.lang)],
    [ko ? '사업자등록번호' : 'Business No.', c.bizNo],
    [ko ? '주소' : 'Address', tx(c.address, ctx.lang).replace(/\n/g, ' ')],
    [ko ? '전화' : 'Tel', c.tel],
    [ko ? '이메일' : 'Email', c.email],
  ].filter(([, v]) => v).map(([k, v]) => `<span><b>${esc(k)}</b> ${esc(v)}</span>`).join('');
  const links = (s.footer?.links || []).map((l) => {
    const a = linkAttrs(l.link, ctx);
    return a ? `<a ${a}>${esc(tx(l.label, ctx.lang))}</a>` : '';
  }).join('');
  const year = new Date().getFullYear();
  return `<footer class="ftr">
  ${fiberEdge('footer', { cls: 'edge--top' })}
  <div class="wrap ftr__top">
    <div class="ftr__brand">
      <a class="logo logo--light" href="${esc(ctx.pageHref('home'))}">${logo(ctx)}</a>
      ${para(s.brand?.tagline, ctx, 'ftr__tagline')}
      ${socialList(ctx, 'social--footer')}
    </div>
    <div class="ftr__cols">${cols}</div>
  </div>
  <div class="wrap ftr__bottom">
    ${facts ? `<p class="ftr__facts">${facts}</p>` : ''}
    ${para(s.footer?.note, ctx, 'ftr__note')}
    <div class="ftr__legal"><span>© ${year} ${esc(tx(c.name, ctx.lang))}. All rights reserved.</span>${links ? `<nav class="ftr__links" aria-label="legal">${links}</nav>` : ''}</div>
  </div>
</footer>`;
}

function head(ctx, assetsVersion) {
  const { site, page, lang } = ctx;
  const m = site.meta || {};
  const siteName = tx(m.siteName, lang) || tx(site.company?.name, lang);
  const isHome = page.id === 'home';
  const pageTitle = tx(page.title, lang);
  const title = isHome ? (pageTitle || siteName) : `${pageTitle} | ${siteName}`;
  const desc = tx(page.description, lang) || tx(m.description, lang);
  const og = page.ogImage || m.ogImage || page.cardImage;
  const base = (m.siteUrl || '').replace(/\/$/, '');
  const canonical = ctx.abs(page.id);
  const colors = site.brand?.colors || {};
  const vars = Object.entries(colors).filter(([, v]) => /^#[0-9a-f]{3,8}$/i.test(v || '')).map(([k, v]) => `--${k}:${v}`).join(';');
  const alternates = LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${esc(ctx.abs(page.id, l))}">`).join('')
    + `<link rel="alternate" hreflang="x-default" href="${esc(ctx.abs(page.id, m.defaultLang || 'ko'))}">`;
  const sameAs = socialUrls(site);
  const orgId = base + '/#organization';
  const orgName = tx(site.company?.name, 'en') || siteName;
  const founded = (tx(site.company?.founded, 'en') + ' ' + tx(site.company?.founded, 'ko')).match(/\d{4}/);
  const addr = tx(site.company?.address, lang).replace(/\n/g, ' ').trim();
  const email = site.company?.email || '';
  const tel = site.company?.tel || '';
  const org = {
    '@type': 'Organization', '@id': orgId, name: orgName,
    alternateName: [tx(site.company?.name, 'ko'), tx(m.siteName, 'ko'), tx(m.siteName, 'en'), site.brand?.wordmark]
      .filter((v, n, a) => v && v !== orgName && a.indexOf(v) === n),
    url: base + '/', logo: { '@type': 'ImageObject', url: base + '/assets/logo.svg' },
    description: tx(m.description, lang),
    ...(m.ogImage ? { image: base + '/' + m.ogImage } : {}),
    ...(founded ? { foundingDate: founded[0] } : {}),
    ...(email ? { email } : {}),
    ...(tel ? { telephone: tel } : {}),
    ...(addr ? { address: { '@type': 'PostalAddress', streetAddress: addr, addressCountry: 'KR' } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    knowsAbout: tx(m.keywords, lang).split(',').map((k) => k.trim()).filter(Boolean),
    ...(email || tel ? { contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', ...(email ? { email } : {}), ...(tel ? { telephone: tel } : {}), availableLanguage: ['Korean', 'English'] } } : {}),
  };
  const trail = [];
  for (let cur = page; cur; cur = cur.parent && ctx.pagesById[cur.parent]) trail.unshift(cur);
  if (!isHome) trail.unshift(ctx.pagesById.home);
  const graph = [org,
    { '@type': 'WebSite', '@id': base + '/#website', url: base + '/', name: siteName, inLanguage: ['ko-KR', 'en'], publisher: { '@id': orgId } },
    { '@type': 'WebPage', '@id': canonical + '#webpage', url: canonical, name: title, description: desc, inLanguage: lang === 'ko' ? 'ko-KR' : 'en',
      isPartOf: { '@id': base + '/#website' }, about: { '@id': orgId },
      ...(og ? { primaryImageOfPage: { '@type': 'ImageObject', url: base + '/' + og } } : {}),
      ...(trail.length > 1 ? { breadcrumb: { '@id': canonical + '#breadcrumb' } } : {}) },
  ];
  if (trail.length > 1) {
    graph.push({ '@type': 'BreadcrumbList', '@id': canonical + '#breadcrumb', itemListElement: trail.filter(Boolean).map((p, n) => ({ '@type': 'ListItem', position: n + 1, name: tx(p.navLabel || p.title, lang), item: ctx.abs(p.id) })) });
  }
  if ((page.sections || []).some((x) => x.type === 'news' && !x.hidden)) {
    const news = [...(site.news || [])].filter((n) => !n.hidden).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 20);
    if (news.length) graph.push({ '@type': 'ItemList', itemListElement: news.map((n, k) => ({ '@type': 'ListItem', position: k + 1, item: {
      '@type': 'NewsArticle', headline: tx(n.title, lang), datePublished: n.date, description: tx(n.summary, lang).slice(0, 300),
      ...(n.image ? { image: base + '/' + n.image } : {}), publisher: { '@id': orgId }, author: { '@id': orgId },
      mainEntityOfPage: canonical } })) });
  }
  const ld = { '@context': 'https://schema.org', '@graph': graph };
  const xUrl = String(site.social?.x || '');
  const xHandle = (xUrl.match(/(?:x|twitter)\.com\/(?:#!\/)?@?([A-Za-z0-9_]{1,15})/i) || [])[1];
  const ga = m.gaId && !ctx.preview
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(m.gaId)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${esc(m.gaId)}');</script>` : '';
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${tx(m.keywords, lang) ? `<meta name="keywords" content="${esc(tx(m.keywords, lang))}">` : ''}
${ctx.preview ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">'}
<link rel="canonical" href="${esc(canonical)}">
${alternates}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(siteName)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:locale" content="${lang === 'ko' ? 'ko_KR' : 'en_US'}">
${og ? `<meta property="og:image" content="${esc(base + '/' + og)}"><meta name="twitter:card" content="summary_large_image">` : ''}
${m.naverVerification ? `<meta name="naver-site-verification" content="${esc(m.naverVerification)}">` : ''}
${m.googleVerification ? `<meta name="google-site-verification" content="${esc(m.googleVerification)}">` : ''}
${m.bingVerification ? `<meta name="msvalidate.01" content="${esc(m.bingVerification)}">` : ''}
${xHandle ? `<meta name="twitter:site" content="@${esc(xHandle)}">` : ''}
<link rel="alternate" type="application/rss+xml" title="${esc(siteName)} ${lang === 'ko' ? '소식' : 'News'}" href="${esc(base)}/rss.xml">
<meta name="theme-color" content="${esc(colors.ink || '#23201b')}">
<link rel="icon" href="${ctx.root}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="${ctx.root}assets/site.css?v=${assetsVersion}">
${vars ? `<style>:root{${vars}}</style>` : ''}
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
${ga}`;
}

function breadcrumb(ctx, tone = 'paper') {
  const trail = [];
  let cur = ctx.page;
  while (cur) { trail.unshift(cur); cur = cur.parent && ctx.pagesById[cur.parent]; }
  if (ctx.page.id === 'home' || trail.length < 2) return '';
  const home = ctx.lang === 'ko' ? '홈' : 'Home';
  const links = [`<a href="${esc(ctx.pageHref('home'))}">${home}</a>`]
    .concat(trail.map((p) => p.id === ctx.page.id
      ? `<span aria-current="page">${esc(tx(p.navLabel || p.title, ctx.lang))}</span>`
      : `<a href="${esc(ctx.pageHref(p.id))}">${esc(tx(p.navLabel || p.title, ctx.lang))}</a>`));
  return `<div class="crumbs-bar tone-${esc(tone)}"><nav class="crumbs wrap" aria-label="breadcrumb">${links.join('<span class="crumbs__sep" aria-hidden="true">/</span>')}</nav></div>`;
}

export function renderPage(site, page, lang, opts = {}) {
  const ctx = makeCtx(site, lang, page, opts);
  const sections = (page.sections || []).filter((s) => !s.hidden);
  const firstIsHero = sections[0]?.type === 'hero';
  const body = sections.map((s, i) => renderSection(s, ctx, page.sections.indexOf(s), sections[i + 1], sections[i - 1])).join('\n');
  const crumbs = breadcrumb(ctx, (firstIsHero ? sections[1] : sections[0])?.tone || 'paper');
  return `<!doctype html>
<html lang="${lang}">
<head>
${head(ctx, opts.assetsVersion || '1')}
</head>
<body class="page-${esc(page.id)}${firstIsHero ? ' has-hero' : ''}${ctx.preview ? ' is-preview' : ''}">
${header(ctx)}
<main id="main">
${firstIsHero ? body.replace(/(<\/section>)/, `$1\n${crumbs}`) : crumbs + body}
</main>
${footer(ctx)}
<script src="${ctx.root}assets/site.js?v=${opts.assetsVersion || '1'}" defer></script>
${ctx.preview ? `<script src="${ctx.root}assets/preview-bridge.js" defer></script>` : ''}
</body>
</html>`;
}

export function render404(site, lang, opts = {}) {
  const page = { id: '404', slug: '', title: { ko: '페이지를 찾을 수 없습니다', en: 'Page not found' }, sections: [] };
  const fake = { ...site, pages: [...site.pages, page] };
  const ctx = makeCtx(fake, lang, { ...page, id: 'home' }, opts);
  ctx.root = '/';
  ctx.page = page;
  ctx.pageHref = ((orig) => (id, l) => orig(id === '404' ? 'home' : id, l))(ctx.pageHref);
  const ko = lang === 'ko';
  return `<!doctype html><html lang="${lang}"><head>${head({ ...ctx, page: { ...page, id: 'home' } }, opts.assetsVersion || '1').replace(/<link rel="canonical"[^>]*>/, '').replace('index,follow', 'noindex')}</head>
<body class="page-404">${header(ctx)}<main id="main"><section class="sec tone-paper notfound"><div class="wrap wrap--narrow center">
<p class="eyebrow">404</p><h1 class="sec__title sec__title--xl">${ko ? '페이지를 찾을 수 없습니다.' : 'This page could not be found.'}</h1>
<p class="sec__lead">${ko ? '주소가 바뀌었거나 삭제된 페이지입니다. 홈에서 다시 찾아보세요.' : 'It may have moved or been removed.'}</p>
<div class="btns btns--center"><a class="btn btn--solid" href="/">${ko ? '홈으로' : 'Go home'}<span class="btn__arrow">→</span></a></div>
</div></section></main>${footer(ctx)}<script src="/assets/site.js?v=${opts.assetsVersion || '1'}" defer></script></body></html>`;
}
