import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { schema } from '@/lib/seo';

// items: [{ label, to? }]  — last item is the current page (no link).
export default function Breadcrumbs({ items = [] }) {
  useEffect(() => {
    if (!items || items.length === 0) return;
    let el = document.getElementById('ks-jsonld-breadcrumb');
    if (!el) {
      el = document.createElement('script');
      el.setAttribute('type', 'application/ld+json');
      el.setAttribute('id', 'ks-jsonld-breadcrumb');
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(schema.breadcrumb(items));
    return () => {
      const node = document.getElementById('ks-jsonld-breadcrumb');
      if (node) node.remove();
    };
  }, [JSON.stringify(items)]);

  if (!items || items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[11px] text-muted-foreground overflow-x-auto pb-1 mb-2 scrollbar-hide">
      <Link to="/" className="hover:text-primary shrink-0">Home</Link>
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1 shrink-0 min-w-0">
            <span className="text-muted-foreground/40">/</span>
            {it.to && !isLast ? (
              <Link to={it.to} className="hover:text-primary truncate">{it.label}</Link>
            ) : (
              <span className="text-foreground font-medium truncate">{it.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}