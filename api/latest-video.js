// The newest public video on the Moluscca YouTube channel, for the "Right now" section.
// Reads YouTube's public feed (no key needed) and keeps the answer for 30 minutes.
const CHANNEL_ID = 'UCEqi6zaDYrEzrMCACyjeCyw';   // youtube.com/@Moluscca

const pick = (xml, tag) => { const m = xml.match(new RegExp('<' + tag + '>([^<]*)</' + tag + '>')); return m ? m[1] : ''; };
const unescape = t => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const r = await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID);
    const xml = await r.text(), entry = (xml.split('<entry>')[1] || '').split('</entry>')[0];
    const id = pick(entry, 'yt:videoId');
    if (!r.ok || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('no video');
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.end(JSON.stringify({ id, title: unescape(pick(entry, 'title')), published: pick(entry, 'published'), url: 'https://www.youtube.com/watch?v=' + id }));
  } catch (e) {
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    res.end(JSON.stringify({ none: true }));
  }
};
