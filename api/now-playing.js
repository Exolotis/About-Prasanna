// What Prasanna is listening to on Spotify, for the "Right now" section.
// Runs on Vercel. Needs three settings in Vercel (Project → Settings → Environment Variables):
//   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN
// Only the song details are sent to the browser. The keys never leave the server.

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const NOW_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENT_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

// turn a Spotify track into the few fields the page needs
const tidy = (track, extra) => track && track.type === 'track' ? Object.assign({
  title: track.name,
  artist: (track.artists || []).map(a => a.name).join(', '),
  album: track.album && track.album.name,
  image: track.album && track.album.images && (track.album.images[1] || track.album.images[0] || {}).url,
  url: track.external_urls && track.external_urls.spotify,
  duration_ms: track.duration_ms
}, extra) : null;

module.exports = async (req, res) => {
  const send = (status, body, cacheSeconds) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=' + cacheSeconds + ', stale-while-revalidate=60');
    res.statusCode = status; res.end(JSON.stringify(body));
  };
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret, SPOTIFY_REFRESH_TOKEN: refresh } = process.env;
  if (!id || !secret || !refresh) return send(200, { connected: false }, 300);

  try {
    // 1. swap the long-lasting refresh token for a short access token
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh })
    });
    if (!tokenRes.ok) return send(200, { connected: false, reason: 'token' }, 60);
    const { access_token } = await tokenRes.json();
    const auth = { Authorization: 'Bearer ' + access_token };

    // 2. what is playing right now?
    const nowRes = await fetch(NOW_URL, { headers: auth });
    if (nowRes.status === 200) {
      const now = await nowRes.json();
      const song = tidy(now.item, { playing: !!now.is_playing, progress_ms: now.progress_ms || 0 });
      if (song) return send(200, Object.assign({ connected: true }, song), 20);
    }

    // 3. nothing playing: show the last song instead
    const recentRes = await fetch(RECENT_URL, { headers: auth });
    if (recentRes.ok) {
      const recent = await recentRes.json(), item = recent.items && recent.items[0];
      const song = item && tidy(item.track, { playing: false, played_at: item.played_at });
      if (song) return send(200, Object.assign({ connected: true }, song), 60);
    }
    return send(200, { connected: true, empty: true }, 60);
  } catch (e) {
    return send(200, { connected: false, reason: 'error' }, 30);
  }
};
