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
    if (!c) return;                                                   // table not set up yet: keep the built-in text
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
    layout();
  };

  /* ---------- newest YouTube video ---------- */
  const video = async () => {
    try {
      const v = await (await fetch('/api/latest-video')).json();
      if (!v || v.none || !/^[A-Za-z0-9_-]{11}$/.test(v.id)) return show('.nwyt', false);
      $('.nwyt a').href = 'https://www.youtube.com/watch?v=' + v.id;
      $('.nwyt .nwthumb').innerHTML = '<img src="https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg" alt="" loading="lazy">';
      $('.nwyt .nwvid b').textContent = v.title; $('.nwyt .nwvid small').textContent = 'Moluscca on YouTube · ' + ago(v.published);
      show('.nwyt', true);
    } catch (e) { show('.nwyt', false); }
    layout();
  };

  // bottom row: as many columns as there are cards showing
  const layout = () => { const row = $('.nwrow'), n = [...row.children].filter(x => !x.hidden).length; row.hidden = !n; row.style.setProperty('--n', n || 1); };

  /* ---------- Spotify ---------- */
  const music = $('.nwmusic');
  const SPOTIFY = '<svg class="nwsp" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14C9.6 9.9 15 10.56 18.72 12.84c.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z"/></svg>';
  const mmss = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  let song = null, fetchedAt = 0;
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
      '<div class="nwhead">' + SPOTIFY + (s.playing ? 'Now playing' : 'Last played') + (!s.playing && s.played_at ? ' <em>· ' + ago(s.played_at) + '</em>' : '') + '</div>' +
      '<a class="nwsong" href="' + esc(link) + '" target="_blank" rel="noopener">' + art + '<span class="nwtxt"><b>' + esc(s.title) + '</b><small>' + esc(s.artist) + '</small></span>' +
      (s.playing ? '<span class="nweq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' : '') + '</a>' +
      (s.playing ? '<div class="nwbar"><i></i></div><div class="nwnums"></div>' : '');
    drawProgress();
  };
  const loadSong = async () => { try { const r = await fetch('/api/now-playing', { cache: 'no-store' }); showSong(r.ok ? await r.json() : null); } catch (e) { showSong(null); } };

  cards(); video(); loadSong();
  setInterval(loadSong, 30000); setInterval(drawProgress, 1000); setInterval(cards, 10 * 60000);
})();
