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
    'T........,,,,=.HHH....F....T',
    'T,,,,,,......=.HhH..,,,,,,.T',
    'T,,,,,,......=......,,,,,,.T',
    'T....F.......=...........F.T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTT'
  ];
  const ROWS = MAP.length, COLS = MAP[0].length;
  const BLOCKED = 'T~AQSH';
  const BUILDINGS = {
    A: { name: 'API Lab', roof: '#7C9CFF', door: 'a', gives: 'api', text: 'The API Lab. Risk maths and India data in one request.', url: 'https://api.moluscca.com' },
    S: { name: 'Templates', roof: '#f5f5f7', door: 's', gives: 'templates', text: 'The Templates Store. Dashboards with the maths built in.', url: 'https://templates.moluscca.com' },
    Q: { name: 'Skill Shop', roof: '#30d158', door: 'q', gives: 'quant', text: 'The Skill Shop. Quant Risk Dashboard, a Claude skill.', url: 'https://www.moluscca.com/products' },
    H: { name: 'Home', roof: '#f5f5f7', door: 'h', home: true }
  };

  /* ---------- battles: partners, moves and types ----------
     market beats data, data beats shield, shield beats market (1.5x one way, 0.67x the other) */
  const STARTERS = {
    volty: { name: 'Volty', mark: '≋', colour: '#ffd60a', type: 'market', blurb: 'Fast and sharp. Hits hard, a little wild.', base: { hp: 44, atk: 15, def: 9 },
      moves: [{ n: 'Spike', pow: 40, acc: 1, kind: 'market' }, { n: 'Jitter', pow: 0, acc: .95, kind: 'lower' }, { n: 'Surge', pow: 72, acc: .75, kind: 'market' }, { n: 'Quick Hit', pow: 32, acc: 1, kind: 'normal' }] },
    hedge: { name: 'Hedge', mark: '⬢', colour: '#30d158', type: 'shield', blurb: 'A tank. Shrugs off hits and patches itself up.', base: { hp: 58, atk: 10, def: 14 },
      moves: [{ n: 'Shell Bash', pow: 40, acc: 1, kind: 'shield' }, { n: 'Brace', pow: 0, acc: 1, kind: 'guard' }, { n: 'Cover', pow: 0, acc: 1, kind: 'heal' }, { n: 'Slam', pow: 56, acc: .9, kind: 'normal' }] },
    delta: { name: 'Delta', mark: 'Δ', colour: '#7C9CFF', type: 'data', blurb: 'Balanced. Steals a little health with every hit.', base: { hp: 50, atk: 12, def: 11 },
      moves: [{ n: 'Pulse', pow: 40, acc: 1, kind: 'data' }, { n: 'Rebalance', pow: 0, acc: 1, kind: 'heal' }, { n: 'Arbitrage', pow: 36, acc: 1, kind: 'drain' }, { n: 'Shock', pow: 62, acc: .85, kind: 'data' }] }
  };
  // battle sprites: Kenney's Tiny Dungeon pack (CC0, kenney.nl), 16 x 16, 12 per row, drawn big and crisp
  const SPRITE = { volty: 120, hedge: 96, delta: 84, api: 108, templates: 121, quant: 109, monte: 122, tail: 123, climate: 124 };
  const sprite = (key, scale, flip) => { const n = SPRITE[key] || 108; return '<span class="grspr' + (flip ? ' flip' : '') + '" style="--s:' + scale + ';--x:' + (n % 12) + ';--y:' + Math.floor(n / 12) + '"></span>'; };
  const WILD_TYPE = { api: 'data', templates: 'data', quant: 'shield', monte: 'market', tail: 'market', climate: 'shield' };
  const BEATS = { market: 'data', data: 'shield', shield: 'market' };
  const typeBoost = (moveType, targetType) => BEATS[moveType] === targetType ? 1.5 : BEATS[targetType] === moveType ? .67 : 1;
  const statsAt = (base, lvl) => ({ max: base.hp + lvl * 4, atk: base.atk + lvl * 2, def: base.def + lvl * 2 });

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
    // battle music: "Battle 1" from the same pack (CC0). Swaps in during a fight, town music comes back after.
    let battle = null, fighting = false;
    const musicOff = () => { playing = false; if (music) music.pause(); if (battle) battle.pause(); };
    const battleOn = () => {
      fighting = true; if (music) music.pause(); if (muted) return;
      if (!battle) { battle = new Audio('/mgr-battle.mp3'); battle.loop = true; battle.volume = .35; }
      battle.currentTime = 0; battle.play().catch(() => {});
    };
    const battleOff = () => { fighting = false; if (battle) battle.pause(); if (playing && !muted && music) music.play().catch(() => {}); };
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
      musicOn, musicOff, battleOn, battleOff,
      setMuted: m => {
        muted = m; store.set('mgr-mute', m);
        if (m) { if (music) music.pause(); if (battle) battle.pause(); }
        else { note(880, .05, 'square', .02); if (fighting) battleOn(); else if (playing) musicOn(); }
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
        '<div class="sdf"><span class="bgmsg">' + (caught.length === DEX.length ? 'Molusdex complete. Legend.' : keyboardless ? 'Use the pad to walk, A to talk and catch.' : 'Arrow keys or WASD to walk. Space to talk. M to mute.') + '</span><button type="button" class="sdnew" data-a="play">' + (caught.length ? 'Continue' : 'Play') + '</button></div>';
      const play = panel.querySelector('[data-a=play]'); if (play) play.onclick = open;
    };

    /* ---------- the overlay with the game ---------- */
    const ov = document.createElement('div'); ov.className = 'grov'; ov.hidden = true;
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Moluscca Global Revolution');
    ov.innerHTML =
      '<div class="grwin"><div class="grtop"><b>Moluscca Global Revolution</b><span class="grcount"></span><button type="button" class="grmute" aria-label="Mute sound"></button><button type="button" class="grx" aria-label="Close">×</button></div>' +
      '<div class="grstage"><canvas width="' + VIEW_W * TILE + '" height="' + VIEW_H * TILE + '"></canvas><div class="grbox" hidden></div></div><p class="grkeys">Arrow keys or WASD to walk · Space to talk and catch · M to mute · Esc to close</p>' +
      // touch screens only: a small game-boy style pad
      '<div class="grpad" aria-label="Controls"><div class="grdpad"><button type="button" data-k="up" aria-label="Up">▲</button><button type="button" data-k="left" aria-label="Left">◀</button><span></span><button type="button" data-k="right" aria-label="Right">▶</button><button type="button" data-k="down" aria-label="Down">▼</button></div>' +
      '<div class="grab"><button type="button" data-k="act" class="gra" aria-label="Talk or catch">A</button><small>talk · catch</small></div></div></div>';
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
        ? '<a class="sdnew' + (i ? ' bgghost' : '') + '" href="' + b.url + '" target="_blank" rel="noopener"><kbd>' + (i + 1) + '</kbd>' + b.label + '</a>'
        : '<button type="button" class="sdnew' + (i ? ' bgghost' : '') + '" data-i="' + i + '"><kbd>' + (i + 1) + '</kbd>' + b.label + '</button>').join('') + '</div>';
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

    /* ----- your partner (saved in this browser) ----- */
    let team = store.get('mgr-team');                       // { kind, lvl, xp, hp }
    if (team && !STARTERS[team.kind]) team = null;
    const saveTeam = () => store.set('mgr-team', team);
    const partnerStats = () => statsAt(STARTERS[team.kind].base, team.lvl);
    const HOME_SPOT = { x: 16, y: 17 };                      // the grass just below Home's door

    const enterHome = () => {
      if (!team) {
        const pick = k => () => {
          const st = statsAt(STARTERS[k].base, 5); team = { kind: k, lvl: 5, xp: 0, hp: st.max }; saveTeam(); sound.caught();
          talk('<b>' + STARTERS[k].name + ' is your partner!</b> Walk into the tall grass to battle wild things. Weaken one, then press Catch.', [{ label: "Let's go", go: done }]);
        };
        return talk('<b>Home.</b> Choose your partner:<br>' + Object.keys(STARTERS).map(k => '<span class="grpick">' + sprite(k, 2.5) + '<b>' + STARTERS[k].name + '</b> ' + esc(STARTERS[k].blurb) + '</span>').join(''),
          Object.keys(STARTERS).map(k => ({ label: STARTERS[k].name, go: pick(k) })));
      }
      team.hp = partnerStats().max; saveTeam(); sound.caught();
      talk('<b>Home.</b> ' + STARTERS[team.kind].name + ' (Lv ' + team.lvl + ') is fully rested.', [{ label: 'Back outside', go: done }]);
    };

    /* ----- a battle ----- */
    let fight = null;                                          // { foe, me, busy, guard, foeWeak }
    const hpBar = (now, max) => '<span class="grhp"><u style="width:' + Math.max(0, Math.round(now / max * 100)) + '%" class="' + (now / max < .25 ? 'low' : now / max < .5 ? 'mid' : '') + '"></u></span>';
    // the battle backdrop, painted once from the town's own tiles (Kenney Tiny Town): sky, clouds, tree line, bushes, grass
    let backdropUrl = '';
    const backdrop = () => {
      if (backdropUrl) return backdropUrl;
      const W = 960, H = 400, K = 4, P = 16 * K, c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      const tile = (n, x, y, k) => g.drawImage(sheet, (n % 12) * 16, Math.floor(n / 12) * 16, 16, 16, x, y, 16 * (k || K), 16 * (k || K));
      const sky = g.createLinearGradient(0, 0, 0, 190); sky.addColorStop(0, '#7ec8ff'); sky.addColorStop(1, '#d8f1ff'); g.fillStyle = sky; g.fillRect(0, 0, W, 190);
      // chunky pixel clouds
      g.fillStyle = 'rgba(255,255,255,.9)';
      [[90, 40], [380, 24], [700, 52], [860, 18]].forEach(([x, y]) => { [[0, 8, 64, 16], [12, 0, 40, 8], [8, 24, 52, 8]].forEach(([a, b, w, h]) => g.fillRect(x + a, y + b, w, h)); });
      // far hills
      g.fillStyle = '#9fd68f'; for (let x = 0; x < W; x += 8) { const h = 26 + Math.round(Math.sin(x / 70) * 10 + Math.sin(x / 23) * 4); g.fillRect(x, 190 - h, 8, h); }
      // grass ground from the horizon down
      for (let y = 190; y < H; y += P) for (let x = 0; x < W; x += P) tile(((x * 7 + y * 3) / P) % 9 === 0 ? 1 : 0, x, y);
      // a few flowers
      [[40, 330], [300, 360], [520, 300], [880, 350]].forEach(([x, y]) => tile(2, x, y, 3));
      // tree line along the horizon, bushes in front of it
      for (let x = -20; x < W; x += 52) tile(x % 3 === 0 ? 27 : 28, x, 120, 4);
      g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, 186, W, 4);                          // soft shadow line under the trees
      try { backdropUrl = c.toDataURL('image/png'); } catch (e) { backdropUrl = ''; }
      return backdropUrl;
    };
    // classic battle screen: the wild one top right with its HP box, your partner bottom left with yours,
    // the message bottom left and a 2 x 2 menu bottom right (Fight / Catch / Partner / Run)
    const drawBattle = (line, hit) => {
      const P = STARTERS[team.kind], ps = partnerStats(), f = fight.foe, off = fight.busy ? ' disabled' : '';
      const mon = (who, c, key, gone) => '<div class="grmon ' + who + (hit === who ? ' hit' : '') + (gone ? ' out' : '') + '" style="--c:' + c + '">' + sprite(key, who === 'me' ? 7 : 5.5, who === 'foe') + '<span class="grplat"></span></div>';
      const info = (who, name, lvl, type, now, max) => '<div class="grinfo ' + who + '"><b>' + name + '</b><small>Lv ' + lvl + ' · ' + type + '</small>' + hpBar(now, max) + (who === 'me' ? '<em>' + now + ' / ' + max + '</em>' : '') + '</div>';
      const menu = fight.menu === 'moves'
        ? P.moves.map((m, i) => '<button type="button" data-m="' + i + '"' + off + ' class="' + (m.pow ? m.kind : 'skill') + '"><kbd>' + (i + 1) + '</kbd>' + m.n + '<small>' + (m.pow ? m.pow + ' power' : m.kind === 'heal' ? 'heal' : m.kind === 'guard' ? 'defence up' : 'their attack down') + '</small></button>').join('')
        : '<button type="button" data-c="fight" class="fight"' + off + '><kbd>1</kbd>Fight</button><button type="button" data-c="catch" class="catch"' + off + '><kbd>2</kbd>Catch</button>' +
          '<button type="button" data-c="partner" class="partner"' + off + '><kbd>3</kbd>Partner</button><button type="button" data-c="run" class="run"' + off + '><kbd>4</kbd>Run</button>';
      box.innerHTML = '<div class="grscene" style="background-image:url(' + backdrop() + ')">' + mon('foe', f.d.colour, f.d.id, f.hp <= 0) + mon('me', P.colour, team.kind, team.hp <= 0) +
        info('foe', esc(f.d.name), f.lvl, f.type, f.hp, f.max) + info('me', P.name, team.lvl, P.type, team.hp, ps.max) + '</div>' +
        '<div class="grcmd"><p class="grlog">' + line + '</p><div class="grmenu' + (fight.menu === 'moves' ? ' moves' : '') + '">' + menu + '</div></div>' +
        (fight.menu === 'moves' ? '<button type="button" class="grback" data-c="back">Back · Esc</button>' : '');
      box.querySelectorAll('[data-m]').forEach(b => b.onclick = () => battleMove(+b.dataset.m));
      box.querySelectorAll('[data-c]').forEach(b => b.onclick = () => battlePick(b.dataset.c));
      fight.line = line;
    };
    // the main menu: Fight opens the moves, Partner shows your partner's details
    const battlePick = c => {
      if (!fight || fight.busy) return;
      if (c === 'fight') { fight.menu = 'moves'; return drawBattle('Choose a move for ' + STARTERS[team.kind].name + '.'); }
      if (c === 'back') { fight.menu = 'main'; return drawBattle('What will ' + STARTERS[team.kind].name + ' do?'); }
      if (c === 'catch') return battleCatch();
      if (c === 'run') return battleRun();
      if (c === 'partner') { const P = STARTERS[team.kind], ps = partnerStats(); return drawBattle('<b>' + P.name + '</b> · ' + P.type + ' type · Lv ' + team.lvl + ' · ' + team.xp + '/' + team.lvl * 20 + ' XP · attack ' + ps.atk + ', defence ' + ps.def + '. ' + esc(P.blurb) + ' Market beats data, data beats shield, shield beats market.'); }
    };
    const hurt = (pow, atk, def, lvl, moveType, targetType) => {
      const boost = typeBoost(moveType, targetType);
      return { dmg: Math.max(1, Math.round((pow * (atk / def) * (.5 + lvl / 10) / 5 + 2) * boost * (.85 + Math.random() * .15))), boost };
    };
    const startBattle = d => {
      const lvl = Math.max(2, team.lvl + Math.floor(Math.random() * 3) - 1 + (d.id === 'tail' ? 2 : 0));
      const st = statsAt({ hp: 38 + d.hard * 20, atk: 9 + d.hard * 6, def: 9 + d.hard * 4 }, lvl);
      fight = { foe: { d, lvl, type: WILD_TYPE[d.id] || 'data', max: Math.round(st.max), hp: Math.round(st.max), atk: st.atk, def: st.def }, busy: false, guard: 1, foeWeak: 1, menu: 'main' };
      mode = 'battle'; box.hidden = false; box.classList.add('grbattle'); sound.meet(); sound.battleOn();
      if (team.hp <= 0) team.hp = 1;
      drawBattle('A wild <b>' + esc(d.name) + '</b> appeared! What will ' + STARTERS[team.kind].name + ' do?');
    };
    const endBattle = () => { fight = null; saveTeam(); box.classList.remove('grbattle'); sound.battleOff(); done(); };
    const foeTurn = line => {
      const f = fight.foe, ps = partnerStats();
      const pow = f.d.id === 'tail' ? 40 : 30, hit = Math.random() < .9;
      if (!hit) { fight.busy = false; fight.menu = 'main'; return drawBattle(line + ' ' + esc(f.d.name) + ' missed!'); }
      const { dmg, boost } = hurt(pow * fight.foeWeak, f.atk, ps.def * fight.guard, f.lvl, f.type, STARTERS[team.kind].type);
      team.hp = Math.max(0, team.hp - dmg); sound.bump();
      line += ' ' + esc(f.d.name) + ' hits back for ' + dmg + (boost > 1 ? ', it is strong against you!' : '.');
      if (team.hp <= 0) {
        fight.busy = true; drawBattle(line, 'me');
        return setTimeout(() => {
          team.hp = partnerStats().max; saveTeam(); fight = null; box.classList.remove('grbattle'); sound.battleOff();
          me.x = me.tx = HOME_SPOT.x; me.y = me.ty = HOME_SPOT.y; me.px = me.x * TILE; me.py = me.y * TILE; me.moving = false; sound.escaped();
          talk('<b>' + STARTERS[team.kind].name + ' fainted.</b> You hurry home and rest. All healed, try again!', [{ label: 'OK', go: done }]);
        }, 900);
      }
      fight.busy = false; fight.menu = 'main'; drawBattle(line, 'me');
    };
    const battleMove = i => {
      if (!fight || fight.busy || mode !== 'battle') return;
      const P = STARTERS[team.kind], m = P.moves[i], f = fight.foe, ps = partnerStats(); if (!m) return;
      fight.busy = true; let line;
      if (Math.random() > m.acc) line = P.name + ' used ' + m.n + ', but it missed.';
      else if (m.kind === 'heal') { const add = Math.round(ps.max * .35); team.hp = Math.min(ps.max, team.hp + add); line = P.name + ' used ' + m.n + ' and healed ' + add + ' HP.'; sound.blip(); }
      else if (m.kind === 'guard') { fight.guard = Math.min(2, fight.guard + .4); line = P.name + ' used ' + m.n + '. Defence up!'; sound.blip(); }
      else if (m.kind === 'lower') { fight.foeWeak = Math.max(.5, fight.foeWeak - .2); line = P.name + ' used ' + m.n + '. ' + esc(f.d.name) + '\'s attack fell!'; sound.blip(); }
      else {
        const { dmg, boost } = hurt(m.pow * 1.45, ps.atk, f.def, team.lvl, m.kind === 'drain' ? P.type : m.kind, f.type);
        f.hp = Math.max(0, f.hp - dmg); sound.step(1);
        line = P.name + ' used ' + m.n + ' for ' + dmg + (boost > 1 ? '. Super effective!' : boost < 1 ? '. Not very effective.' : '.'); fight.hitSide = 'foe';
        if (m.kind === 'drain') { const back = Math.round(dmg / 2); team.hp = Math.min(ps.max, team.hp + back); line += ' Took back ' + back + ' HP.'; }
      }
      drawBattle(line, fight.hitSide); fight.hitSide = '';
      if (f.hp <= 0) {
        return setTimeout(() => {
          const xp = 10 + f.lvl * 4; team.xp += xp; let up = '';
          while (team.xp >= team.lvl * 20) { team.xp -= team.lvl * 20; team.lvl++; up = ' ' + STARTERS[team.kind].name + ' grew to Lv ' + team.lvl + '!'; }
          sound.caught(); endBattle();
          talk('<b>' + esc(f.d.name) + ' fainted.</b> +' + xp + ' XP.' + up + ' Weaken one without knocking it out to catch it.', [{ label: 'Nice', go: done }]);
        }, 700);
      }
      setTimeout(() => fight && foeTurn(line), 700);
    };
    const battleCatch = () => {
      if (!fight || fight.busy) return;
      const f = fight.foe, chance = Math.min(.95, Math.max(.08, (1 - f.hp / f.max) * .95 + .12 - f.d.hard * .25));
      fight.busy = true; drawBattle('You throw a capture orb…');
      const got = Math.random() < chance;
      // the throw: an orb arcs from your partner to the wild one, it gets pulled in, the orb wobbles 3 times
      const scene = box.querySelector('.grscene'), foeEl = scene && scene.querySelector('.grmon.foe .grspr'), meEl = scene && scene.querySelector('.grmon.me .grspr');
      const log = t => { const p = box.querySelector('.grlog'); if (p) p.innerHTML = t; };
      let wait = 700;
      if (scene && foeEl && meEl && Element.prototype.animate) {
        const S = scene.getBoundingClientRect(), A = meEl.getBoundingClientRect(), B = foeEl.getBoundingClientRect();
        const x0 = A.left - S.left + A.width / 2 - 13, y0 = A.top - S.top + A.height / 3, x1 = B.left - S.left + B.width / 2 - 13, y1 = B.top - S.top + B.height - 30;
        const orb = document.createElement('span'); orb.className = 'grorb'; scene.appendChild(orb);
        orb.animate([{ transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.5) rotate(0)' }, { transform: 'translate(' + (x0 + x1) / 2 + 'px,' + Math.min(y0, y1) * .15 + 'px) scale(1) rotate(360deg)' }, { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(1) rotate(720deg)' }], { duration: 650, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' }).onfinish = e => { orb.style.translate = x1 + 'px ' + y1 + 'px'; e.target.cancel(); };   // stay where it landed (wobbles spin in place)
        sound.blip();
        setTimeout(() => { foeEl.animate([{ opacity: 1, transform: 'scale(1)', filter: 'brightness(1)' }, { opacity: 0, transform: 'scale(.1) translateY(30px)', filter: 'brightness(4)' }], { duration: 300, fill: 'forwards' }); sound.door(); }, 650);
        const wobble = n => setTimeout(() => { log('…' + '•'.repeat(n)); sound.step(n % 2); orb.animate([{ rotate: '0deg' }, { rotate: '-22deg' }, { rotate: '18deg' }, { rotate: '0deg' }], { duration: 380, easing: 'ease-in-out' }); }, 1000 + n * 520);
        const tries = got ? 3 : 1 + Math.floor(Math.random() * 3);
        for (let n = 0; n < tries; n++) wobble(n);
        wait = 1000 + tries * 520 + 350;
        setTimeout(() => {
          if (got) { orb.classList.add('shut'); }
          else { orb.classList.add('burst'); foeEl.animate([{ opacity: 0, transform: 'scale(.1)' }, { opacity: 1, transform: 'scale(1.15)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 320, fill: 'forwards' }); }
        }, wait - 300);
      }
      setTimeout(() => {
        if (!fight) return;
        if (got) {
          const d = f.d, isNew = !caught.includes(d.id); save(d.id); const all = caught.length === DEX.length;
          if (all && isNew) sound.complete(); else sound.caught();
          endBattle();
          talk('<b>Gotcha! ' + esc(d.name) + ' was caught.</b>' + (isNew ? ' Added to your Molusdex.' : ' You already had one.') + (all ? '<br>That is all six. Molusdex complete!' : ''),
            d.url ? [{ label: 'Nice', go: done }, { label: 'Visit ' + d.name, url: d.url }] : [{ label: 'Nice', go: done }]);
        } else { sound.escaped(); foeTurn(esc(f.d.name) + ' broke free!'); }
      }, wait + 250);
    };
    const battleRun = () => { if (!fight || fight.busy) return; endBattle(); };

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
      if (b && b.home && lastDoor !== t) { lastDoor = t; held.clear(); sound.door(); return enterHome(); }
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
        held.clear(); const wild = pool[Math.floor(Math.random() * pool.length)];
        if (team) startBattle(wild); else meet(wild);   // no partner yet: the old quick catch
      }
    };
    const act = () => {
      if (mode === 'catch') return tryCatch();
      if (mode === 'battle') return;
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
    const LOOK = { A: { roof: 'blue', wall: 'stone' }, S: { roof: 'red', wall: 'wood' }, Q: { roof: 'blue', wall: 'wood' }, H: { roof: 'red', wall: 'wood' } };
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
      if (e.key === 'Escape') { e.preventDefault(); if (mode === 'battle' && fight && fight.menu === 'moves') return battlePick('back'); return close(); }
      if ((e.key === 'm' || e.key === 'M') && e.type === 'keydown') { e.preventDefault(); return toggleMute(); }
      if (mode === 'talk' && e.type === 'keydown' && /^[1-9]$/.test(e.key)) { const pick = box.querySelectorAll('.grbtns > button, .grbtns > a')[+e.key - 1]; if (pick) { e.preventDefault(); pick.click(); } return; }
      if (mode === 'battle' && e.type === 'keydown' && fight) { const k = e.key.toLowerCase(); if (k === 'escape' && fight.menu === 'moves') { e.preventDefault(); return battlePick('back'); } if ('1234'.includes(k) && k) { e.preventDefault(); return fight.menu === 'moves' ? battleMove(+k - 1) : battlePick(['fight', 'catch', 'partner', 'run'][+k - 1]); } if (k === 'c') { e.preventDefault(); return battleCatch(); } if (k === 'r') { e.preventDefault(); return battleRun(); } }
      if (e.key === ' ' || e.key === 'Enter') { if (e.target.tagName === 'A') return; e.preventDefault(); if (e.type === 'keydown' && !e.repeat) act(); return; }
      const k = KEYS[e.key]; if (!k) return; e.preventDefault();
      if (e.type === 'keydown') held.add(k); else held.delete(k);
    };
    document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKey);
    // the touch pad: hold a direction to keep walking, A talks or catches
    ov.querySelectorAll('.grpad [data-k]').forEach(b => {
      const k = b.dataset.k;
      if (k === 'act') { b.addEventListener('pointerdown', e => { e.preventDefault(); act(); }); return; }
      const on = e => { e.preventDefault(); held.add(k); b.classList.add('down'); }, off = () => { held.delete(k); b.classList.remove('down'); };
      b.addEventListener('pointerdown', on); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, off));
      b.addEventListener('contextmenu', e => e.preventDefault());
    });
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
      if (!caught.length && mode === 'walk' && frame === 0) talk('<b>Welcome to Moluscca Global Revolution!</b> You are the octopus. First visit <b>Home</b>, the little house by the path, to choose your partner. Then walk into the tall grass to battle wild things and catch all six.', [{ label: "Let's go", go: done }]);
      requestAnimationFrame(loop);
    }
    function close() { ov.hidden = true; running = false; sound.musicOff(); held.clear(); document.documentElement.classList.remove('grlock'); renderDex(); }

    renderDex();
  }

  window.boardGames = Object.assign(window.boardGames || {}, { mgr });
})();
