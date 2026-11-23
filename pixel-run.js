/* Pixel run: a little pixel character falls down the right edge as you scroll.
   Every section of the page is a level with someone waiting on a ledge.
   Pass a level and they cheer. Reach the bottom and the chest opens a secret game. */
(() => {
  if (document.documentElement.getAttribute('data-embed')) return;           // not inside the games pop-up
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const LEVELS = [['building', 'Building'], ['work', 'Work'], ['research', 'Research'], ['lead', 'Hobbies'], ['play', 'Games'], ['startups', 'Directory']]
    .map(([id, name]) => ({ el: document.getElementById(id), name })).filter(l => l.el);
  if (!LEVELS.length) return;

  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* ---------- pixel drawings (one letter = one pixel, "." = empty) ---------- */
  const HERO = ['..aaa..', '.aaaaa.', 'aakaaka', 'aaaaaaa', '.aaaaa.', '..a.a..', '.aa.aa.'];
  const PERSON = ['.hh.', '.ff.', 'ssss', '.ss.', '.ss.', '.l.l'];
  const CHEST = ['.wwwwww.', 'wggggggw', 'wwwyywww', 'wggggggw', 'wggggggw', 'wwwwwwww'];
  const CHEST_OPEN = ['yyyyyyyy', 'y.yyyy.y', 'wwwyywww', 'wggggggw', 'wggggggw', 'wwwwwwww'];
  const SHIRTS = ['#0a84ff', '#30d158', '#ff9f0a', '#bf5af2', '#ff453a', '#64d2ff'];
  const COLOURS = { a: '#f5f5f7', k: '#000', h: '#3a2a1a', f: '#f1c27d', l: '#8e8e93', w: '#7a4a22', g: '#b9773a', y: '#ffd60a' };

  /* ---------- the strip on the right edge ---------- */
  const cv = document.createElement('canvas'); cv.className = 'prun'; cv.setAttribute('aria-hidden', 'true');
  const toast = document.createElement('div'); toast.className = 'prt'; toast.setAttribute('aria-live', 'polite');
  const font = document.createElement('link'); font.rel = 'stylesheet'; font.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
  const css = document.createElement('style');
  css.textContent = '.prun{position:fixed;top:0;right:0;height:100vh;z-index:40;pointer-events:none;opacity:.9}' +
    '.prt{position:fixed;right:64px;z-index:41;pointer-events:none;padding:8px 10px;background:#000;color:#f5f5f7;border:2px solid #f5f5f7;font:9px/1.5 "Press Start 2P",monospace;white-space:nowrap;opacity:0;transform:translateX(8px);transition:opacity .25s,transform .25s}' +
    '.prt.on{opacity:1;transform:none}.prt b{color:#ffd60a;font-weight:400}' +
    '@media(max-width:720px){.prt{right:34px;font-size:7px;padding:6px 8px}}';
  document.head.append(font, css); document.body.append(cv, toast);
  const ctx = cv.getContext('2d');

  let W, H, PX, trackX, top, bottom, ratio = 1;
  const size = () => {
    const phone = innerWidth <= 720;
    W = phone ? 30 : 60; H = innerHeight; PX = phone ? 2 : 3; ratio = devicePixelRatio || 1;
    cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = W * ratio; cv.height = H * ratio;
    trackX = phone ? W - 10 : W - 22; top = phone ? 70 : 90; bottom = H - (phone ? 96 : 110);         // stays above the floating Book a call button
  };

  const sprite = (rows, x, y, colours) => {   // x, y = top-left in CSS pixels
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === '.') return; ctx.fillStyle = colours[ch] || COLOURS[ch];
      ctx.fillRect(Math.round(x + c * PX), Math.round(y + r * PX), PX, PX);
    }));
  };

  /* ---------- where each level sits on the track (0 = top of page, 1 = bottom) ---------- */
  const progress = () => { const max = document.documentElement.scrollHeight - innerHeight; return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0; };
  const levelAt = () => { const max = document.documentElement.scrollHeight - innerHeight;
    return LEVELS.map(l => Math.min(.97, Math.max(.03, (l.el.getBoundingClientRect().top + scrollY - innerHeight * .45) / max))); };
  size();                                                              // measure the strip before placing anything
  let marks = levelAt();
  const yOf = p => top + p * (bottom - top);

  /* ---------- game state ---------- */
  let heroY = yOf(progress()), trail = [], cleared = LEVELS.map(() => false), cheer = LEVELS.map(() => 0), opened = !!store.get('pixel-secret'), sparkle = 0, toastTimer;
  // levels already behind you when the page loads count as cleared, without a fuss
  marks.forEach((m, i) => { if (progress() >= m) cleared[i] = true; });

  const say = (html, y) => {
    toast.innerHTML = html; toast.style.top = Math.max(10, Math.min(innerHeight - 40, y - 14)) + 'px'; toast.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('on'), 1600);
  };

  const unlock = () => {
    opened = true; sparkle = 60; store.set('pixel-secret', '1');
    say('<b>SECRET UNLOCKED</b><br>SNAKE IS IN GAMES', bottom - 20);
    window.dispatchEvent(new Event('pixel-secret'));
  };

  const frame = () => {
    const p = progress(), target = yOf(p), before = heroY;
    heroY += (target - heroY) * .18;                                    // falls smoothly toward where you are
    if (Math.abs(heroY - before) > .6) trail.push({ y: heroY, life: 1 });
    trail = trail.filter(t => (t.life -= .045) > 0).slice(-18);

    marks.forEach((m, i) => {
      if (!cleared[i] && p >= m) { cleared[i] = true; cheer[i] = 40; if (innerWidth > 720) say('LEVEL ' + (i + 1) + ' · ' + LEVELS[i].name.toUpperCase() + ' <b>✓</b>', yOf(m)); }
      if (cleared[i] && p < m - .02) cleared[i] = false;                // scroll back up and you can clear it again
    });
    if (!opened && p > .985) unlock();

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, W, H);
    // the track: dashed pixels
    ctx.fillStyle = 'rgba(245,245,247,.14)';
    for (let y = top; y < bottom; y += PX * 3) ctx.fillRect(trackX - PX / 2, y, PX, PX);
    // the levels: a ledge with someone on it
    marks.forEach((m, i) => {
      const y = yOf(m), lx = trackX - PX * 9;
      ctx.fillStyle = cleared[i] ? '#30d158' : 'rgba(245,245,247,.3)'; ctx.fillRect(lx, y, PX * 7, PX);
      const jump = cheer[i] > 0 ? Math.abs(Math.sin(cheer[i] / 40 * Math.PI * 3)) * PX * 4 : 0; if (cheer[i] > 0) cheer[i]--;
      sprite(PERSON, lx + PX * 1.5, y - PX * 6 - jump, { s: SHIRTS[i % SHIRTS.length] });
    });
    // the chest at the bottom
    sprite(opened ? CHEST_OPEN : CHEST, trackX - PX * 4, bottom, {});
    if (sparkle > 0) { sparkle--; for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#ffd60a' : '#f5f5f7'; ctx.fillRect(trackX - PX * 6 + Math.random() * PX * 12, bottom - Math.random() * PX * 12, PX, PX); } }
    // the trail, then the hero on top
    trail.forEach(t => { ctx.fillStyle = 'rgba(10,132,255,' + (t.life * .7).toFixed(2) + ')'; ctx.fillRect(trackX - PX, t.y - PX * 2, PX * 2, PX * 2); });
    const falling = Math.abs(target - heroY) > 2;
    sprite(HERO, trackX - PX * 3.5, heroY - PX * (falling ? 8 : 7), {});
    requestAnimationFrame(frame);
  };

  addEventListener('resize', () => { size(); marks = levelAt(); });
  addEventListener('load', () => { marks = levelAt(); });
  setTimeout(() => { marks = levelAt(); }, 1500);                       // images and games change the page height
  requestAnimationFrame(frame);
})();
