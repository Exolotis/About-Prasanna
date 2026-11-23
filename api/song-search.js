// Song search for "Suggest a song": /api/song-search?q=<words> → up to 6 Spotify tracks with real covers.
// Uses the same Spotify app keys as now-playing, with the app's own (not Prasanna's) access, so it can only search.
let token = null, tokenUntil = 0;   // reused between calls while it is still valid

const appToken = async () => {
  if (token && Date.now() < tokenUntil) return token;
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) throw new Error('no keys');
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials' })
  });
  if (!r.ok) throw new Error('token');
  const j = await r.json(); token = j.access_token; tokenUntil = Date.now() + (j.expires_in - 60) * 1000;
  return token;
};

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const q = (new URL(req.url, 'http://x').searchParams.get('q') || '').trim().slice(0, 80);
  if (q.length < 2) { res.end('[]'); return; }
  try {
    const r = await fetch('https://api.spotify.com/v1/search?type=track&limit=6&q=' + encodeURIComponent(q), { headers: { Authorization: 'Bearer ' + await appToken() } });
    if (!r.ok) throw new Error('search');
    const items = ((await r.json()).tracks || {}).items || [];
    const out = items.map(t => ({
      id: t.id,
      title: t.name,
      artist: (t.artists || []).map(a => a.name).join(', '),
      image: ((t.album && t.album.images) || []).slice(-2)[0] ? t.album.images.slice(-2)[0].url : '',
      url: t.external_urls && t.external_urls.spotify
    })).filter(t => /^[A-Za-z0-9]{22}$/.test(t.id));
    res.setHeader('Cache-Control', 'public, s-maxage=3600');
    res.end(JSON.stringify(out));
  } catch (e) { res.statusCode = 503; res.end('[]'); }
};
