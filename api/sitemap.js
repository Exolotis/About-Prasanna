// sitemap.xml for search engines: the home page plus every published blog post (read live from Supabase).
const SB = 'https://orhlwvmxnsztwhfimjru.supabase.co/rest/v1/blog_posts?select=slug,published_at&published=eq.true&order=published_at.desc&limit=500';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yaGx3dm14bnN6dHdoZmltanJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MjMwNDAsImV4cCI6MjEwMDA5OTA0MH0.Q8DRd40-OJcxuWRMpToCF9qF2XbsM1QGU_rdrr4_mQs';   // the public read-only key (same one the page uses)

module.exports = async (req, res) => {
  let posts = [];
  if (KEY) {
    try { const r = await fetch(SB, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } }); if (r.ok) posts = await r.json(); } catch (e) {}
  }
  const day = d => new Date(d || Date.now()).toISOString().slice(0, 10);
  const urls = ['<url><loc>https://www.prasanna.lol/</loc><lastmod>' + day() + '</lastmod><priority>1.0</priority></url>']
    .concat(posts.filter(p => /^[a-z0-9-]{3,80}$/.test(p.slug)).map(p => '<url><loc>https://www.prasanna.lol/blog/' + p.slug + '</loc><lastmod>' + day(p.published_at) + '</lastmod></url>'));
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.end('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>\n');
};
