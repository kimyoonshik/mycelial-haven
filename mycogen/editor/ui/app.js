// 마이코젠 홈페이지 편집기 — browser app (no build step, no dependencies).
import { SECTION_TYPES, PAGE_FIELDS, SITE_FIELDS, NEWS_FIELDS, NAV_FIELDS, newSection } from '/src/schema.mjs';
import { pagePath, langPrefix, tx } from '/src/render.mjs';

// ---------------------------------------------------------------- utils
const $ = (s, el = document) => el.querySelector(s);
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
  return el;
}
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
function setPath(o, p, v) {
  const keys = p.split('.');
  let cur = o;
  for (const k of keys.slice(0, -1)) { if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {}; cur = cur[k]; }
  cur[keys.at(-1)] = v;
}
const ko = (v) => tx(v, 'ko');
const clone = (v) => JSON.parse(JSON.stringify(v));
const fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB');
const IMG_EXT = /\.(jpe?g|png|webp|gif|svg|avif)$/i;

async function api(path, opts = {}) {
  const res = await fetch(path, opts);
  const type = res.headers.get('content-type') || '';
  const body = type.includes('json') ? await res.json() : await res.text();
  if (!res.ok) {
    const err = new Error((body && (body.error || (body.errors || []).join(' / '))) || res.statusText);
    err.body = body;
    throw err;
  }
  return body;
}

let toastTimer;
function toast(msg, err = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (err ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, err ? 5200 : 2600);
}

// ---------------------------------------------------------------- state
const S = {
  site: null, saved: '', last: '',
  undo: [], redo: [], typingBase: null, typingTimer: null,
  view: 'page', pageId: 'home', open: 0,
  lang: 'ko', device: 'desktop',
  errors: [], warnings: [], media: [], history: [],
  openItems: new WeakSet(), restoreY: 0, building: false,
};

const pagesById = () => Object.fromEntries(S.site.pages.map((p) => [p.id, p]));
const currentPage = () => S.site.pages.find((p) => p.id === S.pageId) || S.site.pages[0];
const isDirty = () => JSON.stringify(S.site) !== S.saved;

// ---------------------------------------------------------------- change tracking
function touch() {
  if (S.typingBase === null) S.typingBase = S.last;
  clearTimeout(S.typingTimer);
  S.typingTimer = setTimeout(commitTyping, 700);
  changed();
}
function commitTyping() {
  clearTimeout(S.typingTimer);
  if (S.typingBase !== null) {
    S.undo.push(S.typingBase);
    S.redo = [];
    S.typingBase = null;
    S.last = JSON.stringify(S.site);
    if (S.undo.length > 200) S.undo.shift();
  }
  updateTop();
}
function mutate(fn, rerender = true) {
  commitTyping();
  S.undo.push(S.last);
  S.redo = [];
  fn();
  S.last = JSON.stringify(S.site);
  changed();
  if (rerender) render();
}
function undo() {
  commitTyping();
  if (!S.undo.length) return;
  S.redo.push(S.last);
  S.last = S.undo.pop();
  S.site = JSON.parse(S.last);
  changed(); render();
}
function redo() {
  commitTyping();
  if (!S.redo.length) return;
  S.undo.push(S.last);
  S.last = S.redo.pop();
  S.site = JSON.parse(S.last);
  changed(); render();
}
function changed() {
  updateTop();
  schedulePreview();
  scheduleSide();
}
let sideTimer;
function scheduleSide() { clearTimeout(sideTimer); sideTimer = setTimeout(renderSide, 400); }

function updateTop() {
  const dirty = isDirty();
  $('#undo').disabled = !S.undo.length && S.typingBase === null;
  $('#redo').disabled = !S.redo.length;
  $('#save').disabled = !dirty;
  $('#discard').disabled = !dirty;
  const st = $('#status');
  st.className = 'top__status' + (S.errors.length ? ' error' : dirty ? ' dirty' : '');
  st.replaceChildren(h('span', { class: 'dot' }), h('span', {
    text: S.errors.length ? `오류 ${S.errors.length}건 — 확인이 필요합니다` : dirty ? '저장하지 않은 변경사항이 있습니다' : '모든 변경사항이 저장되었습니다',
  }));
}

