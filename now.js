/* "Right now" section: a live Pune clock with a sky that follows the time of day and the real weather,
   plus what Prasanna is playing on Spotify (from /api/now-playing). */
(() => {
  const root = document.getElementById('now'); if (!root) return;
  const clock = root.querySelector('.nwclock'), sky = root.querySelector('.nwsky'), music = root.querySelector('.nwmusic');

  /* ---------- time in Pune (IST), whatever the visitor's own time zone ---------- */
  const istParts = () => {
    const p = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const get = t => +(p.find(x => x.type === t) || {}).value || 0;
    return { h: get('hour') % 24, m: get('minute') };
  };
  // which part of the day it is, by hour in Pune
  const phaseOf = h => h >= 5 && h < 8 ? 'morning' : h >= 8 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'evening' : 'night';
  const LABEL = { morning: 'Morning', day: 'Daytime', evening: 'Evening', night: 'Night' };

  // stars, placed once
  const stars = sky.querySelector('.nwstars');
  for (let i = 0; i < 46; i++) {
    const s = document.createElement('i');
    s.style.left = (Math.random() * 100).toFixed(1) + '%'; s.style.top = (Math.random() * 62).toFixed(1) + '%';
    s.style.animationDelay = (Math.random() * 4).toFixed(2) + 's'; if (Math.random() < .25) s.className = 'b';
    stars.appendChild(s);
  }

  const orb = sky.querySelector('.nworb');
  const tick = () => {
    const { h, m } = istParts(), phase = phaseOf(h);
    sky.dataset.phase = phase;
    clock.querySelector('.nwphase').textContent = LABEL[phase];
    const h12 = h % 12 || 12;
    clock.querySelector('.nwtime').innerHTML = h12 + ':' + String(m).padStart(2, '0') + '<small>' + (h < 12 ? 'AM' : 'PM') + '</small>';
    // the sun or moon travels across the sky: sun from 6 am to 6 pm, moon from 6 pm to 6 am
    const mins = h * 60 + m, sun = mins >= 360 && mins < 1080, t = sun ? (mins - 360) / 720 : ((mins - 1080 + 1440) % 1440) / 720;
    orb.className = 'nworb ' + (sun ? 'sun' : 'moon');
    orb.style.left = (8 + t * 76) + '%'; orb.style.top = (58 - Math.sin(t * Math.PI) * 44) + '%';
  };
  tick(); setInterval(tick, 15000);

  /* ---------- weather in Pune (Open-Meteo, free, no key) ---------- */
  const WEATHER = c => c === 0 ? 'Clear' : c <= 2 ? 'Partly cloudy' : c === 3 ? 'Cloudy' : c <= 48 ? 'Foggy' : c <= 57 ? 'Drizzle' : c <= 67 ? 'Rain' : c <= 77 ? 'Snow' : c <= 82 ? 'Showers' : 'Thunderstorm';
  const weather = async () => {
    try {
      const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=18.52&longitude=73.86&current=temperature_2m,weather_code&timezone=Asia%2FKolkata');
      const c = (await r.json()).current; if (!c) return;
      clock.querySelector('.nwwx').textContent = Math.round(c.temperature_2m) + '°C · ' + WEATHER(c.weather_code);
      sky.dataset.wet = c.weather_code >= 51 && c.weather_code <= 99 ? '1' : '';
      sky.dataset.cloudy = c.weather_code >= 2 ? '1' : '';
    } catch (e) {}
  };
  weather(); setInterval(weather, 15 * 60000);

  /* ---------- Spotify ---------- */
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const ago = iso => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
  const clockText = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  let song = null, fetchedAt = 0, timer = null;
  const drawProgress = () => {
    if (!song || !song.playing) return;
    const at = Math.min(song.duration_ms, song.progress_ms + (Date.now() - fetchedAt));
    const bar = music.querySelector('.nwbar i'), nums = music.querySelector('.nwnums');
    if (bar) bar.style.width = (at / song.duration_ms * 100).toFixed(2) + '%';
    if (nums) nums.innerHTML = '<span>' + clockText(at) + '</span><span>' + clockText(song.duration_ms) + '</span>';
    if (at >= song.duration_ms) load();                  // song ended: check what's next
  };
  const show = s => {
    song = s; fetchedAt = Date.now();
    if (!s || !s.connected || s.empty || !s.title) { root.classList.add('nwsolo'); music.hidden = true; return; }
    root.classList.remove('nwsolo'); music.hidden = false;
    const link = /^https:\/\/open\.spotify\.com\//.test(s.url || '') ? s.url : 'https://open.spotify.com';
    const art = /^https:\/\/i\.scdn\.co\//.test(s.image || '') ? '<img src="' + esc(s.image) + '" alt="" loading="lazy">' : '<span class="nwart0"></span>';
    music.innerHTML =
      '<div class="nwhead"><span class="nwdot' + (s.playing ? ' on' : '') + '"></span>' + (s.playing ? 'Now playing' : 'Last played') + ' on Spotify' + (!s.playing && s.played_at ? ' <em>· ' + ago(s.played_at) + '</em>' : '') + '</div>' +
      '<a class="nwsong" href="' + esc(link) + '" target="_blank" rel="noopener">' + art +
      '<span class="nwtxt"><b>' + esc(s.title) + '</b><small>' + esc(s.artist) + '</small></span>' +
      (s.playing ? '<span class="nweq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' : '') + '</a>' +
      (s.playing ? '<div class="nwbar"><i></i></div><div class="nwnums"></div>' : '');
    drawProgress();
  };
  const load = async () => { try { const r = await fetch('/api/now-playing', { cache: 'no-store' }); show(r.ok ? await r.json() : null); } catch (e) { show(null); } };
  load(); setInterval(load, 30000); timer = setInterval(drawProgress, 1000);
})();
