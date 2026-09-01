import { useRef, useCallback, useState, useEffect } from 'react';

const FIELD_ASPECT = 60 / 100;

const SHOT_ON_ICON = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/0097eee59_SHOOTON.png';
const SHOT_OFF_ICON = 'https://media.base44.com/images/public/69c340685dca7075d7622e15/03d49bf3c_SHOOTOFF.png';

// Classic football (soccer ball) SVG rendered at a given cx/cy with radius r
function BallSVG({ cx, cy, r, strokeColor = 'white', strokeWidth = 0.5 }) {
  // Scale the pattern relative to r
  const s = r / 3; // scale unit
  return (
    <g>
      {/* White base */}
      <circle cx={cx} cy={cy} r={r} fill="white" stroke={strokeColor} strokeWidth={strokeWidth} />
      {/* Center pentagon */}
      <polygon
        points={[0,1,2,3,4].map(i => {
          const angle = (i * 72 - 90) * Math.PI / 180;
          return `${cx + Math.cos(angle) * s * 0.9},${cy + Math.sin(angle) * s * 0.9}`;
        }).join(' ')}
        fill="#111"
        opacity="0.85"
      />
      {/* 5 surrounding pentagons (simplified as circles/spots) */}
      {[0,1,2,3,4].map(i => {
        const angle = (i * 72 - 90) * Math.PI / 180;
        const px = cx + Math.cos(angle) * s * 1.9;
        const py = cy + Math.sin(angle) * s * 1.9;
        return <circle key={i} cx={px} cy={py} r={s * 0.62} fill="#111" opacity="0.78" />;
      })}
    </g>
  );
}