// ---------------------------------------------------------------- preview
let pvTimer; let pvBusy = false; let pvAgain = false;
function schedulePreview() { clearTimeout(pvTimer); pvTimer = setTimeout(pushDraft, 450); }
async function pushDraft() {
  if (pvBusy) { pvAgain = true; return; }
  pvBusy = true; $('#pv').classList.add('loading');
  try {
    const r = await api('/api/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(S.site) });
    S.errors = []; S.warnings = r.warnings || [];
    reloadPreview(true);
  } catch (e) {
    S.errors = e.body?.errors || [e.message];
    S.warnings = e.body?.warnings || [];
  } finally {
    pvBusy = false; $('#pv').classList.remove('loading');
    updateTop(); renderNotices();
    if (pvAgain) { pvAgain = false; pushDraft(); }
  }
}
function previewPath(pageId = S.pageId, lang = S.lang) {
  const p = pagesById()[pageId];
  if (!p || p.hidden) return null;
  return '/preview/' + langPrefix(lang, S.site) + pagePath(p, pagesById());
}
function reloadPreview(keep) {
  const f = $('#pvFrame');
  const url = previewPath() || previewPath('home');
  let y = 0;
  try { if (keep && f.contentWindow.location.pathname === url) y = f.contentWindow.scrollY; } catch { /* ignore */ }
  S.restoreY = y;
  f.src = url + '?t=' + Date.now();
  $('#pvPath').textContent = (S.site.meta?.siteUrl || '').replace(/^https?:\/\//, '') + url.replace('/preview', '');
}
function highlight(scroll) {
  const f = $('#pvFrame');
  if (S.view !== 'page' || S.open < 0) return;
  f.contentWindow?.postMessage({ type: 'mycogen:highlight', edit: `${S.pageId}:${S.open}`, scroll }, '*');
}
function layoutPreview() {
  const stage = $('#pvStage'); const wrap = $('#pvFrameWrap');
  const W = { desktop: 1280, tablet: 820, mobile: 390 }[S.device];
  const pad = S.device === 'desktop' ? 0 : 16;
  const avail = stage.clientWidth - pad * 2;
  const scale = Math.min(1, avail / W);
  wrap.style.width = W + 'px';
  wrap.style.height = Math.max(200, (stage.clientHeight - pad * 2) / scale) + 'px';
  wrap.style.transform = `scale(${scale})`;
  wrap.style.margin = `${pad}px 0 0 ${Math.max(pad, (stage.clientWidth - W * scale) / 2)}px`;
}
window.addEventListener('message', (e) => {
  const m = e.data || {};
  if (m.type === 'mycogen:select') {
    const [pid, idx] = String(m.edit).split(':');
    S.view = 'page'; S.pageId = pid; S.open = Number(idx);
    render();
    requestAnimationFrame(() => document.querySelector('.sec-card.open')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    highlight(false);
  }
  if (m.type === 'mycogen:loaded') {
    const path = m.path;
    const f = $('#pvFrame');
    try { f.contentWindow.scrollTo({ top: S.restoreY, behavior: 'instant' }); } catch { /* ignore */ }
    S.restoreY = 0;
    if (path !== previewPath()) {
      // user followed a link inside the preview: follow along in the editor
      for (const lang of ['ko', 'en']) {
        const pg = S.site.pages.find((p) => previewPath(p.id, lang) === path);
        if (pg) { S.lang = lang; S.pageId = pg.id; S.view = 'page'; S.open = -1; render(); syncSeg(); break; }
      }
      $('#pvPath').textContent = path.replace('/preview', '');
    }
    highlight(false);
  }
});
function syncSeg() {
  for (const b of $('#pvLang').children) b.classList.toggle('on', b.dataset.v === S.lang);
  for (const b of $('#pvDevice').children) b.classList.toggle('on', b.dataset.v === S.device);
}

// ---------------------------------------------------------------- fields
function fieldEl(f, obj, opts = {}) {
  if (f.when && obj[f.when.key] === f.when.not) return null;
  const val = getPath(obj, f.key);
  const set = (v, typing) => {
    if (typing) { setPath(obj, f.key, v); touch(); opts.onEdit?.(); }
    else mutate(() => setPath(obj, f.key, v), !!opts.rerenderOnChange);
  };
  const wrap = h('div', { class: 'f' });
  const label = h('label', { class: 'f__label', text: f.label });
  const typingInput = (cls, value, onInput, extra = {}) => {
    const el = h(f.type.includes('rea') || cls === 'ta' ? 'textarea' : 'input', { class: cls, ...extra });
    el.value = value ?? '';
    el.addEventListener('input', () => onInput(el.value));
    return el;
  };

  switch (f.type) {
    case 'i18n':
    case 'i18nArea': {
      const area = f.type === 'i18nArea';
      const cur = val && typeof val === 'object' ? val : { ko: val || '', en: '' };
      const box = h('div', { class: 'i18n' + (area ? '' : ' one') });
      for (const lang of ['ko', 'en']) {
        const row = h('div', { class: 'i18n__row' + (!cur[lang] && cur[lang === 'ko' ? 'en' : 'ko'] ? ' empty' : '') });
        const el = area
          ? h('textarea', { class: 'ta', rows: f.rows || 3 })
          : h('input', { class: 'in' });
        el.value = cur[lang] || '';
        el.addEventListener('input', () => {
          const next = { ...(getPath(obj, f.key) && typeof getPath(obj, f.key) === 'object' ? getPath(obj, f.key) : cur), [lang]: el.value };
          setPath(obj, f.key, next); touch(); opts.onEdit?.();
        });
        row.append(h('span', { class: 'lang', text: lang.toUpperCase() }), el);
        box.append(row);
      }
      wrap.append(label, box);
      if (area) wrap.append(h('div', { class: 'f__help', text: '줄바꿈 그대로 표시 · **굵게** · [글자](page:contact 또는 https://주소) 링크' }));
      break;
    }
    case 'text':
      wrap.append(label, typingInput('in', val, (v) => set(v, true)));
      break;
    case 'textarea':
      wrap.append(label, typingInput('ta', val, (v) => set(v, true), { rows: f.rows || 4 }));
      break;
    case 'number': {
      const el = h('input', { class: 'in', type: 'number', min: f.min, max: f.max, style: { width: '140px' } });
      el.value = val ?? '';
      el.addEventListener('input', () => set(el.value === '' ? '' : Number(el.value), true));
      wrap.append(label, el);
      break;
    }
    case 'select': {
      const el = h('select', { class: 'sel' }, f.options.map(([v, l]) => h('option', { value: v, text: l })));
      el.value = val ?? f.options[0][0];
      el.addEventListener('change', () => mutate(() => setPath(obj, f.key, el.value), true));
      wrap.append(label, el);
      break;
    }
    case 'toggle': {
      const el = h('input', { type: 'checkbox', checked: !!val });
      el.addEventListener('change', () => set(el.checked));
      wrap.append(h('label', { class: 'switch' }, el, h('span', { text: f.label })));
      break;
    }
    case 'color': {
      const pick = h('input', { type: 'color' });
      const txt = h('input', { class: 'in', style: { width: '120px' } });
      pick.value = /^#[0-9a-f]{6}$/i.test(val || '') ? val : '#000000';
      txt.value = val || '';
      pick.addEventListener('input', () => { txt.value = pick.value; set(pick.value, true); });
      txt.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(txt.value)) pick.value = txt.value; set(txt.value, true); });
      wrap.append(label, h('div', { class: 'color' }, pick, txt));
      break;
    }
    case 'image': {
      const thumb = h('div', { class: 'thumb' });
      const pathEl = h('div', { class: 'img-field__path' });
      const paint = (v) => {
        thumb.style.backgroundImage = v && IMG_EXT.test(v) ? `url("/${v}")` : '';
        thumb.textContent = v ? (IMG_EXT.test(v) ? '' : '파일') : '없음';
        pathEl.textContent = v || '이미지가 없습니다';
      };
      paint(val);
      const choose = h('button', { class: 'btn btn--sm', type: 'button', text: '선택·업로드', onclick: () => pickMedia({ images: true }).then((p) => { if (p) { set(p); paint(p); } }) });
      const clear = h('button', { class: 'btn btn--sm', type: 'button', text: '지우기', onclick: () => { set(''); paint(''); } });
      wrap.append(label, h('div', { class: 'img-field' }, thumb, h('div', { class: 'img-field__side' }, pathEl, h('div', { class: 'row' }, choose, clear))));
      break;
    }
    case 'pageRef': {
      const el = h('select', { class: 'sel' }, h('option', { value: '', text: '(없음)' }),
        S.site.pages.filter((p) => p.id !== opts.selfId).map((p) => h('option', { value: p.id, text: `${p.parent ? '— ' : ''}${ko(p.navLabel) || p.id}` })));
      el.value = val || '';
      el.addEventListener('change', () => mutate(() => setPath(obj, f.key, el.value), true));
      wrap.append(label, el);
      break;
    }
    case 'link': {
      const custom = val && !String(val).startsWith('page:');
      const sel = h('select', { class: 'sel' },
        h('option', { value: '', text: '(연결 없음)' }),
        h('optgroup', { label: '사이트 페이지' }, S.site.pages.map((p) => h('option', { value: 'page:' + p.id, text: `${p.parent ? '— ' : ''}${ko(p.navLabel) || p.id}` }))),
        h('option', { value: '__custom', text: '직접 입력 (외부 주소·메일·파일)…' }));
      const input = h('input', { class: 'in', placeholder: 'https://…  /  mailto:…  /  media/파일' });
      const fileBtn = h('button', { class: 'btn btn--sm', type: 'button', text: '파일', onclick: () => pickMedia({ images: false }).then((p) => { if (p) { input.value = p; set(p); } }) });
      const customRow = h('div', { class: 'row', style: { marginTop: '6px' } }, input, fileBtn);
      sel.value = custom ? '__custom' : (val || '');
      input.value = custom ? val : '';
      customRow.hidden = !custom;
      sel.addEventListener('change', () => {
        if (sel.value === '__custom') { customRow.hidden = false; input.focus(); return; }
        customRow.hidden = true; set(sel.value);
      });
      input.addEventListener('input', () => set(input.value.trim(), true));
      wrap.append(label, sel, customRow);
      break;
    }
    case 'list': {
      let items = Array.isArray(val) ? val : null;
      if (!items) { items = []; setPath(obj, f.key, items); }
      const list = h('div', { class: 'list' });
      const labelOf = (it) => {
        const v = it[f.itemLabel];
        let s = v && typeof v === 'object' ? (ko(v) || tx(v, 'en')) : v;
        if (f.itemLabel === 'page') { const pg = S.site.pages.find((x) => x.id === v); s = pg ? ko(pg.navLabel) || pg.id : s; }
        return s ? String(s).split('\n')[0] : '(비어 있음)';
      };
      items.forEach((it, i) => {
        const open = S.openItems.has(it);
        const title = h('b', { text: `${i + 1}. ${labelOf(it)}` });
        const tools = [
          ['↑', '위로', i > 0, () => mutate(() => items.splice(i - 1, 0, items.splice(i, 1)[0]))],
          ['↓', '아래로', i < items.length - 1, () => mutate(() => items.splice(i + 1, 0, items.splice(i, 1)[0]))],
          ['⧉', '복제', !f.max || items.length < f.max, () => mutate(() => { const c = clone(it); items.splice(i + 1, 0, c); S.openItems.add(c); })],
          ['✕', '삭제', true, () => { if (confirm('이 항목을 삭제할까요?')) mutate(() => items.splice(i, 1)); }],
        ].map(([t, tt, en, fn]) => h('button', { class: 'ibtn', type: 'button', title: tt, disabled: !en, text: t, onclick: (e) => { e.stopPropagation(); fn(); } }));
        const item = h('div', { class: 'list-item' },
          h('div', { class: 'list-item__head', onclick: () => { open ? S.openItems.delete(it) : S.openItems.add(it); render(); } }, h('span', { class: 'muted', text: open ? '▾' : '▸' }), title, tools));
        if (open) {
          const body = h('div', { class: 'list-item__body' });
          for (const sf of f.fields) {
            const el = fieldEl(sf, it, { onEdit: () => { title.textContent = `${i + 1}. ${labelOf(it)}`; opts.onEdit?.(); } });
            if (el) body.append(el);
          }
          item.append(body);
        }
        list.append(item);
      });
      const canAdd = !f.max || items.length < f.max;
      const add = h('button', { class: 'btn btn--sm list-add', type: 'button', disabled: !canAdd, text: `+ ${f.label} 추가`, onclick: () => mutate(() => {
        const it = {};
        for (const sf of f.fields) if (sf.type === 'select') it[sf.key] = sf.options[0][0];
        items.push(it); S.openItems.add(it);
      }) });
      wrap.append(h('div', { class: 'f__label' }, f.label, h('small', { text: `${items.length}개${f.max ? ` / 최대 ${f.max}` : ''}` })), list, add);
      break;
    }
    default:
      return null;
  }
  return wrap;
}

