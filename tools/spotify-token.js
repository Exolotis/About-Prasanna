// One-time helper: gets the Spotify "refresh token" the Right now card needs.
// Run it on your own computer. Nothing is saved or sent anywhere except Spotify.
//
// 1. In PowerShell, set your app's keys for this window only:
//      $env:SPOTIFY_CLIENT_ID = "paste client id"
//      $env:SPOTIFY_CLIENT_SECRET = "paste client secret"
// 2. Run:  node tools/spotify-token.js
// 3. Open the link it prints and press Agree. The token shows on that page and in this window.
const http = require('http');
const id = (process.env.SPOTIFY_CLIENT_ID || '').trim(), secret = (process.env.SPOTIFY_CLIENT_SECRET || '').trim();
if (!id || !secret) { console.log('\nSet SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first, in this same window (see the top of this file).\n'); process.exit(1); }
const REDIRECT = 'http://127.0.0.1:8888/callback';
const SCOPES = 'user-read-currently-playing user-read-recently-played';   // read-only: what you are playing, nothing else
const link = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({ client_id: id, response_type: 'code', redirect_uri: REDIRECT, scope: SCOPES, show_dialog: 'true' });
const page = (title, body) => '<!doctype html><meta charset="utf-8"><title>' + title + '</title><body style="font:16px system-ui;background:#111;color:#eee;max-width:720px;margin:60px auto;padding:0 20px"><h2>' + title + '</h2>' + body + '</body>';
const escape = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8888');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (url.pathname !== '/callback') { res.end(page('Spotify helper', '<p>Waiting for Spotify. Open the link from PowerShell.</p>')); return; }
  if (url.searchParams.get('error')) { console.log('Spotify said: ' + url.searchParams.get('error')); res.end(page('Spotify said no', '<p>' + escape(url.searchParams.get('error')) + '. Run the helper again.</p>')); return; }
  const code = url.searchParams.get('code');
  if (!code) { res.end(page('No code', '<p>No code from Spotify. Run the helper again.</p>')); return; }
  console.log('Got a reply from Spotify, asking for the token…');
  try {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT })
    });
    const data = await r.json();
    if (!data.refresh_token) {
      const why = data.error_description || data.error || JSON.stringify(data);
      console.log('\nFailed: ' + why + '\n(Usually a wrong client secret, or the redirect URI in your Spotify app is not exactly ' + REDIRECT + ')\n');
      res.end(page('Did not work', '<p>Spotify said: <b>' + escape(why) + '</b></p><p>Usually a wrong client secret, or the redirect URI in your Spotify app is not exactly <code>' + REDIRECT + '</code>.</p>'));
    } else {
      console.log('\nYour refresh token (put this in Vercel as SPOTIFY_REFRESH_TOKEN):\n\n' + data.refresh_token + '\n');
      res.end(page('Your refresh token', '<p>Copy this and paste it in Vercel as <b>SPOTIFY_REFRESH_TOKEN</b>. Keep it private.</p>' +
        '<textarea id="t" readonly style="width:100%;height:110px;background:#000;color:#7CFC9A;border:1px solid #444;border-radius:8px;padding:10px;font:13px monospace">' + escape(data.refresh_token) + '</textarea>' +
        '<p><button onclick="navigator.clipboard.writeText(document.getElementById(\'t\').value);this.textContent=\'Copied\'" style="font:600 15px system-ui;padding:10px 18px;border-radius:999px;border:0;cursor:pointer">Copy token</button></p><p>You can close this tab and the PowerShell window.</p>'));
    }
  } catch (e) { console.log('Failed: ' + e.message); res.end(page('Did not work', '<p>' + escape(e.message) + '</p>')); }
  setTimeout(() => process.exit(0), 500);
});
server.on('error', e => { console.log(e.code === 'EADDRINUSE' ? '\nPort 8888 is busy: an older helper is probably still open. Close other PowerShell windows running it, then try again.\n' : 'Error: ' + e.message); process.exit(1); });
server.listen(8888, '127.0.0.1', () => console.log('\nWaiting for Spotify. Keep this window open.\nOpen this link in your browser and press Agree:\n\n' + link + '\n'));
