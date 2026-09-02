import React, { useState, useMemo } from "react";
import {
  LayoutDashboard,
  Trophy,
  Shield,
  CalendarDays,
  Users,
  BarChart3,
  Newspaper,
  Search,
  Plus,
  Pencil,
  Trash2,
  Download,
  LogOut,
  X,
  Check,
  Eye,
  EyeOff,
  Menu,
  ChevronDown,
  Layers,
  Sparkles,
  AlertCircle,
} from "lucide-react";

type StatusPos = { from: number; to: number; label: string; color: string; type: string };

type Competition = {
  id: string;
  name: string;
  season: string;
  tier: number;
  color: string;
  logo: string;
  archived: boolean;
  hidden: boolean;
  show_profiles: boolean;
  show_squad: boolean;
  status_positions: StatusPos[];
};

const INITIAL_DATA: Competition[] = [
  {
    id: "superliga-26-27",
    name: "ALBI MALL SUPERLIGA",
    season: "2026/2027",
    tier: 1,
    color: "#16a34a",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Flag_of_Kosovo.png",
    archived: false,
    hidden: false,
    show_profiles: true,
    show_squad: true,
    status_positions: [
      { from: 1, to: 1, label: "Kampion", color: "#16a34a", type: "champion" },
      { from: 2, to: 3, label: "UECL Qual", color: "#3b82f6", type: "uecl" },
      { from: 4, to: 6, label: "Playoff", color: "#f59e0b", type: "playoff" },
      { from: 9, to: 10, label: "Rënie", color: "#ef4444", type: "relegation" },
    ],
  },
  {
    id: "liga-pare-26-27",
    name: "RAIFFEISEN LIGA E PARË",
    season: "2026/2027",
    tier: 2,
    color: "#f97316",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Flag_of_Kosovo.png",
    archived: false,
    hidden: false,
    show_profiles: true,
    show_squad: false,
    status_positions: [
      { from: 1, to: 1, label: "Promovim", color: "#16a34a", type: "promotion" },
      { from: 2, to: 4, label: "Playoff", color: "#f59e0b", type: "playoff" },
    ],
  },
  {
    id: "liga-dyte-26-27",
    name: "LIGA E DYTË E KOSOVËS",
    season: "2026/2027",
    tier: 3,
    color: "#64748b",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Flag_of_Kosovo.png",
    archived: false,
    hidden: false,
    show_profiles: false,
    show_squad: false,
    status_positions: [],
  },
  {
    id: "kupa-26-27",
    name: "KUPA E KOSOVËS",
    season: "2026/2027",
    tier: 4,
    color: "#0f172a",
    logo: "https://cdn-icons-png.flaticon.com/512/2583/2583344.png",
    archived: false,
    hidden: false,
    show_profiles: true,
    show_squad: true,
    status_positions: [],
  },
  {
    id: "superliga-u19-26-27",
    name: "SUPERLIGA U19",
    season: "2026/2027",
    tier: 6,
    color: "#7c3aed",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Flag_of_Kosovo.png",
    archived: false,
    hidden: false,
    show_profiles: true,
    show_squad: true,
    status_positions: [{ from: 1, to: 1, label: "Kampion U19", color: "#7c3aed", type: "champion" }],
  },
  {
    id: "femrave-26-27",
    name: "SUPERLIGA E FEMRAVE",
    season: "2026/2027",
    tier: 4,
    color: "#ec4899",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Flag_of_Kosovo.png",
    archived: false,
    hidden: false,
    show_profiles: true,
    show_squad: true,
    status_positions: [{ from: 1, to: 1, label: "Kampione", color: "#ec4899", type: "champion" }],
  },
  {
    id: "miqesore-26-27",
    name: "MIQËSORE",
    season: "2026/2027",
    tier: 1,
    color: "#ef4444",
    logo: "https://cdn-icons-png.flaticon.com/512/4315/4315445.png",
    archived: false,
    hidden: true,
    show_profiles: false,
    show_squad: false,
    status_positions: [],
  },
  // Archived 2025/2026
  {
    id: "superliga-25-26",
    name: "ALBI MALL SUPERLIGA",
    season: "2025/2026",
    tier: 1,
    color: "#16a34a",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Flag_of_Kosovo.png",
    archived: true,
    hidden: false,
    show_profiles: true,
    show_squad: true,
    status_positions: [
      { from: 1, to: 1, label: "Kampion", color: "#16a34a", type: "champion" },
      { from: 2, to: 3, label: "UECL Qual", color: "#3b82f6", type: "uecl" },
    ],
  },
  {
    id: "liga-pare-25-26",
    name: "RAIFFEISEN LIGA E PARË",
    season: "2025/2026",
    tier: 2,
    color: "#f97316",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Flag_of_Kosovo.png",
    archived: true,
    hidden: false,
    show_profiles: true,
    show_squad: false,
    status_positions: [],
  },
  {
    id: "liga-dyte-25-26",
    name: "LIGA E DYTË E KOSOVËS",
    season: "2025/2026",
    tier: 3,
    color: "#64748b",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Flag_of_Kosovo.png",
    archived: true,
    hidden: false,
    show_profiles: false,
    show_squad: false,
    status_positions: [],
  },
  {
    id: "kupa-25-26",
    name: "KUPA E KOSOVËS",
    season: "2025/2026",
    tier: 4,
    color: "#0f172a",
    logo: "https://cdn-icons-png.flaticon.com/512/2583/2583344.png",
    archived: true,
    hidden: false,
    show_profiles: true,
    show_squad: true,
    status_positions: [],
  },
  {
    id: "superliga-u19-25-26",
    name: "SUPERLIGA U19",
    season: "2025/2026",
    tier: 6,
    color: "#7c3aed",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Flag_of_Kosovo.png",
    archived: true,
    hidden: false,
    show_profiles: true,
    show_squad: true,
    status_positions: [],
  },
  {
    id: "femrave-25-26",
    name: "SUPERLIGA E FEMRAVE",
    season: "2025/2026",
    tier: 4,
    color: "#ec4899",
    logo: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Flag_of_Kosovo.png",
    archived: true,
    hidden: false,
    show_profiles: true,
    show_squad: true,
    status_positions: [],
  },
  {
    id: "miqesore-25-26",
    name: "MIQËSORE",
    season: "2025/2026",
    tier: 1,
    color: "#ef4444",
    logo: "https://cdn-icons-png.flaticon.com/512/4315/4315445.png",
    archived: true,
    hidden: true,
    show_profiles: false,
    show_squad: false,
    status_positions: [],
  },
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("admin@kosovascores.com");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  const [competitions, setCompetitions] = useState<Competition[]>(INITIAL_DATA);
  const [activeNav, setActiveNav] = useState("Competitions");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Competition | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  const [form, setForm] = useState<Partial<Competition>>({
    name: "",
    season: "2026/2027",
    tier: 1,
    color: "#16a34a",
    logo: "",
    archived: false,
    hidden: false,
    show_profiles: true,
    show_squad: true,
    status_positions: [],
  });
  const [statusJson, setStatusJson] = useState("[]");
  const [statusJsonError, setStatusJsonError] = useState(false);

  const filtered = useMemo(() => {
    return competitions.filter((c) => {
      if (!showArchived && c.archived) return false;
      if (search) {
        const s = search.toLowerCase();
        return c.name.toLowerCase().includes(s) || c.season.includes(s);
      }
      return true;
    });
  }, [competitions, search, showArchived]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin123" || email.includes("admin")) {
      setIsLoggedIn(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: "",
      season: "2026/2027",
      tier: 1,
      color: "#16a34a",
      logo: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Flag_of_Kosovo.png",
      archived: false,
      hidden: false,
      show_profiles: true,
      show_squad: true,
      status_positions: [],
    });
    setStatusJson("[]");
    setDrawerOpen(true);
  };

  const openEdit = (c: Competition) => {
    setEditing(c);
    setForm({ ...c });
    setStatusJson(JSON.stringify(c.status_positions, null, 2));
    setDrawerOpen(true);
  };

  const handleSave = () => {
    let parsedPositions: StatusPos[] = [];
    try {
      parsedPositions = JSON.parse(statusJson || "[]");
      setStatusJsonError(false);
    } catch {
      setStatusJsonError(true);
      return;
    }

    if (!form.name?.trim()) return;

    if (editing) {
      setCompetitions((prev) =>
        prev.map((p) => (p.id === editing.id ? ({ ...p, ...form, status_positions: parsedPositions } as Competition) : p))
      );
    } else {
      const newItem: Competition = {
        id: `custom-${Date.now()}`,
        name: form.name || "Gara e re",
        season: form.season || "2026/2027",
        tier: form.tier || 1,
        color: form.color || "#0f172a",
        logo: form.logo || "https://upload.wikimedia.org/wikipedia/commons/5/5a/Flag_of_Kosovo.png",
        archived: !!form.archived,
        hidden: !!form.hidden,
        show_profiles: !!form.show_profiles,
        show_squad: !!form.show_squad,
        status_positions: parsedPositions,
      };
      setCompetitions((prev) => [newItem, ...prev]);
    }
    setDrawerOpen(false);
    showToast("U ruajt • eksporto JSON");
  };

  const toggleArchived = (id: string) => {
    setCompetitions((prev) => prev.map((c) => (c.id === id ? { ...c, archived: !c.archived } : c)));
    showToast("U ruajt • eksporto JSON");
  };

  const handleDelete = (id: string) => {
    if (!confirm("Fshij këtë garë?")) return;
    setCompetitions((prev) => prev.filter((c) => c.id !== id));
    showToast("U fshi");
  };

  const handleExport = () => {
    const exportData = competitions.map(({ id, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Competition.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Competition.json u eksportua");
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="w-full max-w-[440px]">
          <div className="bg-white rounded-[16px] border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-[#0f172a] flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-[15px] tracking-tight leading-none">KosovaScores Admin</div>
                <div className="text-[12px] text-slate-500 mt-1">Base44 Edition</div>
              </div>
            </div>

            <h1 className="text-[22px] font-semibold tracking-tight">Mirë se vini</h1>
            <p className="text-[13px] text-slate-500 mt-1.5">Kyçuni për të menaxhuar garat • 14 kompeticione</p>

            <form onSubmit={handleLogin} className="mt-7 space-y-4">
              <div>
                <label className="text-[12px] font-medium text-slate-700">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-[14px] outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                  placeholder="admin@kosovascores.com"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-slate-700">Fjalëkalimi</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 w-full h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-[14px] outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                  placeholder="••••••••"
                />
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Sparkles className="w-3 h-3" /> hint: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">admin123</span>
                </div>
              </div>

              {loginError && (
                <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-4 h-4" /> Kredenciale të gabuara. Provo admin123.
                </div>
              )}

              <button
                type="submit"
                className="w-full h-11 rounded-lg bg-[#0f172a] text-white text-[14px] font-medium hover:bg-black transition flex items-center justify-center gap-2"
              >
                Kyçu <span className="opacity-60">→</span>
              </button>

              <div className="text-[11px] text-center text-slate-400 mt-3">/admin/login • 404 zëvendësohet me këtë panel</div>
            </form>
          </div>

          <div className="mt-4 text-center text-[11px] text-slate-400">© 2026 KosovaScores • Base44 Admin UI</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-[Inter,system-ui]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{font-family: Inter, system-ui, sans-serif}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px}
      `}</style>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-[260px] bg-[#0f172a] text-slate-300 z-40 flex flex-col transition-transform lg:translate-x-0 ${
          mobileSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-[64px] flex items-center gap-3 px-5 border-b border-white/10 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <Trophy className="w-4 h-4 text-[#0f172a]" />
          </div>
          <div className="leading-tight">
            <div className="text-white font-semibold text-[13.5px] tracking-tight">KosovaScores</div>
            <div className="text-[11px] text-slate-400">Admin • Base44</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            { label: "Dashboard", icon: LayoutDashboard, count: null },
            { label: "Competitions", icon: Trophy, count: competitions.length, active: true },
            { label: "Clubs", icon: Shield, count: 36 },
            { label: "Matches", icon: CalendarDays, count: 128 },
            { label: "Players", icon: Users, count: 842 },
            { label: "Standings", icon: BarChart3, count: null },
            { label: "News", icon: Newspaper, count: 24 },
          ].map((item) => {
            const isActive = activeNav === item.label || (item.label === "Competitions" && activeNav === "Competitions");
            return (
              <button
                key={item.label}
                onClick={() => setActiveNav(item.label)}
                className={`w-full flex items-center justify-between px-3 h-9 rounded-lg text-[13px] transition ${
                  isActive ? "bg-white/10 text-white" : "hover:bg-white/[0.06] hover:text-white text-slate-400"
                }`}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </span>
                {item.count !== null && (
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${
                      isActive ? "bg-white text-[#0f172a]" : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-6">
            <div className="text-[11px] font-semibold tracking-widest text-slate-500 px-3 mb-2">SYSTEM</div>
            <div className="rounded-xl bg-white/[0.05] border border-white/10 p-3">
              <div className="flex items-center gap-2 text-[12px] text-white">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live sync active
              </div>
              <div className="text-[11px] text-slate-400 mt-1">14 competitions loaded</div>
              <div className="mt-2.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-[86%] bg-emerald-400 rounded-full" />
              </div>
            </div>
          </div>
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2">
            <img src="https://i.pravatar.cc/100?img=12" alt="admin" className="w-8 h-8 rounded-full" />
            <div className="leading-tight">
              <div className="text-white text-[12.5px] font-medium">Admin User</div>
              <div className="text-[11px] text-slate-400">admin@kosovascores.com</div>
            </div>
            <button
              onClick={() => setIsLoggedIn(false)}
              className="ml-auto w-7 h-7 grid place-items-center rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-[260px]">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200 h-[64px] flex items-center gap-3 px-4 lg:px-6">
          <button
            onClick={() => setMobileSidebar(!mobileSidebar)}
            className="lg:hidden w-9 h-9 grid place-items-center rounded-lg border border-slate-200"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="relative flex-1 max-w-[420px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kërko gara, sezone, tier..."
              className="w-full h-10 rounded-xl bg-[#f1f5f9] border border-transparent pl-10 pr-3 text-[13px] outline-none focus:bg-white focus:border-slate-200 focus:ring-4 focus:ring-slate-900/5"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <label className="hidden md:flex items-center gap-2 text-[12px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full pl-2 pr-3 h-8">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded"
              />
              Shfaq arkivat
            </label>

            <button
              onClick={handleExport}
              className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white text-[13px] font-medium flex items-center gap-2 hover:bg-slate-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span> JSON
            </button>

            <button
              onClick={openAdd}
              className="h-9 px-4 rounded-xl bg-[#0f172a] text-white text-[13px] font-medium flex items-center gap-2 hover:bg-black"
            >
              <Plus className="w-4 h-4" /> Shto garë
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 lg:p-6 max-w-[1400px] mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] tracking-widest font-semibold text-slate-500">COMPETITIONS</div>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 grid place-items-center">
                  <Trophy className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div className="mt-3 text-[26px] font-semibold tracking-tight leading-none">{competitions.length}</div>
              <div className="mt-1 text-[12px] text-slate-500">{filtered.length} shfaqur • 7 aktive</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] tracking-widest font-semibold text-slate-500">CLUBS</div>
                <div className="w-7 h-7 rounded-lg bg-blue-50 grid place-items-center">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="mt-3 text-[26px] font-semibold tracking-tight leading-none">36</div>
              <div className="mt-1 text-[12px] text-slate-500">10 Superliga • 12 Liga I</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] tracking-widest font-semibold text-slate-500">MATCHES LIVE</div>
                <div className="w-7 h-7 rounded-lg bg-orange-50 grid place-items-center">
                  <CalendarDays className="w-4 h-4 text-orange-600" />
                </div>
              </div>
              <div className="mt-3 text-[26px] font-semibold tracking-tight leading-none flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                4
              </div>
              <div className="mt-1 text-[12px] text-slate-500">128 totale këtë javë</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] tracking-widest font-semibold text-slate-500">PLAYERS</div>
                <div className="w-7 h-7 rounded-lg bg-violet-50 grid place-items-center">
                  <Users className="w-4 h-4 text-violet-600" />
                </div>
              </div>
              <div className="mt-3 text-[26px] font-semibold tracking-tight leading-none">842</div>
              <div className="mt-1 text-[12px] text-slate-500">profiles • squads aktive</div>
            </div>
          </div>

          {/* Table card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 h-[56px] flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="text-[13px] font-semibold tracking-tight">Competitions • REAL data</div>
                <span className="text-[11px] px-2 py-1 rounded-full bg-slate-900 text-white font-medium">{filtered.length} / 14</span>
                <span className="hidden md:flex items-center gap-1 text-[11px] text-slate-500">
                  <Layers className="w-3 h-3" /> Base44 table style
                </span>
              </div>
              <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500">
                tier <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> 1 • <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> 2 •{" "}
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" /> 6
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-[#f8fafc] text-[11px] font-semibold tracking-widest text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="text-left font-semibold py-3 pl-5 pr-3">LOGO</th>
                    <th className="text-left font-semibold py-3 px-3">COMPETITION</th>
                    <th className="text-left font-semibold py-3 px-3">SEASON</th>
                    <th className="text-left font-semibold py-3 px-3">TIER</th>
                    <th className="text-left font-semibold py-3 px-3">COLOR</th>
                    <th className="text-left font-semibold py-3 px-3">STATUS POS</th>
                    <th className="text-left font-semibold py-3 px-3">FLAGS</th>
                    <th className="text-right font-semibold py-3 pl-3 pr-5">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-[#f8fafc]/80 transition">
                      <td className="py-3 pl-5 pr-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 grid place-items-center overflow-hidden">
                          <img src={c.logo} alt={c.name} className="w-6 h-6 object-contain" onError={(e)=>{(e.target as HTMLImageElement).src='https://upload.wikimedia.org/wikipedia/commons/5/5a/Flag_of_Kosovo.png'}}/>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium leading-tight max-w-[240px] truncate">{c.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: c.color }} />
                          {c.archived ? "Arkivuar" : "Aktiv"} • {c.hidden ? "Hidden" : "Visible"}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center h-6 px-2 rounded-full text-[11px] font-medium border ${c.archived ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                          {c.season}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex h-6 min-w-[28px] justify-center items-center px-2 rounded-lg bg-slate-900 text-white text-[11px] font-semibold">
                          {c.tier}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full border border-black/10 shadow-inner" style={{ background: c.color }} />
                          <span className="font-mono text-[11px] text-slate-600">{c.color}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {c.status_positions.length === 0 ? (
                            <span className="text-[11px] text-slate-400">—</span>
                          ) : (
                            c.status_positions.map((s, i) => (
                              <span
                                key={i}
                                className="inline-flex h-5 items-center px-1.5 rounded-md text-[10px] font-medium text-white"
                                style={{ background: s.color }}
                              >
                                {s.from === s.to ? `${s.from}` : `${s.from}-${s.to}`} {s.label}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleArchived(c.id)}
                            className={`h-6 px-2 rounded-full text-[10px] font-medium border flex items-center gap-1 ${
                              c.archived ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"
                            }`}
                            title="Arkivo"
                          >
                            {c.archived ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {c.archived ? "Arkiv" : "Live"}
                          </button>
                          {c.hidden && <span className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded-full">hidden</span>}
                        </div>
                      </td>
                      <td className="py-3 pl-3 pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(c)}
                            className="w-7 h-7 grid place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="w-7 h-7 grid place-items-center rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="py-16 text-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 grid place-items-center mx-auto">
                    <Search className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="mt-3 text-[13px] font-medium">S'ka rezultate</div>
                  <div className="text-[12px] text-slate-500">Provo kërkim tjetër ose shfaq arkivat</div>
                </div>
              )}
            </div>

            <div className="px-5 h-12 bg-[#f8fafc] border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Export format: Competition.json • tier, color, archived, status_positions[]</span>
              <span className="hidden md:inline">Base44 • dark sidebar #0f172a • white tables</span>
            </div>
          </div>

          {/* footer hint */}
          <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-4 flex items-center gap-3 text-[12px] text-slate-500 bg-white/60">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white grid place-items-center shrink-0">
              <ChevronDown className="w-4 h-4" />
            </div>
            <div>
              <span className="font-medium text-slate-900">Drawer editing</span> • Kliko lapsin për të hapur editorin anësor me fields: name, season, tier, color, logo URL, archived, hidden, show_profiles, show_squad, status_positions JSON. Pastaj <span className="font-mono bg-slate-100 px-1 rounded">U ruajt • eksporto JSON</span>
            </div>
          </div>
        </main>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="flex-1 bg-black/40 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} />
          <div className="w-full max-w-[480px] bg-white h-full shadow-[-20px_0_60px_rgba(0,0,0,0.18)] flex flex-col animate-[slideIn_0.24s_ease]">
            <style>{`@keyframes slideIn{from{transform:translateX(16px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

            <div className="h-[64px] px-6 flex items-center justify-between border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white grid place-items-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold leading-none">{editing ? "Edito garën" : "Shto garë"}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Competition.json fields</div>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-[11px] font-semibold tracking-widest text-slate-500">NAME</label>
                  <input
                    value={form.name || ""}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="ALBI MALL SUPERLIGA"
                    className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3.5 text-[13px] outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold tracking-widest text-slate-500">SEASON</label>
                    <select
                      value={form.season}
                      onChange={(e) => setForm((f) => ({ ...f, season: e.target.value }))}
                      className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-slate-900 bg-white"
                    >
                      <option>2026/2027</option>
                      <option>2025/2026</option>
                      <option>2024/2025</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold tracking-widest text-slate-500">TIER</label>
                    <select
                      value={form.tier}
                      onChange={(e) => setForm((f) => ({ ...f, tier: Number(e.target.value) }))}
                      className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-slate-900 bg-white"
                    >
                      <option value={1}>1 - Elite</option>
                      <option value={2}>2 - Liga e Parë</option>
                      <option value={3}>3 - Liga e Dytë</option>
                      <option value={4}>4 - Kupa / Femra</option>
                      <option value={6}>6 - U19</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_56px] gap-3 items-end">
                  <div>
                    <label className="text-[11px] font-semibold tracking-widest text-slate-500">COLOR (hex)</label>
                    <input
                      value={form.color || ""}
                      onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                      className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3.5 text-[13px] font-mono outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                    />
                  </div>
                  <div className="h-11 rounded-xl border border-slate-200 overflow-hidden">
                    <input
                      type="color"
                      value={form.color || "#16a34a"}
                      onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                      className="w-full h-full p-1 bg-white cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold tracking-widest text-slate-500">LOGO URL</label>
                  <input
                    value={form.logo || ""}
                    onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))}
                    placeholder="https://..."
                    className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3.5 text-[12px] outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 grid place-items-center overflow-hidden">
                      <img src={form.logo || INITIAL_DATA[0].logo} alt="preview" className="w-6 h-6 object-contain" />
                    </div>
                    <span className="text-[11px] text-slate-500">Preview • fallback Kosovo flag</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "archived", label: "Archived" },
                    { key: "hidden", label: "Hidden" },
                    { key: "show_profiles", label: "Show profiles" },
                    { key: "show_squad", label: "Show squad" },
                  ].map((t) => (
                    <label key={t.key} className="flex items-center justify-between h-11 px-3.5 rounded-xl border border-slate-200 bg-[#f8fafc] cursor-pointer">
                      <span className="text-[12px] font-medium">{t.label}</span>
                      <input
                        type="checkbox"
                        checked={!!(form as any)[t.key]}
                        onChange={(e) => setForm((f) => ({ ...f, [t.key]: e.target.checked }))}
                        className="w-4 h-4 rounded"
                      />
                    </label>
                  ))}
                </div>

                <div>
                  <label className="text-[11px] font-semibold tracking-widest text-slate-500 flex items-center justify-between">
                    <span>STATUS_POSITIONS JSON</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusJsonError ? "bg-red-500 text-white" : "bg-slate-900 text-white"}`}>
                      {statusJsonError ? "JSON gabim" : "valid"}
                    </span>
                  </label>
                  <textarea
                    value={statusJson}
                    onChange={(e) => setStatusJson(e.target.value)}
                    rows={8}
                    className={`mt-1.5 w-full rounded-xl border px-3.5 py-3 text-[11px] font-mono leading-relaxed outline-none focus:ring-4 focus:ring-slate-900/10 ${
                      statusJsonError ? "border-red-300 bg-red-50 focus:border-red-500" : "border-slate-200 bg-[#fbfdff] focus:border-slate-900"
                    }`}
                    spellCheck={false}
                  />
                  <div className="mt-2 text-[11px] text-slate-500">
                    Shembull: [{`{ "from":1,"to":1,"label":"Kampion","color":"#16a34a","type":"champion" }`}]
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center gap-2 bg-[#f8fafc]">
              <button onClick={() => setDrawerOpen(false)} className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-[13px] font-medium">
                Anulo
              </button>
              <button
                onClick={handleSave}
                className="flex-1 h-11 rounded-xl bg-[#0f172a] text-white text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-black"
              >
                <Check className="w-4 h-4" /> Ruaj • U ruajt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 bg-[#0f172a] text-white text-[13px] font-medium px-4 h-11 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <span className="w-6 h-6 rounded-full bg-white text-[#0f172a] grid place-items-center">
            <Check className="w-4 h-4" />
          </span>
          {toast}
        </div>
      )}

      {/* Mobile overlay */}
      {mobileSidebar && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setMobileSidebar(false)} />}
    </div>
  );
}