function fieldsEl(fields, obj, opts) {
  return fields.map((f) => fieldEl(f, obj, opts)).filter(Boolean);
}

// ---------------------------------------------------------------- media
async function loadMedia() { S.media = await api('/api/media'); }

async function prepareUpload(file) {
  // Resize large photos in the browser and store them as WebP: smaller site, same look.
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return { blob: file, name: file.name };
  try {
    const bmp = await createImageBitmap(file);
    const max = 2000;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 700 * 1024) return { blob: file, name: file.name };
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.84));
    if (!blob || (scale === 1 && blob.size > file.size)) return { blob: file, name: file.name };
    return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.webp' };
  } catch { return { blob: file, name: file.name }; }
}

async function uploadFiles(files) {
  const done = [];
  for (const file of files) {
    try {
      toast(`올리는 중: ${file.name}`);
      const { blob, name } = await prepareUpload(file);
      const r = await api(`/api/media?folder=uploads&name=${encodeURIComponent(name)}`, { method: 'POST', body: blob });
      done.push(r.path);
    } catch (e) { toast(`${file.name}: ${e.message}`, true); }
  }
  await loadMedia();
  if (done.length) toast(`${done.length}개 파일을 올렸습니다.`);
  return done;
}

function mediaGrid(items, { onPick, filter = '' } = {}) {
  const q = filter.trim().toLowerCase();
  const grid = h('div', { class: 'media-grid' });
  for (const m of items.filter((x) => !q || x.path.toLowerCase().includes(q))) {
    const isImg = IMG_EXT.test(m.path);
    const thumb = h('div', { class: 'thumb', style: isImg ? { backgroundImage: `url("/${m.path}")` } : {}, text: isImg ? '' : m.ext.slice(1).toUpperCase() });
    const meta = h('div', { class: 'media-card__meta' }, h('b', { text: m.path.split('/').pop() }), `${m.path.split('/').slice(1, -1).join('/')} · ${fmtSize(m.size)}`);
    const card = h('div', { class: 'media-card' });
    if (onPick) card.append(h('button', { class: 'pick', type: 'button', title: '선택', onclick: () => onPick(m.path) }, thumb, meta));
    else {
      card.append(thumb, meta, h('div', { class: 'media-card__tools' },
        h('button', { type: 'button', text: '경로 복사', onclick: () => navigator.clipboard?.writeText(m.path).then(() => toast('경로를 복사했습니다: ' + m.path)) }),
        h('button', { type: 'button', text: '보기', onclick: () => window.open('/' + m.path, '_blank') }),
        h('button', { type: 'button', text: '삭제', onclick: async () => {
          if (JSON.stringify(S.site).includes(m.path)) return toast('편집 중인 콘텐츠에서 사용 중인 파일입니다.', true);
          if (!confirm(`${m.path} 파일을 휴지통(content/.trash)으로 옮길까요?`)) return;
          try { await api('/api/media?path=' + encodeURIComponent(m.path), { method: 'DELETE' }); await loadMedia(); render(); toast('삭제했습니다.'); } catch (e) { toast(e.message, true); }
        } })));
    }
    grid.append(card);
  }
  return grid;
}

