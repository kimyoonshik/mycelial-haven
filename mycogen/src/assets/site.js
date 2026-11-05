/* Mycogen — site behaviour: header, mobile menu, reveal, contact form. */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');

  // Opened straight from a folder (double-clicking index.html): browsers do not turn
  // "company/" into "company/index.html" there, so every menu link would open a folder.
  if (location.protocol === 'file:') {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (/^([a-z]+:|#|\/\/)/i.test(href)) return;
      var hash = '';
      var i = href.indexOf('#');
      if (i >= 0) { hash = href.slice(i); href = href.slice(0, i); }
      if (href === '' || href === '.' || href === './') href = './';
      if (href.slice(-1) === '/') a.setAttribute('href', href + 'index.html' + hash);
    });
  }

  var hdr = document.querySelector('[data-hdr]');
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle('is-scrolled', window.scrollY > 24); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var burger = hdr.querySelector('.burger');
    if (burger) {
      burger.addEventListener('click', function () {
        var open = !hdr.classList.contains('is-open');
        hdr.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', String(open));
        document.body.style.overflow = open ? 'hidden' : '';
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && hdr.classList.contains('is-open')) burger.click();
      });
    }
    hdr.querySelectorAll('.nav__toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.nav__item');
        var open = !item.classList.contains('is-open');
        item.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  }

  // reveal on scroll
  var targets = document.querySelectorAll('.sec__head, .grid > *, .split__body, .split__media, .step, .stat, .specs, .news__item, .band__tile, .cta, .contact > *, .prose');
  if ('IntersectionObserver' in window && !document.body.classList.contains('is-preview')) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    var vh = window.innerHeight;
    window.addEventListener('beforeprint', function () { targets.forEach(function (el) { el.classList.add('is-in'); }); });
    targets.forEach(function (el) {
      var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      if (el.getBoundingClientRect().top < vh * 0.92) return; // already on screen: show immediately
      el.setAttribute('data-reveal', '');
      el.style.setProperty('--d', Math.min(sib, 5) * 0.08 + 's');
      io.observe(el);
    });
  }

  // contact form: posts to an endpoint when configured, otherwise opens the mail app
  document.querySelectorAll('form[data-contact]').forEach(function (form) {
    var status = form.querySelector('.form__status');
    var ko = form.getAttribute('data-lang') === 'ko';
    var say = function (msg, kind) { status.textContent = msg; status.className = 'form__status ' + (kind ? 'is-' + kind : ''); };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = null;
      form.querySelectorAll('[required]').forEach(function (el) {
        var ok = el.type === 'checkbox' ? el.checked : el.value.trim() !== '' && (el.type !== 'email' || /.+@.+\..+/.test(el.value));
        var field = el.closest('.field');
        if (field) field.classList.toggle('is-invalid', !ok);
        if (!ok && !bad) bad = el;
      });
      if (bad) {
        say(bad.type === 'checkbox'
          ? (ko ? '개인정보 수집·이용에 동의해 주세요.' : 'Please agree to the privacy notice.')
          : (ko ? '필수 항목을 확인해 주세요.' : 'Please check the required fields.'), 'error');
        bad.focus();
        return;
      }
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = String(v); });
      var endpoint = form.getAttribute('data-endpoint');
      var email = form.getAttribute('data-email');
      if (endpoint) {
        say(ko ? '보내는 중…' : 'Sending…');
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); say(ko ? '문의가 접수되었습니다. 빠르게 회신드리겠습니다.' : 'Thank you. We will get back to you shortly.', 'ok'); })
          .catch(function () { say(ko ? '전송에 실패했습니다. ' + (email ? email + ' 로 메일을 보내 주세요.' : '') : 'Sending failed. ' + (email ? 'Please email ' + email + '.' : ''), 'error'); });
        return;
      }
      if (!email) { say(ko ? '문의 수신 이메일이 설정되지 않았습니다.' : 'No inquiry address is configured.', 'error'); return; }
      var subject = (ko ? '[홈페이지 문의] ' : '[Website inquiry] ') + (data.topic ? data.topic + ' - ' : '') + (data.company || data.name);
      var body = [
        (ko ? '성함: ' : 'Name: ') + data.name,
        (ko ? '회사: ' : 'Company: ') + (data.company || '-'),
        (ko ? '이메일: ' : 'Email: ') + data.email,
        (ko ? '연락처: ' : 'Phone: ') + (data.phone || '-'),
        (ko ? '유형: ' : 'Topic: ') + (data.topic || '-'),
        '',
        data.message,
      ].join('\n');
      window.location.href = 'mailto:' + email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      say(ko ? '이메일 앱이 열립니다. 내용을 확인한 뒤 보내기를 눌러 주세요.' : 'Your mail app will open. Review and press send.', 'ok');
    });
  });
})();
