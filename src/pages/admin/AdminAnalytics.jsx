import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Users, Eye, Globe, Smartphone, Monitor, Download,
  RefreshCw, TrendingUp, Tablet, Laptop, BarChart2
} from 'lucide-react';
import moment from 'moment';
import GoogleAnalyticsChart from '@/components/admin/GoogleAnalyticsChart';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

const DEVICE_COLORS = { mobile: '#3b82f6', desktop: '#10b981', tablet: '#f59e0b' };
const COUNTRY_PALETTE = ['#6366f1','#3b82f6','#0ea5e9','#10b981','#f59e0b','#f97316','#ef4444','#8b5cf6','#ec4899','#14b8a6'];

function getDeviceType(ua = '') {
  if (/iPad|Tablet/.test(ua)) return 'tablet';
  if (/Mobile|Android|iPhone/.test(ua)) return 'mobile';
  return 'desktop';
}

// Deduplicate by device (session_id) per 24h window
function dedupeByDevice(records) {
  // Keep only the FIRST record per device_id per calendar day
  const seen = new Set();
  return records.filter(r => {
    if (!r.session_id) return true;
    const key = r.session_id + '_' + moment(r.created_date).format('YYYY-MM-DD');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('24h'); // '24h' | '30d' | '90d' | '365d'

  const load = async () => {
    setLoading(true);
    // Load enough data for all ranges
    const data = await base44.entities.Analytics.list('-created_date', 8000);
    setAnalytics(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  // All page views
  const allPageViews = useMemo(() => analytics.filter(a => a.event === 'page_view'), [analytics]);
  const allPwaPrompts = useMemo(() => analytics.filter(a => a.event === 'pwa_install_prompt'), [analytics]);
  const allPwaInstalled = useMemo(() => analytics.filter(a => a.event === 'pwa_installed'), [analytics]);

  // 24h unique device visits (the hero metric)
  const last24h = useMemo(() => {
    const cutoff = moment().subtract(24, 'hours');
    const inWindow = allPageViews.filter(a => moment(a.created_date).isAfter(cutoff));
    return dedupeByDevice(inWindow);
  }, [allPageViews]);

  // Period window for secondary stats
  const periodDays = period === '24h' ? 1 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const periodStart = moment().subtract(periodDays, 'days').startOf('day');
  const inPeriod = useMemo(() => {
    const raw = allPageViews.filter(a => moment(a.created_date).isAfter(periodStart));
    return dedupeByDevice(raw);
  }, [allPageViews, periodDays]);

  // 24h hero cards
  const visits24h = last24h.length;
  const uniqueDevices24h = new Set(last24h.map(a => a.session_id).filter(Boolean)).size;
  const pwaInstalled24h = allPwaInstalled.filter(a => moment(a.created_date).isAfter(moment().subtract(24,'hours'))).length;

  // Total all-time unique devices
  const allTimeDevices = useMemo(() => new Set(allPageViews.map(a => a.session_id).filter(Boolean)).size, [allPageViews]);

  // Hourly chart for 24h
  const hourlyData = useMemo(() => {
    const hours = [];
    for (let i = 23; i >= 0; i--) {
      const h = moment().subtract(i, 'hours');
      const label = h.format('HH:mm');
      const hStart = h.clone().startOf('hour');
      const hEnd = h.clone().endOf('hour');
      const count = new Set(
        last24h
          .filter(a => moment(a.created_date).isBetween(hStart, hEnd, null, '[]'))
          .map(a => a.session_id)
          .filter(Boolean)
      ).size;
      hours.push({ label, count });
    }
    return hours;
  }, [last24h]);

  // Daily chart for selected period
  const dailyData = useMemo(() => {
    if (period === '24h') return hourlyData;
    const days = [];
    for (let i = periodDays - 1; i >= 0; i--) {
      const d = moment().subtract(i, 'days');
      const dayStr = d.format('YYYY-MM-DD');
      const label = periodDays <= 31 ? d.format('DD/MM') : d.format('MM/YY');
      const count = new Set(
        allPageViews
          .filter(a => moment(a.created_date).format('YYYY-MM-DD') === dayStr)
          .map(a => a.session_id)
          .filter(Boolean)
      ).size;
      days.push({ label, count });
    }
    return days;
  }, [allPageViews, period, periodDays, hourlyData]);

  // Monthly aggregation for 12-month view
  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const m = moment().subtract(i, 'months');
      const label = m.format('MMM YY');
      const mStr = m.format('YYYY-MM');
      const count = new Set(
        allPageViews
          .filter(a => moment(a.created_date).format('YYYY-MM') === mStr)
          .map(a => a.session_id)
          .filter(Boolean)
      ).size;
      months.push({ label, count });
    }
    return months;
  }, [allPageViews]);

  // Countries from period (unique devices per country)
  const countryStats = useMemo(() => {
    const map = {};
    inPeriod.forEach(a => {
      const k = a.country_name || a.country || 'E panjohur';
      if (!map[k]) map[k] = new Set();
      if (a.session_id) map[k].add(a.session_id);
    });
    return Object.entries(map)
      .map(([name, set]) => ({ name, count: set.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [inPeriod]);

  // Devices from period
  const deviceStats = useMemo(() => {
    const map = { mobile: new Set(), desktop: new Set(), tablet: new Set() };
    inPeriod.forEach(a => {
      const dt = getDeviceType(a.user_agent || '');
      if (a.session_id) map[dt].add(a.session_id);
    });
    return [
      { name: 'Mobile', key: 'mobile', count: map.mobile.size, icon: Smartphone, color: '#3b82f6' },
      { name: 'Desktop', key: 'desktop', count: map.desktop.size, icon: Monitor, color: '#10b981' },
      { name: 'Tablet', key: 'tablet', count: map.tablet.size, icon: Tablet, color: '#f59e0b' },
    ];
  }, [inPeriod]);

  // PWA stats
  const pwaStats = useMemo(() => {
    const prompts = allPwaPrompts.length;
    const installed = allPwaInstalled.length;
    return { prompts, installed, rate: prompts > 0 ? Math.round((installed / prompts) * 100) : 0 };
  }, [allPwaPrompts, allPwaInstalled]);

  const PERIOD_LABELS = { '24h': '24 Orët', '30d': '30 Ditë', '90d': '3 Muaj', '365d': '1 Vit' };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const chartData = period === '365d' ? monthlyData : dailyData;
  const chartLabel = period === '24h' ? 'Orë' : period === '365d' ? 'Muaj' : 'Ditë';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black">Statistikat</h2>
          <p className="text-xs text-muted-foreground">Vizita unike — 1 pajisje = 1 vizitë / 24 orë</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-xs font-medium">
          <RefreshCw className="w-3.5 h-3.5" /> Rifresko
        </button>
      </div>

      {/* HERO — 24h Unique Device Visits */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-bold opacity-80 uppercase tracking-wide">Vizita Unike — 24 Orë</span>
          </div>
          <p className="text-6xl font-black mt-2">{visits24h.toLocaleString()}</p>
          <p className="text-sm opacity-70 mt-1">Pajisje të ndryshme elektronike</p>
          <div className="mt-3 flex gap-4 text-xs font-semibold">
            <span className="opacity-75">📱 {new Set(last24h.filter(a=>getDeviceType(a.user_agent||'') === 'mobile').map(a=>a.session_id).filter(Boolean)).size} mobile</span>
            <span className="opacity-75">💻 {new Set(last24h.filter(a=>getDeviceType(a.user_agent||'') === 'desktop').map(a=>a.session_id).filter(Boolean)).size} desktop</span>
            <span className="opacity-75">🖥 {new Set(last24h.filter(a=>getDeviceType(a.user_agent||'') === 'tablet').map(a=>a.session_id).filter(Boolean)).size} tablet</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-indigo-500 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wide">Pajisje Totale</span>
          </div>
          <p className="text-4xl font-black">{allTimeDevices.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Të gjitha kohët</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-purple-500 mb-2">
            <Download className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wide">PWA Instaluar</span>
          </div>
          <p className="text-4xl font-black">{pwaStats.installed.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Add to Home Screen · {pwaStats.rate}% konversion</p>
        </div>
      </div>

      {/* Period toggle + Chart */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            Vizita Unike — {PERIOD_LABELS[period]}
          </h3>
          <div className="flex rounded-xl border border-border overflow-hidden text-xs">
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <button key={key} onClick={() => setPeriod(key)}
                className={`px-3 py-1.5 font-semibold transition-colors ${period === key ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted text-muted-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={period === '24h' ? 3 : period === '365d' ? 0 : Math.floor(periodDays / 8)} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
              formatter={(val) => [val, `Pajisje unike`]}
              labelFormatter={(l) => `${chartLabel}: ${l}`}
            />
            <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#visitGrad)" strokeWidth={2.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-2 text-center text-xs text-muted-foreground">
          Totali periudhës: <span className="font-black text-foreground">{inPeriod.length.toLocaleString()}</span> vizita unike nga pajisje të ndryshme
        </div>
      </div>

      {/* Countries + Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Countries */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-500" />
            Vizita nga Vendet — {PERIOD_LABELS[period]}
          </h3>
          {countryStats.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nuk ka të dhëna për periudhën</p>
          ) : (
            <div className="space-y-2.5">
              {countryStats.map(({ name, count }, i) => (
                <div key={name} className="flex items-center gap-2.5">
                  <span className="text-[10px] font-bold text-muted-foreground w-5 text-right shrink-0">{i + 1}</span>
                  <span className="text-xs font-medium flex-1 truncate">{name}</span>
                  <span className="text-xs font-black tabular-nums">{count}</span>
                  <div className="w-24 bg-muted rounded-full h-2 shrink-0">
                    <div className="rounded-full h-2 transition-all duration-500" style={{
                      width: `${(count / (countryStats[0]?.count || 1)) * 100}%`,
                      backgroundColor: COUNTRY_PALETTE[i % COUNTRY_PALETTE.length]
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Devices */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-500" />
            Lloji i Pajisjes — {PERIOD_LABELS[period]}
          </h3>
          <div className="space-y-4">
            {deviceStats.map(({ name, key, count, icon: Icon, color }) => {
              const total = deviceStats.reduce((s, d) => s + d.count, 0) || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                      <span className="text-xs font-semibold">{name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black">{count}</span>
                      <span className="text-xs text-muted-foreground ml-1">({pct}%)</span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-2.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* PWA mini section */}
          <div className="mt-5 pt-4 border-t border-border">
            <h4 className="text-xs font-bold mb-3 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-purple-500" /> Add to Home Screen (kosovoscores.com)
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-orange-50 dark:bg-orange-500/10 rounded-xl p-3 border border-orange-200 dark:border-orange-500/30">
                <p className="text-2xl font-black text-orange-600">{pwaStats.prompts}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Promti u shfaq</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-3 border border-purple-200 dark:border-purple-500/30">
                <p className="text-2xl font-black text-purple-600">{pwaStats.installed}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">U instalua</p>
              </div>
              <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-3 border border-green-200 dark:border-green-500/30">
                <p className="text-2xl font-black text-green-600">{pwaStats.rate}%</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Konversion</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Google Analytics Section */}
      <div>
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-500" />
          Google Analytics 4
        </h3>
        <GoogleAnalyticsChart />
      </div>

      {/* Monthly overview chart */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          Prirja Mujore — 12 Muajt e Fundit
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
              formatter={(val) => [val, 'Pajisje unike']}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {monthlyData.map((_, i) => (
                <Cell key={i} fill={i === monthlyData.length - 1 ? '#6366f1' : '#c7d2fe'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}