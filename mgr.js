/* Moluscca Global Revolution: a small top-down adventure that opens in an overlay.
   You are an octopus. Walk the town, step into tall grass to meet wild Moluscca things,
   catch them with a timing bar, and fill the Molusdex. Buildings link to the real products.
   Everything is drawn in code: no images, no outside libraries. */
(() => {
  const TILE = 32, VIEW_W = 15, VIEW_H = 11;           // the camera shows 15 x 11 tiles
  const MAP = [                                         // . grass  , tall grass  T tree  ~ water  = path  F flowers
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',                    // A/a API Lab (a = door)  S/s Templates Store  Q/q Skill Shop
    'T..F.....,,,,=,,,,.....F...T',
    'T.AAAA....,,,=,,,....SSSS..T',
    'T.AAAA....,,,=,,,....SSSS..T',
    'T.AaAA.......=.......SsSS..T',
    'T..====================....T',
    'T...,,,,.....=....~~~~~....T',
    'T.,,,,,,.....=....~~~~~~...T',
    'T.,,,,,,.....=.....~~~~....T',
    'T..,,,,......=........TT...T',
    'TTT..........=.....,,,,,,..T',
    'T...QQQQ.....=.....,,,,,,..T',
    'T...QQQQ.....=.....,,,,,,..T',
    'T...QqQQ.....=.....,,,,,,..T',
    'T....=========....,,,,.....T',
    'T........,,,,=........F....T',
    'T,,,,,,......=......,,,,,,.T',
    'T,,,,,,......=......,,,,,,.T',
    'T....F.......=...........F.T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTT'
  ];
  const ROWS = MAP.length, COLS = MAP[0].length;
  const BLOCKED = 'T~AQS';
  const BUILDINGS = {
    A: { name: 'API Lab', roof: '#7C9CFF', door: 'a', gives: 'api', text: 'The API Lab. Risk maths and India data in one request.', url: 'https://api.moluscca.com' },
    S: { name: 'Templates', roof: '#f5f5f7', door: 's', gives: 'templates', text: 'The Templates Store. Dashboards with the maths built in.', url: 'https://templates.moluscca.com' },
    Q: { name: 'Skill Shop', roof: '#30d158', door: 'q', gives: 'quant', text: 'The Skill Shop. Quant Risk Dashboard, a Claude skill.', url: 'https://www.moluscca.com/products' }
  };
  const DEX = [   // the six things you can collect
    { id: 'api', name: 'API', mark: '{ }', colour: '#7C9CFF', line: 'Risk maths and India data in one request.', url: 'https://api.moluscca.com', hard: .5 },
    { id: 'templates', name: 'Templates', mark: '▦', colour: '#f5f5f7', line: 'Dashboard templates with the maths built in.', url: 'https://templates.moluscca.com', hard: .5 },
    { id: 'quant', name: 'Quant Skill', mark: '◆', colour: '#30d158', line: 'Any spreadsheet into a verified risk dashboard.', url: 'https://www.moluscca.com/products', hard: .55 },
    { id: 'monte', name: 'Monte Carlo', mark: '⁂', colour: '#ffd60a', line: 'Simulates thousands of possible futures.', hard: .7 },
    { id: 'tail', name: 'Tail Risk', mark: '↯', colour: '#ff453a', line: 'The 1-in-200 loss. Rare, and hard to catch.', hard: .85 },
    { id: 'climate', name: 'Climate Data', mark: '☂', colour: '#64d2ff', line: 'Rain, heat and cold across India.', hard: .65 }
  ];
  const tileAt = (x, y) => (MAP[y] || '')[x] || 'T';
  const store = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function mgr(panel) {
    let caught = store.get('mgr-dex') || [];
    /* ---------- the card in the games section: intro, Molusdex, play button ---------- */
    const renderDex = () => {
      panel.innerHTML =
        '<div class="sdh"><b>Moluscca Global Revolution</b><span class="sdt">' + caught.length + '/' + DEX.length + '</span></div>' +
        '<p class="grintro">Play as an octopus. Walk into tall grass to meet wild Moluscca things, catch them, and fill your Molusdex. Visit the buildings too.</p>' +
        '<div class="grdex">' + DEX.map(d => caught.includes(d.id)
          ? '<div class="grd on"><i style="color:' + d.colour + '">' + d.mark + '</i><b>' + d.name + '</b></div>'
          : '<div class="grd"><i>?</i><b>???</b></div>').join('') + '</div>' +
        '<div class="sdf"><span class="bgmsg">' + (caught.length === DEX.length ? 'Molusdex complete. Legend.' : 'Arrow keys or WASD. Space to talk.') + '</span><button type="button" class="sdnew" data-a="play">' + (caught.length ? 'Continue' : 'Play') + '</button></div>';
      panel.querySelector('[data-a=play]').onclick = open;
    };

    /* ---------- the overlay with the game ---------- */
    const ov = document.createElement('div'); ov.className = 'grov'; ov.hidden = true;
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Moluscca Global Revolution');
    ov.innerHTML =
      '<div class="grwin"><div class="grtop"><b>Moluscca Global Revolution</b><span class="grcount"></span><button type="button" class="grx" aria-label="Close">×</button></div>' +
      '<div class="grstage"><canvas width="' + VIEW_W * TILE + '" height="' + VIEW_H * TILE + '"></canvas><div class="grbox" hidden></div></div>' +
      '<div class="grpad"><button type="button" data-k="up" aria-label="Up">▲</button><button type="button" data-k="left" aria-label="Left">◀</button><button type="button" data-k="down" aria-label="Down">▼</button><button type="button" data-k="right" aria-label="Right">▶</button><button type="button" data-k="act" class="gra" aria-label="Talk or catch">A</button></div></div>';
    // on the normal page it sits on top of everything; in the games pop-up only the games section is shown, so it goes there
    (document.documentElement.getAttribute('data-embed') && panel.closest('section') || document.body).appendChild(ov);
    const cv = ov.querySelector('canvas'), ctx = cv.getContext('2d'), box = ov.querySelector('.grbox'), count = ov.querySelector('.grcount');

    // player state: tile position, pixel position while walking, facing, walk animation
    const me = { x: 13, y: 18, px: 13 * TILE, py: 18 * TILE, face: 'up', moving: false, tx: 13, ty: 18, step: 0 };
    const held = new Set();
    let mode = 'walk', running = false, frame = 0, encounter = null, marker = 0, markerDir = 1, lastDoor = '';

    const setCount = () => { count.textContent = 'Molusdex ' + caught.length + '/' + DEX.length; };
    const save = id => { if (!caught.includes(id)) { caught.push(id); store.set('mgr-dex', caught); } setCount(); };

    /* ----- dialog box ----- */
    const talk = (html, buttons) => {
      mode = 'talk'; box.hidden = false;
      box.innerHTML = '<div class="grtext">' + html + '</div><div class="grbtns">' + buttons.map((b, i) => b.url
        ? '<a class="sdnew' + (i ? ' bgghost' : '') + '" href="' + b.url + '" target="_blank" rel="noopener">' + b.label + '</a>'
        : '<button type="button" class="sdnew' + (i ? ' bgghost' : '') + '" data-i="' + i + '">' + b.label + '</button>').join('') + '</div>';
      box.querySelectorAll('button[data-i]').forEach(el => el.onclick = () => buttons[+el.dataset.i].go());
      const first = box.querySelector('button, a'); if (first) first.focus({ preventScroll: true });
    };
    const done = () => { mode = 'walk'; box.hidden = true; box.innerHTML = ''; cv.focus({ preventScroll: true }); };

    const meet = d => {   // a wild thing appears: show it with a timing bar
      encounter = d; marker = 0; markerDir = 1; mode = 'catch'; box.hidden = false;
      const zone = Math.round((1 - d.hard) * 60 + 8);          // harder things have a smaller green zone
      encounter.zone = [50 - zone / 2, 50 + zone / 2];
      box.innerHTML = '<div class="grwild"><i style="color:' + d.colour + '">' + d.mark + '</i><div><b>A wild ' + esc(d.name) + ' appeared!</b><span>' + esc(d.line) + '</span></div></div>' +
        '<div class="grbar"><em style="left:' + encounter.zone[0] + '%;width:' + (encounter.zone[1] - encounter.zone[0]) + '%"></em><u></u></div>' +
        '<div class="grbtns"><button type="button" class="sdnew" data-a="catch">Catch · Space</button><button type="button" class="sdnew bgghost" data-a="run">Run</button></div>';
      box.querySelector('[data-a=catch]').onclick = tryCatch; box.querySelector('[data-a=run]').onclick = () => { encounter = null; done(); };
    };
    const tryCatch = () => {
      if (mode !== 'catch' || !encounter) return;
      const d = encounter, got = marker >= d.zone[0] && marker <= d.zone[1]; encounter = null;
      if (got) {
        const isNew = !caught.includes(d.id); save(d.id);
        const all = caught.length === DEX.length;
        talk('<b>Gotcha! ' + esc(d.name) + ' was caught.</b>' + (isNew ? ' Added to your Molusdex.' : ' You already had one.') + (all ? '<br>That is all six. Molusdex complete!' : ''),
          d.url ? [{ label: 'Nice', go: done }, { label: 'Visit ' + d.name, url: d.url }] : [{ label: 'Nice', go: done }]);
      } else talk('<b>Oh no, ' + esc(d.name) + ' slipped away.</b> Try again in the grass.', [{ label: 'OK', go: done }]);
    };

    /* ----- moving around ----- */
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const tryStep = dir => {
      me.face = dir; const [dx, dy] = DIRS[dir], nx = me.x + dx, ny = me.y + dy;
      if (BLOCKED.includes(tileAt(nx, ny))) return;
      me.tx = nx; me.ty = ny; me.moving = true;
    };
    const arrived = () => {
      me.x = me.tx; me.y = me.ty; me.moving = false; const t = tileAt(me.x, me.y);
      const b = Object.values(BUILDINGS).find(b => b.door === t);
      if (b && lastDoor !== t) {
        lastDoor = t; const thing = DEX.find(d => d.id === b.gives), isNew = !caught.includes(thing.id); save(thing.id);
        held.clear();
        return talk('<b>' + esc(b.name) + '</b> ' + esc(b.text) + (isNew ? '<br>You got <b style="color:' + thing.colour + '">' + esc(thing.name) + '</b> for your Molusdex!' : ''),
          [{ label: 'Back outside', go: () => { done(); } }, { label: 'Open the real one', url: b.url }]);
      }
      if (!b) lastDoor = '';
      if (t === ',' && Math.random() < .2) {
        // mostly things you have not caught yet, sometimes a repeat
        const missing = DEX.filter(d => !caught.includes(d.id)), pool = missing.length && Math.random() < .8 ? missing : DEX;
        held.clear(); meet(pool[Math.floor(Math.random() * pool.length)]);
      }
    };
    const act = () => {
      if (mode === 'catch') return tryCatch();
      if (mode === 'talk') { const b = box.querySelector('button'); if (b) b.click(); return; }
      // talking to a sign: look at the tile in front
      const [dx, dy] = DIRS[me.face], t = tileAt(me.x + dx, me.y + dy);
      if (t === '~') talk('The water sparkles. Somewhere out there is a 1-in-200 wave.', [{ label: 'OK', go: done }]);
      else if (t === 'T') talk('A sturdy tree. Trees do not worry about tail risk.', [{ label: 'OK', go: done }]);
    };

    /* ----- drawing ----- */
    const drawTile = (t, x, y, sx, sy) => {
      const g = (x + y) % 2 ? '#2f6b3a' : '#326f3d';
      ctx.fillStyle = t === '=' ? '#cdb991' : t === '~' ? '#2c6aa3' : g; ctx.fillRect(sx, sy, TILE, TILE);
      if (t === '=') { ctx.fillStyle = 'rgba(0,0,0,.05)'; ctx.fillRect(sx, sy + TILE - 3, TILE, 3); }
      if (t === '~') { ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5; const o = (frame / 12 + x * 3) % 12;
        ctx.beginPath(); ctx.moveTo(sx + 4, sy + 10 + o / 3); ctx.quadraticCurveTo(sx + 10, sy + 6 + o / 3, sx + 16, sy + 10 + o / 3); ctx.stroke(); }
      if (t === ',') { const sway = Math.sin(frame / 20 + x + y) * 1.5;
        for (let k = 0; k < 4; k++) { const bx = sx + 4 + k * 7, by = sy + TILE - 4; ctx.fillStyle = k % 2 ? '#4fa85c' : '#3f8f4c';
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 3 + sway, by - 18 - (k % 2) * 4); ctx.lineTo(bx + 6, by); ctx.fill(); } }
      if (t === 'F') { [[8, 10, '#ff9f0a'], [22, 8, '#ff6b9a'], [15, 22, '#f5f5f7']].forEach(([fx, fy, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx + fx, sy + fy, 3, 0, 7); ctx.fill(); }); }
      if (t === 'T') { ctx.fillStyle = '#5b3a1e'; ctx.fillRect(sx + 13, sy + 20, 6, 10); ctx.fillStyle = '#1f4d2a'; ctx.beginPath(); ctx.arc(sx + 16, sy + 14, 12, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.arc(sx + 12, sy + 10, 5, 0, 7); ctx.fill(); }
      const b = BUILDINGS[t] || Object.values(BUILDINGS).find(b => b.door === t);
      if (b) {
        const letter = Object.keys(BUILDINGS).find(k => BUILDINGS[k] === b), isTop = tileAt(x, y - 1) !== letter;
        ctx.fillStyle = '#e4e4ea'; ctx.fillRect(sx, sy, TILE, TILE);
        if (isTop) { ctx.fillStyle = b.roof; ctx.fillRect(sx, sy, TILE, TILE * .55); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(sx, sy + TILE * .55 - 3, TILE, 3); }
        else if (t !== b.door) { ctx.fillStyle = '#9fb4d8'; ctx.fillRect(sx + 9, sy + 9, 14, 12); }
        if (t === b.door) { ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.roundRect(sx + 8, sy + 6, 16, 26, [6, 6, 0, 0]); ctx.fill(); }
      }
    };
    const drawLabels = (camX, camY) => {
      Object.entries(BUILDINGS).forEach(([k, b]) => {
        const y = MAP.findIndex(r => r.includes(k)), x = MAP[y].indexOf(k), w = MAP[y].split(k).length - 1;
        const sx = x * TILE - camX + w * TILE / 2, sy = y * TILE - camY + 12;
        ctx.font = '700 11px "Albert Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = b.roof === '#f5f5f7' ? '#1d1d1f' : '#0b0b0c'; ctx.fillText(b.name.toUpperCase(), sx, sy + 2); ctx.textAlign = 'start';
      });
    };
    const drawOctopus = (sx, sy) => {
      const cx = sx + TILE / 2, cy = sy + TILE / 2 - 2, walk = me.moving ? Math.sin(me.step / 2) : Math.sin(frame / 18) * .4;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(cx, sy + TILE - 3, 11, 4, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#5d7fe6'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
      [-8, -3, 3, 8].forEach((o, i) => { const w = (i % 2 ? walk : -walk) * 3; ctx.beginPath(); ctx.moveTo(cx + o * .8, cy + 6); ctx.quadraticCurveTo(cx + o + w, cy + 12, cx + o * 1.2 - w, cy + 15); ctx.stroke(); });
      ctx.fillStyle = '#7C9CFF'; ctx.beginPath(); ctx.ellipse(cx, cy - 1, 11, 10.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(cx - 4, cy - 6, 4, 3, -.4, 0, 7); ctx.fill();
      if (me.face !== 'up') {
        const ex = me.face === 'left' ? -2 : me.face === 'right' ? 2 : 0;
        [-4, 4].forEach(o => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + o + ex, cy, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#0b0b0c'; ctx.beginPath(); ctx.arc(cx + o + ex * 1.4, cy + .5, 1.5, 0, 7); ctx.fill(); });
      }
    };

    const loop = () => {
      if (!running) return; frame++;
      if (mode === 'walk') {
        if (!me.moving) { const d = ['up', 'down', 'left', 'right'].find(k => held.has(k)); if (d) tryStep(d); }
        if (me.moving) {
          me.step++; const speed = 4, gx = me.tx * TILE, gy = me.ty * TILE;
          me.px += Math.sign(gx - me.px) * Math.min(speed, Math.abs(gx - me.px)); me.py += Math.sign(gy - me.py) * Math.min(speed, Math.abs(gy - me.py));
          if (me.px === gx && me.py === gy) arrived();
        }
      }
      if (mode === 'catch') {   // the marker slides back and forth; harder things move it faster
        marker += markerDir * (1.4 + (encounter ? encounter.hard : .5) * 2.4); if (marker >= 100 || marker <= 0) { markerDir *= -1; marker = Math.max(0, Math.min(100, marker)); }
        const u = box.querySelector('.grbar u'); if (u) u.style.left = marker + '%';
      }
      const camX = Math.max(0, Math.min(COLS * TILE - cv.width, me.px + TILE / 2 - cv.width / 2));
      const camY = Math.max(0, Math.min(ROWS * TILE - cv.height, me.py + TILE / 2 - cv.height / 2));
      ctx.clearRect(0, 0, cv.width, cv.height);
      const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
      for (let y = y0; y <= y0 + VIEW_H; y++) for (let x = x0; x <= x0 + VIEW_W; x++) drawTile(tileAt(x, y), x, y, x * TILE - camX, y * TILE - camY);
      drawLabels(camX, camY);
      drawOctopus(me.px - camX, me.py - camY);
      // tall grass covers the octopus's legs, like walking through it
      if (tileAt(me.x, me.y) === ',' && !me.moving) { ctx.fillStyle = 'rgba(63,143,76,.85)'; ctx.fillRect(me.px - camX + 4, me.py - camY + TILE - 9, TILE - 8, 7); }
      requestAnimationFrame(loop);
    };

    /* ----- open, close, keys ----- */
    const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
    const onKey = e => {
      if (ov.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); return close(); }
      if (e.key === ' ' || e.key === 'Enter') { if (e.target.tagName === 'A') return; e.preventDefault(); if (e.type === 'keydown' && !e.repeat) act(); return; }
      const k = KEYS[e.key]; if (!k) return; e.preventDefault();
      if (e.type === 'keydown') held.add(k); else held.delete(k);
    };
    document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKey);
    ov.querySelectorAll('.grpad [data-k]').forEach(b => {
      const k = b.dataset.k;
      if (k === 'act') { b.onclick = act; return; }
      const on = e => { e.preventDefault(); held.add(k); }, off = () => held.delete(k);
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    });
    ov.querySelector('.grx').onclick = () => close();
    ov.addEventListener('click', e => { if (e.target === ov) close(); });

    function open() {
      ov.hidden = false; document.documentElement.classList.add('grlock'); setCount(); running = true; cv.tabIndex = 0; cv.focus({ preventScroll: true });
      if (!caught.length && mode === 'walk' && frame === 0) talk('<b>Welcome to Moluscca Global Revolution!</b> You are the octopus. Walk into the tall grass to meet wild things, and visit the three buildings. Catch all six.', [{ label: "Let's go", go: done }]);
      requestAnimationFrame(loop);
    }
    function close() { ov.hidden = true; running = false; held.clear(); document.documentElement.classList.remove('grlock'); renderDex(); }

    renderDex();
  }

  window.boardGames = Object.assign(window.boardGames || {}, { mgr });
})();