function dropZone(onFiles, accept) {
  const input = h('input', { type: 'file', multiple: true, accept, hidden: true });
  input.addEventListener('change', () => { onFiles([...input.files]); input.value = ''; });
  const zone = h('div', { class: 'drop' }, '사진·파일을 여기로 끌어다 놓거나 ', h('button', { class: 'btn btn--sm', type: 'button', text: '파일 선택', onclick: () => input.click() }), input,
    h('div', { class: 'f__help', text: '큰 사진은 자동으로 2000px · WebP로 줄여서 저장합니다.' }));
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('over'); onFiles([...e.dataTransfer.files]); });
  return zone;
}

function openModal(build) {
  const dlg = $('#modal'); const box = $('#modalBox');
  box.replaceChildren();
  return new Promise((resolve) => {
    const close = (v) => { dlg.close(); resolve(v); };
    build(box, close);
    dlg.onclose = () => resolve(undefined);
    dlg.showModal();
  });
}

async function pickMedia({ images }) {
  await loadMedia();
  return openModal((box, close) => {
    let filter = '';
    const list = () => S.media.filter((m) => !images || IMG_EXT.test(m.path));
    const gridHost = h('div');
    const paint = () => gridHost.replaceChildren(mediaGrid(list(), { onPick: close, filter }));
    const search = h('input', { class: 'in', placeholder: '파일 이름으로 찾기', oninput: (e) => { filter = e.target.value; paint(); } });
    box.append(h('h2', { text: images ? '이미지 선택' : '파일 선택' }),
      h('p', { class: 'muted', text: '목록에서 고르거나 새 파일을 올리세요. 올린 파일은 content/media/uploads 에 저장됩니다.' }),
      dropZone(async (files) => { const paths = await uploadFiles(files); if (paths.length === 1) close(paths[0]); else paint(); }, images ? 'image/*' : ''),
      search, h('div', { style: { height: '12px' } }), gridHost,
      h('div', { class: 'modal__foot' }, h('button', { class: 'btn', type: 'button', text: '닫기', onclick: () => close(undefined) })));
    paint();
  });
}

// ---------------------------------------------------------------- sidebar
function renderSide() {
  const side = $('#side');
  const item = (label, ico, on, onclick, extra = {}) => h('button', { class: `nav-item${on ? ' on' : ''}${extra.child ? ' child' : ''}${extra.hidden ? ' is-hidden' : ''}`, type: 'button', onclick },
    h('span', { class: 'ico', text: ico }), h('span', { text: label }), extra.count != null ? h('span', { class: 'count', text: extra.count }) : null);
  const go = (view, more = {}) => () => { commitTyping(); Object.assign(S, { view, ...more }); render(); if (view === 'page') reloadPreview(false); };
  const pages = S.site.pages;
  const tops = pages.filter((p) => !p.parent || !pages.some((x) => x.id === p.parent));
  const tree = [];
  for (const p of tops) {
    tree.push(item(ko(p.navLabel) || p.id, p.id === 'home' ? '⌂' : '▤', S.view === 'page' && S.pageId === p.id, go('page', { pageId: p.id, open: -1 }), { hidden: p.hidden }));
    for (const c of pages.filter((x) => x.parent === p.id)) tree.push(item(ko(c.navLabel) || c.id, '▪', S.view === 'page' && S.pageId === c.id, go('page', { pageId: c.id, open: -1 }), { child: true, hidden: c.hidden }));
  }
  side.replaceChildren(...[
    h('h3', { text: '사이트' }),
    item('사이트 정보', '⚙', S.view === 'site', go('site')),
    item('메뉴 구성', '☰', S.view === 'nav', go('nav')),
    h('h3', { text: '페이지' }),
    tree,
    h('button', { class: 'btn btn--sm', type: 'button', text: '+ 새 페이지', onclick: newPageDialog }),
    h('h3', { text: '콘텐츠' }),
    item('소식', '✎', S.view === 'news', go('news'), { count: (S.site.news || []).length }),
    item('미디어', '▣', S.view === 'media', go('media')),
    h('h3', { text: '관리' }),
    item('저장 기록', '↺', S.view === 'history', go('history')),
    item('게시·배포', '⇪', S.view === 'deploy', go('deploy')),
    item('편집기 종료', '⏻', false, quit),
  ].flat());
}

// ---------------------------------------------------------------- views
function head(title, sub, ...tools) {
  return h('div', { class: 'panel__head' }, h('div', {}, h('h1', { text: title }), sub ? h('p', { text: sub }) : null), h('div', { class: 'tools' }, tools));
}

function renderNotices() {
  const host = $('#notices');
  if (!host) return;
  host.replaceChildren(...[
    S.errors.length ? h('div', { class: 'notice notice--error' }, h('b', { text: '미리보기를 만들 수 없습니다. 아래를 고쳐 주세요.' }), h('ul', {}, S.errors.map((e) => h('li', { text: e })))) : null,
    S.warnings.length && ['page', 'site', 'deploy'].includes(S.view) ? h('div', { class: 'notice notice--warn' }, h('b', { text: '확인해 주세요' }), h('ul', {}, S.warnings.map((e) => h('li', { text: e })))) : null,
  ].filter(Boolean));
}

function sectionSummary(s) {
  const t = ko(s.title) || ko(s.eyebrow) || ko(s.text);
  if (t) return t.replace(/\n/g, ' ');
  if (s.type === 'cards' && s.source === 'business') return '사업 페이지 카드 (자동)';
  return '';
}

