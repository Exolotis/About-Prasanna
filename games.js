/* Games: tabs (Sudoku + five one-minute maths games), score logging and a leaderboard (Supabase table game_scores). */
(() => {
  const SB = 'https://orhlwvmxnsztwhfimjru.supabase.co/rest/v1/game_scores';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yaGx3dm14bnN6dHdoZmltanJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MjMwNDAsImV4cCI6MjEwMDA5OTA0MH0.Q8DRd40-OJcxuWRMpToCF9qF2XbsM1QGU_rdrr4_mQs';
  const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
  const sec = document.getElementById('play'), sdk = sec && sec.querySelector('.sdk'); if (!sdk) return;
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), pick = a => a[Math.floor(Math.random() * a.length)];
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* ---------- question makers (every answer is a whole number) ---------- */
  const expr = () => { const k = rnd(0, 4);
    if (k === 0) { const a = rnd(10, 99), b = rnd(10, 99); return [a + ' + ' + b, a + b]; }
    if (k === 1) { const a = rnd(20, 99), b = rnd(2, a - 1); return [a + ' − ' + b, a - b]; }
    if (k === 2) { const a = rnd(2, 12), b = rnd(2, 12); return [a + ' × ' + b, a * b]; }
    if (k === 3) { const b = rnd(2, 12), q = rnd(2, 12); return [b * q + ' ÷ ' + b, q]; }
    const a = rnd(10, 60), b = rnd(1, 9), c = rnd(1, 9); return [a + ' − ' + b + ' + ' + c, a - b + c]; };
  const G = {
    quick: { name: 'Quick maths', how: 'Type the answer. It moves on by itself.', input: true, q: () => { const [t, a] = expr(); return { t: t + ' =', a }; } },
    bigger: { name: 'Bigger or smaller', how: 'Tap the bigger one, or use ← and →.', q: () => { let l, r; do { l = expr(); r = expr(); } while (l[1] === r[1]); return { l: l[0], r: r[0], a: l[1] > r[1] ? 0 : 1 }; } },
    sequence: { name: "What's next", how: 'Spot the pattern. Type the next number.', input: true, q: () => { const k = rnd(0, 3); let s;
      if (k === 0) { const a = rnd(1, 30), d = rnd(2, 12); s = [0, 1, 2, 3, 4].map(i => a + d * i); }
      else if (k === 1) { const a = rnd(60, 120), d = rnd(3, 11); s = [0, 1, 2, 3, 4].map(i => a - d * i); }
      else if (k === 2) { const a = rnd(1, 5), m = pick([2, 3]); s = [0, 1, 2, 3, 4].map(i => a * Math.pow(m, i)); }
      else { const a = rnd(1, 8); s = [0, 1, 2, 3, 4].map(i => (a + i) * (a + i)); }
      return { t: s.slice(0, 4).join(', ') + ', ?', a: s[4] }; } }
  };
  const TABS = [['sudoku', 'Sudoku'], ['quick', 'Quick maths'], ['bigger', 'Bigger or smaller'], ['sequence', "What's next"], ['wordle', 'Wordle'], ['memory', 'Memory']];
  const NAMES = { wordle: 'Wordle', memory: 'Memory' }, ASC = g => /^(sudoku|wordle|memory)/.test(g);
  const show = (g, s) => g.startsWith('sudoku') ? fmt(s) : g === 'wordle' ? Math.floor(s / 1000) + (Math.floor(s / 1000) > 1 ? ' tries' : ' try') + ' · ' + fmt(s % 1000) : g === 'memory' ? Math.floor(s / 1000) + ' moves · ' + fmt(s % 1000) : s;
  const label = g => g.startsWith('sudoku') ? 'Sudoku · ' + g.split('-')[1][0].toUpperCase() + g.split('-')[1].slice(1) : (NAMES[g] || G[g].name);

  /* ---------- markup ---------- */
  const bar = document.createElement('div'); bar.className = 'gbar';
  bar.innerHTML = '<div class="gtabs" role="tablist">' + TABS.map((t, i) => '<button type="button" role="tab" data-g="' + t[0] + '" aria-selected="' + !i + '">' + t[1] + '</button>').join('') + '</div>' +
    '<button type="button" class="glb" id="glbb" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg><span>Leaderboard</span></button>';
  const lb = document.createElement('div'); lb.className = 'glbp'; lb.hidden = true;
  const mg = document.createElement('div'); mg.className = 'sdk mg'; mg.hidden = true;
  mg.innerHTML = '<div class="sdh"><b class="mgn"></b><span class="sdt mgt">1:00</span></div><div class="mgbar"><i></i></div>' +
    '<div class="mgstage"><div class="mgintro"><p class="mghow"></p><button type="button" class="sdnew mgstart">Start · 60 seconds</button><p class="mgbest"></p></div>' +
    '<div class="mgplay" hidden><div class="mgq"></div><div class="mgans"><input class="mgin" inputmode="numeric" autocomplete="off" aria-label="Your answer"><div class="mgch"><button type="button" data-c="0"></button><button type="button" data-c="1"></button></div></div><div class="mgsc">Score <b>0</b></div></div>' +
    '<div class="mgend" hidden></div></div>';
  sdk.before(bar); bar.after(lb); sdk.after(mg);

  /* ---------- leaderboard ---------- */
  let cur = 'sudoku';
  const boardKey = () => { if (cur !== 'sudoku') return cur; const lv = document.querySelector('#sdlv .on'); return 'sudoku-' + ({ 38: 'easy', 46: 'medium', 53: 'hard' }[lv ? lv.dataset.l : 38] || 'easy'); };
  document.getElementById('sdn').addEventListener('click', () => { const o = sdk.querySelector('.gjoin'); if (o) o.remove(); });
  document.querySelectorAll('#sdlv button').forEach(b => b.addEventListener('click', () => { const o = sdk.querySelector('.gjoin'); if (o) o.remove(); }));
  const showBoard = async g => { g = g || boardKey(); const asc = ASC(g);
    lb.innerHTML = '<div class="glbh"><b>' + label(g) + '</b><small>' + (g.startsWith('sudoku') ? 'Fastest times' : g === 'wordle' ? 'Fewest tries, then fastest' : g === 'memory' ? 'Fewest moves, then fastest' : 'Top scores in 60 seconds') + '</small></div><ol class="glbl"><li class="glbe">Loading…</li></ol>';
    try { const r = await fetch(SB + '?select=name,avatar,score&listed=eq.true&game=eq.' + g + '&order=score.' + (asc ? 'asc' : 'desc') + ',created_at.asc&limit=10', { headers: H });
      const rows = r.ok ? await r.json() : [];
      lb.querySelector('ol').innerHTML = rows.length ? rows.map((x, i) => '<li><span class="rk">' + (i + 1) + '</span>' + (/^data:image\//.test(x.avatar || '') ? '<img src="' + esc(x.avatar) + '" alt="">' : '<i>' + esc((x.name || '?')[0].toUpperCase()) + '</i>') +
        '<span class="nm">' + esc(x.name) + '</span><b>' + show(g, x.score) + '</b></li>').join('') : '<li class="glbe">No one yet. Finish a game and take the top spot.</li>';
    } catch (e) { lb.querySelector('ol').innerHTML = '<li class="glbe">The leaderboard is taking a break. Try again soon.</li>'; } };
  const lbb = document.getElementById('glbb');
  lbb.onclick = () => { const open = lb.hidden; lb.hidden = !open; lbb.setAttribute('aria-expanded', open); lbb.classList.toggle('on', open); if (open) showBoard(); };

  /* ---------- after a game: log it, offer the leaderboard ---------- */
  const log = (game, score, extra) => fetch(SB, { method: 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, H), body: JSON.stringify(Object.assign({ game, score }, extra || {})) }).then(r => r.ok);
  const shrink = file => new Promise((res, rej) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), s = Math.min(img.width, img.height);
    x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 64, 64); let d = c.toDataURL('image/webp', .8); if (!d.startsWith('data:image/webp')) d = c.toDataURL('image/jpeg', .8); URL.revokeObjectURL(img.src); res(d); }; img.onerror = rej; img.src = URL.createObjectURL(file); });
  const offer = (host, game, score, shown) => {
    const name = store.get('g-name') || '', av = store.get('g-av') || '';
    const f = document.createElement('form'); f.className = 'gjoin';
    f.innerHTML = '<p>' + shown + ' Put it on the leaderboard?</p><div class="gjr"><label class="gav" title="Add a photo (optional)"><input type="file" accept="image/*" hidden><span>' + (av ? '<img src="' + esc(av) + '" alt="">' : '+') + '</span></label>' +
      '<input class="gnm" maxlength="20" placeholder="Your name" aria-label="Your name" value="' + esc(name) + '"><button type="submit" class="sdnew">Add me</button></div><button type="button" class="lnk gskip">No thanks</button><p class="gmsg" role="status"></p>';
    host.appendChild(f); let pic = av;
    f.querySelector('input[type=file]').onchange = async e => { const fl = e.target.files[0]; if (!fl) return; try { pic = await shrink(fl); f.querySelector('.gav span').innerHTML = '<img src="' + pic + '" alt="">'; } catch (x) { f.querySelector('.gmsg').textContent = "That photo didn't open."; } };
    f.querySelector('.gskip').onclick = () => f.remove();
    f.onsubmit = async e => { e.preventDefault(); const n = f.querySelector('.gnm').value.trim().slice(0, 20); if (!n) return f.querySelector('.gnm').focus();
      const b = f.querySelector('[type=submit]'); b.disabled = true; b.textContent = 'Adding…';
      const ok = await log(game, score, { listed: true, name: n, avatar: pic || null }).catch(() => false);
      if (ok) { store.set('g-name', n); if (pic) store.set('g-av', pic); f.innerHTML = '<p class="gok">You\'re on the board, ' + esc(n) + '.</p>'; lb.hidden = false; lbb.classList.add('on'); lbb.setAttribute('aria-expanded', true); showBoard(game); }
      else { b.disabled = false; b.textContent = 'Add me'; f.querySelector('.gmsg').textContent = "Couldn't add that just now. Try again."; } };
  };
  window.gameDone = (game, score) => { log(game, score); const m = document.getElementById('sdm'); if (!m) return;
    const old = sdk.querySelector('.gjoin'); if (old) old.remove(); offer(sdk, game, score, 'Solved in ' + fmt(score) + '.'); };

  /* ---------- maths games ---------- */
  const q = sel => mg.querySelector(sel), inp = q('.mgin'), chs = mg.querySelectorAll('.mgch button');
  let st = null;
  const best = k => +(store.get('g-best-' + k) || 0);
  const intro = () => { const g = G[cur]; q('.mgn').textContent = g.name; q('.mghow').textContent = g.how; q('.mgt').textContent = '1:00'; q('.mgbar i').style.transform = 'scaleX(1)';
    q('.mgbest').textContent = best(cur) ? 'Your best: ' + best(cur) : ''; q('.mgintro').hidden = false; q('.mgplay').hidden = true; q('.mgend').hidden = true; };
  const next = () => { const g = G[cur]; st.q = g.q(); const Q = st.q;
    if (g.input) { q('.mgq').textContent = Q.t; q('.mgq').classList.remove('sm'); inp.value = ''; inp.hidden = false; q('.mgch').hidden = true; }
    else { q('.mgq').textContent = Q.t || 'Which is bigger?'; q('.mgq').classList.toggle('sm', !Q.t); inp.hidden = true; q('.mgch').hidden = false; chs[0].textContent = Q.l; chs[1].textContent = Q.r; } };
  const score = d => { st.s += d; q('.mgsc b').textContent = st.s; };
  const flash = ok => { const e = q('.mgq'); e.classList.remove('ok', 'no'); void e.offsetWidth; e.classList.add(ok ? 'ok' : 'no'); };
  const end = () => { clearInterval(st.tm); const s = st.s, k = cur; st = null; q('.mgplay').hidden = true; const E = q('.mgend'); E.hidden = false;
    const pb = s > best(k); if (pb) store.set('g-best-' + k, s);
    E.innerHTML = '<div class="mgfin"><small>Final score</small><b>' + s + '</b>' + (pb && s ? '<span>New personal best</span>' : '') + '</div><button type="button" class="sdnew mgagain">Play again</button>';
    E.querySelector('.mgagain').onclick = start; log(k, s); if (s > 0) offer(E, k, s, 'You scored ' + s + '.'); };
  const start = () => { st = { s: 0, t0: Date.now() }; q('.mgsc b').textContent = 0; q('.mgintro').hidden = true; q('.mgend').hidden = true; q('.mgplay').hidden = false; next();
    if (G[cur].input) setTimeout(() => inp.focus(), 30);
    st.tm = setInterval(() => { const left = Math.max(0, 60 - (Date.now() - st.t0) / 1000); q('.mgt').textContent = fmt(Math.ceil(left)); q('.mgbar i').style.transform = 'scaleX(' + left / 60 + ')'; if (!left) end(); }, 100); };
  q('.mgstart').onclick = start;
  inp.addEventListener('input', () => { if (!st) return; inp.value = inp.value.replace(/[^\d-]/g, ''); if (inp.value !== '' && +inp.value === st.q.a) { score(1); flash(true); next(); } });
  const choose = c => { if (!st) return; const ok = c === st.q.a; if (ok) score(1); flash(ok); next(); };
  chs.forEach(b => b.onclick = () => choose(+b.dataset.c));
  document.addEventListener('keydown', e => { if (!st || !G[cur] || G[cur].input || mg.hidden) return; if (e.key === 'ArrowLeft') { e.preventDefault(); choose(0); } if (e.key === 'ArrowRight') { e.preventDefault(); choose(1); } });

  /* ---------- Wordle: random word, six tries ---------- */
  const WORDS = ('about above actor acute adapt admit adopt adult after again agent agree ahead alarm album alert alike alive allow alone along alter amber angel anger angle angry apart apple apply arena argue arise array aside asset audio audit avoid award aware badge basic beach began begin being below bench birth black blade blame blank blast blend bless blind block blood board boost booth bound brain brand brave bread break breed brick brief bring broad brown build built buyer cabin cable candy carry catch cause chain chair chalk charm chart chase cheap check chess chest chief child chill civil claim class clean clear clerk click climb clock close cloud coach coast could count court cover craft crane crash crazy cream crime cross crowd crown curve cycle daily dance dealt death delay depth dirty doubt dozen draft drama dream dress drink drive eager early earth eight elite empty enemy enjoy enter entry equal error event every exact exist extra faith false fancy fault favor feast fence fewer fiber field fifth fifty fight final first flame flash fleet float floor fluid focus force forth forty forum found frame fresh front fruit funny ghost giant given glass globe glory grace grade grain grand grant grape graph grass great green group guard guess guest guide habit happy heart heavy hello honey horse hotel house human humor ideal image index inner input issue jelly joint judge juice knife known label large laser later laugh layer learn lease least lemon level light limit local logic loose lucky lunch magic major maker march match maybe mayor medal media metal meter might minor model money month moral motor mount mouse mouth movie music nerve never night noble noise north novel nurse ocean offer often olive onion opera orbit order other ought ounce outer owner paint panel paper party peace pearl phase phone photo piano piece pilot pitch pizza place plain plane plant plate point polar pound power press price pride prime print prior prize proof proud prove queen quick quiet quite radio raise range rapid ratio reach ready realm relax reply rider ridge right rival river robot rough round route royal rural salad scale scene scope score sense serve seven shade shake shape share sharp sheep shelf shell shift shine shirt shock shoot short shout sight skill sleep slice slide small smart smile smoke snake solar solid solve sound south space spare speak speed spend spice spike split spoon sport staff stage stake stand start state steam steel stick still stock stone store storm story stove study style sugar sunny super sweet swing table taste teach thank theme there thick thing think third three throw tiger tight title toast today token topic total touch tough tower trace track trade trail train treat trend trial tribe trick truck truly trust truth twice uncle under union unity until upper upset urban usage usual valid value video virus visit vital vivid voice waste watch water wheel where which while white whole woman world worry worth would wound write wrong yield young youth zebra').split(' ');
  const wd = document.createElement('div'); wd.className = 'sdk wd'; wd.hidden = true;
  wd.innerHTML = '<div class="sdh"><b>Wordle</b><span class="sdt wdt">0:00</span></div><div class="wdg"></div><p class="wdmsg" role="status"></p><div class="wdk"></div><div class="wdend"></div>';
  mg.after(wd);
  const W = {}, wg = wd.querySelector('.wdg'), wk = wd.querySelector('.wdk'), wmsg = wd.querySelector('.wdmsg');
  for (let i = 0; i < 30; i++) wg.appendChild(document.createElement('span'));
  ['qwertyuiop', 'asdfghjkl', '+zxcvbnm-'].forEach(r => { const row = document.createElement('div'); [...r].forEach(ch => { const b = document.createElement('button'); b.type = 'button';
    b.dataset.k = ch === '+' ? 'Enter' : ch === '-' ? 'Backspace' : ch; b.textContent = ch === '+' ? 'Enter' : ch === '-' ? '⌫' : ch; if (ch === '+' || ch === '-') b.className = 'wide'; row.appendChild(b); }); wk.appendChild(row); });
  const day = Math.floor((Date.now() + 19800000) / 86400000), dailyWord = WORDS[(day * 7919 + 13) % WORDS.length];
  const wStart = practice => { W.practice = !!practice; W.ans = practice ? pick(WORDS) : dailyWord; wd.querySelector('.sdh b').textContent = practice ? 'Wordle · Practice' : 'Wordle · Today'; W.row = 0; W.col = 0; W.done = false; W.t0 = 0; wmsg.textContent = practice ? 'Practice word. Not on the leaderboard.' : "Today's word. Same for everyone, one go a day."; wd.querySelector('.wdend').innerHTML = '';
    wg.querySelectorAll('span').forEach(s => { s.textContent = ''; s.className = ''; }); wk.querySelectorAll('button').forEach(b => b.className = b.className.replace(/\b(g|y|x)\b/g, '').trim());
    clearInterval(W.tm); wd.querySelector('.wdt').textContent = '0:00';
    const done = !practice && store.get('wd-' + day); if (done) { W.done = true; wmsg.textContent = 'You played today' + (done === 'x' ? '. Tomorrow brings a new word.' : ': ' + done + '. New word tomorrow.'); const E = wd.querySelector('.wdend'); E.innerHTML = '<button type="button" class="sdnew">Practice with a random word</button>'; E.firstChild.onclick = () => wStart(true); } };
  const cell = (r, c) => wg.children[r * 5 + c];
  const wKey = k => { if (W.done || !W.ans) return;
    if (!W.t0 && /^[a-z]$/i.test(k)) { W.t0 = Date.now(); W.tm = setInterval(() => { wd.querySelector('.wdt').textContent = fmt(Math.round((Date.now() - W.t0) / 1000)); }, 1000); }
    if (/^[a-z]$/i.test(k) && W.col < 5) { const c = cell(W.row, W.col++); c.textContent = k.toLowerCase(); c.className = 'f'; return; }
    if (k === 'Backspace' && W.col > 0) { const c = cell(W.row, --W.col); c.textContent = ''; c.className = ''; return; }
    if (k !== 'Enter') return;
    if (W.col < 5) { wmsg.textContent = 'Five letters, please.'; wg.classList.remove('shk'); void wg.offsetWidth; wg.classList.add('shk'); return; }
    const guess = [...Array(5)].map((_, i) => cell(W.row, i).textContent).join(''), res = Array(5).fill('x'), left = W.ans.split('');
    for (let i = 0; i < 5; i++) if (guess[i] === W.ans[i]) { res[i] = 'g'; left[i] = null; }
    for (let i = 0; i < 5; i++) if (res[i] !== 'g') { const j = left.indexOf(guess[i]); if (j > -1) { res[i] = 'y'; left[j] = null; } }
    res.forEach((r, i) => { const c = cell(W.row, i); setTimeout(() => { c.className = r + ' flip'; }, i * 120);
      const kb = wk.querySelector('[data-k="' + guess[i] + '"]'); if (kb && !/\bg\b/.test(kb.className)) { kb.classList.remove('x', 'y'); kb.classList.add(r); } });
    const win = guess === W.ans; W.row++; W.col = 0;
    if (win || W.row === 6) { W.done = true; clearInterval(W.tm); const secs = Math.min(999, Math.max(1, Math.round((Date.now() - W.t0) / 1000))), E = wd.querySelector('.wdend');
      setTimeout(() => { wmsg.textContent = win ? (W.row === 1 ? 'First try. Unreal.' : 'Got it in ' + W.row + ' tries, ' + fmt(secs) + '.') : 'The word was ' + W.ans.toUpperCase() + '.';
        E.innerHTML = '<button type="button" class="sdnew">' + (W.practice ? 'Another practice word' : 'Practice with a random word') + '</button>'; E.firstChild.onclick = () => wStart(true);
        if (!W.practice) store.set('wd-' + day, win ? W.row + (W.row > 1 ? ' tries' : ' try') + ', ' + fmt(secs) : 'x');
        if (win && !W.practice) { const sc = W.row * 1000 + secs; log('wordle', sc); offer(E, 'wordle', sc, ''); } }, 700); }
    else wmsg.textContent = ''; };
  wk.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) wKey(b.dataset.k); });
  document.addEventListener('keydown', e => { if (wd.hidden || e.ctrlKey || e.metaKey || e.altKey || /input|textarea/i.test((e.target.tagName || ''))) return;
    if (/^[a-z]$/i.test(e.key) || e.key === 'Enter' || e.key === 'Backspace') { const r = wd.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; e.preventDefault(); wKey(e.key); } });

  /* ---------- Memory: 8 pairs of maths symbols ---------- */
  const SYM = ['∑', 'π', '∞', '√', 'Δ', 'λ', 'σ', 'μ'];
  const mm = document.createElement('div'); mm.className = 'sdk mm'; mm.hidden = true;
  mm.innerHTML = '<div class="sdh"><b>Memory</b><span class="sdt mmt">0 moves · 0:00</span></div><div class="mmg"></div><div class="mmend"></div>';
  wd.after(mm);
  const M = {}, mgd = mm.querySelector('.mmg');
  const mStat = () => { mm.querySelector('.mmt').textContent = M.moves + (M.moves === 1 ? ' move · ' : ' moves · ') + fmt(M.t0 ? Math.round((Date.now() - M.t0) / 1000) : 0); };
  const mStart = () => { M.cards = SYM.concat(SYM).sort(() => Math.random() - .5); M.open = []; M.moves = 0; M.found = 0; M.t0 = 0; M.lock = false; clearInterval(M.tm); mm.querySelector('.mmend').innerHTML = '';
    mgd.innerHTML = M.cards.map((s, i) => '<button type="button" class="mc" data-i="' + i + '" aria-label="Card ' + (i + 1) + '"><span class="fr">' + s + '</span><span class="bk"></span></button>').join(''); mStat(); };
  mgd.addEventListener('click', e => { const b = e.target.closest('.mc'); if (!b || M.lock || b.classList.contains('up')) return;
    if (!M.t0) { M.t0 = Date.now(); M.tm = setInterval(mStat, 1000); }
    b.classList.add('up'); M.open.push(b); if (M.open.length < 2) return;
    M.moves++; mStat(); const [a, c] = M.open; M.open = [];
    if (M.cards[a.dataset.i] === M.cards[c.dataset.i]) { a.classList.add('got'); c.classList.add('got'); M.found++;
      if (M.found === 8) { clearInterval(M.tm); const secs = Math.min(999, Math.round((Date.now() - M.t0) / 1000)), sc = Math.min(99, M.moves) * 1000 + secs, E = mm.querySelector('.mmend');
        E.innerHTML = '<p class="wdmsg">All pairs in ' + M.moves + ' moves, ' + fmt(secs) + '.</p><button type="button" class="sdnew">Play again</button>'; E.querySelector('button').onclick = mStart; log('memory', sc); offer(E, 'memory', sc, ''); } }
    else { M.lock = true; setTimeout(() => { a.classList.remove('up'); c.classList.remove('up'); M.lock = false; }, 750); } });

  /* ---------- tabs ---------- */
  bar.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
    if (st) { clearInterval(st.tm); st = null; }
    bar.querySelectorAll('[data-g]').forEach(x => x.setAttribute('aria-selected', x === b)); cur = b.dataset.g; b.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    sdk.hidden = cur !== 'sudoku'; mg.hidden = !G[cur]; wd.hidden = cur !== 'wordle'; mm.hidden = cur !== 'memory'; if (G[cur]) intro(); if (cur === 'wordle' && !W.ans) wStart(false); if (cur === 'memory' && !M.cards) mStart(); if (!lb.hidden) showBoard(); });
  document.querySelectorAll('#sdlv button').forEach(b => b.addEventListener('click', () => { if (!lb.hidden) setTimeout(showBoard, 0); }));
})();
