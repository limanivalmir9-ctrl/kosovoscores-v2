import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Link, Loader2, CheckCircle2, Camera } from 'lucide-react';

const MATCHES_SCHEMA = {
  type: 'object',
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          home_team: { type: 'string' },
          away_team: { type: 'string' },
          date: { type: 'string' },
          time: { type: 'string' },
          home_score: { type: 'string' },
          away_score: { type: 'string' },
          round: { type: 'string' },
          has_result: { type: 'boolean' },
        }
      }
    }
  }
};

export default function ImportMatchesFromUrl({ competition, clubs, open, onClose, onImported }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [mode, setMode] = useState('url'); // 'url' | 'photo'

  const compClubs = clubs.filter(c => c.competition_id === competition?.id);

  const buildPrompt = (isPhoto = false) => {
    const clubList = compClubs.map(c => c.name).join(', ');
    if (isPhoto) {
      return `You are analyzing an image of a football match schedule/fixture/results table.

TASK: Extract ALL football matches visible in this image.

For each match, extract:
- home_team: the home/left team name
- away_team: the away/right team name
- date: match date in YYYY-MM-DD format (use 2025 if year unknown)
- time: match time in HH:MM 24h format, or "" if not present
- home_score: home team goals as a string like "2", or "" if no result shown
- away_score: away team goals as a string like "1", or "" if no result shown
- round: round/week number as a string like "5", or "" if not shown
- has_result: true if a score is shown, false if it's a future/scheduled match

OFFICIAL CLUB NAMES for this competition (use these exact names when matching):
${clubList}

IMPORTANT: Match team names in the image to the official list above (case-insensitive). Use the exact official name if found.

Return JSON with a "matches" array containing ALL matches found.`;
    }
    return `Extract all football matches from the provided source.

For each match return:
- home_team, away_team (match to official list if possible)
- date (YYYY-MM-DD), time (HH:MM or "")
- home_score, away_score as strings ("2", "1") or "" if no result
- round as string or ""
- has_result: true if score is present

Official clubs: ${clubList}

Return JSON with "matches" array.`;
  };

  const handleFetch = async () => {
    if (!url.trim()) { toast.error('Shto një link'); return; }
    setLoading(true);
    setPreview(null);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: buildPrompt(false) + `\n\nURL: ${url}`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: MATCHES_SCHEMA,
    });

    setPreview(result.matches || []);
    setLoading(false);
    if (!result.matches?.length) toast.error('Nuk u gjetën ndeshje. Provo me link tjetër.');
  };

  const handlePhotoScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setPreview(null);
    try {
      toast('Duke ngarkuar foton...', { duration: 3000 });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      toast('Duke analizuar foton me AI...', { duration: 8000 });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(true),
        file_urls: [file_url],
        model: 'gpt_5',
        response_json_schema: MATCHES_SCHEMA,
      });
      const found = result?.matches || [];
      setPreview(found);
      if (!found.length) toast.error('Nuk u gjetën ndeshje në foto. Provo foto me rezolucion më të lartë.');
    } catch (err) {
      toast.error('Gabim gjatë analizimit: ' + (err?.message || 'error i panjohur'));
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  // Exact match first, then partial
  const resolveClub = (name) => {
    if (!name) return null;
    const lower = name.toLowerCase().trim();
    return (
      compClubs.find(c => c.name.toLowerCase() === lower) ||
      compClubs.find(c => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase())) ||
      null
    );
  };

  const parseScore = (val) => {
    if (val === null || val === undefined || val === '' || val === '-') return null;
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
  };

  const handleImport = async () => {
    if (!preview?.length) return;
    setImporting(true);
    let created = 0;
    for (const m of preview) {
      const homeClub = resolveClub(m.home_team);
      const awayClub = resolveClub(m.away_team);
      const homeScore = parseScore(m.home_score);
      const awayScore = parseScore(m.away_score);
      const hasResult = m.has_result === true || (homeScore !== null && awayScore !== null);
      await base44.entities.Match.create({
        competition_id: competition.id,
        competition_name: competition.name,
        competition_color: competition.color || 'blue-500',
        competition_tier: competition.tier || 1,
        home_team_id: homeClub?.id || '',
        away_team_id: awayClub?.id || '',
        home_team_name: homeClub?.name || m.home_team,
        away_team_name: awayClub?.name || m.away_team,
        home_team_logo: homeClub?.logo || '',
        away_team_logo: awayClub?.logo || '',
        stadium: homeClub?.stadium || '',
        date: m.date || '',
        time: m.time || '',
        round: m.round ? parseInt(m.round, 10) || null : null,
        home_score: hasResult ? homeScore : 0,
        away_score: hasResult ? awayScore : 0,
        status: hasResult ? 'full_time' : 'scheduled',
        minute: hasResult ? 90 : 0,
        match_code: String(Math.floor(100000 + Math.random() * 900000)),
      });
      created++;
    }
    setImporting(false);
    toast.success(`${created} ndeshje u importuan!`);
    setUrl('');
    setPreview(null);
    onClose();
    setTimeout(() => onImported?.(), 300);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importo Ndeshje nga Link – {competition?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Mode tabs */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button onClick={() => setMode('url')} className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1 ${mode === 'url' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>
              <Link className="w-3.5 h-3.5" /> Link
            </button>
            <button onClick={() => setMode('photo')} className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1 ${mode === 'photo' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>
              <Camera className="w-3.5 h-3.5" /> Foto
            </button>
          </div>

          {mode === 'url' && (
            <div>
              <Label>Link i faqes me rezultate / fixture</Label>
              <div className="flex gap-2 mt-1">
                <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
                <Button onClick={handleFetch} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                AI do të lexojë faqen dhe do të gjejë ndeshjet ({compClubs.length} klube të regjistruara).
              </p>
            </div>
          )}

          {mode === 'photo' && (
            <div>
              <Label>Ngarko foto me program / fixture</Label>
              <label className={`mt-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary transition-colors ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                {loading ? (
                  <><Loader2 className="w-6 h-6 animate-spin text-primary mb-2" /><span className="text-xs text-muted-foreground">Duke analizuar foton...</span></>
                ) : (
                  <><Camera className="w-6 h-6 text-muted-foreground mb-2" /><span className="text-xs text-muted-foreground">Kliko për të zgjedhur foton</span></>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoScan} disabled={loading} />
              </label>
              <p className="text-[11px] text-muted-foreground mt-1">
                AI do të lexojë ndeshjet, datat, oraret dhe rezultatet nga foto ({compClubs.length} klube të regjistruara).
              </p>
            </div>
          )}

          {loading && mode === 'url' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Duke lexuar faqen dhe analizuar ndeshjet...
            </div>
          )}


          {preview && preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">U gjetën {preview.length} ndeshje – kontrolloji:</p>
              <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2">
                {preview.map((m, i) => {
                  const homeC = resolveClub(m.home_team);
                  const awayC = resolveClub(m.away_team);
                  const hasScore = m.has_result === true || (m.home_score !== '' && m.home_score !== null && m.home_score !== undefined && m.away_score !== '' && m.away_score !== null);
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-2 py-1.5">
                      <div className="flex-1 min-w-0">
                        <span className={homeC ? 'text-foreground font-medium' : 'text-orange-500'}>{homeC?.name || m.home_team}</span>
                        <span className="mx-1 text-muted-foreground font-bold">{hasScore ? `${m.home_score}–${m.away_score}` : 'vs'}</span>
                        <span className={awayC ? 'text-foreground font-medium' : 'text-orange-500'}>{awayC?.name || m.away_team}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {hasScore && <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1 rounded">FT</span>}
                        <span className="text-muted-foreground">{m.date}</span>
                        {m.round && <span className="text-primary">J{m.round}</span>}
                        {homeC && awayC ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <span className="text-orange-400">!</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-orange-600">Emrat me ngjyrë portokalli nuk u përputhën me klubet e regjistruara — do të ruhen pa ID klubi.</p>
              <Button onClick={handleImport} disabled={importing} className="w-full bg-green-600 hover:bg-green-700 text-white">
                {importing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Duke importuar...</> : `Importo ${preview.length} Ndeshje`}
              </Button>
            </div>
          )}

          {preview && preview.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-4">Nuk u gjetën ndeshje. Provo link tjetër.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}