function viewPage() {
  const page = currentPage();
  S.pageId = page.id;
  const secs = page.sections || (page.sections = []);
  const panel = [];
  panel.push(head(ko(page.navLabel) || page.id, page.id === 'home' ? '사이트 첫 화면' : `주소: /${pagePath(page, pagesById())}`,
    h('button', { class: 'btn btn--sm', type: 'button', text: '복제', onclick: () => duplicatePage(page) }),
    page.id !== 'home' ? h('button', { class: 'btn btn--sm btn--danger', type: 'button', text: '삭제', onclick: () => deletePage(page) }) : null));
  panel.push(h('div', { id: 'notices' }));
  if (page.hidden) panel.push(h('div', { class: 'notice notice--info', text: '숨김 상태인 페이지입니다. 사이트에 만들어지지 않으며 미리보기도 표시되지 않습니다.' }));

  const settings = h('details', { class: 'box' }, h('summary', { text: '페이지 설정 · 검색 노출(SEO)' }),
    h('div', { class: 'box__body' }, fieldsEl(PAGE_FIELDS.filter((f) => !(page.id === 'home' && ['slug', 'parent', 'hidden'].includes(f.key))), page, { selfId: page.id, onEdit: scheduleSide })));
  panel.push(settings);

  secs.forEach((s, i) => {
    const def = SECTION_TYPES[s.type] || { label: s.type, fields: [] };
    const open = S.open === i;
    const sum = h('span', { text: sectionSummary(s) });
    const tools = [
      ['↑', '위로', i > 0, () => mutate(() => { secs.splice(i - 1, 0, secs.splice(i, 1)[0]); S.open = i - 1; })],
      ['↓', '아래로', i < secs.length - 1, () => mutate(() => { secs.splice(i + 1, 0, secs.splice(i, 1)[0]); S.open = i + 1; })],
      ['⧉', '복제', true, () => mutate(() => { secs.splice(i + 1, 0, clone(s)); S.open = i + 1; })],
      [s.hidden ? '◌' : '◉', s.hidden ? '보이기' : '숨기기', true, () => mutate(() => { s.hidden = !s.hidden; })],
      ['🗑', '삭제', true, () => { if (confirm(`"${def.label}" 섹션을 삭제할까요?`)) mutate(() => { secs.splice(i, 1); S.open = -1; }); }],
    ].map(([t, tt, en, fn]) => h('button', { class: 'ibtn', type: 'button', title: tt, 'aria-label': tt, disabled: !en, text: t, onclick: (e) => { e.stopPropagation(); fn(); } }));
    const card = h('div', { class: `sec-card${open ? ' open' : ''}${s.hidden ? ' is-hidden' : ''}`, 'data-index': i },
      h('div', { class: 'sec-card__head', onclick: () => { commitTyping(); S.open = open ? -1 : i; render(); highlight(true); } },
        h('span', { class: 'sec-card__num', text: i + 1 }),
        h('div', { class: 'sec-card__title' }, h('b', { text: def.label + (s.hidden ? ' (숨김)' : '') }), sum),
        h('div', { class: 'sec-card__tools' }, tools)));
    if (open) {
      const body = h('div', { class: 'sec-card__body' }, def.hint ? h('p', { class: 'sec-card__hint', text: def.hint }) : null,
        fieldsEl(def.fields, s, { onEdit: () => { sum.textContent = sectionSummary(s); } }));
      if (s.type === 'cards' && s.source === 'business') body.append(h('div', { class: 'notice notice--info', style: { marginTop: '14px' }, text: '카드 내용은 ‘사업분야’ 하위 페이지의 메뉴 이름·목록 카드 사진·목록 카드 설명에서 자동으로 가져옵니다. 각 사업 페이지의 ‘페이지 설정’에서 바꾸세요.' }));
      if (s.type === 'contact') body.append(h('div', { class: 'notice notice--info', style: { marginTop: '14px' }, text: '문의는 ‘사이트 정보 → 대표 이메일’로 전송됩니다. 자동 접수가 필요하면 ‘문의 전송 주소’에 Formspree 등의 주소를 넣으세요.' }));
      card.append(body);
    }
    panel.push(card);
  });
  panel.push(h('button', { class: 'add-sec', type: 'button', text: '+ 섹션 추가', onclick: () => addSectionDialog(page) }));
  return panel;
}

