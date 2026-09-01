import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const DAYS_AL = ['E Diel', 'E Hënë', 'E Martë', 'E Mërkurë', 'E Enjte', 'E Premte', 'E Shtunë'];
const MONTHS_AL = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];

export default function PublicDateBar() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const day = DAYS_AL[now.getDay()];
  const date = now.getDate();
  const month = MONTHS_AL[now.getMonth()];
  const year = now.getFullYear();
  const time = now.toTimeString().slice(0, 8);

  return (
    <div className="bg-[#0d1827] border-b border-white/10 flex items-center justify-center gap-3 py-1 px-3">
      <div className="inline-flex items-center gap-2 text-white/80 text-[11px] font-medium">
        <span>{day}</span>
        <span className="w-px h-3 bg-white/30" />
        <span>{date} {month} {year}</span>
        <span className="w-px h-3 bg-white/30" />
        <span className="font-mono tabular-nums">{time}</span>
      </div>
      <Link
        to="/kontakti?agent=1"
        className="text-[10px] font-black px-2 py-0.5 rounded-full border border-yellow-400/70 text-yellow-300 uppercase tracking-wide"
        style={{ animation: 'agentFlash 2s ease-in-out infinite' }}
      >
        Bëhu Vullnetar
      </Link>
      <style>{`
        @keyframes agentFlash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}