// The video for the "Right now" card.
//  - /api/latest-video          → the newest public video on the Exolotis YouTube channel
//  - /api/latest-video?v=<id>   → the title and channel of one video you pinned in the Studio
// No key needed: reads YouTube's public feed and oEmbed. Answers are kept for 30 minutes.
const CHANNEL_ID = 'UCggPySm-JfIzqzjnvj5Av2w';   // youtube.com/@exolotis

const pick = (xml, tag) => { const m = xml.match(new RegExp('<' + tag + '>([^<]*)</' + tag + '>')); return m ? m[1] : ''; };
const unescape = t => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const VALID = /^[A-Za-z0-9_-]{11}$/;

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const send = (body, seconds) => { res.setHeader('Cache-Control', 'public, s-maxage=' + seconds + ', stale-while-revalidate=3600'); res.end(JSON.stringify(body)); };
  try {
    const v = new URL(req.url, 'http://x').searchParams.get('v');
    if (v) {                                             // one pinned video
      if (!VALID.test(v)) return send({ none: true }, 300);
      const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + v));
      if (!r.ok) return send({ none: true }, 300);
      const o = await r.json();
      return send({ id: v, title: o.title || '', channel: o.author_name || '', pinned: true }, 1800);
    }
    const r = await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID);   // newest upload
    const xml = await r.text(), entry = (xml.split('<entry>')[1] || '').split('</entry>')[0], id = pick(entry, 'yt:videoId');
    if (!r.ok || !VALID.test(id)) throw new Error('no video');
    return send({ id, title: unescape(pick(entry, 'title')), published: pick(entry, 'published'), channel: 'Exolotis' }, 1800);
  } catch (e) { return send({ none: true }, 300); }
};
