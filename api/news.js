// World headlines for the "Enter the world" loading screen: /api/news → up to 8 BBC News headlines with links.
// Reads BBC's public RSS feed on the server (no keys) and lets Vercel cache the answer for 20 minutes,
// so the feed is fetched a few times an hour at most, however many people visit.
const FEED = 'https://feeds.bbci.co.uk/news/world/rss.xml';

const clean = s => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, '').trim();

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const r = await fetch(FEED, { headers: { 'User-Agent': 'prasanna.lol headlines' }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error('feed ' + r.status);
    const xml = await r.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8).map(m => {
      const title = clean((m[1].match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
      const link = clean((m[1].match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '');
      return { title: title.slice(0, 140), link: /^https:\/\/www\.bbc\.(co\.uk|com)\//.test(link) ? link : 'https://www.bbc.com/news/world' };
    }).filter(i => i.title);
    res.setHeader('Cache-Control', 's-maxage=1200, stale-while-revalidate=600');
    res.end(JSON.stringify({ source: 'BBC News', items }));
  } catch (e) {
    res.setHeader('Cache-Control', 's-maxage=120');
    res.end(JSON.stringify({ source: 'BBC News', items: [] }));
  }
};