function addSectionDialog(page) {
  openModal((box, close) => {
    box.append(h('h2', { text: '섹션 추가' }), h('p', { class: 'muted', text: S.open >= 0 ? `${S.open + 1}번 섹션 아래에 추가합니다.` : '페이지 맨 아래에 추가합니다.' }),
      h('div', { class: 'type-grid' }, Object.entries(SECTION_TYPES).map(([type, def]) => h('button', { class: 'type-btn', type: 'button', onclick: () => {
        close();
        mutate(() => {
          const at = S.open >= 0 ? S.open + 1 : page.sections.length;
          page.sections.splice(at, 0, newSection(type));
          S.open = at;
        });
        requestAnimationFrame(() => document.querySelector('.sec-card.open')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      } }, h('b', { text: def.label }), h('span', { text: def.hint || '' })))),
      h('div', { class: 'modal__foot' }, h('button', { class: 'btn', type: 'button', text: '취소', onclick: () => close() })));
  });
}

function uniqueId(base) {
  let id = (base || 'page').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'page';
  const ids = new Set(S.site.pages.map((p) => p.id));
  if (!ids.has(id)) return id;
  for (let i = 2; ; i++) if (!ids.has(`${id}-${i}`)) return `${id}-${i}`;
}

function newPageDialog() {
  openModal((box, close) => {
    const nameKo = h('input', { class: 'in', placeholder: '예: 인증·특허' });
    const nameEn = h('input', { class: 'in', placeholder: 'e.g. Certifications' });
    const slug = h('input', { class: 'in', placeholder: 'certifications' });
    const parent = h('select', { class: 'sel' }, h('option', { value: '', text: '(최상위 페이지)' }), S.site.pages.filter((p) => p.id !== 'home').map((p) => h('option', { value: p.id, text: ko(p.navLabel) || p.id })));
    const tmpl = h('select', { class: 'sel' },
      h('option', { value: 'basic', text: '기본 구성 (첫 화면 + 메시지 + 문의 유도)' }),
      h('option', { value: 'empty', text: '빈 페이지' }),
      h('optgroup', { label: '기존 페이지 구성 복사' }, S.site.pages.map((p) => h('option', { value: 'copy:' + p.id, text: ko(p.navLabel) || p.id }))));
    const addNav = h('input', { type: 'checkbox', checked: true });
    nameEn.addEventListener('input', () => { if (!slug.dataset.touched) slug.value = nameEn.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); });
    slug.addEventListener('input', () => { slug.dataset.touched = '1'; });
    const err = h('div');
    box.append(h('h2', { text: '새 페이지' }),
      h('div', { class: 'f' }, h('label', { text: '메뉴 이름 (한국어)' }), nameKo),
      h('div', { class: 'f' }, h('label', { text: '메뉴 이름 (영어)' }), nameEn),
      h('div', { class: 'f' }, h('label', { text: '주소 (영문 소문자·숫자·-)' }), slug),
      h('div', { class: 'f' }, h('label', { text: '상위 페이지 (사업분야 아래에 두려면 ‘사업분야’ 선택)' }), parent),
      h('div', { class: 'f' }, h('label', { text: '시작 구성' }), tmpl),
      h('div', { class: 'f' }, h('label', { class: 'switch' }, addNav, h('span', { text: '최상위 페이지면 상단 메뉴에 추가' }))),
      err,
      h('div', { class: 'modal__foot' }, h('button', { class: 'btn', type: 'button', text: '취소', onclick: () => close() }),
        h('button', { class: 'btn btn--primary', type: 'button', text: '만들기', onclick: () => {
          const s = slug.value.trim();
          if (!nameKo.value.trim()) { err.replaceChildren(h('div', { class: 'notice notice--error', text: '메뉴 이름을 입력하세요.' })); return; }
          if (!/^[a-z0-9-]+$/.test(s)) { err.replaceChildren(h('div', { class: 'notice notice--error', text: '주소는 영문 소문자·숫자·-로 입력하세요.' })); return; }
          const id = uniqueId(s);
          const L = (k, e) => ({ ko: k, en: e });
          let sections = [];
          if (tmpl.value === 'basic') {
            sections = [
              { ...newSection('hero'), size: 'medium', title: L(nameKo.value, nameEn.value), eyebrow: L((nameEn.value || '').toUpperCase(), (nameEn.value || '').toUpperCase()), image: 'media/photos/mycelium-spawn.webp' },
              { ...newSection('statement'), title: L('제목을 입력하세요', 'Your headline'), text: L('내용을 입력하세요.', 'Write your text.') },
              clone(S.site.pages.find((p) => p.id === 'home')?.sections.find((x) => x.type === 'cta') || newSection('cta')),
            ];
          } else if (tmpl.value.startsWith('copy:')) {
            sections = clone(S.site.pages.find((p) => p.id === tmpl.value.slice(5)).sections || []);
          }
          close();
          mutate(() => {
            S.site.pages.push({ id, slug: s, parent: parent.value, navLabel: L(nameKo.value, nameEn.value), title: L(nameKo.value, nameEn.value), description: L('', ''), sections });
            if (addNav.checked && !parent.value) S.site.navigation.splice(Math.max(0, S.site.navigation.length - 1), 0, { page: id, children: false, button: false });
            S.view = 'page'; S.pageId = id; S.open = 0;
          });
          reloadPreview(false);
          toast('페이지를 만들었습니다. 저장하면 사이트에 반영됩니다.');
        } })));
    nameKo.focus();
  });
}

function duplicatePage(page) {
  const id = uniqueId(page.id + '-copy');
  mutate(() => {
    const c = clone(page);
    c.id = id; c.slug = id; c.navLabel = { ko: (ko(page.navLabel) || '') + ' (복사본)', en: (tx(page.navLabel, 'en') || '') + ' (copy)' };
    S.site.pages.splice(S.site.pages.indexOf(page) + 1, 0, c);
    S.pageId = id; S.open = -1;
  });
  reloadPreview(false);
}

function deletePage(page) {
  const json = JSON.stringify(S.site);
  const refs = (json.match(new RegExp(`"page:${page.id}(#[^"]*)?"`, 'g')) || []).length;
  const kids = S.site.pages.filter((p) => p.parent === page.id);
  const msg = `"${ko(page.navLabel)}" 페이지를 삭제할까요?` + (refs ? `\n이 페이지로 연결된 링크 ${refs}개는 ‘연결 없음’으로 바뀝니다.` : '') + (kids.length ? `\n하위 페이지 ${kids.length}개는 최상위로 옮겨집니다.` : '');
  if (!confirm(msg)) return;
  mutate(() => {
    const strip = (o) => {
      if (Array.isArray(o)) o.forEach(strip);
      else if (o && typeof o === 'object') for (const k of Object.keys(o)) {
        if (typeof o[k] === 'string' && (o[k] === `page:${page.id}` || o[k].startsWith(`page:${page.id}#`))) o[k] = '';
        else strip(o[k]);
      }
    };
    S.site.pages = S.site.pages.filter((p) => p !== page);
    for (const k of kids) k.parent = '';
    S.site.navigation = S.site.navigation.filter((n) => n.page !== page.id);
    strip(S.site);
    S.pageId = 'home'; S.open = -1;
  });
  reloadPreview(false);
}

function viewSite() {
  return [head('사이트 정보', '회사 정보, 브랜드 색, 검색·공유 설정. 모든 페이지에 공통으로 적용됩니다.'), h('div', { id: 'notices' }),
    SITE_FIELDS.map((g, i) => h('details', { class: 'box', open: i === 0 }, h('summary', { text: g.group }), h('div', { class: 'box__body' }, fieldsEl(g.fields, S.site))))];
}

function viewNav() {
  const nav = S.site.navigation || (S.site.navigation = []);
  return [head('메뉴 구성', '상단 메뉴와 하단(푸터) 메뉴에 표시할 페이지와 순서입니다.'),
    h('div', { class: 'notice notice--info', text: '‘하위 메뉴 자동 표시’를 켜면 그 페이지를 상위 페이지로 지정한 페이지들이 드롭다운으로 나옵니다. 마지막 항목을 ‘버튼 모양’으로 두면 강조 버튼(예: 문의하기)이 됩니다.' }),
    h('div', { class: 'box' }, h('div', { class: 'box__body' }, fieldEl({ key: 'navigation', label: '메뉴 항목', type: 'list', itemLabel: 'page', fields: NAV_FIELDS }, S.site)))];
}

