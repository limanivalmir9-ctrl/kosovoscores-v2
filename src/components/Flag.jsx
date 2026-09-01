import { countryInfo } from '@/lib/countries';

// Flag image via flagcdn (renders on all platforms incl. Windows, unlike emoji flags).
// `value` can be a country name (Shqipëri) or ISO alpha-2 code (AL).
export default function Flag({ value, size = 16, className = '' }) {
  const ci = countryInfo(value);
  if (!ci?.code) return null;
  return (
    <img
      src={`https://flagcdn.com/w40/${ci.code.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w80/${ci.code.toLowerCase()}.png 2x`}
      alt={ci.name || ci.code}
      width={size}
      height={Math.round(size * 0.75)}
      loading="lazy"
      className={`inline-block object-cover rounded-[2px] align-middle ${className}`}
      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
    />
  );
}