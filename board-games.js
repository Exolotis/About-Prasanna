/* Board games for the Games section: Chess and Tic-tac-toe.
   Both can be played against the bot or by two people on one device.
   games.js calls boardGames.chess(panel) and boardGames.ttt(panel) to build them. */
(() => {
  const el = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; };
  const segPick = (seg, onPick) => seg.querySelectorAll('button').forEach(b => b.onclick = () => {
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); onPick(b);
  });

  /* =====================================================================
     CHESS
     The board is 64 squares, index = row * 8 + column, row 0 is the top (black's side).
     White pieces are capital letters (P N B R Q K), black pieces are small letters.
     ===================================================================== */
  const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  // flat, simple piece drawings (40 x 40). "cut" lines are drawn in the opposite colour.
  const BASE = '<rect x="10" y="31" width="20" height="4" rx="2"/>';
  const SHAPE = {
    p: '<circle cx="20" cy="14" r="5"/><path d="M14.5 30c.4-5.5 2.2-9 5.5-9s5.1 3.5 5.5 9z"/>' + BASE,
    r: '<path d="M12.5 9h4v3h2v-3h3v3h2v-3h4v6.5l-2.5 2V28l2 2h-15l2-2V17.5l-2.5-2z"/>' + BASE,
    n: '<path d="M14 30c-.3-4.5 1.5-7.5 4.5-10l-5 1.5-2-2.5 6.5-8 2-3.5 1.5 2.5c5.5 1.5 8.5 6.5 8.5 13V30z"/><circle class="dot" cx="19.5" cy="12.5" r="1.3"/>' + BASE,
    b: '<circle cx="20" cy="6.5" r="2.2"/><path d="M20 9.5c5 3.5 6.8 8 5.8 12-.6 2.4-2.3 3.6-2.3 5L24.5 30h-9l1-3.5c0-1.4-1.7-2.6-2.3-5-1-4 .8-8.5 5.8-12z"/><path class="cut" d="M22 14.5l-3.5 4.5"/>' + BASE,
    q: '<circle cx="11" cy="11.5" r="2.2"/><circle cx="20" cy="8" r="2.2"/><circle cx="29" cy="11.5" r="2.2"/><path d="M11 13l3 13h12l3-13-5.5 6.5L20 10l-3.5 9.5z"/><path d="M14 26.5h12l1 3.5H13z"/>' + BASE,
    k: '<rect x="19" y="3.5" width="2" height="9" rx="1"/><rect x="16" y="6" width="8" height="2" rx="1"/><path d="M12.5 15.5c3-2.5 12-2.5 15 0L25 26.5H15z"/><path d="M14 26.5h12l1 3.5H13z"/>' + BASE
  };
  const sideOf = p => p ? (p === p.toUpperCase() ? 'w' : 'b') : null;
  const other = side => side === 'w' ? 'b' : 'w';
  const onBoard = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const STRAIGHT = [[-1, 0], [1, 0], [0, -1], [0, 1]], DIAGONAL = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  const startPosition = () => ({
    b: 'rnbqkbnrpppppppp' .split('').concat(Array(32).fill(''), 'PPPPPPPPRNBQKBNR'.split('')),
    turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0
  });

  // is square sq attacked by side "by"?
  function attacked(b, sq, by) {
    const r = sq >> 3, c = sq & 7, own = p => sideOf(p) === by;
    const pr = by === 'w' ? r + 1 : r - 1, pawn = by === 'w' ? 'P' : 'p';
    for (const dc of [-1, 1]) if (onBoard(pr, c + dc) && b[pr * 8 + c + dc] === pawn) return true;
    for (const [dr, dc] of KNIGHT) { const p = onBoard(r + dr, c + dc) && b[(r + dr) * 8 + c + dc]; if (p && own(p) && p.toLowerCase() === 'n') return true; }
    for (const [dr, dc] of KING) { const p = onBoard(r + dr, c + dc) && b[(r + dr) * 8 + c + dc]; if (p && own(p) && p.toLowerCase() === 'k') return true; }
    const slide = (dirs, kinds) => dirs.some(([dr, dc]) => {
      let rr = r + dr, cc = c + dc;
      while (onBoard(rr, cc)) { const p = b[rr * 8 + cc]; if (p) return own(p) && kinds.includes(p.toLowerCase()); rr += dr; cc += dc; }
      return false; });
    return slide(STRAIGHT, 'rq') || slide(DIAGONAL, 'bq');
  }
  const kingSquare = (b, side) => b.indexOf(side === 'w' ? 'K' : 'k');
  const inCheck = s => attacked(s.b, kingSquare(s.b, s.turn), other(s.turn));

  // every move that follows the piece rules, before checking if it leaves the king in check
  function rawMoves(s) {
    const out = [], b = s.b, me = s.turn;
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq]; if (sideOf(p) !== me) continue;
      const r = sq >> 3, c = sq & 7, kind = p.toLowerCase();
      const add = (to, extra) => out.push(Object.assign({ from: sq, to }, extra));
      if (kind === 'p') {
        const dir = me === 'w' ? -1 : 1, startRow = me === 'w' ? 6 : 1, one = (r + dir) * 8 + c;
        if (onBoard(r + dir, c) && !b[one]) {
          add(one);
          const two = (r + 2 * dir) * 8 + c;
          if (r === startRow && !b[two]) add(two, { two: true });
        }
        for (const dc of [-1, 1]) {
          if (!onBoard(r + dir, c + dc)) continue;
          const t = (r + dir) * 8 + c + dc;
          if (b[t] && sideOf(b[t]) !== me) add(t); else if (t === s.ep) add(t, { ep: true });
        }
      } else if (kind === 'n' || kind === 'k') {
        for (const [dr, dc] of kind === 'n' ? KNIGHT : KING) {
          if (!onBoard(r + dr, c + dc)) continue;
          const t = (r + dr) * 8 + c + dc; if (sideOf(b[t]) !== me) add(t);
        }
        if (kind === 'k') addCastling(s, sq, add);
      } else {
        const dirs = kind === 'r' ? STRAIGHT : kind === 'b' ? DIAGONAL : STRAIGHT.concat(DIAGONAL);
        for (const [dr, dc] of dirs) {
          let rr = r + dr, cc = c + dc;
          while (onBoard(rr, cc)) { const t = rr * 8 + cc; if (b[t]) { if (sideOf(b[t]) !== me) add(t); break; } add(t); rr += dr; cc += dc; }
        }
      }
    }
    return out;
  }
  function addCastling(s, sq, add) {
    const b = s.b, me = s.turn, foe = other(me), safe = (...sqs) => sqs.every(x => !attacked(b, x, foe)), empty = (...sqs) => sqs.every(x => !b[x]);
    if (me === 'w' && sq === 60) {
      if (s.castle.K && b[63] === 'R' && empty(61, 62) && safe(60, 61, 62)) add(62, { castle: 'K' });
      if (s.castle.Q && b[56] === 'R' && empty(57, 58, 59) && safe(60, 59, 58)) add(58, { castle: 'Q' });
    }
    if (me === 'b' && sq === 4) {
      if (s.castle.k && b[7] === 'r' && empty(5, 6) && safe(4, 5, 6)) add(6, { castle: 'k' });
      if (s.castle.q && b[0] === 'r' && empty(1, 2, 3) && safe(4, 3, 2)) add(2, { castle: 'q' });
    }
  }

  // play a move and return the new position (the old one is left untouched, so undo is easy)
  function play(s, m) {
    const b = s.b.slice(), p = b[m.from], kind = p.toLowerCase(), captured = b[m.to] || (m.ep ? 'p' : '');
    b[m.to] = p; b[m.from] = '';
    if (m.ep) b[(m.from >> 3) * 8 + (m.to & 7)] = '';
    if (kind === 'p' && (m.to < 8 || m.to >= 56)) b[m.to] = sideOf(p) === 'w' ? 'Q' : 'q';   // pawns become queens
    const rookMove = { K: [63, 61], Q: [56, 59], k: [7, 5], q: [0, 3] }[m.castle];
    if (rookMove) { b[rookMove[1]] = b[rookMove[0]]; b[rookMove[0]] = ''; }
    const castle = Object.assign({}, s.castle);
    if (p === 'K') castle.K = castle.Q = false;
    if (p === 'k') castle.k = castle.q = false;
    for (const [corner, right] of [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']]) if (m.from === corner || m.to === corner) castle[right] = false;
    return { b, turn: other(s.turn), castle, ep: m.two ? (m.from + m.to) / 2 : -1, half: kind === 'p' || captured ? 0 : s.half + 1 };
  }
  const legalMoves = s => rawMoves(s).filter(m => { const n = play(s, m); return !attacked(n.b, kingSquare(n.b, s.turn), n.turn); });

  // not enough pieces left for anyone to checkmate
  const tooFewPieces = b => { const left = b.filter(p => p && p.toLowerCase() !== 'k'); return !left.length || (left.length === 1 && 'nb'.includes(left[0].toLowerCase())); };

  /* ---------- the bot: looks a few moves ahead and counts material ---------- */
  function score(s) { // from white's point of view
    let total = 0;
    s.b.forEach((p, sq) => {
      if (!p) return;
      const r = sq >> 3, c = sq & 7, kind = p.toLowerCase(), white = sideOf(p) === 'w';
      let v = VALUE[kind];
      const centre = (3.5 - Math.abs(r - 3.5)) + (3.5 - Math.abs(c - 3.5));
      if (kind === 'n' || kind === 'b') v += centre * 6;
      if (kind === 'q') v += centre * 2;
      if (kind === 'p') v += (white ? 6 - r : r - 1) * 8 + (c > 1 && c < 6 ? 6 : 0);
      total += white ? v : -v;
    });
    return total;
  }
  function search(s, depth, alpha, beta, ply) {
    if (depth === 0) return score(s) * (s.turn === 'w' ? 1 : -1);
    const moves = legalMoves(s);
    if (!moves.length) return inCheck(s) ? -100000 + ply : 0;
    moves.sort((a, b) => (VALUE[(s.b[b.to] || 'x').toLowerCase()] || 0) - (VALUE[(s.b[a.to] || 'x').toLowerCase()] || 0));
    for (const m of moves) {
      const v = -search(play(s, m), depth - 1, -beta, -alpha, ply + 1);
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return alpha;
  }
  function botMove(s, level) {
    const depth = level, wobble = { 1: 160, 2: 25, 3: 0 }[level];
    const moves = legalMoves(s).sort(() => Math.random() - .5);
    let best = null, bestScore = -Infinity;
    for (const m of moves) {
      const v = -search(play(s, m), depth - 1, -Infinity, Infinity, 1) + Math.random() * wobble;
      if (v > bestScore) { bestScore = v; best = m; }
    }
    return best;
  }

  function chess(panel) {
    panel.innerHTML =
      '<div class="sdh bgh"><div class="seg" data-k="mode"><button type="button" data-v="bot" class="on">vs Bot</button><button type="button" data-v="two">2 players</button></div>' +
      '<div class="seg" data-k="level"><button type="button" data-v="1">Easy</button><button type="button" data-v="2" class="on">Medium</button><button type="button" data-v="3">Hard</button></div></div>' +
      '<div class="chb" role="grid" aria-label="Chess board"></div>' +
      '<div class="sdf"><span class="bgmsg" aria-live="polite"></span><span class="bgbtns"><button type="button" class="sdnew bgghost" data-a="undo">Undo</button><button type="button" class="sdnew" data-a="new">New game</button></span></div>';
    const boardEl = panel.querySelector('.chb'), msg = panel.querySelector('.bgmsg'), levelSeg = panel.querySelector('[data-k=level]');
    const squares = [];
    for (let i = 0; i < 64; i++) {
      const sq = el('<button type="button" class="chs ' + (((i >> 3) + (i & 7)) % 2 ? 'dk' : 'lt') + '"></button>');
      if ((i & 7) === 0) sq.dataset.rank = 8 - (i >> 3);
      if (i >> 3 === 7) sq.dataset.file = 'abcdefgh'[i & 7];
      sq.onclick = () => tap(i); boardEl.appendChild(sq); squares.push(sq);
    }
    let S, history, picked, targets, last, over, thinking, mode = 'bot', level = 2;

    const draw = () => {
      const checkSq = inCheck(S) ? kingSquare(S.b, S.turn) : -1;
      squares.forEach((sq, i) => {
        const p = S.b[i];
        sq.innerHTML = p ? '<svg class="pc ' + sideOf(p) + '" viewBox="0 0 40 40" aria-hidden="true">' + SHAPE[p.toLowerCase()] + '</svg>' : '';
        sq.classList.toggle('pick', i === picked);
        sq.classList.toggle('last', !!last && (i === last.from || i === last.to));
        sq.classList.toggle('chk', i === checkSq);
        sq.classList.toggle('to', targets.some(m => m.to === i));
        sq.classList.toggle('cap', targets.some(m => m.to === i) && !!p);
        sq.setAttribute('aria-label', 'abcdefgh'[i & 7] + (8 - (i >> 3)) + (p ? ' ' + (sideOf(p) === 'w' ? 'white ' : 'black ') + { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' }[p.toLowerCase()] : ''));
      });
    };
    const update = () => {
      const moves = legalMoves(S), check = inCheck(S), name = S.turn === 'w' ? 'White' : 'Black';
      over = false;
      if (!moves.length) {
        over = true;
        msg.textContent = !check ? "Stalemate. It's a draw." : mode === 'bot' ? (S.turn === 'b' ? 'Checkmate. You win!' : 'Checkmate. The bot wins.') : 'Checkmate. ' + (S.turn === 'w' ? 'Black' : 'White') + ' wins!';
        // beat the bot: report the win so it can go on the leaderboard (fewest of your moves wins)
        if (check && mode === 'bot' && S.turn === 'b') window.dispatchEvent(new CustomEvent('chess-win', { detail: { level: level, moves: Math.ceil(history.length / 2), host: panel } }));
      } else if (S.half >= 100) { over = true; msg.textContent = 'Fifty moves with no capture. Draw.'; }
      else if (tooFewPieces(S.b)) { over = true; msg.textContent = 'Not enough pieces to win. Draw.'; }
      else msg.textContent = (mode === 'bot' ? (S.turn === 'w' ? 'Your move' : 'Bot is thinking…') : name + ' to move') + (check ? ' · Check!' : '');
      draw();
    };
    const move = m => {
      history.push(S); S = play(S, m); last = m; picked = -1; targets = []; update();
      if (mode === 'bot' && S.turn === 'b' && !over) {
        thinking = true;
        setTimeout(() => { const reply = botMove(S, level); thinking = false; if (reply) move(reply); }, 260);
      }
    };
    const tap = i => {
      if (over || thinking) return;
      const hit = targets.find(m => m.to === i);
      if (hit) return move(hit);
      const mine = sideOf(S.b[i]) === S.turn && (mode === 'two' || S.turn === 'w');
      picked = mine && picked !== i ? i : -1;
      targets = picked < 0 ? [] : legalMoves(S).filter(m => m.from === i);
      draw();
    };
    const reset = () => { S = startPosition(); history = []; picked = -1; targets = []; last = null; thinking = false; update(); };
    const undo = () => {
      if (thinking || !history.length) return;
      S = history.pop();
      if (mode === 'bot') while (S.turn !== 'w' && history.length) S = history.pop();
      picked = -1; targets = []; last = null; update();
    };
    panel.querySelector('[data-a=new]').onclick = reset;
    panel.querySelector('[data-a=undo]').onclick = undo;
    segPick(panel.querySelector('[data-k=mode]'), b => { mode = b.dataset.v; levelSeg.hidden = mode !== 'bot'; reset(); });
    segPick(levelSeg, b => { level = +b.dataset.v; reset(); });
    reset();
  }

  /* =====================================================================
     TIC-TAC-TOE
     ===================================================================== */
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const winLine = g => LINES.find(([a, b, c]) => g[a] && g[a] === g[b] && g[a] === g[c]);
  // best score for the player to move: +1 win, 0 draw, -1 loss
  function bestFor(g, me) {
    const line = winLine(g); if (line) return { v: -1 };
    const free = g.map((x, i) => x ? -1 : i).filter(i => i >= 0); if (!free.length) return { v: 0 };
    let best = { v: -2 };
    for (const i of free) { g[i] = me; const v = -bestFor(g, me === 'X' ? 'O' : 'X').v; g[i] = ''; if (v > best.v) best = { v, i }; if (v === 1) break; }
    return best;
  }

  function ttt(panel) {
    panel.innerHTML =
      '<div class="sdh bgh"><div class="seg" data-k="mode"><button type="button" data-v="bot" class="on">vs Bot</button><button type="button" data-v="two">2 players</button></div>' +
      '<div class="seg" data-k="level"><button type="button" data-v="easy">Easy</button><button type="button" data-v="hard" class="on">Unbeatable</button></div></div>' +
      '<div class="ttb" role="grid" aria-label="Tic-tac-toe board"></div>' +
      '<div class="tts"></div>' +
      '<div class="sdf"><span class="bgmsg" aria-live="polite"></span><button type="button" class="sdnew" data-a="new">New game</button></div>';
    const boardEl = panel.querySelector('.ttb'), msg = panel.querySelector('.bgmsg'), tally = panel.querySelector('.tts'), levelSeg = panel.querySelector('[data-k=level]');
    const cells = [...Array(9)].map((_, i) => { const c = el('<button type="button" class="ttc" aria-label="Empty"></button>'); c.onclick = () => tap(i); boardEl.appendChild(c); return c; });
    let grid, turn, over, thinking, mode = 'bot', level = 'hard', round = 0, wins = { X: 0, O: 0, draw: 0 };

    const who = p => mode === 'bot' ? (p === 'X' ? 'You' : 'Bot') : p;
    const draw = (line) => {
      cells.forEach((c, i) => { c.textContent = grid[i]; c.className = 'ttc' + (grid[i] ? ' ' + grid[i].toLowerCase() : '') + (line && line.includes(i) ? ' win' : ''); c.setAttribute('aria-label', grid[i] || 'Empty'); });
      tally.innerHTML = '<span><b>' + wins.X + '</b> ' + who('X') + '</span><span><b>' + wins.draw + '</b> Draws</span><span><b>' + wins.O + '</b> ' + who('O') + '</span>';
    };
    const update = () => {
      const line = winLine(grid);
      if (line) { over = true; const w = grid[line[0]]; wins[w]++; msg.textContent = mode === 'bot' ? (w === 'X' ? 'You win!' : 'The bot wins.') : w + ' wins!'; }
      else if (grid.every(Boolean)) { over = true; wins.draw++; msg.textContent = "It's a draw."; }
      else msg.textContent = mode === 'bot' ? (turn === 'X' ? 'Your move (X)' : 'Bot is thinking…') : turn + ' to move';
      draw(line);
      if (!over && mode === 'bot' && turn === 'O') {
        thinking = true;
        setTimeout(() => {
          const free = grid.map((x, i) => x ? -1 : i).filter(i => i >= 0);
          // easy bot: takes a win if it sees one, otherwise plays anywhere
          const winNow = free.find(i => { grid[i] = 'O'; const w = winLine(grid); grid[i] = ''; return w; });
          const i = level === 'hard' ? bestFor(grid, 'O').i : winNow !== undefined ? winNow : free[Math.floor(Math.random() * free.length)];
          thinking = false; put(i);
        }, 380);
      }
    };
    const put = i => { grid[i] = turn; turn = turn === 'X' ? 'O' : 'X'; update(); };
    const tap = i => { if (over || thinking || grid[i] || (mode === 'bot' && turn !== 'X')) return; put(i); };
    // whoever starts swaps each round, so the bot opens every other game
    const reset = () => { grid = Array(9).fill(''); turn = round++ % 2 ? 'O' : 'X'; over = false; thinking = false; update(); };
    const fresh = () => { wins = { X: 0, O: 0, draw: 0 }; round = 0; reset(); };
    panel.querySelector('[data-a=new]').onclick = reset;
    segPick(panel.querySelector('[data-k=mode]'), b => { mode = b.dataset.v; levelSeg.hidden = mode !== 'bot'; fresh(); });
    segPick(levelSeg, b => { level = b.dataset.v; fresh(); });
    fresh();
  }

  /* =====================================================================
     SNAKE (the secret game, unlocked by reaching the bottom of the page)
     ===================================================================== */
  function snake(panel) {
    const N = 16;                                                     // board is 16 x 16 squares
    panel.innerHTML =
      '<div class="sdh"><b>Snake</b><span class="sdt snb">Best 0</span></div>' +
      '<canvas class="snc" width="480" height="480" aria-label="Snake board"></canvas>' +
      '<div class="snpad"><button type="button" data-d="up" aria-label="Up">▲</button><button type="button" data-d="left" aria-label="Left">◀</button><button type="button" data-d="down" aria-label="Down">▼</button><button type="button" data-d="right" aria-label="Right">▶</button></div>' +
      '<div class="sdf"><span class="bgmsg" aria-live="polite">Arrow keys, WASD or swipe.</span><button type="button" class="sdnew" data-a="new">Start</button></div>';
    const cv = panel.querySelector('canvas'), ctx = cv.getContext('2d'), msg = panel.querySelector('.bgmsg'), bestEl = panel.querySelector('.snb'), C = cv.width / N;
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    let body, dir, queued, food, timer, running = false, points = 0;
    let best = 0; try { best = +localStorage.getItem('snake-best') || 0; } catch (e) {}
    bestEl.textContent = 'Best ' + best;

    const freeSquare = () => { let s; do { s = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; } while (body.some(b => b[0] === s[0] && b[1] === s[1])); return s; };
    const paint = () => {
      ctx.fillStyle = '#f5f5f7'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#ebebf0'; for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if ((x + y) % 2) ctx.fillRect(x * C, y * C, C, C);
      ctx.fillStyle = '#ff453a'; ctx.fillRect(food[0] * C + 6, food[1] * C + 6, C - 12, C - 12);
      body.forEach((b, i) => { ctx.fillStyle = i ? '#1d1d1f' : '#0a84ff'; ctx.fillRect(b[0] * C + 2, b[1] * C + 2, C - 4, C - 4); });
    };
    const stop = text => { running = false; clearInterval(timer); msg.textContent = text; panel.querySelector('[data-a=new]').textContent = 'Play again'; };
    const step = () => {
      dir = queued;
      const head = [body[0][0] + dir[0], body[0][1] + dir[1]];
      const hitsWall = head[0] < 0 || head[1] < 0 || head[0] >= N || head[1] >= N;
      const hitsSelf = body.slice(0, -1).some(b => b[0] === head[0] && b[1] === head[1]);
      if (hitsWall || hitsSelf) {
        if (points > best) { best = points; try { localStorage.setItem('snake-best', best); } catch (e) {} bestEl.textContent = 'Best ' + best; }
        return stop('Game over · ' + points + ' point' + (points === 1 ? '' : 's') + '.');
      }
      body.unshift(head);
      if (head[0] === food[0] && head[1] === food[1]) {
        points++; msg.textContent = points + ' point' + (points === 1 ? '' : 's');
        food = freeSquare(); clearInterval(timer); timer = setInterval(step, Math.max(70, 150 - points * 4));   // a little faster each time
      } else body.pop();
      paint();
    };
    const start = () => {
      body = [[7, 8], [6, 8], [5, 8]]; dir = queued = DIRS.right; food = freeSquare(); points = 0; running = true;
      msg.textContent = '0 points'; clearInterval(timer); timer = setInterval(step, 150); paint();
    };
    const turn = name => { const d = DIRS[name]; if (!running || !d) return; if (d[0] === -dir[0] && d[1] === -dir[1]) return; queued = d; };

    panel.querySelector('[data-a=new]').onclick = start;
    panel.querySelectorAll('[data-d]').forEach(b => b.onclick = () => turn(b.dataset.d));
    const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    document.addEventListener('keydown', e => {
      if (!running || panel.hidden || /input|textarea/i.test(e.target.tagName)) return;
      const name = KEYS[e.key] || KEYS[e.key.toLowerCase && e.key.toLowerCase()]; if (!name) return;
      e.preventDefault(); turn(name);
    });
    let touch = null;
    cv.addEventListener('touchstart', e => { touch = [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true });
    cv.addEventListener('touchmove', e => { if (running) e.preventDefault(); }, { passive: false });
    cv.addEventListener('touchend', e => {
      if (!touch) return; const dx = e.changedTouches[0].clientX - touch[0], dy = e.changedTouches[0].clientY - touch[1]; touch = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });
    // pause if the player switches to another game
    new MutationObserver(() => { if (panel.hidden && running) stop('Paused. Press Play again to restart.'); }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
    body = [[7, 8], [6, 8], [5, 8]]; dir = DIRS.right; food = [11, 8]; paint();
  }

  window.boardGames = { chess, ttt, snake };
})();
