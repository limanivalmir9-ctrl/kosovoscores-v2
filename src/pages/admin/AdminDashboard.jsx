import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Trophy, Users, Calendar, Newspaper, Star, Image, UserCheck,
  Table, Mail, BarChart2, UserSquare, MessageSquare, Tv2,
  ClipboardList, ArrowRightLeft, Heart, ShieldCheck, BellRing, LayoutDashboard
} from 'lucide-react';
import { isMasterAdmin, hasAccess, getAdminSession } from '@/lib/adminAuth';

const ALL_SECTORS = [
  {
    path: '/ks-panel-7k4m9/matches-today',
    label: 'Ndeshjet Sot',
    desc: 'Live kontrollo & menaxho',
    icon: Tv2,
    bg: 'from-red-500 to-rose-600',
    shadow: 'shadow-red-200',
    section: 'matches-today',
    highlight: true,
    statKey: null,
  },
  {
    path: '/ks-panel-7k4m9/competitions',
    label: 'Kompeticionet',
    desc: 'Liga & kupe',
    icon: Trophy,
    bg: 'from-blue-500 to-blue-700',
    shadow: 'shadow-blue-200',
    section: 'competitions',
    statKey: 'competitions',
  },
  {
    path: '/ks-panel-7k4m9/clubs',
    label: 'Klubet',
    desc: 'Ekipet & logot',
    icon: Users,
    bg: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-200',
    section: 'clubs',
    statKey: 'clubs',
  },
  {
    path: '/ks-panel-7k4m9/matches',
    label: 'Ndeshjet',
    desc: 'Programi i ndeshjeve',
    icon: Calendar,
    bg: 'from-orange-500 to-amber-600',
    shadow: 'shadow-orange-200',
    section: 'matches',
    statKey: 'matches',
  },
  {
    path: '/ks-panel-7k4m9/standings',
    label: 'Tabelat',
    desc: 'Klasifikimi i ekipeve',
    icon: Table,
    bg: 'from-purple-500 to-purple-700',
    shadow: 'shadow-purple-200',
    section: 'standings',
    statKey: null,
  },
  {
    path: '/ks-panel-7k4m9/top-scorers',
    label: 'Golashënuesit',
    desc: 'Renditja e golashënuesve',
    icon: Star,
    bg: 'from-yellow-400 to-yellow-600',
    shadow: 'shadow-yellow-200',
    section: 'top-scorers',
    statKey: null,
  },
  {
    path: '/ks-panel-7k4m9/news',
    label: 'Lajme',
    desc: 'Publiko lajme',
    icon: Newspaper,
    bg: 'from-cyan-500 to-sky-600',
    shadow: 'shadow-cyan-200',
    section: 'news',
    statKey: 'news',
  },
  {
    path: '/ks-panel-7k4m9/referees',
    label: 'Gjyqtarët',
    desc: 'Lista e gjyqtarëve',
    icon: UserCheck,
    bg: 'from-slate-500 to-slate-700',
    shadow: 'shadow-slate-200',
    section: 'referees',
    statKey: null,
  },
  {
    path: '/ks-panel-7k4m9/agents',
    label: 'Agjentët',
    desc: 'Menaxho agjentët',
    icon: UserSquare,
    bg: 'from-indigo-500 to-indigo-700',
    shadow: 'shadow-indigo-200',
    section: 'agents',
    statKey: 'agents',
  },
  {
    path: '/ks-panel-7k4m9/agent-chat',
    label: 'Chat Agjentë',
    desc: 'Mesazhet nga agjentët',
    icon: MessageSquare,
    bg: 'from-pink-500 to-rose-500',
    shadow: 'shadow-pink-200',
    section: 'agent-chat',
    statKey: null,
  },
  {
    path: '/ks-panel-7k4m9/match-applications',
    label: 'Aplikimet',
    desc: 'Aplikimet e agjentëve',
    icon: ClipboardList,
    bg: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-200',
    section: 'match-applications',
    statKey: null,
  },
  {
    path: '/ks-panel-7k4m9/agent-alerts',
    label: 'Alarmet',
    desc: 'Sinjalizime aktive',
    icon: BellRing,
    bg: 'from-red-400 to-red-600',
    shadow: 'shadow-red-200',
    section: 'agents',
    statKey: null,
  },
  {
    path: '/ks-panel-7k4m9/ads',
    label: 'Reklamat',
    desc: 'Banerat & reklamat',
    icon: Image,
    bg: 'from-rose-500 to-pink-600',
    shadow: 'shadow-rose-200',
    section: 'ads',
    statKey: null,
  },
  {
    path: '/ks-panel-7k4m9/contacts',
    label: 'Kontaktet',
    desc: 'Mesazhet e vizitorëve',
    icon: Mail,
    bg: 'from-teal-500 to-emerald-600',
    shadow: 'shadow-teal-200',
    section: 'contacts',
    statKey: 'contacts',
  },
  {
    path: '/ks-panel-7k4m9/analytics',
    label: 'Analitika',
    desc: 'Vizitat & statistikat',
    icon: BarChart2,
    bg: 'from-violet-500 to-purple-700',
    shadow: 'shadow-violet-200',
    section: 'analytics',
    statKey: null,
  },
  {
    path: '/ks-panel-7k4m9/transfer-players',
    label: 'Transfero',
    desc: 'Lëviz lojtarë mes klubeve',
    icon: ArrowRightLeft,
    bg: 'from-lime-500 to-green-600',
    shadow: 'shadow-lime-200',
    section: 'transfer-players',
    statKey: null,
  },
  {
    path: '/ks-panel-7k4m9/donacion',
    label: 'Donacionet',
    desc: 'Konfigurimet e donacioneve',
    icon: Heart,
    bg: 'from-fuchsia-500 to-pink-600',
    shadow: 'shadow-fuchsia-200',
    section: 'donacion',
    statKey: null,
  },
];

