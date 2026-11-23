// One-time helper: gets the Spotify "refresh token" the Right now card needs.
// Run it on your own computer. Nothing is saved or sent anywhere except Spotify.
//
// 1. In PowerShell, set your app's keys for this window only:
//      $env:SPOTIFY_CLIENT_ID = "paste client id"
//      $env:SPOTIFY_CLIENT_SECRET = "paste client secret"
// 2. Run:  node tools/spotify-token.js
// 3. Open the link it prints, press Agree, and copy the refresh token it shows.
const http = require('http');
const id = process.env.SPOTIFY_CLIENT_ID, secret = process.env.SPOTIFY_CLIENT_SECRET;
if (!id || !secret) { console.log('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first (see the top of this file).'); process.exit(1); }
const REDIRECT = 'http://127.0.0.1:8888/callback';
const SCOPES = 'user-read-currently-playing user-read-recently-played';   // read-only: what you are playing, nothing else
const link = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({ client_id: id, response_type: 'code', redirect_uri: REDIRECT, scope: SCOPES });

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8888');
  if (url.pathname !== '/callback') { res.end(); return; }
  const code = url.searchParams.get('code');
  if (!code) { res.end('No code from Spotify. Close this tab and run the helper again.'); return; }
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT })
  });
  const data = await r.json();
  if (!data.refresh_token) { res.end('Spotify said: ' + JSON.stringify(data)); console.log('Failed:', data); process.exit(1); }
  res.end('Done. Go back to PowerShell for your refresh token. You can close this tab.');
  console.log('\nYour refresh token (put this in Vercel as SPOTIFY_REFRESH_TOKEN):\n\n' + data.refresh_token + '\n');
  process.exit(0);
}).listen(8888, '127.0.0.1', () => console.log('Open this link in your browser and press Agree:\n\n' + link + '\n'));
