// Global image optimization: ensure every <img> decodes off the main thread
// and loads lazily, except above-the-fold header/hero images (data-eager or
// inside <header>/<nav>) which must stay eager for fast first paint (LCP).
//
// base44 media does NOT support server-side resize query params, so existing
// images can't be shrunk via URL — but this defers off-screen images and decodes
// all images off the main thread, which is the biggest remaining speed win.

function upgrade(img) {
  if (!(img instanceof HTMLImageElement)) return;
  if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
  if (!img.hasAttribute('loading') && !img.closest('header, nav, [data-eager]')) {
    img.setAttribute('loading', 'lazy');
  }
}

export function initLazyImages() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('img').forEach(upgrade);

  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.tagName === 'IMG') upgrade(node);
        else if (node.querySelectorAll) node.querySelectorAll('img').forEach(upgrade);
      });
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
}