/* "Right now" section.
   - Clock, sky and weather for the city you set (time zone found from the city name).
   - Status, Building, Reading and This week come from Supabase (table now_cards), edited at /now-edit.
   - Spotify from /api/now-playing, newest YouTube video from /api/latest-video. */
(() => {
  const root = document.getElementById('now'); if (!root) return;
  const SB = 'https://orhlwvmxnsztwhfimjru.supabase.co/rest/v1', KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yaGx3dm14bnN6dHdoZmltanJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MjMwNDAsImV4cCI6MjEwMDA5OTA0MH0.Q8DRd40-OJcxuWRMpToCF9qF2XbsM1QGU_rdrr4_mQs';
  const $ = s => root.querySelector(s);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const ago = iso => { const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000)); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
  const sky = $('.nwsky'), clock = $('.nwclock');

  // where you are: starts as Bengaluru, then follows the city saved in now_cards
  let place = { city: 'Bengaluru', country: 'India', tz: 'Asia/Kolkata', lat: 12.97, lon: 77.59 };

  /* ---------- clock and sky ---------- */
  const timeIn = tz => {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: false, timeZoneName: 'short' }).formatToParts(new Date());
    const get = t => (p.find(x => x.type === t) || {}).value;
    return { h: +get('hour') % 24, m: +get('minute'), zone: get('timeZoneName') };
  };
  const phaseOf = h => h >= 5 && h < 8 ? 'morning' : h >= 8 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'evening' : 'night';
  const LABEL = { morning: 'Morning', day: 'Daytime', evening: 'Evening', night: 'Night' };
  const stars = $('.nwstars');
  for (let i = 0; i < 46; i++) { const s = document.createElement('i'); s.style.left = (Math.random() * 100).toFixed(1) + '%'; s.style.top = (Math.random() * 62).toFixed(1) + '%'; s.style.animationDelay = (Math.random() * 4).toFixed(2) + 's'; if (Math.random() < .25) s.className = 'b'; stars.appendChild(s); }
  const orb = $('.nworb');
  const tick = () => {
    const { h, m, zone } = timeIn(place.tz), phase = phaseOf(h);
    sky.dataset.phase = phase; clock.querySelector('.nwphase').textContent = LABEL[phase];
    clock.querySelector('.nwtime').innerHTML = (h % 12 || 12) + ':' + String(m).padStart(2, '0') + '<small>' + (h < 12 ? 'AM' : 'PM') + '</small>';
    clock.querySelector('.nwwhere').textContent = place.city + ', ' + place.country + ' · ' + (zone === 'GMT+5:30' ? 'IST' : zone);
    // the sun travels 6 am to 6 pm, the moon 6 pm to 6 am
    const mins = h * 60 + m, sun = mins >= 360 && mins < 1080, t = sun ? (mins - 360) / 720 : ((mins - 1080 + 1440) % 1440) / 720;
    orb.className = 'nworb ' + (sun ? 'sun' : 'moon'); orb.style.left = (8 + t * 76) + '%'; orb.style.top = (58 - Math.sin(t * Math.PI) * 44) + '%';
  };
  tick(); setInterval(tick, 15000);

  /* ---------- weather (Open-Meteo, free, no key) ---------- */
  const WEATHER = c => c === 0 ? 'Clear' : c <= 2 ? 'Partly cloudy' : c === 3 ? 'Cloudy' : c <= 48 ? 'Foggy' : c <= 57 ? 'Drizzle' : c <= 67 ? 'Rain' : c <= 77 ? 'Snow' : c <= 82 ? 'Showers' : 'Thunderstorm';
  const weather = async () => {
    try {
      const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + place.lat + '&longitude=' + place.lon + '&current=temperature_2m,weather_code');
      const c = (await r.json()).current; if (!c) return;
      clock.querySelector('.nwwx').textContent = Math.round(c.temperature_2m) + '°C · ' + WEATHER(c.weather_code);
      sky.dataset.wet = c.weather_code >= 51 ? '1' : ''; sky.dataset.cloudy = c.weather_code >= 2 ? '1' : '';
    } catch (e) {}
  };
  setInterval(weather, 15 * 60000);

  // find a city's position and time zone from its name
  const findCity = async name => {
    try {
      const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&name=' + encodeURIComponent(name));
      const g = ((await r.json()).results || [])[0];
      if (g) place = { city: g.name, country: g.country || '', tz: g.timezone || place.tz, lat: g.latitude, lon: g.longitude };
    } catch (e) {}
  };

  /* ---------- your cards from Supabase ---------- */
  const show = (sel, on) => { const el = $(sel); if (el) el.hidden = !on; };
  const cover = async (title, author) => {
    try {
      const r = await fetch('https://openlibrary.org/search.json?limit=1&fields=cover_i&title=' + encodeURIComponent(title) + (author ? '&author=' + encodeURIComponent(author) : ''));
      const id = (((await r.json()).docs || [])[0] || {}).cover_i;
      return id ? 'https://covers.openlibrary.org/b/id/' + id + '-M.jpg' : '';
    } catch (e) { return ''; }
  };
  const cards = async () => {
    let c = null;
    try { const r = await fetch(SB + '/now_cards?select=*&id=eq.1', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } }); if (r.ok) c = (await r.json())[0]; } catch (e) {}
    if (c && c.city && c.city.toLowerCase() !== place.city.toLowerCase()) await findCity(c.city);
    $('.nwcity').textContent = place.city + '.'; tick(); weather();
    if (!c) return video('');                                         // table not set up yet: keep the built-in text
    $('.nwstatus').innerHTML = '<span>' + esc(c.status_emoji) + '</span>' + esc(c.status_text); show('.nwstatus', !!c.status_text);
    $('.nwbuild b').textContent = c.building_title; $('.nwbuild p').textContent = c.building_text;
    $('.nwtags').innerHTML = c.building_tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5).map(t => '<span>' + esc(t) + '</span>').join('');
    if (c.reading_title) {
      $('.nwread .nwbook b').textContent = c.reading_title; $('.nwread .nwbook small').textContent = c.reading_author ? 'by ' + c.reading_author : '';
      const img = await cover(c.reading_title, c.reading_author);
      $('.nwread .nwcover').innerHTML = img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : '<span>📖</span>';
    }
    show('.nwread', !!c.reading_title);
    $('.nwweek p').textContent = c.this_week; show('.nwweek', !!c.this_week);
    layout(); video(c.video_url || '');
  };

  /* ---------- YouTube: the video you pinned in the Studio, or else your newest upload ---------- */
  // works with youtube.com/watch?v=, youtu.be/, /shorts/, /embed/ and /live/ links
  const videoId = url => { const m = String(url || '').match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : ''; };
  const quiet = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let shownVideo = '', previewWatch = null;
  const video = async pinnedUrl => {
    try {
      const pin = videoId(pinnedUrl);
      const v = await (await fetch('/api/latest-video' + (pin ? '?v=' + pin : ''))).json();
      if (!v || v.none || !/^[A-Za-z0-9_-]{11}$/.test(v.id)) { show('.nwyt', false); return layout(); }
      if (v.id === shownVideo) return;                                  // same video: leave the playing preview alone
      shownVideo = v.id;
      $('.nwyt .nwhead span').textContent = v.pinned ? 'Featured video' : 'Latest video';
      $('.nwyt .nwopen').href = 'https://www.youtube.com/watch?v=' + v.id;
      const thumb = $('.nwyt .nwthumb');
      thumb.innerHTML = '<img src="https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg" alt="" loading="lazy"><span class="nwplay" aria-hidden="true"></span>';
      $('.nwyt .nwvid b').textContent = v.title;
      $('.nwyt .nwvid small').textContent = (v.channel || 'YouTube') + (v.published ? ' · ' + ago(v.published) : '');
      const btn = $('.nwyt .nwplaybtn'); btn.classList.remove('playing');
      btn.onclick = () => playHere(btn, thumb, v.id);
      show('.nwyt', true); layout();
      // silent looping preview, started only once the card is on screen
      if (previewWatch) previewWatch.disconnect();
      if (!quiet && 'IntersectionObserver' in window) {
        previewWatch = new IntersectionObserver(list => {
          if (!list.some(e => e.isIntersecting)) return; previewWatch.disconnect();
          const f = document.createElement('iframe');
          f.src = 'https://www.youtube-nocookie.com/embed/' + v.id + '?autoplay=1&mute=1&loop=1&playlist=' + v.id + '&controls=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&disablekb=1&cc_load_policy=0';
          f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.title = 'Video preview'; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true');
          f.onload = () => setTimeout(() => thumb.classList.add('live'), 1200);   // fade in once it has started
          thumb.appendChild(f);
        }, { threshold: .4 });
        previewWatch.observe(thumb);
      }
    } catch (e) { show('.nwyt', false); layout(); }
  };

  // click: swap the silent preview for the real player, with sound and controls, right inside the card
  const playHere = (btn, thumb, id) => {
    if (previewWatch) previewWatch.disconnect();
    btn.onclick = null; btn.classList.add('playing');
    thumb.className = 'nwthumb playing';
    thumb.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1&playsinline=1&cc_load_policy=0" allow="autoplay; encrypted-media; picture-in-picture" title="Video"></iframe>';
  };

  // bottom row: as many columns as there are cards showing
  // the Building card is twice as wide as the others, so it counts as two columns
  const layout = () => { const row = $('.nwrow'), shown = [...row.children].filter(x => !x.hidden), n = shown.reduce((t, x) => t + (x.classList.contains('nwbuild') ? 2 : 1), 0); row.hidden = !shown.length; row.style.setProperty('--n', n || 1); };

  /* ---------- Spotify ---------- */
  const music = $('.nwmusic');
  const SPOTIFY = '<svg class="nwsp" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14C9.6 9.9 15 10.56 18.72 12.84c.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z"/></svg>';
  const mmss = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  let song = null, fetchedAt = 0, suggestOpen = null;   // suggestOpen is set by Visitor picks below
  const drawProgress = () => {
    if (!song || !song.playing) return;
    const at = Math.min(song.duration_ms, song.progress_ms + (Date.now() - fetchedAt)), bar = music.querySelector('.nwbar i'), nums = music.querySelector('.nwnums');
    if (bar) bar.style.width = (at / song.duration_ms * 100).toFixed(2) + '%';
    if (nums) nums.innerHTML = '<span>' + mmss(at) + '</span><span>' + mmss(song.duration_ms) + '</span>';
    if (at >= song.duration_ms) loadSong();
  };
  const showSong = s => {
    song = s; fetchedAt = Date.now();
    if (!s || !s.connected || s.empty || !s.title) { root.classList.add('nwsolo'); music.hidden = true; return; }
    root.classList.remove('nwsolo'); music.hidden = false;
    const link = /^https:\/\/open\.spotify\.com\//.test(s.url || '') ? s.url : 'https://open.spotify.com';
    const art = /^https:\/\/i\.scdn\.co\//.test(s.image || '') ? '<img src="' + esc(s.image) + '" alt="" loading="lazy">' : '<span class="nwart0"></span>';
    music.innerHTML =
      '<div class="nwhead">' + SPOTIFY + (s.playing ? 'Now playing' : 'Last played') + (!s.playing && s.played_at ? ' <em>· ' + ago(s.played_at) + '</em>' : '') + '<button type="button" class="nwsgbtn">+ Suggest a song</button></div>' +
      '<a class="nwsong" href="' + esc(link) + '" target="_blank" rel="noopener">' + art + '<span class="nwtxt"><b>' + esc(s.title) + '</b><small>' + esc(s.artist) + '</small></span>' +
      (s.playing ? '<span class="nweq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' : '') + '</a>' +
      (s.playing ? '<div class="nwbar"><i></i></div><div class="nwnums"></div>' : '');
    const sb = music.querySelector('.nwsgbtn'); if (sb) { sb.hidden = !suggestOpen; sb.onclick = () => suggestOpen && suggestOpen(); }
    drawProgress();
  };
  const loadSong = async () => { try { const r = await fetch('/api/now-playing', { cache: 'no-store' }); showSong(r.ok ? await r.json() : null); } catch (e) { showSong(null); } };


  /* ---------- "Get early access": a small form right here, saved to the same list as api.moluscca.com (table api_waitlist) ---------- */
  const cta = $('.nwcta');
  if (cta) {
    const wl = document.createElement('div'); wl.className = 'nwwl'; wl.hidden = true;
    wl.setAttribute('role', 'dialog'); wl.setAttribute('aria-modal', 'true'); wl.setAttribute('aria-label', 'Moluscca API early access');
    const formHtml = '<form class="nwwlbox" novalidate><button type="button" class="nwwlx" aria-label="Close">×</button>' +
      '<span class="nwwltag">Moluscca API · early access</span><h3>Get in early.</h3><p>Risk maths and India data in one request. Join the list and we will email you when keys open.</p>' +
      '<label for="nwwl-name">Name</label><input id="nwwl-name" name="name" maxlength="120" autocomplete="name" required>' +
      '<label for="nwwl-email">Work email</label><input id="nwwl-email" name="email" type="email" maxlength="200" autocomplete="email" required>' +
      '<input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +   // trap for spam bots
      '<button type="submit" class="nwwlgo">Join the waitlist</button><p class="nwwlmsg" aria-live="polite"></p></form>';
    wl.innerHTML = formHtml; document.body.appendChild(wl);
    const closeWl = () => { wl.hidden = true; document.documentElement.classList.remove('grlock'); };
    const wire = () => {
      const form = wl.querySelector('form'), msg = form.querySelector('.nwwlmsg'), go = form.querySelector('.nwwlgo');
      form.querySelector('.nwwlx').onclick = closeWl;
      form.onsubmit = e => {
        e.preventDefault();
        const name = form.name.value.trim(), email = form.email.value.trim().toLowerCase();
        if (form.website.value) return closeWl();                                       // a bot filled the hidden box
        if (!name) { msg.textContent = 'Add your name.'; return; }
        if (!form.email.checkValidity() || !email) { msg.textContent = 'That email does not look right.'; return; }
        go.disabled = true; go.textContent = 'Joining…'; msg.textContent = '';
        fetch(SB + '/api_waitlist', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ name, email }) })
          .then(r => {
            if (r.ok || r.status === 409) {                                             // 409: already on the list
              form.innerHTML = '<button type="button" class="nwwlx" aria-label="Close">×</button><span class="nwwltag">You are on the list</span><h3>Thanks, ' + esc(name) + '.</h3><p>We will email ' + esc(email) + ' as soon as keys open. Meanwhile, have a look at <a href="https://api.moluscca.com" target="_blank" rel="noopener">api.moluscca.com</a>.</p>';
              form.querySelector('.nwwlx').onclick = closeWl;
            } else { go.disabled = false; go.textContent = 'Join the waitlist'; msg.textContent = 'Could not join right now. Try again in a minute.'; }
          })
          .catch(() => { go.disabled = false; go.textContent = 'Join the waitlist'; msg.textContent = 'Could not join right now. Try again in a minute.'; });
      };
    };
    cta.addEventListener('click', e => {
      e.preventDefault();
      if (!wl.querySelector('#nwwl-name')) { wl.innerHTML = formHtml; }                 // fresh form each time after a sign-up
      wire(); wl.hidden = false; document.documentElement.classList.add('grlock'); wl.querySelector('#nwwl-name').focus();
    });
    wl.addEventListener('click', e => { if (e.target === wl) closeWl(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !wl.hidden) closeWl(); });
  }


  /* ---------- Visitor picks: anyone can suggest a song (real Spotify cover), shown publicly ---------- */
  const picks = $('.nwpicks');
  if (picks) {
    const strip = picks.querySelector('.nwpstrip');
    const tile = p => '<a class="nwptile" href="https://open.spotify.com/track/' + esc(p.track_id) + '" target="_blank" rel="noopener">' +
      (/^https:\/\/i\.scdn\.co\//.test(p.image) ? '<img src="' + esc(p.image) + '" alt="" loading="lazy">' : '<span class="nwart0"></span>') +
      '<b>' + esc(p.title) + '</b><small>' + esc(p.artist) + '</small><em>' + (p.suggested_by ? 'by ' + esc(p.suggested_by) : 'by a visitor') + '</em></a>';
    const loadPicks = async () => {
      try {
        const r = await fetch(SB + '/song_suggestions?select=track_id,title,artist,image,suggested_by,created_at&order=created_at.desc&limit=16', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
        if (!r.ok) throw 0;                                            // table not set up yet: hide the strip
        const rows = await r.json();
        strip.innerHTML = rows.length ? rows.map(tile).join('') : '<p class="nwpempty">No picks yet. Be the first to suggest a song.</p>';
        picks.hidden = false; layout();
      } catch (e) { picks.hidden = true; }
    };

    // the suggest window: search Spotify, pick a song, add your name, send
    const sg = document.createElement('div'); sg.className = 'nwwl nwsg'; sg.hidden = true;
    sg.setAttribute('role', 'dialog'); sg.setAttribute('aria-modal', 'true'); sg.setAttribute('aria-label', 'Suggest a song');
    document.body.appendChild(sg);
    const closeSg = () => { sg.hidden = true; document.documentElement.classList.remove('grlock'); };
    const openSg = () => {
      let chosen = null, timer = null, asked = 0;
      sg.innerHTML = '<form class="nwwlbox" novalidate><button type="button" class="nwwlx" aria-label="Close">×</button>' +
        '<span class="nwwltag nwsgtag">' + SPOTIFY + 'Suggest a song</span><h3>What should I listen to?</h3>' +
        '<label for="nwsg-q">Search Spotify</label><input id="nwsg-q" maxlength="80" autocomplete="off" placeholder="Song or artist">' +
        '<div class="nwsgres" role="listbox" aria-label="Results"></div>' +
        '<label for="nwsg-by">Your name <span style="font-weight:500;color:var(--mute)">(optional)</span></label><input id="nwsg-by" maxlength="40" autocomplete="given-name">' +
        '<input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +
        '<button type="submit" class="nwwlgo" disabled>Pick a song first</button><p class="nwwlmsg" aria-live="polite"></p></form>';
      const form = sg.querySelector('form'), q = sg.querySelector('#nwsg-q'), res = sg.querySelector('.nwsgres'), go = form.querySelector('.nwwlgo'), msg = form.querySelector('.nwwlmsg');
      form.querySelector('.nwwlx').onclick = closeSg;
      const showResults = list => {
        res.innerHTML = list.length ? list.map((t, i) => '<button type="button" class="nwsgopt" role="option" data-i="' + i + '">' +
          (/^https:\/\/i\.scdn\.co\//.test(t.image) ? '<img src="' + esc(t.image) + '" alt="">' : '<span class="nwart0"></span>') +
          '<span><b>' + esc(t.title) + '</b><small>' + esc(t.artist) + '</small></span></button>').join('') : '<p class="nwpempty">No songs found.</p>';
        res.querySelectorAll('.nwsgopt').forEach(b => b.onclick = () => {
          chosen = list[+b.dataset.i]; res.querySelectorAll('.nwsgopt').forEach(x => x.classList.toggle('on', x === b));
          go.disabled = false; go.textContent = 'Suggest this song';
        });
      };
      q.oninput = () => {
        clearTimeout(timer); chosen = null; go.disabled = true; go.textContent = 'Pick a song first';
        const words = q.value.trim(); if (words.length < 2) { res.innerHTML = ''; return; }
        timer = setTimeout(async () => {
          const mine = ++asked; res.innerHTML = '<p class="nwpempty">Searching…</p>';
          try { const r = await fetch('/api/song-search?q=' + encodeURIComponent(words)); const list = await r.json(); if (mine === asked) showResults(Array.isArray(list) ? list : []); }
          catch (e) { if (mine === asked) res.innerHTML = '<p class="nwpempty">Search is resting. Try again soon.</p>'; }
        }, 320);
      };
      form.onsubmit = async e => {
        e.preventDefault(); if (!chosen) return; if (form.website.value) return closeSg();   // bots fill the hidden box
        go.disabled = true; go.textContent = 'Sending…'; msg.textContent = '';
        const by = sg.querySelector('#nwsg-by').value.trim().slice(0, 40);
        try {
          const r = await fetch(SB + '/song_suggestions', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify({ track_id: chosen.id, title: chosen.title.slice(0, 200), artist: chosen.artist.slice(0, 200), image: /^https:\/\/i\.scdn\.co\/image\//.test(chosen.image) ? chosen.image : '', suggested_by: by }) });
          if (!r.ok) throw 0;
          form.innerHTML = '<button type="button" class="nwwlx" aria-label="Close">×</button><span class="nwwltag nwsgtag">' + SPOTIFY + 'Added to Visitor picks</span><h3>Thanks' + (by ? ', ' + esc(by) : '') + '!</h3><p>' + esc(chosen.title) + ' is on the list. I will give it a listen.</p>';
          form.querySelector('.nwwlx').onclick = closeSg; loadPicks();
        } catch (e2) { go.disabled = false; go.textContent = 'Suggest this song'; msg.textContent = 'Could not send right now. Try again in a minute.'; }
      };
      sg.hidden = false; document.documentElement.classList.add('grlock'); q.focus();
    };
    picks.querySelector('.nwpadd').onclick = openSg;
    suggestOpen = openSg; const sb = music.querySelector('.nwsgbtn'); if (sb) { sb.hidden = false; sb.onclick = openSg; }
    sg.addEventListener('click', e => { if (e.target === sg) closeSg(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sg.hidden) closeSg(); });
    loadPicks();
  }

  cards(); loadSong();
  setInterval(loadSong, 30000); setInterval(drawProgress, 1000); setInterval(cards, 10 * 60000);
})();