function viewNews() {
  const news = S.site.news || (S.site.news = []);
  return [head('소식', '홈과 ‘소식’ 페이지에 날짜순으로 표시됩니다.', h('button', { class: 'btn btn--primary btn--sm', type: 'button', text: '+ 새 소식', onclick: () => mutate(() => {
    const it = { date: new Date().toISOString().slice(0, 10), category: { ko: '공지', en: 'Notice' }, title: { ko: '', en: '' }, summary: { ko: '', en: '' }, image: '', link: '' };
    news.unshift(it); S.openItems.add(it);
  }) })),
  h('div', { class: 'box' }, h('div', { class: 'box__body' }, fieldEl({ key: 'news', label: '소식', type: 'list', itemLabel: 'title', fields: [...NEWS_FIELDS, { key: 'hidden', label: '숨기기', type: 'toggle' }] }, S.site, { onEdit: scheduleSide })))];
}

function viewMedia() {
  let filter = '';
  const host = h('div');
  const paint = () => host.replaceChildren(mediaGrid(S.media, { filter }));
  paint();
  return [head('미디어', `사진과 파일 ${S.media.length}개 · content/media 폴더`, h('button', { class: 'btn btn--sm', type: 'button', text: '폴더 열기', onclick: () => api('/api/open-folder', { method: 'POST', body: JSON.stringify({ which: 'media' }) }).then(() => toast('폴더를 열었습니다.')) })),
    dropZone(async (files) => { await uploadFiles(files); render(); }, ''),
    h('input', { class: 'in', placeholder: '파일 이름으로 찾기', oninput: (e) => { filter = e.target.value; paint(); }, style: { marginBottom: '12px' } }),
    host];
}

