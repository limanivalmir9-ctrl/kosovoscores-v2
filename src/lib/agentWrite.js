import { base44 } from '@/api/base44Client';

// Frontend helper for field-agent writes. Agents are anonymous (no user auth) and
// Match/MatchEvent/TopScorer/Standing/Agent have admin-only write RLS, so every
// agent mutation goes through the `agentMatchAction` backend function (service role),
// validated by the match_code the agent logged in with.

export async function agentAction(matchCode, ops) {
  if (!matchCode) throw new Error('Mungon kodi i ndeshjes');
  const res = await base44.functions.invoke('agentMatchAction', { match_code: matchCode, ops });
  const data = res.data;
  if (!data || !data.ok) throw new Error((data && data.error) || 'Veprim i gabuar');
  return data;
}

export async function agentUpdateMatch(matchCode, data) {
  return agentAction(matchCode, [{ op: 'updateMatch', data }]);
}
export async function agentCreateEvent(matchCode, data) {
  const r = await agentAction(matchCode, [{ op: 'createEvent', data }]);
  return r.results[0] && r.results[0].event;
}
export async function agentUpdateEvent(matchCode, eventId, data) {
  return agentAction(matchCode, [{ op: 'updateEvent', event_id: eventId, data }]);
}
export async function agentDeleteEvent(matchCode, eventId) {
  return agentAction(matchCode, [{ op: 'deleteEvent', event_id: eventId }]);
}
export async function agentDecrementTopScorer(matchCode, playerName) {
  return agentAction(matchCode, [{ op: 'decrementTopScorer', player_name: playerName }]);
}
export async function agentUpdateTopScorer(matchCode, scorerId, data) {
  return agentAction(matchCode, [{ op: 'updateTopScorer', scorer_id: scorerId, data }]);
}
export async function agentCreateTopScorer(matchCode, data) {
  const r = await agentAction(matchCode, [{ op: 'createTopScorer', data }]);
  return r.results[0] && r.results[0].scorer;
}
export async function agentUpdateStanding(matchCode, standingId, data) {
  return agentAction(matchCode, [{ op: 'updateStanding', standing_id: standingId, data }]);
}
export async function agentUpdateAgent(matchCode, agentId, data) {
  return agentAction(matchCode, [{ op: 'updateAgent', agent_id: agentId, data }]);
}
export async function agentRotateMatchCode(matchCode, newCode) {
  const r = await agentAction(matchCode, [{ op: 'rotateMatchCode', newCode }]);
  return r.results[0] && r.results[0].newCode;
}
export async function agentHeartbeat(matchCode) {
  return agentAction(matchCode, [{ op: 'heartbeat' }]);
}
export async function agentBatch(matchCode, ops) {
  return agentAction(matchCode, ops);
}