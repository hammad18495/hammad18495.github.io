(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
  };

  /* theme */
  const root = document.documentElement;
  $('.theme-toggle')?.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    store.set('theme', next);
  });

  /* nav: scrolled state, progress, mobile menu */
  const nav = $('.nav'), bar = $('.progress'), top = $('.to-top');
  const onScroll = () => {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    nav?.classList.toggle('scrolled', y > 10);
    if (bar) bar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    top?.classList.toggle('show', y > 600);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  top?.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
  $('.menu-btn')?.addEventListener('click', e => {
    const open = nav.classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', open);
  });
  $$('.nav-links a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  addEventListener('keydown', e => { if (e.key === 'Escape') nav?.classList.remove('open'); });

  /* page transitions between internal pages */
  document.body.classList.add('page-enter');
  if (!reduce) {
    $$('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || a.target === '_blank' || a.hasAttribute('download') || /^https?:/.test(href)) return;
      a.addEventListener('click', e => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
        e.preventDefault();
        document.body.classList.add('leaving');
        setTimeout(() => (location.href = a.href), 220);
      });
    });
  }
  addEventListener('pageshow', e => { if (e.persisted) document.body.classList.remove('leaving'); });

  /* reveal on scroll */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* counters */
  const fmt = n => n >= 1000 ? Math.round(n).toLocaleString('en-US') : Math.round(n);
  const cio = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, end = +el.dataset.count, suf = el.dataset.suffix || '';
      cio.unobserve(el);
      if (reduce) { el.textContent = fmt(end) + suf; return; }
      const t0 = performance.now(), dur = 1600;
      const tick = t => {
        const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(end * e) + suf;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.5 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* typed roles */
  const typed = $('.typed');
  if (typed) {
    const words = JSON.parse(typed.dataset.words);
    if (reduce) typed.textContent = words[0];
    else {
      let w = 0, i = 0, del = false;
      const loop = () => {
        const word = words[w];
        typed.textContent = word.slice(0, i);
        if (!del && i < word.length) { i++; setTimeout(loop, 65); }
        else if (!del) { del = true; setTimeout(loop, 1700); }
        else if (i > 0) { i--; setTimeout(loop, 32); }
        else { del = false; w = (w + 1) % words.length; setTimeout(loop, 300); }
      };
      loop();
    }
  }

  /* cursor glow on cards */
  $$('.card').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', e.clientX - r.left + 'px');
    c.style.setProperty('--my', e.clientY - r.top + 'px');
  }));

  /* portrait tilt */
  const frame = $('.tilt');
  if (frame && !reduce && matchMedia('(hover:hover)').matches) {
    const wrap = frame.parentElement;
    wrap.addEventListener('pointermove', e => {
      const r = wrap.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      frame.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    });
    wrap.addEventListener('pointerleave', () => (frame.style.transform = ''));
  }

  /* typed code window */
  const code = $('#code-typed');
  if (code) {
    const src = $('#code-src').innerHTML.trim();
    if (reduce) code.innerHTML = src;
    else {
      const cio2 = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return; cio2.disconnect();
        // tokenise html so tags are inserted whole
        const parts = src.match(/<[^>]+>|&[a-z]+;|[\s\S]/g);
        let i = 0, out = '';
        const step = () => {
          for (let k = 0; k < 3 && i < parts.length; k++) out += parts[i++];
          code.innerHTML = out + '<span class="caret"></span>';
          if (i < parts.length) setTimeout(step, 14); else code.innerHTML = out;
        };
        step();
      }, { threshold: .3 });
      cio2.observe(code);
    }
  }

  /* experience expand */
  $$('.toggle-more').forEach(b => b.addEventListener('click', () => {
    const item = b.closest('.tl-item');
    const open = item.classList.toggle('expanded');
    b.setAttribute('aria-expanded', open);
    b.querySelector('span').textContent = open ? 'Show less' : 'Show more';
  }));

  /* project filters */
  const filters = $$('.filter');
  filters.forEach(f => f.addEventListener('click', () => {
    filters.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-pressed', 'false'); });
    f.classList.add('active'); f.setAttribute('aria-pressed', 'true');
    const cat = f.dataset.filter;
    $$('.proj').forEach(p => {
      const show = cat === 'all' || p.dataset.cat.split(' ').includes(cat);
      p.classList.toggle('hide', !show);
      if (show) { p.classList.remove('in'); requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('in'))); }
    });
  }));

  /* project modal */
  const modal = $('#modal');
  let lastFocus;
  const openModal = id => {
    const tpl = $('#case-' + id); if (!tpl || !modal) return;
    lastFocus = document.activeElement;
    $('.modal-head h3', modal).textContent = tpl.dataset.title;
    $('.modal-head .eyebrow', modal).textContent = tpl.dataset.kicker;
    $('.modal-content', modal).innerHTML = tpl.innerHTML;
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('.modal-close', modal).focus();
    history.replaceState(null, '', '#' + id);
  };
  const closeModal = () => {
    if (!modal?.classList.contains('open')) return;
    modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    history.replaceState(null, '', location.pathname);
    lastFocus?.focus();
  };
  $$('.proj').forEach(p => {
    p.addEventListener('click', e => { if (e.target.closest('a[target=_blank]')) return; openModal(p.dataset.id); });
    p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(p.dataset.id); } });
  });
  modal?.addEventListener('click', e => { if (e.target.matches('.modal-backdrop, .modal-close, .modal-close *')) closeModal(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  if (modal && location.hash) openModal(location.hash.slice(1));

  /* toast + copy */
  const toast = msg => {
    let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200);
  };
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast('Copied to clipboard'); }
    catch { toast(b.dataset.copy); }
  }));

  /* contact form → sent via FormSubmit (free), falls back to email app */
  const form = $('#contact-form');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    let ok = true;
    $$('[required]', form).forEach(inp => {
      const f = inp.closest('.field');
      const bad = !inp.value.trim() || (inp.type === 'email' && !/^\S+@\S+\.\S+$/.test(inp.value));
      f.classList.toggle('invalid', bad); if (bad) ok = false;
    });
    if (!ok) { toast('Please fill in the highlighted fields'); return; }
    const d = Object.fromEntries(new FormData(form));
    if (d._honey) return; // bot
    const subject = `[Portfolio] ${d.topic} — ${d.name}`;
    const btn = $('button[type=submit]', form), label = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = 'Sending…';
    try {
      const r = await fetch('https://formsubmit.co/ajax/hammad18495@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: d.name, email: d.email, company: d.company || '-', topic: d.topic, message: d.message,
          _subject: subject, _replyto: d.email, _template: 'table', _captcha: 'false' })
      });
      const res = await r.json().catch(() => ({}));
      if (!r.ok || String(res.success) === 'false') throw new Error(res.message || 'send failed');
      form.reset(); $('#form-error').hidden = true;
      $('#form-success').hidden = false; form.hidden = true;
      toast('Message sent. Thank you!');
    } catch (err) {
      // Don't force a desktop mail app: show options inline and keep what they typed
      const body = `${d.message}\n\n— ${d.name}${d.company ? ', ' + d.company : ''}\n${d.email}`;
      const box = $('#form-error');
      $('#gmail-link', box).href = `https://mail.google.com/mail/?view=cm&fs=1&to=hammad18495@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      $('#mailto-link', box).href = `mailto:hammad18495@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      box.hidden = false;
      box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    } finally { btn.disabled = false; btn.innerHTML = label; }
  });
  $('#send-another')?.addEventListener('click', () => { $('#form-success').hidden = true; form.hidden = false; });
  $$('#contact-form input, #contact-form textarea').forEach(i => i.addEventListener('input', () => i.closest('.field')?.classList.remove('invalid')));

  /* year */
  $$('.year').forEach(y => (y.textContent = new Date().getFullYear()));
})();