const MASTER_SECTORS = [
  {
    path: '/ks-panel-7k4m9/sub-admins',
    label: 'Nën-Adminët',
    desc: 'Menaxho aksesin',
    icon: ShieldCheck,
    bg: 'from-slate-600 to-slate-800',
    shadow: 'shadow-slate-300',
    section: '__master__',
    statKey: null,
  },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({ competitions: 0, clubs: 0, matches: 0, news: 0, agents: 0, contacts: 0 });
  const [loading, setLoading] = useState(true);
  const master = isMasterAdmin();
  const session = getAdminSession();

  useEffect(() => {
    const load = async () => {
      const [comps, clubs, matches, news, agents, contacts] = await Promise.all([
        base44.entities.Competition.list('-created_date', 200),
        base44.entities.Club.list('-created_date', 200),
        base44.entities.Match.list('-created_date', 200),
        base44.entities.News.list('-created_date', 200),
        base44.entities.Agent.list('-created_date', 200),
        base44.entities.Contact.list('-created_date', 200),
      ]);
      setStats({ competitions: comps.length, clubs: clubs.length, matches: matches.length, news: news.length, agents: agents.length, contacts: contacts.length });
      setLoading(false);
    };
    load();
  }, []);

  const baseSectors = ALL_SECTORS.filter(s =>
    s.section === null || (s.section === '__master__' ? master : hasAccess(s.section))
  );
  const sectors = master ? [...baseSectors, ...MASTER_SECTORS] : baseSectors;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-md">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Paneli i Administrimit</h1>
            <p className="text-xs text-muted-foreground">
              {master ? '⭐ Super Admin' : `Mirësevjen, ${session?.name || 'Admin'}`} — zgjidhni sektorin
            </p>
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
        {[
          { label: 'Kompeticionet', val: stats.competitions, color: 'text-blue-600' },
          { label: 'Klubet', val: stats.clubs, color: 'text-emerald-600' },
          { label: 'Ndeshjet', val: stats.matches, color: 'text-orange-500' },
          { label: 'Lajmet', val: stats.news, color: 'text-cyan-500' },
          { label: 'Agjentët', val: stats.agents, color: 'text-indigo-500' },
          { label: 'Kontaktet', val: stats.contacts, color: 'text-teal-500' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl px-3 py-3 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{loading ? '—' : s.val}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sectors grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {sectors.map(sector => {
          const Icon = sector.icon;
          const count = sector.statKey ? stats[sector.statKey] : null;
          return (
            <Link
              key={sector.path}
              to={sector.path}
              className={`group relative flex flex-col items-start gap-3 rounded-2xl p-4 bg-gradient-to-br ${sector.bg} text-white overflow-hidden hover:scale-[1.03] hover:shadow-lg ${sector.shadow} transition-all duration-200 active:scale-[0.98]`}
            >
              {/* Decorative circle */}
              <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10" />
              <div className="absolute -right-1 -bottom-8 w-28 h-28 rounded-full bg-white/5" />

              {/* Icon */}
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
                <Icon className="w-5 h-5 text-white" />
              </div>

              {/* Text */}
              <div className="relative z-10 min-w-0">
                <p className="text-sm font-black leading-tight">{sector.label}</p>
                <p className="text-[10px] text-white/70 mt-0.5 leading-tight">{sector.desc}</p>
              </div>

              {/* Count badge */}
              {count !== null && !loading && (
                <div className="absolute top-3 right-3 bg-white/25 rounded-full px-2 py-0.5 text-[10px] font-black">
                  {count}
                </div>
              )}

              {/* Live pulse for today's matches */}
              {sector.highlight && (
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}