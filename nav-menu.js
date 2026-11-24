/* Phones: the top bar only fits "Prasanna" and "Book a call", so add a Menu button that opens every section. */
(() => {
  const nav = document.querySelector('.nav'); if (!nav) return;
  // the sections: the bar's own links, plus the ones added later (Right now, Writing, Gallery) when they are on the page
  const links = [...nav.querySelectorAll('a[href^="#"]')].filter(a => !a.classList.contains('me') && !a.classList.contains('cta')).map(a => [a.getAttribute('href'), a.textContent.trim()]);
  [['#now', 'Right now', '#play'], ['#writing', 'Writing', '#play'], ['#gallery', 'Gallery', '#play']].forEach(([href, name, before]) => {
    if (links.some(l => l[0] === href) || !document.querySelector(href)) return;
    const i = links.findIndex(l => l[0] === before); links.splice(i < 0 ? links.length : i, 0, [href, name]);
  });

  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'navmenu'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Menu'); btn.setAttribute('aria-controls', 'navsheet');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 9h14M5 15h14"/></svg><span>Menu</span>';
  const cta = nav.querySelector('.cta'); nav.insertBefore(btn, cta || null);

  const sheet = document.createElement('div'); sheet.id = 'navsheet'; sheet.className = 'navsheet'; sheet.hidden = true;
  sheet.innerHTML = links.map(([href, name]) => '<a href="' + href + '">' + name + '</a>').join('');
  document.body.appendChild(sheet);

  const show = open => {
    // hidden sections (like Writing before the first post) are left out
    sheet.querySelectorAll('a').forEach(a => { const t = document.querySelector(a.getAttribute('href')); a.hidden = !t || t.hidden; });
    sheet.hidden = !open; btn.setAttribute('aria-expanded', open); btn.classList.toggle('on', open);
  };
  btn.onclick = e => { e.stopPropagation(); show(sheet.hidden); };
  sheet.addEventListener('click', e => { if (e.target.closest('a')) show(false); });
  document.addEventListener('click', e => { if (!sheet.hidden && !sheet.contains(e.target)) show(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') show(false); });
  addEventListener('scroll', () => { if (!sheet.hidden) show(false); }, { passive: true });
})();
