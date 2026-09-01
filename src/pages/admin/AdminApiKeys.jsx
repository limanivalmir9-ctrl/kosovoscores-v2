import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Key, Plus, Copy, Trash2, ToggleLeft, ToggleRight,
  Code, Mail, ChevronDown, ChevronUp, Globe, CheckCircle2
} from 'lucide-react';

// The real public API endpoint
const API_BASE_URL = 'https://app.base44.com/api/apps/69c340685dca7075d7622e15/functions/publicApi';

function generateKey() {
  return 'ks_' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

const ENDPOINTS = [
  {
    action: 'live_matches',
    emoji: '🔴',
    title: 'Ndeshjet LIVE (aktuale)',
    desc: 'Kthen të gjitha ndeshjet që janë duke u luajtur tani.',
    params: [],
    example: { action: 'live_matches' },
    response: '{ ok: true, count: 2, matches: [...] }',
  },
  {
    action: 'matches_by_date',
    emoji: '📅',
    title: 'Ndeshjet sipas datës',
    desc: 'Kthen të gjitha ndeshjet e një date të caktuar.',
    params: [{ name: 'date', type: 'string', req: true, desc: 'Data në formatin YYYY-MM-DD  (p.sh. 2025-05-25)' }],
    example: { action: 'matches_by_date', date: '2025-05-25' },
    response: '{ ok: true, date: "2025-05-25", count: 5, matches: [...] }',
  },
  {
    action: 'match',
    emoji: '⚽',
    title: 'Ndeshja + të gjitha ngjarjet',
    desc: 'Kthen detajet e plotë të ndeshjes bashkë me golat, kartonat, zëvendësimet.',
    params: [{ name: 'match_id', type: 'string', req: true, desc: 'ID e ndeshjes (merret nga lista e ndeshjeve)' }],
    example: { action: 'match', match_id: 'abc123' },
    response: '{ ok: true, match: {...}, events: [...] }',
  },
  {
    action: 'match_events',
    emoji: '📋',
    title: 'Vetëm ngjarjet e ndeshjes',
    desc: 'Kthen listën e ngjarjeve (gola, kartona, zëvendësime) pa detajet e ndeshjes.',
    params: [{ name: 'match_id', type: 'string', req: true, desc: 'ID e ndeshjes' }],
    example: { action: 'match_events', match_id: 'abc123' },
    response: '{ ok: true, count: 8, events: [...] }',
  },
  {
    action: 'standings',
    emoji: '🏆',
    title: 'Tabela e klasifikimit',
    desc: 'Kthen tabelën e plotë të klasifikimit për një kompeticion.',
    params: [{ name: 'competition_id', type: 'string', req: true, desc: 'ID e kompeticionit (merret nga /competitions)' }],
    example: { action: 'standings', competition_id: 'comp123' },
    response: '{ ok: true, competition: {...}, standings: [...] }',
  },
  {
    action: 'competitions',
    emoji: '🎯',
    title: 'Lista e kompeticioneve',
    desc: 'Kthen të gjitha ligat dhe kupat (me ID, emër, logo, sezon).',
    params: [],
    example: { action: 'competitions' },
    response: '{ ok: true, competitions: [{id, name, season, logo, tier},...] }',
  },
  {
    action: 'top_scorers',
    emoji: '👟',
    title: 'Golëvënës kryesorë',
    desc: 'Kthen listën e golëvënësve, opsionalisht të filtruar sipas kompeticionit.',
    params: [{ name: 'competition_id', type: 'string', req: false, desc: 'ID e kompeticionit (lëre bosh për të gjitha)' }],
    example: { action: 'top_scorers' },
    response: '{ ok: true, scorers: [{player_name, goals, club_name},...] }',
  },
  {
    action: 'recent_matches',
    emoji: '🕐',
    title: 'Ndeshjet e fundit (të përfunduara)',
    desc: 'Kthen ndeshjet e fundit të luajtura.',
    params: [
      { name: 'limit', type: 'number', req: false, desc: 'Sa ndeshje (maks 50, parazgjedhja 20)' },
      { name: 'competition_id', type: 'string', req: false, desc: 'Filtro sipas kompeticionit (opsionale)' },
    ],
    example: { action: 'recent_matches', limit: 10 },
    response: '{ ok: true, count: 10, matches: [...] }',
  },
];

function EndpointCard({ ep }) {
  const [open, setOpen] = useState(false);
  const copy = (obj) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    toast.success('Kopjuar ✅');
  };
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
      >
        <span className="text-lg">{ep.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs bg-primary/10 text-primary rounded px-2 py-0.5 font-mono">{ep.action}</code>
            <span className="text-sm font-semibold">{ep.title}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{ep.desc}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/20">
          {ep.params.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-1.5">Parametrat:</p>
              <div className="space-y-1.5">
                {ep.params.map(p => (
                  <div key={p.name} className="flex items-start gap-2 text-xs">
                    <code className="bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 shrink-0">{p.name}</code>
                    <span className={`rounded px-1.5 py-0.5 shrink-0 ${p.req ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                      {p.req ? 'i detyrueshëm' : 'opsional'}
                    </span>
                    <span className="text-muted-foreground">{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold">Shembull kërkese (body JSON):</p>
              <button onClick={() => copy({ ...ep.example, api_key: 'ks_your_key_here' })} className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
                <Copy className="w-3 h-3" /> Kopjo
              </button>
            </div>
            <pre className="bg-slate-900 text-green-300 rounded-lg p-3 text-xs overflow-x-auto">{JSON.stringify({ ...ep.example, api_key: 'ks_your_key_here' }, null, 2)}</pre>
          </div>
          <div>
            <p className="text-xs font-bold mb-1">Përgjigja (response):</p>
            <code className="text-xs bg-slate-100 text-slate-700 rounded-lg px-3 py-2 block">{ep.response}</code>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState({});
  const [emailDialog, setEmailDialog] = useState(null); // the key object
  const [emailCopied, setEmailCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.ApiKey.list('-created_date', 50);
    setKeys(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const key = generateKey();
    await base44.entities.ApiKey.create({ name: newName.trim(), key, active: true, notes: newNotes.trim(), usage_count: 0 });
    toast.success(`API Key u krijua për ${newName} ✅`);
    setNewName(''); setNewNotes(''); setCreateDialog(false); setCreating(false);
    load();
  };

  const handleToggle = async (k) => {
    await base44.entities.ApiKey.update(k.id, { active: !k.active });
    toast.success(k.active ? 'Key u çaktivizua' : 'Key u aktivizua');
    load();
  };

  const handleDelete = async (k) => {
    if (!confirm(`Fshi key-in e ${k.name}?`)) return;
    await base44.entities.ApiKey.delete(k.id);
    toast.success('Key u fshi');
    load();
  };

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    toast.success('Key u kopjua ✅');
  };

  const getEmailText = (k) => `Përshëndetje,

Ju jeni lidhur me KosovoScores API, sistemi i rezultateve live të futbollit kosovar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 API KEY JUAJ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${k.key}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 ENDPOINT (URL e API)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${API_BASE_URL}
Metoda: POST
Content-Type: application/json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 SI FUNKSIONON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Çdo kërkesë duhet të dërgohet me metodën POST si JSON, duke përfshirë api_key dhe action.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 SHEMBULL — Ndeshjet Live
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST ${API_BASE_URL}
{
  "api_key": "${k.key}",
  "action": "live_matches"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 SHEMBULL — Ndeshjet sipas datës
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "api_key": "${k.key}",
  "action": "matches_by_date",
  "date": "2025-05-25"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 SHEMBULL — Tabela e klasifikimit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "api_key": "${k.key}",
  "action": "standings",
  "competition_id": "[ID e kompeticionit]"
}

Për ID e kompeticioneve, thirre fillimisht:
{
  "api_key": "${k.key}",
  "action": "competitions"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ VEPRIMET E MUNDSHME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• live_matches        — Ndeshjet live aktuale
• matches_by_date     — Ndeshjet sipas datës (+ date)
• match               — Ndeshja + ngjarjet (+ match_id)
• match_events        — Vetëm ngjarjet (+ match_id)
• standings           — Tabela (+ competition_id)
• competitions        — Lista e kompeticioneve
• top_scorers         — Golëvënësit
• recent_matches      — Ndeshjet e fundit

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ E RËNDËSISHME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Mos e ndani API key me të tjerët
• Qasja është vetëm lexim (read-only)
• Nëse keni probleme, na kontaktoni

Me respekt,
Ekipi i KosovoScores`;

  const copyEmail = (k) => {
    navigator.clipboard.writeText(getEmailText(k));
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 3000);
    toast.success('Email i kopjuar! 📧');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Key className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">API Publike</h2>
            <p className="text-xs text-muted-foreground">Qasje për partnerë dhe portale</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowDocs(true)}>
            <Code className="w-3.5 h-3.5 mr-1" /> Si funksionon API
          </Button>
          <Button size="sm" onClick={() => setCreateDialog(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> API Key e Re
          </Button>
        </div>
      </div>

      {/* Explanation banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-4 mb-6 space-y-3">
        <p className="text-sm font-bold text-indigo-800">📡 Çfarë është kjo?</p>
        <p className="text-xs text-indigo-700 leading-relaxed">
          API është një mënyrë që faqet/aplikacionet e jashtme të marrin automatikisht të dhënat e ndeshjeve nga KosovoScores.
          Çdo partner (portal sportiv, TV, aplikacion) merr një <strong>API Key unike</strong> — si një fjalëkalim i posaçëm.
          Me atë key ata mund të tërheqin rezultate live, tabela, orarin dhe ngjarjet, pa iu qasur panelit tuaj.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {['🔴 Rezultate live', '📅 Orar ndeshjesh', '🏆 Tabela', '⚽ Gola & kartona', '👟 Golëvënës'].map(item => (
            <span key={item} className="bg-white/70 border border-indigo-200 rounded-full px-2.5 py-1 text-indigo-700 font-medium">{item}</span>
          ))}
        </div>
        <div className="bg-white/70 rounded-xl px-3 py-2 font-mono text-xs text-indigo-800 flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{API_BASE_URL}</span>
          <button onClick={() => { navigator.clipboard.writeText(API_BASE_URL); toast.success('URL kopjuar'); }}
            className="shrink-0 text-indigo-500 hover:text-indigo-700"><Copy className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Keys list */}
      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : keys.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Key className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium">Nuk ka API keys akoma</p>
          <p className="text-xs mt-1">Krijo key të parë për një partner/portal</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(k => (
            <div key={k.id} className={`rounded-2xl border p-4 transition-all ${k.active ? 'bg-card border-border' : 'bg-muted/30 border-dashed border-muted-foreground/30 opacity-60'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${k.active ? 'bg-green-100' : 'bg-muted'}`}>
                  <Key className={`w-4 h-4 ${k.active ? 'text-green-600' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{k.name}</span>
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${k.active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                      {k.active ? '● AKTIV' : '● ÇAKTIV'}
                    </span>
                  </div>
                  {k.notes && <p className="text-xs text-muted-foreground mt-0.5">{k.notes}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="font-mono text-[11px] bg-muted/60 rounded-lg px-2.5 py-1.5 flex-1 min-w-0 truncate text-muted-foreground">
                      {visibleKeys[k.id] ? k.key : k.key.slice(0, 10) + '••••••••••••••••••'}
                    </div>
                    <button
                      onClick={() => setVisibleKeys(prev => ({ ...prev, [k.id]: !prev[k.id] }))}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
                    >
                      {visibleKeys[k.id] ? 'Fsheh' : 'Shfaq'}
                    </button>
                    <button
                      onClick={() => copyKey(k.key)}
                      className="flex items-center gap-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-lg px-2.5 py-1.5 transition-colors shrink-0 font-medium"
                    >
                      <Copy className="w-3 h-3" /> Kopjo Key
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span>📊 {k.usage_count || 0} kërkesa</span>
                    {k.last_used && <span>🕐 {new Date(k.last_used).toLocaleString('sq')}</span>}
                    <span>📅 {k.created_date ? new Date(k.created_date).toLocaleDateString('sq') : '—'}</span>
                    <button
                      onClick={() => setEmailDialog(k)}
                      className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg px-2.5 py-1 transition-colors font-medium"
                    >
                      <Mail className="w-3 h-3" /> Gato email për partner
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => handleToggle(k)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title={k.active ? 'Çaktivizo' : 'Aktivizo'}>
                    {k.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                  </button>
                  <button onClick={() => handleDelete(k)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500" title="Fshi">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>🔑 API Key e Re</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Emri i partnerit / kompanisë *</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="p.sh. Telekosi, Sport Express, Kohavision..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Shënime (opsionale)</label>
              <Input value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="p.sh. për faqen kryesore sportive..." />
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
              🔐 API key gjenerohet automatikisht si string i sigurt unik. Pastaj mund ta kopjosh dhe ta dërgosh partnerit.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateDialog(false)}>Anulo</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={!newName.trim() || creating}>
                {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Krijo Key</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email for partner dialog */}
      <Dialog open={!!emailDialog} onOpenChange={() => { setEmailDialog(null); setEmailCopied(false); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📧 Email i gatshëm — {emailDialog?.name}</DialogTitle>
          </DialogHeader>
          {emailDialog && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <p className="font-bold mb-1">📌 Si e përdor?</p>
                <p>Kopjo tekstin e emailit më poshtë → hap emailin tënd → ngjite si përmbajtje → dërgo tek partneri. Ata do kenë gjithçka që u duhet!</p>
              </div>
              <div className="relative">
                <pre className="bg-slate-900 text-green-200 rounded-xl p-4 text-xs overflow-auto max-h-96 whitespace-pre-wrap font-mono leading-relaxed">
                  {getEmailText(emailDialog)}
                </pre>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => copyEmail(emailDialog)}>
                  {emailCopied ? <><CheckCircle2 className="w-4 h-4 mr-1" /> Kopjuar!</> : <><Copy className="w-4 h-4 mr-1" /> Kopjo të gjithë tekstin</>}
                </Button>
                <Button variant="outline" onClick={() => { setEmailDialog(null); setEmailCopied(false); }}>Mbyll</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Docs Dialog */}
      <Dialog open={showDocs} onOpenChange={setShowDocs}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>📖 Si funksionon API — Udhëzues i plotë</DialogTitle></DialogHeader>
          <div className="space-y-5 text-sm">

            {/* Step 1 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="font-bold text-blue-800 mb-2">🧭 Si funksionon (me fjalë të thjeshta)</p>
              <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
                <li>Krijon një <strong>API Key</strong> për partnerin (butonin "API Key e Re")</li>
                <li>I dërgon partnerit <strong>API Key-in</strong> + <strong>URL-ën e endpoint-it</strong></li>
                <li>Partneri dërgon kërkesa tek URL-ja me API Key-in e tyre dhe merr të dhënat automatikisht</li>
                <li>Ti mund ta <strong>çaktivizosh</strong> key-in çdo herë nëse dëshiron ta ndërprish qasjen</li>
              </ol>
            </div>

            {/* Endpoint */}
            <div>
              <p className="font-bold mb-2">🔗 URL e API (Endpoint)</p>
              <div className="bg-slate-900 text-green-300 rounded-xl p-3 font-mono text-xs flex items-center justify-between gap-2">
                <span className="truncate">{API_BASE_URL}</span>
                <button onClick={() => { navigator.clipboard.writeText(API_BASE_URL); toast.success('Kopjuar'); }}
                  className="shrink-0 text-slate-400 hover:text-white"><Copy className="w-3.5 h-3.5" /></button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Metoda: <code className="bg-muted px-1 rounded">POST</code> — Content-Type: <code className="bg-muted px-1 rounded">application/json</code></p>
            </div>

            {/* All endpoints */}
            <div>
              <p className="font-bold mb-2">📋 Të gjitha veprimet e mundshme</p>
              <div className="space-y-2">
                {ENDPOINTS.map(ep => <EndpointCard key={ep.action} ep={ep} />)}
              </div>
            </div>

            {/* Quick example */}
            <div>
              <p className="font-bold mb-2">⚡ Shembull i shpejtë (JavaScript/fetch)</p>
              <pre className="bg-slate-900 text-green-300 rounded-xl p-4 text-xs overflow-x-auto">{`// Merr ndeshjet live
const response = await fetch('${API_BASE_URL}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    api_key: 'ks_your_key_here',
    action: 'live_matches'
  })
});

const data = await response.json();
// data.matches = lista e ndeshjeve live`}</pre>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}