/* Moluscca Global Revolution: a small top-down adventure that opens in an overlay.
   You are an octopus. Walk the town, step into tall grass to meet wild Moluscca things,
   catch them with a timing bar, and fill the Molusdex. Buildings link to the real products.
   Map tiles are Kenney's Tiny Town pack (CC0, kenney.nl). Music is "Town" by Aureolus_Omicron (CC0, opengameart.org).
   The octopus and the sound effects are our own. */
(() => {
  const TILE = 32, VIEW_W = 15, VIEW_H = 11;           // the camera shows 15 x 11 tiles
  const MAP = [                                         // . grass  , tall grass  T tree  ~ bushes  = path  F flowers
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

  /* ---------- sound effects: short retro blips made in the browser, no music, no files ---------- */
  const sound = (() => {
    let ac = null, muted = store.get('mgr-mute') === true;
    const audio = () => { if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); } if (ac.state === 'suspended') ac.resume(); return ac; };
    // one note: frequency, length in seconds, wave shape, volume, delay before it starts, optional slide to another frequency
    const note = (freq, len, wave, vol, delay, slideTo) => {
      if (muted) return; const a = audio(); if (!a) return;
      const t = a.currentTime + (delay || 0), osc = a.createOscillator(), gain = a.createGain();
      osc.type = wave || 'square'; osc.frequency.setValueAtTime(freq, t); if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + len);
      gain.gain.setValueAtTime(.0001, t); gain.gain.exponentialRampToValueAtTime(vol || .04, t + .008); gain.gain.exponentialRampToValueAtTime(.0001, t + len);
      osc.connect(gain).connect(a.destination); osc.start(t); osc.stop(t + len + .02);
    };
    // a short burst of soft noise, for rustling grass
    const rustle = () => {
      if (muted) return; const a = audio(); if (!a) return;
      const len = .14, buf = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = a.createBufferSource(), hp = a.createBiquadFilter(), gain = a.createGain();
      hp.type = 'highpass'; hp.frequency.value = 2200; gain.gain.value = .07; src.buffer = buf; src.connect(hp).connect(gain).connect(a.destination); src.start();
    };
    const tune = (notes, gap, len, wave, vol) => notes.forEach((f, i) => note(f, len, wave, vol, i * gap));
    // background music: "Town" from 15 Melodic RPG Chiptunes by Aureolus_Omicron (CC0, opengameart.org).
    // It only downloads when the game opens, plays quietly on a loop, and stops when the game closes.
    let music = null, playing = false;
    const musicOn = () => {
      playing = true; if (muted) return;
      if (!music) { music = new Audio('/mgr-town.mp3'); music.loop = true; music.volume = .35; }
      music.play().catch(() => {});
    };
    const musicOff = () => { playing = false; if (music) music.pause(); };
    return {
      step: alt => note(alt ? 196 : 174, .04, 'triangle', .06),
      bump: () => note(120, .09, 'square', .03, 0, 80),
      rustle,
      blip: () => note(880, .035, 'square', .018),
      meet: () => tune([523, 659, 784, 1047, 784, 1047], .065, .08, 'square', .03),
      caught: () => { tune([659, 784, 988, 1319], .09, .1, 'square', .032); note(1319, .32, 'triangle', .05, .36); },
      escaped: () => tune([440, 349, 262], .12, .16, 'triangle', .06),
      door: () => { note(392, .09, 'triangle', .06); note(587, .16, 'triangle', .06, .09); },
      complete: () => { tune([523, 659, 784, 1047, 784, 1047, 1319], .1, .12, 'square', .03); note(1568, .5, 'triangle', .05, .72); },
      get muted() { return muted; },
      musicOn, musicOff,
      setMuted: m => {
        muted = m; store.set('mgr-mute', m);
        if (m) { if (music) music.pause(); } else { note(880, .05, 'square', .02); if (playing) musicOn(); }
      }
    };
  })();
  const keyboardless = matchMedia('(hover: none) and (pointer: coarse)').matches;   // phones and tablets: no keyboard

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
        (keyboardless
          ? '<div class="sdf"><span class="bgmsg">This one needs a keyboard. Play it on a computer.</span></div>'
          : '<div class="sdf"><span class="bgmsg">' + (caught.length === DEX.length ? 'Molusdex complete. Legend.' : 'Arrow keys or WASD to walk. Space to talk. M to mute.') + '</span><button type="button" class="sdnew" data-a="play">' + (caught.length ? 'Continue' : 'Play') + '</button></div>');
      const play = panel.querySelector('[data-a=play]'); if (play) play.onclick = open;
    };

    /* ---------- the overlay with the game ---------- */
    const ov = document.createElement('div'); ov.className = 'grov'; ov.hidden = true;
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Moluscca Global Revolution');
    ov.innerHTML =
      '<div class="grwin"><div class="grtop"><b>Moluscca Global Revolution</b><span class="grcount"></span><button type="button" class="grmute" aria-label="Mute sound"></button><button type="button" class="grx" aria-label="Close">×</button></div>' +
      '<div class="grstage"><canvas width="' + VIEW_W * TILE + '" height="' + VIEW_H * TILE + '"></canvas><div class="grbox" hidden></div></div><p class="grkeys">Arrow keys or WASD to walk · Space to talk and catch · M to mute · Esc to close</p></div>';
    // on the normal page it sits on top of everything; in the games pop-up only the games section is shown, so it goes there
    (document.documentElement.getAttribute('data-embed') && panel.closest('section') || document.body).appendChild(ov);
    const cv = ov.querySelector('canvas'), ctx = cv.getContext('2d'), box = ov.querySelector('.grbox'), count = ov.querySelector('.grcount');

    // player state: tile position, pixel position while walking, facing, walk animation
    const me = { x: 13, y: 18, px: 13 * TILE, py: 18 * TILE, face: 'up', moving: false, tx: 13, ty: 18, step: 0 };
    const held = new Set();
    let mode = 'walk', running = false, frame = 0, encounter = null, marker = 0, markerDir = 1, lastDoor = '', lastBump = -99, steps = 0;

    const setCount = () => { count.textContent = 'Molusdex ' + caught.length + '/' + DEX.length; };
    const save = id => { if (!caught.includes(id)) { caught.push(id); store.set('mgr-dex', caught); } setCount(); };

    /* ----- dialog box ----- */
    const talk = (html, buttons) => {
      mode = 'talk'; box.hidden = false; sound.blip();
      box.innerHTML = '<div class="grtext">' + html + '</div><div class="grbtns">' + buttons.map((b, i) => b.url
        ? '<a class="sdnew' + (i ? ' bgghost' : '') + '" href="' + b.url + '" target="_blank" rel="noopener">' + b.label + '</a>'
        : '<button type="button" class="sdnew' + (i ? ' bgghost' : '') + '" data-i="' + i + '">' + b.label + '</button>').join('') + '</div>';
      box.querySelectorAll('button[data-i]').forEach(el => el.onclick = () => buttons[+el.dataset.i].go());
      const first = box.querySelector('button, a'); if (first) first.focus({ preventScroll: true });
    };
    const done = () => { mode = 'walk'; box.hidden = true; box.innerHTML = ''; cv.focus({ preventScroll: true }); };

    const meet = d => {   // a wild thing appears: show it with a timing bar
      encounter = d; marker = 0; markerDir = 1; mode = 'catch'; box.hidden = false; sound.meet();
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
        if (all && isNew) sound.complete(); else sound.caught();
        talk('<b>Gotcha! ' + esc(d.name) + ' was caught.</b>' + (isNew ? ' Added to your Molusdex.' : ' You already had one.') + (all ? '<br>That is all six. Molusdex complete!' : ''),
          d.url ? [{ label: 'Nice', go: done }, { label: 'Visit ' + d.name, url: d.url }] : [{ label: 'Nice', go: done }]);
      } else { talk('<b>Oh no, ' + esc(d.name) + ' slipped away.</b> Try again in the grass.', [{ label: 'OK', go: done }]); sound.escaped(); }
    };

    /* ----- moving around ----- */
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const tryStep = dir => {
      me.face = dir; const [dx, dy] = DIRS[dir], nx = me.x + dx, ny = me.y + dy;
      if (BLOCKED.includes(tileAt(nx, ny))) { if (frame - lastBump > 16) { sound.bump(); lastBump = frame; } return; }
      me.tx = nx; me.ty = ny; me.moving = true;
    };
    const arrived = () => {
      me.x = me.tx; me.y = me.ty; me.moving = false; const t = tileAt(me.x, me.y);
      if (t === ',') sound.rustle(); else sound.step(steps++ % 2);
      const b = Object.values(BUILDINGS).find(b => b.door === t);
      if (b && lastDoor !== t) {
        lastDoor = t; const thing = DEX.find(d => d.id === b.gives), isNew = !caught.includes(thing.id); save(thing.id);
        held.clear(); sound.door();
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
      if (t === '~') talk('A round bush. Nothing is hiding in this one.', [{ label: 'OK', go: done }]);
      else if (t === 'T') talk('A sturdy tree. Trees do not worry about tail risk.', [{ label: 'OK', go: done }]);
    };

    /* ----- drawing: tiles come from Kenney's Tiny Town pack (CC0, kenney.nl), 16 x 16 each, 12 per row ----- */
    const sheet = new Image(); sheet.src = '/mgr-tiles.png';
    const T = { grass: 0, grassTuft: 1, flowers: 2, plants: 17, tree: 28, autumnTree: 27, bush: 5, path: 25, mushrooms: 29 };
    const ROOF = { blue: [[48, 49, 50], [60, 61, 62]], red: [[52, 53, 54], [64, 65, 66]] };
    const WALL = { stone: { window: 88, door: 89 }, wood: { window: 84, door: 85 } };
    const LOOK = { A: { roof: 'blue', wall: 'stone' }, S: { roof: 'red', wall: 'wood' }, Q: { roof: 'blue', wall: 'wood' } };
    const spot = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;     // a fixed "random" number per square, so the map never flickers
    const put = (n, sx, sy) => ctx.drawImage(sheet, (n % 12) * 16, Math.floor(n / 12) * 16, 16, 16, sx, sy, TILE, TILE);
    // where each building sits, worked out once from the map
    const AREA = {};
    Object.keys(BUILDINGS).forEach(k => {
      const ys = MAP.map((r, y) => r.includes(k) || r.includes(BUILDINGS[k].door) ? y : -1).filter(y => y >= 0);
      const xs = ys.flatMap(y => [...MAP[y]].map((c, x) => c === k || c === BUILDINGS[k].door ? x : -1).filter(x => x >= 0));
      AREA[k] = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: ys.length };
    });

    const drawTile = (t, x, y, sx, sy) => {
      if (t === '=') return put(T.path, sx, sy);
      put(spot(x, y) % 7 === 0 ? T.grassTuft : T.grass, sx, sy);                // grass under everything else
      if (t === ',') put(T.plants, sx, sy);
      else if (t === 'F') put(T.flowers, sx, sy);
      else if (t === 'T') put(spot(x, y) % 5 === 0 ? T.autumnTree : T.tree, sx, sy);
      else if (t === '~') put(spot(x, y) % 4 === 0 ? T.mushrooms : T.bush, sx, sy);
      const k = Object.keys(BUILDINGS).find(k => k === t || BUILDINGS[k].door === t);
      if (k) {
        const a = AREA[k], c = x - a.x, r = y - a.y, look = LOOK[k], col = c === 0 ? 0 : c === a.w - 1 ? 2 : 1;
        if (r < a.h - 1) put(ROOF[look.roof][Math.min(r, 1)][col], sx, sy);
        else put(t === BUILDINGS[k].door ? WALL[look.wall].door : WALL[look.wall].window, sx, sy);
      }
    };
    const drawLabels = (camX, camY) => {               // a small pill with the building's name, in the site's style
      Object.keys(BUILDINGS).forEach(k => {
        const a = AREA[k], name = BUILDINGS[k].name, cx = (a.x + a.w / 2) * TILE - camX, cy = a.y * TILE - camY - 6;
        ctx.font = '600 11px "Albert Sans", sans-serif'; const w = ctx.measureText(name).width + 16;
        ctx.fillStyle = 'rgba(17,17,19,.88)'; ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - 10, w, 20, 10); ctx.fill();
        ctx.fillStyle = '#f5f5f7'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name, cx, cy + .5);
        ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
      });
    };
    // the octopus, as 16 x 16 pixel art to match the tiles. d outline, b body, h shine, w eye white, k pupil
    const OCTO_HEAD = [
      '................',
      '.....dddddd.....',
      '...ddbbbbbbdd...',
      '..dbbhhbbbbbbd..',
      '..dbhhbbbbbbbd..',
      '.dbbbbbbbbbbbbd.',
      '.dbbbbbbbbbbbbd.',
      '.dbbbbbbbbbbbbd.',
      '.dbbbbbbbbbbbbd.',
      '..dbbbbbbbbbbd..',
      '..dbbbbbbbbbbd..'];
    const OCTO_LEGS = [[
      '..db.db..db.db..',
      '.db..db..db..db.',
      '.d...d....d...d.'], [
      '..db.db..db.db..',
      '..db..db.db.db..',
      '...d...d.d...d..']];
    const OCTO = { d: '#3b52b0', b: '#7C9CFF', h: '#c9d6ff', w: '#ffffff', k: '#15151a' };
    const pixels = (rows, sx, sy, top) => rows.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === '.') return; ctx.fillStyle = OCTO[ch]; ctx.fillRect(sx + c * 2, sy + (top + r) * 2, 2, 2);
    }));
    const drawOctopus = (sx, sy) => {
      const bob = me.moving ? 0 : Math.round(Math.sin(frame / 14)), legs = me.moving ? Math.floor(me.step / 4) % 2 : 0, y = sy - 2 + bob;
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(sx + TILE / 2, sy + TILE - 2, 10, 3, 0, 0, 7); ctx.fill();
      pixels(OCTO_HEAD, sx, y, 0); pixels(OCTO_LEGS[legs], sx, y, 11);
      if (me.face !== 'up') {           // eyes look the way you walk
        const shift = me.face === 'left' ? -1 : me.face === 'right' ? 1 : 0;
        [4, 9].forEach(ex => { pixels(['ww', 'wk'.split('').map((p, i) => (shift > 0 ? 'wk' : shift < 0 ? 'kw' : 'wk')[i]).join('')], sx + (ex + shift) * 2, y, 6); });
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
      ctx.clearRect(0, 0, cv.width, cv.height); ctx.imageSmoothingEnabled = false;   // keep the pixel art crisp
      const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
      for (let y = y0; y <= y0 + VIEW_H; y++) for (let x = x0; x <= x0 + VIEW_W; x++) drawTile(tileAt(x, y), x, y, x * TILE - camX, y * TILE - camY);
      drawLabels(camX, camY);
      drawOctopus(me.px - camX, me.py - camY);
      // tall grass covers the octopus's legs, like walking through it
      if (tileAt(me.x, me.y) === ',' && !me.moving) ctx.drawImage(sheet, (T.plants % 12) * 16, Math.floor(T.plants / 12) * 16 + 10, 16, 6, me.px - camX, me.py - camY + TILE - 12, TILE, 12);
      requestAnimationFrame(loop);
    };

    /* ----- open, close, keys ----- */
    const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
    const onKey = e => {
      if (ov.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); return close(); }
      if ((e.key === 'm' || e.key === 'M') && e.type === 'keydown') { e.preventDefault(); return toggleMute(); }
      if (e.key === ' ' || e.key === 'Enter') { if (e.target.tagName === 'A') return; e.preventDefault(); if (e.type === 'keydown' && !e.repeat) act(); return; }
      const k = KEYS[e.key]; if (!k) return; e.preventDefault();
      if (e.type === 'keydown') held.add(k); else held.delete(k);
    };
    document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKey);
    const muteBtn = ov.querySelector('.grmute');
    const showMute = () => {
      muteBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/>' +
        (sound.muted ? '<path d="m16 9 5 6M21 9l-5 6"/>' : '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>') + '</svg>';
      muteBtn.setAttribute('aria-label', sound.muted ? 'Turn sound on' : 'Mute sound'); muteBtn.classList.toggle('off', sound.muted);
    };
    const toggleMute = () => { sound.setMuted(!sound.muted); showMute(); };
    muteBtn.onclick = () => { toggleMute(); cv.focus({ preventScroll: true }); };
    showMute();
    ov.querySelector('.grx').onclick = () => close();
    ov.addEventListener('click', e => { if (e.target === ov) close(); });

    function open() {
      ov.hidden = false; document.documentElement.classList.add('grlock'); setCount(); running = true; sound.musicOn(); cv.tabIndex = 0; cv.focus({ preventScroll: true });
      if (!caught.length && mode === 'walk' && frame === 0) talk('<b>Welcome to Moluscca Global Revolution!</b> You are the octopus. Walk into the tall grass to meet wild things, and visit the three buildings. Catch all six.', [{ label: "Let's go", go: done }]);
      requestAnimationFrame(loop);
    }
    function close() { ov.hidden = true; running = false; sound.musicOff(); held.clear(); document.documentElement.classList.remove('grlock'); renderDex(); }

    renderDex();
  }

  window.boardGames = Object.assign(window.boardGames || {}, { mgr });
})();
