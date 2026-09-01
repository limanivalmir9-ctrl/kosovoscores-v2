// Auto-assignment of non-conflicting team colors for a match.
// Excludes white and bright/neon yellow per product requirement.

const COLOR_PALETTE = [
  '#1d4ed8', '#dc2626', '#0f766e', '#7c3aed', '#ea580c',
  '#0e7490', '#be123c', '#4338ca', '#15803d', '#9333ea',
  '#a16207', '#0d9488', '#c2410c', '#6d28d9',
];

function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const num = parseInt(n, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function relLum({ r, g, b }) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(a, b) {
  const la = relLum(hexToRgb(a));
  const lb = relLum(hexToRgb(b));
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// Reject white/near-white and bright/neon yellow
function isExcluded(hex) {
  if (!hex) return true;
  const { r, g, b } = hexToRgb(hex);
  if (r >= 225 && g >= 225 && b >= 225) return true; // near-white
  if (r >= 200 && g >= 200 && b <= 120) return true;   // bright yellow
  return false;
}

/**
 * Pick non-conflicting team colors.
 * Keeps valid existing colors; replaces excluded (white/bright-yellow) ones;
 * ensures home vs away have sufficient contrast, falling back to the palette.
 */
export function pickTeamColors({ homeColor, awayColor } = {}) {
  let home = !isExcluded(homeColor) ? homeColor : null;
  let away = !isExcluded(awayColor) ? awayColor : null;

  if (home && away && contrastRatio(home, away) >= 1.6) {
    return { homeColor: home, awayColor: away };
  }
  if (home && !away) {
    const pick = COLOR_PALETTE.find(c => contrastRatio(home, c) >= 1.6) || COLOR_PALETTE[0];
    return { homeColor: home, awayColor: pick };
  }
  if (!home && away) {
    const pick = COLOR_PALETTE.find(c => contrastRatio(away, c) >= 1.6) || COLOR_PALETTE[1];
    return { homeColor: pick, awayColor: away };
  }
  // neither valid — pick two distinct palette colors with good contrast
  const h = COLOR_PALETTE[0];
  const a = COLOR_PALETTE.find(c => c !== h && contrastRatio(h, c) >= 1.6) || COLOR_PALETTE[1];
  return { homeColor: h, awayColor: a };
}