function viewHistory() {
  const rows = S.history.map((x) => {
    const m = x.name.match(/site-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
    const when = m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}` : x.name;
    return h('div', { class: 'hist__row' }, h('span', {}, h('b', { text: when }), h('span', { class: 'muted', text: `  ·  ${fmtSize(x.size)}` })),
      h('button', { class: 'btn btn--sm', type: 'button', text: '이 시점으로 불러오기', onclick: async () => {
        if (!confirm(`${when} 저장본을 불러올까요?\n지금 편집 내용은 ‘되돌리기’로 복구할 수 있고, 저장해야 사이트에 반영됩니다.`)) return;
        const data = await api('/api/history/file?name=' + encodeURIComponent(x.name));
        mutate(() => { S.site = typeof data === 'string' ? JSON.parse(data) : data; S.view = 'page'; S.pageId = 'home'; S.open = -1; });
        reloadPreview(false);
        toast('불러왔습니다. 확인 후 저장하세요.');
      } }));
  });
  return [head('저장 기록', '저장할 때마다 직전 내용이 자동 보관됩니다(최근 80개).', h('button', { class: 'btn btn--sm', type: 'button', text: '폴더 열기', onclick: () => api('/api/open-folder', { method: 'POST', body: JSON.stringify({ which: 'history' }) }) })),
    rows.length ? h('div', { class: 'hist' }, rows) : h('p', { class: 'muted', text: '아직 저장 기록이 없습니다.' })];
}

function viewDeploy() {
  const out = h('div', { class: 'f__help' });
  const domain = (S.site.meta?.siteUrl || 'https://www.mycogen.co.kr').replace(/\/$/, '');
  return [head('게시·배포', '편집한 내용을 실제 홈페이지(' + domain.replace(/^https?:\/\//, '') + ')에 올리는 방법입니다.'),
    h('div', { id: 'notices' }),
    isDirty() ? h('div', { class: 'notice notice--warn', text: '저장하지 않은 변경사항은 게시본에 포함되지 않습니다. 먼저 저장하세요.' }) : null,
    h('div', { class: 'box' }, h('div', { class: 'box__head', text: '1. 사이트 만들기' }), h('div', { class: 'box__body' },
      h('p', { class: 'muted', text: '저장할 때마다 자동으로 만들어집니다. 결과물은 mycogen/dist 폴더입니다.' }),
      h('div', { class: 'row' },
        h('button', { class: 'btn btn--primary btn--sm', type: 'button', text: '지금 다시 만들기', onclick: async () => {
          try { const r = await api('/api/build', { method: 'POST' }); out.textContent = `완료: ${r.pages}개 페이지 · ${r.ms}ms`; toast('사이트를 만들었습니다.'); } catch (e) { out.textContent = e.message; toast(e.message, true); }
        } }),
        h('button', { class: 'btn btn--sm', type: 'button', text: '완성본 새 창으로 보기', onclick: () => window.open('/site/', '_blank') }),
        h('button', { class: 'btn btn--sm', type: 'button', text: 'dist 폴더 열기', onclick: () => api('/api/open-folder', { method: 'POST', body: JSON.stringify({ which: 'dist' }) }).then(() => toast('폴더를 열었습니다.')) })),
      out)),
    h('div', { class: 'box' }, h('div', { class: 'box__head', text: '2. 호스팅에 올리기' }), h('div', { class: 'box__body' },
      h('p', {}, h('a', { class: 'btn btn--primary btn--sm', href: '/api/export', download: '', text: '배포용 ZIP 내려받기' })),
      h('ol', { class: 'steps-guide' },
        h('li', {}, h('b', { text: '가비아·카페24 웹호스팅 (FTP)' }), h('br'), 'FileZilla 등 FTP 프로그램으로 접속해 ', h('code', { text: 'dist' }), ' 폴더 안의 파일 전체를 웹 루트(', h('code', { text: 'www' }), ' 또는 ', h('code', { text: 'public_html' }), ')에 올립니다. ', h('code', { text: '.htaccess' }), ' 파일도 함께 올리세요.'),
        h('li', {}, h('b', { text: 'Netlify / Cloudflare Pages (무료)' }), h('br'), '관리 화면에서 새 사이트를 만들고 ZIP을 풀어 나온 폴더를 끌어다 놓으면 바로 게시됩니다. 이후 도메인을 연결합니다.'))),
    ),
    h('div', { class: 'box' }, h('div', { class: 'box__head', text: '3. 도메인 연결 (mycogen.co.kr)' }), h('div', { class: 'box__body' },
      h('ol', { class: 'steps-guide' },
        h('li', { text: '도메인을 산 곳(가비아·후이즈 등)의 DNS 관리 화면을 엽니다.' }),
        h('li', { text: '호스팅 업체가 알려 준 값으로 www 레코드(CNAME 또는 A)를 등록합니다.' }),
        h('li', { text: 'mycogen.co.kr(www 없는 주소)은 www.mycogen.co.kr로 이동하도록 설정합니다.' }),
        h('li', { text: '호스팅 관리 화면에서 무료 SSL(https)을 켭니다.' })))),
    h('div', { class: 'box' }, h('div', { class: 'box__head', text: '4. 검색 엔진 등록' }), h('div', { class: 'box__body' },
      h('ol', { class: 'steps-guide' },
        h('li', {}, h('b', { text: '네이버 서치어드바이저' }), h('br'), '사이트 등록 → ‘HTML 태그’ 방식 인증 코드를 복사 → 이 편집기 ‘사이트 정보 → 검색·공유 → 네이버 인증 코드’에 붙여 넣고 저장·재배포 → 인증 → 요청 › 사이트맵 제출에 ', h('code', { text: domain + '/sitemap.xml' })),
        h('li', {}, h('b', { text: 'Google Search Console' }), h('br'), '같은 방법으로 ‘구글 인증 코드’를 넣고 사이트맵을 제출합니다.'),
        h('li', {}, h('b', { text: '방문 통계(선택)' }), h('br'), 'GA4 측정 ID(G-로 시작)를 ‘사이트 정보’에 넣으면 모든 페이지에 자동 적용됩니다.')))),
    h('div', { class: 'box' }, h('div', { class: 'box__head', text: '5. 문의 양식 자동 접수(선택)' }), h('div', { class: 'box__body' },
      h('p', { text: '기본 설정에서는 방문자의 이메일 앱이 열려 대표 이메일로 보내집니다. 이메일 앱 없이 바로 접수하려면 Formspree(formspree.io)에서 양식을 만들고 발급된 주소(https://formspree.io/f/…)를 ‘사이트 정보 → 문의 전송 주소’에 넣으세요.' }))),
  ];
}

// ---------------------------------------------------------------- render
function render() {
  renderSide();
  const panel = $('#panel');
  const views = { page: viewPage, site: viewSite, nav: viewNav, news: viewNews, media: viewMedia, history: viewHistory, deploy: viewDeploy };
  const y = panel.scrollTop;
  const sameView = panel.dataset.view === `${S.view}:${S.pageId}`;
  panel.replaceChildren(...[(views[S.view] || viewPage)()].flat(Infinity).filter(Boolean));
  panel.dataset.view = `${S.view}:${S.pageId}`;
  if (sameView) panel.scrollTop = y;
  renderNotices();
  updateTop();
  if (S.view === 'media' && !S.media.length) loadMedia().then(() => S.view === 'media' && render());
  if (S.view === 'history' && !S._historyLoaded) { S._historyLoaded = true; api('/api/history').then((l) => { S.history = l; if (S.view === 'history') render(); }); }
  if (S.view !== 'history') S._historyLoaded = false;
}

// ---------------------------------------------------------------- save / quit
async function save() {
  commitTyping();
  if (!isDirty()) return;
  const btn = $('#save'); btn.disabled = true;
  try {
    const r = await api('/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(S.site) });
    S.saved = JSON.stringify(S.site);
    S.errors = []; S.warnings = r.warnings || [];
    toast(`저장했습니다 · 사이트 ${r.build?.pages || 0}쪽을 새로 만들었습니다.`);
  } catch (e) {
    S.errors = e.body?.errors || [e.message];
    toast('저장하지 못했습니다: ' + (S.errors[0] || e.message), true);
  }
  updateTop(); renderNotices();
}

async function quit() {
  if (isDirty() && !confirm('저장하지 않은 변경사항이 있습니다. 그래도 종료할까요?')) return;
  if (!isDirty() && !confirm('편집기를 종료할까요?')) return;
  await api('/api/quit', { method: 'POST' }).catch(() => {});
  S.saved = JSON.stringify(S.site);
  document.body.replaceChildren(h('div', { style: { display: 'grid', placeItems: 'center', height: '100vh', textAlign: 'center' } },
    h('div', {}, h('h2', { text: '편집기를 종료했습니다.' }), h('p', { class: 'muted', text: '이 탭을 닫아도 됩니다. 다시 편집하려면 실행 파일을 더블클릭하세요.' }))));
}

// ---------------------------------------------------------------- boot
async function boot() {
  const text = await api('/api/content');
  S.site = typeof text === 'string' ? JSON.parse(text) : text;
  S.saved = S.last = JSON.stringify(S.site);
  render();
  syncSeg();
  layoutPreview();
  new ResizeObserver(layoutPreview).observe($('#pvStage'));
  reloadPreview(false);
  pushDraft();
  loadMedia();

  $('#save').onclick = save;
  $('#undo').onclick = undo;
  $('#redo').onclick = redo;
  $('#discard').onclick = () => { if (confirm('마지막 저장 이후의 변경을 모두 취소할까요?')) mutate(() => { S.site = JSON.parse(S.saved); }); };
  $('#pvReload').onclick = () => pushDraft();
  $('#pvOpen').onclick = () => window.open(previewPath() || '/preview/', '_blank');
  $('#pvLang').onclick = (e) => { const v = e.target.dataset.v; if (!v) return; S.lang = v; syncSeg(); reloadPreview(true); };
  $('#pvDevice').onclick = (e) => { const v = e.target.dataset.v; if (!v) return; S.device = v; syncSeg(); layoutPreview(); };
  $('#pvFrame').addEventListener('load', () => {
    layoutPreview();
    try { $('#pvFrame').contentWindow.scrollTo({ top: S.restoreY, behavior: 'instant' }); } catch { /* ignore */ }
  });

  // small screens: toggle between form and preview
  const pvToggle = h('button', { class: 'btn btn--ghost pv-toggle', type: 'button', text: '미리보기', onclick: () => { $('#app').classList.toggle('pv-only'); pvToggle.textContent = $('#app').classList.contains('pv-only') ? '편집 화면' : '미리보기'; layoutPreview(); } });
  if (window.matchMedia('(max-width: 1180px)').matches) $('.top__actions').prepend(pvToggle);

  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if (mod && !typing && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    if (mod && !typing && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
  });
  window.addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
}

boot().catch((e) => {
  document.body.replaceChildren(h('div', { style: { padding: '40px' } }, h('h2', { text: '편집기를 열 수 없습니다.' }), h('p', { text: e.message }), h('p', { class: 'muted', text: '편집기 실행 창(검은 창)이 켜져 있는지 확인하세요.' })));
});
