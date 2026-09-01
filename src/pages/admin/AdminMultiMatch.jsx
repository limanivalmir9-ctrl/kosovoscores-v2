import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Layers, Smartphone, Monitor, UserSquare, Calendar,
  Plus, Trash2, CheckCircle2, Clock, ChevronRight, RefreshCw, X
} from 'lucide-react';
import moment from 'moment';

const STATUS_LABELS = {
  scheduled: { label: 'Planifikuar', color: 'bg-slate-100 text-slate-600' },
  first_half: { label: '1. Gjysmë', color: 'bg-green-100 text-green-700' },
  half_time: { label: 'Pushim', color: 'bg-yellow-100 text-yellow-700' },
  second_half: { label: '2. Gjysmë', color: 'bg-green-100 text-green-700' },
  full_time: { label: 'Mbaruar', color: 'bg-red-100 text-red-700' },
};

export default function AdminMultiMatch() {
  const [agents, setAgents] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [controlType, setControlType] = useState('mobile');
  const [saving, setSaving] = useState(false);
  const [agentAssignments, setAgentAssignments] = useState({}); // agentId -> [matches]
  const [dateFilter, setDateFilter] = useState(moment().format('YYYY-MM-DD'));

  const load = async () => {
    setLoading(true);
    const [agentsData, matchesData] = await Promise.all([
      base44.entities.Agent.list('first_name', 100),
      base44.entities.Match.filter({ date: dateFilter }, 'time', 100),
    ]);
    setAgents(agentsData);
    setMatches(matchesData);

    // Build assignment map: for each agent, find their assigned matches for this date
    const map = {};
    for (const agent of agentsData) {
      const assigned = matchesData.filter(m => m.assigned_agent_id === agent.id);
      if (assigned.length > 0) {
        map[agent.id] = assigned;
      }
    }
    setAgentAssignments(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, [dateFilter]);

  const openAssignDialog = (agent = null) => {
    setSelectedAgent(agent);
    if (agent) {
      // Pre-select already assigned matches for this agent
      const currentlyAssigned = matches.filter(m => m.assigned_agent_id === agent.id).map(m => m.id);
      setSelectedMatches(currentlyAssigned);
    } else {
      setSelectedMatches([]);
    }
    setControlType('mobile');
    setAssignDialog(true);
  };

  const toggleMatch = (matchId) => {
    setSelectedMatches(prev =>
      prev.includes(matchId) ? prev.filter(id => id !== matchId) : [...prev, matchId]
    );
  };

  const handleSave = async () => {
    if (!selectedAgent || selectedMatches.length === 0) return;
    setSaving(true);

    // Assign selected matches to this agent
    await Promise.all(
      selectedMatches.map(matchId =>
        base44.entities.Match.update(matchId, {
          assigned_agent_id: selectedAgent.id,
          multi_control_type: controlType,
        })
      )
    );

    toast.success(`✅ ${selectedMatches.length} ndeshje u caktuan tek ${selectedAgent.first_name} (${controlType === 'mobile' ? '📱 Mobile' : '🖥️ Desktop'})`);
    setSaving(false);
    setAssignDialog(false);
    load();
  };

  const handleUnassign = async (agentId, matchId) => {
    await base44.entities.Match.update(matchId, { assigned_agent_id: null, multi_control_type: null });
    toast.success('Ndeshja u hoq');
    load();
  };

  const scheduledMatches = matches.filter(m =>
    ['scheduled', 'first_half', 'half_time', 'second_half', 'awaiting_extra_time', 'extra_time_first_half', 'extra_time_half_time', 'extra_time_second_half', 'penalties'].includes(m.status)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black">Multi Match Control</h2>
            <p className="text-xs text-muted-foreground">Cakto agjentët të kontrollojnë shumë ndeshje njëkohësisht</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="text-xs border border-border rounded-lg px-3 py-2 bg-card"
          />
          <button onClick={load} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Control type legend */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-800">📱 Mobile Control</p>
            <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
              Agjenti sheh të gjitha ndeshjet si karta dhe kalon shpejt ndërmjet tyre me tastin e poshtëm. Ideal për telefon.
            </p>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 bg-slate-600 rounded-xl flex items-center justify-center shrink-0">
            <Monitor className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">🖥️ Desktop Control</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Agjenti hap ndeshje të shumta në tab të ndryshme të browser-it. Ideal për laptop/PC.
            </p>
          </div>
        </div>
      </div>

      {/* Agents with assignments */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map(agent => {
            const assigned = agentAssignments[agent.id] || [];
            return (
              <div key={agent.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center shrink-0">
                      <UserSquare className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{agent.first_name} {agent.last_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {assigned.length > 0
                          ? <span className="text-violet-600 font-semibold">{assigned.length} ndeshje caktuar</span>
                          : 'Nuk ka ndeshje caktuar sot'}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant={assigned.length > 0 ? 'outline' : 'default'} onClick={() => openAssignDialog(agent)}>
                    {assigned.length > 0 ? 'Ndrysho' : <><Plus className="w-3.5 h-3.5 mr-1" /> Cakto</>}
                  </Button>
                </div>

                {assigned.length > 0 && (
                  <div className="mt-3 space-y-2 pl-12">
                    {assigned.map(m => {
                      const st = STATUS_LABELS[m.status] || STATUS_LABELS.scheduled;
                      const isMultiMobile = m.multi_control_type === 'mobile';
                      return (
                        <div key={m.id} className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2">
                          <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0 ${st.color}`}>{st.label}</span>
                          <span className="text-xs font-semibold flex-1 truncate">{m.home_team_name} vs {m.away_team_name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{m.time || '—'}</span>
                          {isMultiMobile
                            ? <Smartphone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            : <Monitor className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          }
                          <button
                            onClick={() => handleUnassign(agent.id, m.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              🎯 Cakto Ndeshje — {selectedAgent?.first_name} {selectedAgent?.last_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Control type selector */}
            <div>
              <p className="text-xs font-bold mb-2 text-muted-foreground uppercase tracking-wide">Lloji i Kontrollit</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setControlType('mobile')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all ${controlType === 'mobile' ? 'border-blue-500 bg-blue-50' : 'border-border bg-card hover:border-blue-200'}`}
                >
                  <Smartphone className={`w-5 h-5 ${controlType === 'mobile' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                  <div className="text-left">
                    <p className={`text-xs font-bold ${controlType === 'mobile' ? 'text-blue-700' : 'text-foreground'}`}>📱 Mobile</p>
                    <p className="text-[10px] text-muted-foreground">Switch i shpejtë</p>
                  </div>
                  {controlType === 'mobile' && <CheckCircle2 className="w-4 h-4 text-blue-500 ml-auto" />}
                </button>
                <button
                  onClick={() => setControlType('desktop')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all ${controlType === 'desktop' ? 'border-slate-600 bg-slate-50' : 'border-border bg-card hover:border-slate-300'}`}
                >
                  <Monitor className={`w-5 h-5 ${controlType === 'desktop' ? 'text-slate-600' : 'text-muted-foreground'}`} />
                  <div className="text-left">
                    <p className={`text-xs font-bold ${controlType === 'desktop' ? 'text-slate-700' : 'text-foreground'}`}>🖥️ Desktop</p>
                    <p className="text-[10px] text-muted-foreground">Tab të shumta</p>
                  </div>
                  {controlType === 'desktop' && <CheckCircle2 className="w-4 h-4 text-slate-600 ml-auto" />}
                </button>
              </div>
            </div>

            {/* Match selection */}
            <div>
              <p className="text-xs font-bold mb-2 text-muted-foreground uppercase tracking-wide">
                Zgjedh Ndeshjet — {moment(dateFilter).format('DD/MM/YYYY')}
              </p>
              {scheduledMatches.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Nuk ka ndeshje për këtë datë
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {scheduledMatches.map(m => {
                    const selected = selectedMatches.includes(m.id);
                    const alreadyAssignedToOther = m.assigned_agent_id && m.assigned_agent_id !== selectedAgent?.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => !alreadyAssignedToOther && toggleMatch(m.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          alreadyAssignedToOther
                            ? 'opacity-40 cursor-not-allowed border-border bg-muted/30'
                            : selected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border bg-card hover:border-primary/30'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
                          {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{m.home_team_name} vs {m.away_team_name}</p>
                          <p className="text-[10px] text-muted-foreground">{m.time || '—'} • {m.competition_name || ''}</p>
                        </div>
                        {alreadyAssignedToOther && (
                          <span className="text-[9px] bg-orange-100 text-orange-600 rounded-full px-1.5 py-0.5 shrink-0 font-bold">Caktuar</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedMatches.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-primary font-semibold">
                ✅ {selectedMatches.length} ndeshje zgjedhura
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAssignDialog(false)}>Anulo</Button>
              <Button
                className="flex-1"
                disabled={selectedMatches.length === 0 || saving}
                onClick={handleSave}
              >
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><ChevronRight className="w-4 h-4 mr-1" /> Cakto {selectedMatches.length > 0 ? selectedMatches.length : ''} Ndeshje</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}