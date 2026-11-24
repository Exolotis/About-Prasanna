/* Hobbies tiles: each tile slowly crossfades through its photos while it is on screen. */
(() => {
  const tiles = document.querySelectorAll('[data-hb]'); if (!tiles.length) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  tiles.forEach((tile, n) => {
    const imgs = tile.querySelectorAll('.hbimgs img'), dots = tile.querySelectorAll('.hbdots i');
    let at = 0, timer = null;
    const show = i => { imgs.forEach((im, k) => im.classList.toggle('on', k === i)); dots.forEach((d, k) => d.classList.toggle('on', k === i)); };
    show(0);
    if (still || imgs.length < 2) return;
    const start = () => { if (!timer) timer = setInterval(() => { at = (at + 1) % imgs.length; show(at); }, 3600 + n * 500); };
    const stop = () => { clearInterval(timer); timer = null; };
    // only animate while the tile is visible
    new IntersectionObserver(list => list.forEach(e => e.isIntersecting ? start() : stop()), { threshold: .2 }).observe(tile);
  });
})();
