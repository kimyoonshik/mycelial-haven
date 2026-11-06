/* Loaded only in the editor's preview build. Click a section to edit it; the editor can ask us to highlight one. */
(function () {
  'use strict';
  if (window.parent === window) return;
  document.addEventListener('click', function (e) {
    if (e.target.closest('video')) return; // video controls work in the preview
    var a = e.target.closest('a');
    var sec = e.target.closest('[data-edit]');
    if (a && !e.altKey) {
      var href = a.getAttribute('href') || '';
      if (/^(https?:|mailto:|tel:)/.test(href)) { e.preventDefault(); return; }
      if (!sec || e.target.closest('.hdr, .ftr')) return; // let internal navigation work in header/footer
    }
    if (!sec) return;
    e.preventDefault();
    window.parent.postMessage({ type: 'mycogen:select', edit: sec.getAttribute('data-edit') }, '*');
  }, true);
  document.addEventListener('submit', function (e) { e.preventDefault(); }, true);
  window.addEventListener('message', function (e) {
    var m = e.data || {};
    if (m.type !== 'mycogen:highlight') return;
    document.querySelectorAll('[data-edit].is-selected').forEach(function (el) { el.classList.remove('is-selected'); });
    var el = document.querySelector('[data-edit="' + m.edit + '"]');
    if (el) { el.classList.add('is-selected'); if (m.scroll) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  window.parent.postMessage({ type: 'mycogen:loaded', path: location.pathname }, '*');
})();