export default function FootballPitch({
  onBallMove,
  onPossessionChange,
  homeSide = 'left',
  possession,
  homeTeamName,
  awayTeamName,
  homeColor = '#3b82f6',
  awayColor = '#ef4444',
  readOnly = false,
  showGoalAnimation = null,
  sdLastEvent = null,
  ballVisible = true,
  ballPos = null,       // {x, y} as percentage 0-100
  cornerArrow = null,   // {fromX, fromY, toX, toY} percentage — corner arrow
  matchStatus = null,
  sdStats = {},
  halfTimeStats = false,
  showWeatherOnPitch = null,
  penaltyFlash = false,
  penaltyTeam = null,
  referees = null,
  redCards = null,
  onDismissOverlay = null, // callback: any click on pitch when active overlay/corner arrow
}) {
  const pitchRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const [flashOn, setFlashOn] = useState(true);

  useEffect(() => {
    if (!penaltyFlash) { setFlashOn(true); return; }
    const id = setInterval(() => setFlashOn(v => !v), 400);
    return () => clearInterval(id);
  }, [penaltyFlash]);

  // In second half, home side is FLIPPED
  const isSecondHalf = ['second_half', 'extra_time_first_half', 'extra_time_second_half', 'extra_time_half_time'].includes(matchStatus);
  const effectiveHomeSide = isSecondHalf
    ? (homeSide === 'left' ? 'right' : 'left')
    : homeSide;

  const matchStarted = matchStatus && matchStatus !== 'scheduled';
  const possessionColor = matchStarted && (possession === 'home' ? homeColor : possession === 'away' ? awayColor : null);

  // Penalty spot
  const penaltySpotPos = (() => {
    if (!penaltyFlash || !penaltyTeam) return null;
    const teamAttackSide = penaltyTeam === 'home'
      ? (effectiveHomeSide === 'left' ? 'right' : 'left')
      : (effectiveHomeSide === 'left' ? 'left' : 'right');
    return teamAttackSide === 'right' ? { x: 89, y: 50 } : { x: 11, y: 50 };
  })();

  // --- Touch/click handlers ---
  const getPosFromPointer = useCallback((clientX, clientY) => {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }, []);

  const handleClick = useCallback((e) => {
    if (readOnly) return;
    // If there's an active overlay or corner arrow, dismiss it first
    if ((sdLastEvent && onDismissOverlay) || (cornerArrow && onDismissOverlay)) {
      onDismissOverlay();
      return;
    }
    if (onBallMove) {
      const pos = getPosFromPointer(e.clientX, e.clientY);
      if (pos) onBallMove(pos);
    }
  }, [readOnly, onBallMove, getPosFromPointer, sdLastEvent, cornerArrow, onDismissOverlay]);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    const isSwipe = Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5;
    if (isSwipe && !readOnly && onPossessionChange) {
      const rightTeam = effectiveHomeSide === 'right' ? 'home' : 'away';
      const leftTeam = effectiveHomeSide === 'left' ? 'home' : 'away';
      onPossessionChange(dx > 0 ? rightTeam : leftTeam);
    }
  }, [readOnly, onPossessionChange, effectiveHomeSide]);

  const WEATHER_ICONS = { sun: '☀️', cloudy: '⛅', rain: '🌧️', snow: '❄️', wind: '💨', fog: '🌫️' };

  const htStatItems = [
    { label: 'Shuta 🎯', h: sdStats.shot_on_home || 0, a: sdStats.shot_on_away || 0 },
    { label: 'Shuta jashtë 💨', h: sdStats.shot_off_home || 0, a: sdStats.shot_off_away || 0 },
    { label: 'Kornerë 🚩', h: sdStats.corner_home || 0, a: sdStats.corner_away || 0 },
    { label: 'Kartona 🟨', h: sdStats.yellow_home || 0, a: sdStats.yellow_away || 0 },
    { label: 'Faule 🤚', h: sdStats.foul_home || 0, a: sdStats.foul_away || 0 },
  ];

  const homeRedCards = redCards?.home || 0;
  const awayRedCards = redCards?.away || 0;

  const leftTeamName = effectiveHomeSide === 'left' ? homeTeamName : awayTeamName;
  const rightTeamName = effectiveHomeSide === 'right' ? homeTeamName : awayTeamName;
  const leftTeamColor = effectiveHomeSide === 'left' ? homeColor : awayColor;
  const rightTeamColor = effectiveHomeSide === 'right' ? homeColor : awayColor;
  const leftTeamRedCards = effectiveHomeSide === 'left' ? homeRedCards : awayRedCards;
  const rightTeamRedCards = effectiveHomeSide === 'right' ? homeRedCards : awayRedCards;

  const possessingTeamName = possession === 'home' ? homeTeamName : possession === 'away' ? awayTeamName : null;
  const penaltyBallPos = penaltyFlash && penaltySpotPos ? penaltySpotPos : null;

  // Corner arrow: convert % coords to SVG viewBox (100x60)
  const ca = cornerArrow;

  // Cursor logic
  const hasActiveOverlay = !readOnly && onDismissOverlay && (sdLastEvent || cornerArrow);
  const cursorStyle = readOnly ? 'default' : hasActiveOverlay ? 'pointer' : 'crosshair';

  return (
    <div
      ref={pitchRef}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full overflow-hidden rounded-xl select-none"
      style={{
        paddingBottom: `${FIELD_ASPECT * 100}%`,
        background: 'linear-gradient(180deg, #2d7a2d 0%, #1e5c1e 50%, #2d7a2d 100%)',
        cursor: cursorStyle,
        touchAction: 'none',
      }}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="none">

        {/* Field lines */}
        <rect x="2" y="2" width="96" height="56" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
        <line x1="50" y1="2" x2="50" y2="58" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
        <circle cx="50" cy="30" r="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
        <circle cx="50" cy="30" r="0.6" fill="rgba(255,255,255,0.6)" />
        <rect x="2" y="16" width="16" height="28" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
        <rect x="2" y="22" width="6" height="16" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
        <rect x="0" y="26" width="2" height="8" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.7)" strokeWidth="0.4" />
        <rect x="82" y="16" width="16" height="28" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
        <rect x="92" y="22" width="6" height="16" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
        <rect x="98" y="26" width="2" height="8" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.7)" strokeWidth="0.4" />
        <circle cx="11" cy="30" r="0.5" fill="rgba(255,255,255,0.6)" />
        <circle cx="89" cy="30" r="0.5" fill="rgba(255,255,255,0.6)" />

        {/* Corner arrow — from corner toward goal */}
        {ca && (
          <>
            {/* Shadow line */}
            <line
              x1={ca.fromX} y1={ca.fromY * 0.6}
              x2={ca.toX}   y2={ca.toY * 0.6}
              stroke="rgba(0,0,0,0.35)" strokeWidth="1.6" strokeLinecap="round"
            />
            {/* Main arrow line */}
            <line
              x1={ca.fromX} y1={ca.fromY * 0.6}
              x2={ca.toX}   y2={ca.toY * 0.6}
              stroke="#facc15" strokeWidth="1.1" strokeLinecap="round"
              strokeDasharray="3 1.5"
            />
            {/* Arrowhead */}
            <polygon
              points={(() => {
                const dx = ca.toX - ca.fromX;
                const dy = (ca.toY - ca.fromY) * 0.6;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const ux = dx / len, uy = dy / len;
                const px = -uy, py = ux;
                const tip = { x: ca.toX, y: ca.toY * 0.6 };
                const base1 = { x: tip.x - ux * 3.5 + px * 1.5, y: tip.y - uy * 3.5 + py * 1.5 };
                const base2 = { x: tip.x - ux * 3.5 - px * 1.5, y: tip.y - uy * 3.5 - py * 1.5 };
                return `${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`;
              })()}
              fill="#facc15"
            />
            {/* Flag emoji at origin */}
            <text x={ca.fromX} y={ca.fromY * 0.6 - 1.5} textAnchor="middle" fontSize="4" style={{ userSelect: 'none' }}>🚩</text>
          </>
        )}

        {/* Ball */}
        {ballVisible && ballPos && !penaltyFlash && (
          <BallSVG
            cx={ballPos.x}
            cy={ballPos.y * 0.6}
            r={2.6}
            strokeColor={possessionColor || 'rgba(255,255,255,0.5)'}
            strokeWidth={0.6}
          />
        )}

        {/* Penalty ball flash */}
        {penaltyBallPos && flashOn && (
          <BallSVG
            cx={penaltyBallPos.x}
            cy={penaltyBallPos.y * 0.6}
            r={3}
            strokeColor={penaltyTeam === 'home' ? homeColor : awayColor}
            strokeWidth={0.8}
          />
        )}
      </svg>

      {/* Possessing team name overlay */}
      {possessingTeamName && matchStarted && ballVisible && !showGoalAnimation && matchStatus !== 'full_time' && !cornerArrow && !sdLastEvent && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
          <div className="text-sm font-black tracking-wide drop-shadow-lg" style={{ color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
            {possessingTeamName}
          </div>
        </div>
      )}

      {/* Team names left/right */}
      <div className="absolute left-0 right-0 flex justify-between pointer-events-none" style={{ top: '10%', paddingLeft: '4%', paddingRight: '4%' }}>
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[11px] font-black px-1.5 py-0.5 rounded leading-none" style={{ color: leftTeamColor, background: 'rgba(0,0,0,0.4)' }}>
            {leftTeamName}
          </span>
          {leftTeamRedCards > 0 && (
            <span className="text-[9px] px-1 py-0.5 rounded font-black" style={{ background: 'rgba(0,0,0,0.5)', color: '#ef4444' }}>
              {'🟥'.repeat(Math.min(leftTeamRedCards, 3))}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[11px] font-black px-1.5 py-0.5 rounded leading-none text-right" style={{ color: rightTeamColor, background: 'rgba(0,0,0,0.4)' }}>
            {rightTeamName}
          </span>
          {rightTeamRedCards > 0 && (
            <span className="text-[9px] px-1 py-0.5 rounded font-black" style={{ background: 'rgba(0,0,0,0.5)', color: '#ef4444' }}>
              {'🟥'.repeat(Math.min(rightTeamRedCards, 3))}
            </span>
          )}
        </div>
      </div>

      {/* Second half indicator */}
      {isSecondHalf && ballVisible && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.7)' }}>
            ⇄ P.2
          </span>
        </div>
      )}

      {/* Pre-match weather */}
      {showWeatherOnPitch && !ballVisible && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-center px-4 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.85)' }}>
            <div className="text-3xl">{WEATHER_ICONS[showWeatherOnPitch.weather] || '🌡️'}</div>
            {showWeatherOnPitch.temp != null && (
              <div className="text-base font-black text-gray-800">{showWeatherOnPitch.temp}°C</div>
            )}
          </div>
        </div>
      )}

      {/* Referees bottom-right pre-match */}
      {referees && !ballVisible && (referees.main || referees.assistant1 || referees.assistant2) && (
        <div className="absolute bottom-2 right-2 pointer-events-none text-right">
          <div className="px-2 py-1.5 rounded-lg text-[9px] space-y-0.5" style={{ background: 'rgba(0,0,0,0.65)', color: 'white', lineHeight: '1.7' }}>
            {referees.main && (
              <div className="flex items-center justify-end gap-1">
                <span>{referees.main}</span>
                <span>👨‍⚖️</span>
              </div>
            )}
            {referees.assistant1 && (
              <div className="flex items-center justify-end gap-1">
                <span>{referees.assistant1}</span>
                <span>🚩</span>
              </div>
            )}
            {referees.assistant2 && (
              <div className="flex items-center justify-end gap-1">
                <span>{referees.assistant2}</span>
                <span>🚩</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Half-time stats overlay */}
      {halfTimeStats && matchStatus === 'half_time' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="px-4 py-3 rounded-xl w-[80%]" style={{ background: 'rgba(255,255,255,0.88)' }}>
            <p className="text-center text-[10px] font-black text-gray-800 mb-2">📊 STATISTIKAT – PJESA E PARË</p>
            <div className="space-y-1">
              {htStatItems.map(item => (
                <div key={item.label} className="flex justify-between items-center text-[9px] font-bold">
                  <span className="font-black" style={{color:'#111'}}>{item.h}</span>
                  <span style={{color:'#555'}}>{item.label}</span>
                  <span className="font-black" style={{color:'#111'}}>{item.a}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Goal animation */}
      {showGoalAnimation && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="text-center px-5 py-4 rounded-2xl animate-bounce" style={{ background: 'rgba(255,255,255,0.88)' }}>
            <div className="text-4xl mb-1">⚽</div>
            <div className="text-2xl font-black" style={{ color: '#facc15', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>GOOOL!</div>
            <div className="text-base font-black mt-1" style={{ color: showGoalAnimation.team === 'home' ? homeColor : awayColor }}>
              {showGoalAnimation.teamName}
            </div>
            {showGoalAnimation.playerName && (
              <div className="text-sm font-bold text-gray-800">{showGoalAnimation.playerName}</div>
            )}
          </div>
        </div>
      )}

      {/* Full time overlay */}
      {matchStatus === 'full_time' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="text-center px-5 py-4 rounded-2xl" style={{ background: 'rgba(0,0,0,0.75)' }}>
            <div className="text-xl font-black text-white tracking-wide">NDESHJA PËRFUNDOI</div>
          </div>
        </div>
      )}

      {/* SD Event overlay */}
      {sdLastEvent && !showGoalAnimation && matchStatus !== 'full_time' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="text-center px-4 py-3 rounded-2xl mx-4 max-w-[70%]" style={{ background: sdLastEvent.isVar ? 'rgba(120,120,130,0.92)' : 'rgba(255,255,255,0.88)' }}>
            {sdLastEvent.iconUrl ? (
              <img src={sdLastEvent.iconUrl} alt="" className="w-12 h-12 mx-auto mb-1 object-contain" />
            ) : (
              <div className="text-2xl">{sdLastEvent.icon}</div>
            )}
            <div className="text-sm font-black" style={{ color: sdLastEvent.isVar ? 'white' : '#111' }}>{sdLastEvent.label}</div>
            {sdLastEvent.teamName && (
              <div className="text-xs font-bold mt-0.5" style={{ color: sdLastEvent.teamColor }}>{sdLastEvent.teamName}</div>
            )}
            {sdLastEvent.playerOut && <div className="text-xs font-bold mt-1 text-red-500">⬆ {sdLastEvent.playerOut}</div>}
            {sdLastEvent.playerIn && <div className="text-xs font-bold text-green-600">⬇ {sdLastEvent.playerIn}</div>}
            {sdLastEvent.playerName && !sdLastEvent.playerOut && !sdLastEvent.playerIn && (
              <div className="text-xs text-gray-800 font-semibold">{sdLastEvent.playerName}</div>
            )}
            {onDismissOverlay && (
              <div className="text-[9px] text-gray-500 mt-1">Kliko fushën për të mbyllur</div>
            )}
          </div>
        </div>
      )}

      {/* Corner arrow dismiss hint (agent only) */}
      {cornerArrow && !sdLastEvent && onDismissOverlay && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,0,0.9)' }}>
            Kliko fushën për të hequr shigjëtën
          </span>
        </div>
      )}
    </div>
  );
}

export { SHOT_ON_ICON, SHOT_OFF_ICON };