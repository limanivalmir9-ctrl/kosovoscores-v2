import { useState, useEffect, useRef } from 'react';
import { shouldShowAd } from '@/lib/adDevice';

/**
 * RotatingAdBanner
 * Takes a list of ads from the same rotation_group and flips through them
 * with a 3D card-flip animation. Each ad has its own rotation_seconds timer.
 */
export default function RotatingAdBanner({ ads, className = '', defaultWidth, defaultHeight }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const timerRef = useRef(null);

  const validAds = ads.filter(a => a.image && shouldShowAd(a));

  useEffect(() => {
    if (validAds.length <= 1) return;
    scheduleNext(0);
    return () => clearTimeout(timerRef.current);
  }, [validAds.length]);

  const scheduleNext = (idx) => {
    clearTimeout(timerRef.current);
    const secs = validAds[idx]?.rotation_seconds || 5;
    timerRef.current = setTimeout(() => {
      goNext(idx);
    }, secs * 1000);
  };

  const goNext = (idx) => {
    const nextIdx = (idx + 1) % validAds.length;
    // Start flip animation
    setFlipping(true);
    // At halfway point (300ms), swap the image
    setTimeout(() => {
      setCurrentIndex(nextIdx);
      setShowBack(false);
    }, 300);
    // End flip
    setTimeout(() => {
      setFlipping(false);
      scheduleNext(nextIdx);
    }, 600);
  };

  if (!validAds.length) return null;
  const safeIndex = currentIndex % validAds.length;
  const ad = validAds[safeIndex];

  const w = ad.width || defaultWidth;
  const h = ad.height || defaultHeight;
  const sized = w || h;
  const imgStyle = sized
    ? { width: w ? w + 'px' : undefined, height: h ? h + 'px' : undefined, objectFit: 'contain', display: 'block' }
    : { maxHeight: '54px' };
  const imgClass = sized ? '' : 'w-full object-contain';

  const content = (
    <div
      className={`relative overflow-hidden rounded-lg my-2 ${className}`}
      style={{ perspective: '800px', minHeight: sized ? undefined : '54px' }}
    >
      <div
        style={{
          transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)',
          transformStyle: 'preserve-3d',
          transform: flipping ? 'rotateY(90deg)' : 'rotateY(0deg)',
          backfaceVisibility: 'hidden',
        }}
      >
        {ad.link ? (
          <a href={ad.link} target="_blank" rel="noopener noreferrer" className="block">
            <img src={ad.image} alt="Ad" className={imgClass} style={imgStyle} loading="lazy" />
          </a>
        ) : (
          <img src={ad.image} alt="Ad" className={imgClass} style={imgStyle} loading="lazy" />
        )}
      </div>
      {/* Dots indicator */}
      {validAds.length > 1 && (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-1">
          {validAds.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentIndex ? 12 : 5,
                height: 4,
                backgroundColor: i === currentIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );

  return content;
}