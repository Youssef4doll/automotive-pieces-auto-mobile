/** Everything measurable about one rendered screen. */
export async function inspect(page, width) {
  return page.evaluate((W) => {
    const out = { hScroll: document.documentElement.scrollWidth > W + 1, offscreen: [], clipped: [], small: [] };
    const seen = new Set();

    /** Is this node inside something that scrolls sideways on purpose? */
    const inHorizontalScroller = (el) => {
      let n = el.parentElement;
      while (n && n !== document.body) {
        const s = getComputedStyle(n);
        if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && n.scrollWidth > n.clientWidth + 4) return true;
        n = n.parentElement;
      }
      return false;
    };

    for (const el of document.querySelectorAll('div,span,button')) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.top < -200 || r.top > window.innerHeight + 2000) continue;
      const cs = getComputedStyle(el);
      const text = (el.textContent || '').trim();

      if (el.children.length === 0 && text) {
        // Clipped text. An ellipsis is not clipping — `numberOfLines` is a
        // deliberate choice and renders as -webkit-line-clamp or
        // text-overflow, so both are excluded. An earlier version of this
        // check reported every truncated product name and was wrong.
        if (
          el.scrollWidth > el.clientWidth + 2 &&
          cs.overflow !== 'visible' &&
          !cs.textOverflow.includes('ellipsis') &&
          cs.webkitLineClamp === 'none'
        ) {
          const k = 'clip:' + text.slice(0, 28);
          if (!seen.has(k)) { seen.add(k); out.clipped.push({ text: text.slice(0, 28), want: el.scrollWidth, got: el.clientWidth }); }
        }
        if (r.right > W + 1 && !inHorizontalScroller(el)) {
          const k = 'off:' + text.slice(0, 24);
          if (!seen.has(k)) { seen.add(k); out.offscreen.push({ text: text.slice(0, 24), right: Math.round(r.right) }); }
        }
      }

      if (el.getAttribute('role') === 'button' || el.tagName === 'BUTTON') {
        if (r.height < 43.5 || r.width < 43.5) {
          const name = el.getAttribute('aria-label') || text.slice(0, 24);
          const k = `tap:${name}:${Math.round(r.width)}x${Math.round(r.height)}`;
          if (!seen.has(k)) { seen.add(k); out.small.push({ control: name, w: Math.round(r.width), h: Math.round(r.height) }); }
        }
      }
    }
    return out;
  }, width);
}

