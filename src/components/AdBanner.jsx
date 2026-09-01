import { shouldShowAd } from '@/lib/adDevice';

export default function AdBanner({ ad, defaultWidth, defaultHeight }) {
  if (!ad || !ad.image) return null;
  if (!shouldShowAd(ad)) return null;

  const w = ad.width || defaultWidth;
  const h = ad.height || defaultHeight;
  const sized = w || h;

  const imgStyle = {};
  if (w) imgStyle.width = w + 'px';
  if (h) imgStyle.height = h + 'px';
  if (sized) { imgStyle.objectFit = 'contain'; imgStyle.display = 'block'; }

  const content = (
    <div className="rounded-lg overflow-hidden my-2" style={sized ? {} : { maxHeight: '54px' }}>
      <img
        src={ad.image}
        alt="Ad"
        style={sized ? imgStyle : {}}
        className={sized ? '' : 'w-full h-full object-contain'}
        loading="lazy"
        decoding="async"
      />
    </div>
  );

  if (ad.link) {
    return (
      <a href={ad.link} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return content;
}