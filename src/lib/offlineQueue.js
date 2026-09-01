// Offline queue for match feed actions
const QUEUE_KEY = 'ks_offline_queue';

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch { return []; }
}

export function addToQueue(action) {
  const queue = getQueue();
  queue.push({ ...action, id: Date.now() + Math.random(), timestamp: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export function removeFromQueue(id) {
  const queue = getQueue().filter(a => a.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function flushQueue(base44) {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  let flushed = 0;
  for (const action of queue) {
    try {
      if (action.type === 'create_event') {
        await base44.entities.MatchEvent.create(action.data);
      } else if (action.type === 'update_match') {
        await base44.entities.Match.update(action.matchId, action.data);
      } else if (action.type === 'delete_event') {
        await base44.entities.MatchEvent.delete(action.eventId);
      } else if (action.type === 'update_event') {
        await base44.entities.MatchEvent.update(action.eventId, action.data);
      }
      removeFromQueue(action.id);
      flushed++;
    } catch (e) {
      console.warn('Failed to flush action:', action, e);
    }
  }
  return flushed;
}