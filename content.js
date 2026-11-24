/* Writing and Gallery sections: latest published posts, and the photo gallery with emoji-tag filters and a viewer.
   Both sections stay hidden until there is something to show. Everything shown is escaped first. */
(() => {
  const SB = 'https://orhlwvmxnsztwhfimjru.supabase.co/rest/v1', KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yaGx3dm14bnN6dHdoZmltanJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MjMwNDAsImV4cCI6MjEwMDA5OTA0MH0.Q8DRd40-OJcxuWRMpToCF9qF2XbsM1QGU_rdrr4_mQs', H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
  const PUB = 'https://orhlwvmxnsztwhfimjru.supabase.co/storage/v1/object/public/portfolio/';
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ours = u => typeof u === 'string' && u.startsWith(PUB);            // only show images from our own storage
  const date = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const tagsOf = t => String(t || '').split(',').map(s => s.trim()).filter(Boolean);

  /* ---------- Writing ---------- */
  const writing = document.getElementById('writing');
  if (writing) fetch(SB + '/blog_posts?select=slug,title,summary,cover_url,tags,published_at&published=eq.true&order=published_at.desc&limit=6', { headers: H })
    .then(r => r.ok ? r.json() : []).then(posts => {
      if (!posts.length) return;
      writing.querySelector('.wrgrid').innerHTML = posts.map(p =>
        '<a class="wrcard" href="/blog/' + encodeURIComponent(p.slug) + '">' +
        (ours(p.cover_url) ? '<span class="wrcover"><img src="' + esc(p.cover_url) + '" alt="" loading="lazy"></span>' : '') +
        '<span class="wrbody"><small>' + esc(date(p.published_at)) + '</small><b>' + esc(p.title) + '</b>' + (p.summary ? '<span class="wrsum">' + esc(p.summary) + '</span>' : '') +
        '<span class="wrtags">' + tagsOf(p.tags).slice(0, 3).map(t => '<i>' + esc(t) + '</i>').join('') + '</span><em>Read</em></span></a>').join('');
      writing.hidden = false;
    }).catch(() => {});

  /* ---------- Gallery ---------- */
  const gallery = document.getElementById('gallery');
  if (!gallery) return;
  let photos = [], filter = '', at = 0;
  const grid = gallery.querySelector('.glgrid'), chips = gallery.querySelector('.glchips'), view = gallery.querySelector('.glview');
  document.body.appendChild(view);   // the viewer sits above everything else on the page
  const shown = () => filter ? photos.filter(p => tagsOf(p.tags).includes(filter)) : photos;
  const drawGrid = () => {
    grid.innerHTML = shown().map((p, i) =>
      '<button type="button" class="glph" data-i="' + i + '"><img src="' + esc(p.url) + '" alt="' + esc(p.caption) + '" loading="lazy"' + (p.width && p.height ? ' width="' + p.width + '" height="' + p.height + '"' : '') + '>' +
      (p.caption || p.tags ? '<span class="glcap">' + (p.caption ? '<b>' + esc(p.caption) + '</b>' : '') + '<span>' + tagsOf(p.tags).map(t => '<i>' + esc(t) + '</i>').join('') + '</span></span>' : '') + '</button>').join('');
    grid.querySelectorAll('.glph').forEach(b => b.onclick = () => open(+b.dataset.i));
  };
  const drawChips = () => {
    const all = [...new Set(photos.flatMap(p => tagsOf(p.tags)))].slice(0, 14);
    chips.innerHTML = all.length ? '<button type="button" class="' + (filter ? '' : 'on') + '" data-t="">All</button>' + all.map(t => '<button type="button" class="' + (t === filter ? 'on' : '') + '" data-t="' + esc(t) + '">' + esc(t) + '</button>').join('') : '';
    chips.querySelectorAll('button').forEach(b => b.onclick = () => { filter = b.dataset.t; drawChips(); drawGrid(); });
  };
  // the full-size viewer, with arrow keys and Esc
  const open = i => {
    const list = shown(); at = (i + list.length) % list.length; const p = list[at];
    view.querySelector('img').src = p.url; view.querySelector('img').alt = p.caption || '';
    view.querySelector('.glvcap').innerHTML = (p.caption ? '<b>' + esc(p.caption) + '</b>' : '') + '<span>' + tagsOf(p.tags).map(t => '<i>' + esc(t) + '</i>').join('') + (p.taken_on ? '<small>' + esc(date(p.taken_on)) + '</small>' : '') + '</span>';
    view.hidden = false; document.documentElement.classList.add('grlock');
  };
  const close = () => { view.hidden = true; document.documentElement.classList.remove('grlock'); };
  view.querySelector('.glx').onclick = close;
  view.querySelector('.glprev').onclick = () => open(at - 1); view.querySelector('.glnext').onclick = () => open(at + 1);
  view.addEventListener('click', e => { if (e.target === view) close(); });
  document.addEventListener('keydown', e => { if (view.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') open(at - 1); if (e.key === 'ArrowRight') open(at + 1); });
  fetch(SB + '/gallery_photos?select=url,caption,tags,taken_on,width,height&order=created_at.desc&limit=60', { headers: H })
    .then(r => r.ok ? r.json() : []).then(rows => {
      photos = rows.filter(p => ours(p.url)); if (!photos.length) return;
      drawChips(); drawGrid(); gallery.hidden = false;
    }).catch(() => {});
})();
