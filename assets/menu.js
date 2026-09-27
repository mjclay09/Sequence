// Site menu: builds the dropdown from one list so every page stays in sync.
(() => {
  const btn = document.querySelector('.menu-btn');
  if (!btn) return;
  const ICONS = {
    quiz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
    learn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20"/></svg>',
    app: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M12 7v7M9 11l3 3 3-3M10.5 18.5h3"/></svg>',
    calc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8.5 7h7M8.5 11h1M12 11h1M15.5 11h0M8.5 14.5h1M12 14.5h1M8.5 18h1M12 18h1M15.5 14.5V18"/></svg>',
  };
  const ITEMS = [
    { href: '/', key: 'quiz', title: 'Find my stack', sub: 'The 8-question goal quiz' },
    { href: '/peptides/', key: 'learn', title: 'Peptides Simplified', sub: 'What studies show, in plain English' },
    { href: '/calculator/', key: 'calc', title: 'Mixing calculator', sub: 'How many units to draw' },
  ];
  const path = location.pathname;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let installEvt = null;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });
  const isCurrent = (h) => (h === '/' ? path === '/' || path === '/index.html' : path.startsWith(h));

  const scrim = document.createElement('div');
  scrim.className = 'menu-scrim';
  const panel = document.createElement('nav');
  panel.className = 'menu-panel';
  panel.id = 'site-menu';
  panel.setAttribute('aria-label', 'Site menu');
  panel.innerHTML = ITEMS.map((it) => `<a class="menu-item" href="${it.href}"${isCurrent(it.href) ? ' aria-current="page"' : ''}>
      <span class="ic" aria-hidden="true">${ICONS[it.key]}</span>
      <span><b>${it.title}</b><small>${it.sub}</small></span>
      <span class="arrow" aria-hidden="true">→</span></a>`).join('')
    + (standalone ? '' : `<button type="button" class="menu-item menu-install"><span class="ic" aria-hidden="true">${ICONS.app}</span><span><b>Get the app</b><small>Add North Star to your home screen</small></span><span class="arrow" aria-hidden="true">+</span></button><p class="menu-help" hidden></p>`)
    + '<p class="menu-foot">North Star Peptide · Your compass for peptide research.</p>';
  document.body.append(scrim, panel);
  btn.setAttribute('aria-controls', 'site-menu');
  btn.setAttribute('aria-expanded', 'false');

  const links = () => [...panel.querySelectorAll('a, .menu-install')];
  const inst = panel.querySelector('.menu-install'), help = panel.querySelector('.menu-help');
  if (inst) inst.addEventListener('click', async () => {
    if (installEvt) { installEvt.prompt(); await installEvt.userChoice.catch(() => {}); installEvt = null; setOpen(false, true); return; }
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    help.textContent = ios
      ? 'In Safari, tap the Share button (the square with an arrow), then choose “Add to Home Screen”.'
      : 'Open your browser menu (⋮) and choose “Install app” or “Add to Home screen”.';
    help.hidden = false;
  });
  function setOpen(open, focusBtn) {
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    panel.classList.toggle('open', open);
    scrim.classList.toggle('open', open);
    if (open) links()[0]?.focus({ preventScroll: true });
    else if (focusBtn) btn.focus({ preventScroll: true });
  }
  btn.addEventListener('click', () => setOpen(btn.getAttribute('aria-expanded') !== 'true'));
  scrim.addEventListener('click', () => setOpen(false, true));
  panel.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (a && isCurrent(a.getAttribute('href'))) { e.preventDefault(); setOpen(false, true); }
  });
  document.addEventListener('keydown', (e) => {
    if (btn.getAttribute('aria-expanded') !== 'true') return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false, true); }
    if (e.key === 'Tab') {
      const f = [...links(), btn]; const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  }, true);
})();

// Offline support + installable app.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
