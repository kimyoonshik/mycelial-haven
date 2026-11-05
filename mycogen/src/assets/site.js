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

  // Living mycelium on the hero: hyphae grow from the edges, branch, carry glowing
  // nutrient pulses, then fade and grow again. Static drawing stays for reduced motion.
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && window.HTMLCanvasElement) {
    document.querySelectorAll('.hero__net').forEach(function (holder) { growMycelium(holder); });
  }

  function growMycelium(holder) {
    var net = document.createElement('canvas');
    var glow = document.createElement('canvas');
    var nc = net.getContext('2d');
    var gc = glow.getContext('2d');
    if (!nc || !gc) return;
    holder.appendChild(net);
    holder.appendChild(glow);
    holder.classList.add('is-live');

    var W = 0, H = 0, small = false;
    var tips = [], paths = [], pulses = [];
    var phase = 'grow', phaseTime = 0, pulseClock = 0, running = false, last = 0, raf = 0;
    var R = Math.random;
    var SPEED = 3;     // growth speed (1 = original pace)
    var HOLD = 1800;   // ms the grown network rests before fading
    var FADE = 1800;   // ms to fade out; then it grows again, forever

    function size() {
      var r = holder.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      small = W < 760;
      var dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);
      [net, glow].forEach(function (c) {
        c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
        c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
      });
      nc.lineCap = 'round'; nc.lineJoin = 'round';
    }

    function tip(x, y, a, w, life, depth) {
      var path = [[x, y]];
      paths.push(path);
      return { x: x, y: y, a: a, w: w, life: life, depth: depth, path: path, n: 0, curl: (R() - 0.5) * 0.02 };
    }

    function seed() {
      tips = []; paths = []; pulses = [];
      var count = small ? 7 : 12;
      for (var i = 0; i < count; i++) {
        var side = i % 4; // left, right, bottom, top
        var x = side === 0 ? -8 : side === 1 ? W + 8 : W * (0.08 + R() * 0.84);
        var y = side === 2 ? H + 8 : side === 3 ? -8 : H * (0.08 + R() * 0.86);
        var a = side === 0 ? (R() - 0.5) * 0.9 : side === 1 ? Math.PI + (R() - 0.5) * 0.9
          : side === 2 ? -Math.PI / 2 + (R() - 0.5) * 1.1 : Math.PI / 2 + (R() - 0.5) * 1.1;
        tips.push(tip(x, y, a, 1.5 + R() * 0.6, (720 + R() * 420) / SPEED, 0));
      }
      phase = 'grow'; phaseTime = 0;
    }

    function stepTips(draw) {
      var maxTips = small ? 38 : 70;
      var speed = (small ? 1.05 : 1.35) * SPEED;
      for (var i = tips.length - 1; i >= 0; i--) {
        var t = tips[i];
        t.a += (R() - 0.5) * 0.55 + t.curl * SPEED;
        var nx = t.x + Math.cos(t.a) * speed;
        var ny = t.y + Math.sin(t.a) * speed;
        if (draw) {
          nc.strokeStyle = 'rgba(255,255,255,' + (0.4 + t.w * 0.2).toFixed(2) + ')';
          nc.lineWidth = t.w;
          nc.beginPath(); nc.moveTo(t.x, t.y); nc.lineTo(nx, ny); nc.stroke();
        }
        t.x = nx; t.y = ny; t.life--; t.n++;
        t.path.push([nx, ny]);
        if (t.depth < 4 && tips.length < maxTips && R() < 0.011 * SPEED) {
          var side = R() < 0.5 ? -1 : 1;
          tips.push(tip(nx, ny, t.a + side * (0.45 + R() * 0.75), Math.max(0.5, t.w * 0.7), t.life * (0.45 + R() * 0.35), t.depth + 1));
        }
        if (t.life <= 0 || nx < -60 || ny < -60 || nx > W + 60 || ny > H + 60) tips.splice(i, 1);
      }
    }

    function drawGlow(dt) {
      gc.clearRect(0, 0, W, H);
      var fade = phase === 'fade' ? Math.max(0, 1 - phaseTime / FADE) : 1;
      // growing tips
      gc.fillStyle = 'rgba(255,250,235,' + (0.85 * fade).toFixed(2) + ')';
      for (var i = 0; i < tips.length; i++) {
        gc.beginPath(); gc.arc(tips[i].x, tips[i].y, 1.2 + tips[i].w * 0.5, 0, 6.283); gc.fill();
      }
      // nutrient pulses travelling along grown hyphae
      pulseClock += dt;
      var maxPulses = small ? 7 : 14;
      if (phase !== 'fade' && pulseClock > 260 && pulses.length < maxPulses) {
        pulseClock = 0;
        var p = paths[Math.floor(R() * paths.length)];
        if (p && p.length > 14) pulses.push({ path: p, i: 0, v: 0.18 + R() * 0.22, r: 1.8 + R() * 1.6 });
      }
      gc.shadowColor = 'rgba(255,196,96,0.9)';
      gc.shadowBlur = 10;
      for (var j = pulses.length - 1; j >= 0; j--) {
        var q = pulses[j];
        q.i += q.v * dt / 16;
        var k = Math.floor(q.i);
        if (k >= q.path.length - 1) { pulses.splice(j, 1); continue; }
        var f = q.i - k, a = q.path[k], b = q.path[k + 1];
        var life = Math.min(1, q.i / 4, (q.path.length - 1 - q.i) / 4);
        gc.fillStyle = 'rgba(255,214,150,' + (0.95 * life * fade).toFixed(2) + ')';
        gc.beginPath(); gc.arc(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, q.r, 0, 6.283); gc.fill();
      }
      gc.shadowBlur = 0;
    }

    function frame(now) {
      if (!running) return;
      var dt = Math.min(48, now - (last || now));
      last = now;
      phaseTime += dt;
      if (phase === 'grow') {
        var steps = Math.max(1, Math.round(dt / 16));
        for (var s = 0; s < steps; s++) stepTips(true);
        if (!tips.length || phaseTime > 12000) { phase = 'hold'; phaseTime = 0; tips = []; }
      } else if (phase === 'hold') {
        if (phaseTime > HOLD) { phase = 'fade'; phaseTime = 0; }
      } else if (phase === 'fade') {
        nc.globalCompositeOperation = 'destination-out';
        nc.fillStyle = 'rgba(0,0,0,' + Math.min(0.25, dt / (FADE / 4)).toFixed(3) + ')';
        nc.fillRect(0, 0, W, H);
        nc.globalCompositeOperation = 'source-over';
        if (phaseTime > FADE) { nc.clearRect(0, 0, W, H); seed(); }
      }
      drawGlow(dt);
      raf = requestAnimationFrame(frame);
    }

    function setRunning(on) {
      on = on && !document.hidden;
      if (on === running) return;
      running = on;
      if (on) { last = 0; raf = requestAnimationFrame(frame); } else cancelAnimationFrame(raf);
    }

    size();
    seed();
    for (var pre = 0; pre < Math.round(320 / SPEED); pre++) stepTips(true); // start with a network already spreading

    var visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; setRunning(visible); }).observe(holder);
    }
    document.addEventListener('visibilitychange', function () { setRunning(visible); });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var r = holder.getBoundingClientRect();
        if (Math.abs(r.width - W) < 40 && Math.abs(r.height - H) < 80) return;
        size(); seed();
        for (var pre2 = 0; pre2 < Math.round(200 / SPEED); pre2++) stepTips(true);
      }, 250);
    });
    setRunning(true);
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
