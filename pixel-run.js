/* Scroll run: a small block falls down a hairline on the right edge as you scroll.
   Every section of the page is a level with a small figure waiting at a checkpoint.
   Pass a level and the figure turns green and hops. Reach the bottom and the lock opens a secret game.
   Drawn in the site's own style: thin lines, white, one green, the site font. */
(() => {
  if (document.documentElement.getAttribute('data-embed')) return;           // not inside the games pop-up
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const LEVELS = [['building', 'Building'], ['work', 'Work'], ['research', 'Research'], ['lead', 'Hobbies'], ['play', 'Games'], ['startups', 'Directory']]
    .map(([id, name]) => ({ el: document.getElementById(id), name })).filter(l => l.el);
  if (!LEVELS.length) return;

  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const WHITE = '#f5f5f7', GREEN = '#30d158';

  /* ---------- the strip on the right edge, and a pill for messages ---------- */
  const cv = document.createElement('canvas'); cv.className = 'prun'; cv.setAttribute('aria-hidden', 'true');
  const pill = document.createElement('div'); pill.className = 'prt'; pill.setAttribute('aria-live', 'polite');
  const css = document.createElement('style');
  css.textContent = '.prun{position:fixed;top:0;right:0;height:100vh;z-index:40;pointer-events:none}' +
    '.prt{position:fixed;right:58px;z-index:41;pointer-events:none;display:flex;align-items:center;gap:8px;height:34px;padding:0 14px;border-radius:999px;' +
    'background:rgba(22,22,24,.82);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);' +
    'color:#f5f5f7;font:600 13px var(--f);letter-spacing:-.01em;white-space:nowrap;opacity:0;transform:translateX(8px);transition:opacity .3s,transform .3s}' +
    '.prt.on{opacity:1;transform:none}.prt i{width:7px;height:7px;border-radius:50%;background:#30d158;box-shadow:0 0 8px #30d158}.prt small{color:#86868b;font-weight:500;font-size:13px}' +
    '@media(max-width:720px){.prt{right:30px}}';
  document.head.append(css); document.body.append(cv, pill);
  const ctx = cv.getContext('2d');

  let W, H, trackX, top, bottom, ratio = 1, phone = false;
  const size = () => {
    phone = innerWidth <= 720;
    W = phone ? 26 : 52; H = innerHeight; ratio = devicePixelRatio || 1;
    cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = W * ratio; cv.height = H * ratio;
    trackX = phone ? W - 9 : W - 20; top = phone ? 76 : 96; bottom = H - (phone ? 100 : 116);   // stays above the floating Book a call button
  };
  size();

  /* ---------- where each level sits on the track (0 = top of page, 1 = bottom) ---------- */
  const progress = () => { const max = document.documentElement.scrollHeight - innerHeight; return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0; };
  const levelAt = () => { const max = document.documentElement.scrollHeight - innerHeight;
    return LEVELS.map(l => Math.min(.97, Math.max(.03, (l.el.getBoundingClientRect().top + scrollY - innerHeight * .45) / max))); };
  let marks = levelAt();
  const yOf = p => top + p * (bottom - top);

  /* ---------- state ---------- */
  let heroY = yOf(progress()), trail = [], cleared = LEVELS.map(() => false), hop = LEVELS.map(() => 0), opened = !!store.get('pixel-secret'), glow = 0, pillTimer;
  marks.forEach((m, i) => { if (progress() >= m) cleared[i] = true; });          // already passed when the page loads: no fuss

  const say = (text, sub, y) => {
    pill.innerHTML = '<i></i>' + text + (sub ? ' <small>' + sub + '</small>' : '');
    pill.style.top = Math.max(10, Math.min(innerHeight - 44, y - 17)) + 'px'; pill.classList.add('on');
    clearTimeout(pillTimer); pillTimer = setTimeout(() => pill.classList.remove('on'), 1800);
  };
  const unlock = () => {
    opened = true; glow = 1; store.set('pixel-secret', '1');
    say('Snake unlocked', 'in Games', bottom);
    window.dispatchEvent(new Event('pixel-secret'));
  };

  /* ---------- drawing helpers ---------- */
  const rounded = (x, y, w, h, r, fill) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); };
  const figure = (x, y, colour) => {                        // a small flat person: round head, rounded body
    ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(x, y - 11, 2.6, 0, 7); ctx.fill();
    rounded(x - 3.5, y - 7.5, 7, 7.5, 3, colour);
  };
  const lock = (x, y, open) => {                            // padlock: body plus a shackle that lifts when opened
    const c = open ? GREEN : 'rgba(245,245,247,.45)', lift = open ? 3 : 0;
    ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.beginPath();
    ctx.moveTo(x - 3.6, y - 1 - (open ? 6 : 0)); ctx.lineTo(x - 3.6, y - 4 - lift); ctx.arc(x, y - 4 - lift, 3.6, Math.PI, 0); ctx.lineTo(x + 3.6, y - 1);
    ctx.stroke();
    rounded(x - 5.5, y - 1.5, 11, 9, 2.5, c);
  };

  const frame = () => {
    const p = progress(), target = yOf(p), before = heroY;
    heroY += (target - heroY) * .16;                                     // falls smoothly toward where you are
    if (Math.abs(heroY - before) > .5) trail.push({ y: heroY, life: 1 });
    trail = trail.filter(t => (t.life -= .05) > 0).slice(-16);

    marks.forEach((m, i) => {
      if (!cleared[i] && p >= m) { cleared[i] = true; hop[i] = 1; if (!phone) say('Level ' + (i + 1) + ' cleared', LEVELS[i].name, yOf(m)); }
      if (cleared[i] && p < m - .02) cleared[i] = false;                 // scroll back up and you can clear it again
    });
    if (!opened && p > .985) unlock();

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, W, H);
    // the hairline track, brighter above the block (the part you have travelled)
    ctx.fillStyle = 'rgba(245,245,247,.08)'; ctx.fillRect(trackX - .5, top, 1, bottom - top);
    ctx.fillStyle = 'rgba(245,245,247,.32)'; ctx.fillRect(trackX - .5, top, 1, Math.max(0, heroY - top));
    // checkpoints with a figure on each
    marks.forEach((m, i) => {
      const y = yOf(m), done = cleared[i];
      ctx.beginPath(); ctx.arc(trackX, y, 3.2, 0, 7);
      if (done) { ctx.fillStyle = WHITE; ctx.fill(); } else { ctx.fillStyle = '#000'; ctx.fill(); ctx.strokeStyle = 'rgba(245,245,247,.35)'; ctx.lineWidth = 1; ctx.stroke(); }
      const lift = hop[i] > 0 ? Math.sin(hop[i] * Math.PI) * 6 : 0; if (hop[i] > 0) hop[i] = Math.max(0, hop[i] - .04);
      if (!phone) figure(trackX - 13, y + 4 - lift, done ? GREEN : 'rgba(245,245,247,.28)');
    });
    // the lock at the end of the line
    if (glow > 0) { ctx.fillStyle = 'rgba(48,209,88,' + (glow * .25).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(trackX, bottom + 3, 16 * (1.4 - glow * .4), 0, 7); ctx.fill(); glow = Math.max(0, glow - .012); }
    lock(trackX, bottom + 2, opened);
    // the trail, then the block on top
    trail.forEach(t => rounded(trackX - 2, t.y - 2, 4, 4, 1, 'rgba(245,245,247,' + (t.life * .35).toFixed(2) + ')'));
    ctx.shadowColor = 'rgba(245,245,247,.6)'; ctx.shadowBlur = 10;
    rounded(trackX - 4.5, heroY - 4.5, 9, 9, 2.5, WHITE);
    ctx.shadowBlur = 0;
    requestAnimationFrame(frame);
  };

  addEventListener('resize', () => { size(); marks = levelAt(); });
  addEventListener('load', () => { marks = levelAt(); });
  setTimeout(() => { marks = levelAt(); }, 1500);                        // images and games change the page height
  requestAnimationFrame(frame);
})();
