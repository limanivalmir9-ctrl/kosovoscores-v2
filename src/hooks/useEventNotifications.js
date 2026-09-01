import { useEffect, useRef } from 'react';

const CRITICAL_TYPES = ['goal', 'penalty_goal', 'own_goal', 'red_card', 'second_yellow', 'substitution'];

const TYPE_LABELS = {
  goal: '⚽ GOL',
  penalty_goal: '⚽ GOL (Penalti)',
  own_goal: '⚽ Gol Vetë',
  red_card: '🟥 Karton i Kuq',
  second_yellow: '🟨🟥 Verdhë/Kuq',
  substitution: '🔄 Zëvendësim',
};

function requestPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function fireNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/logo.png', silent: false });
  } catch {}
}

/**
 * Watches an events array and fires browser notifications for new critical events.
 * @param {Array} events - current events array
 * @param {Object} match - match object with team names
 */
export function useEventNotifications(events, match) {
  const prevIdsRef = useRef(null);

  useEffect(() => {
    requestPermission();
  }, []);

  useEffect(() => {
    if (!events || !match) return;

    const currentIds = new Set(events.map(e => e.id));

    if (prevIdsRef.current === null) {
      // First load — just record IDs, don't notify
      prevIdsRef.current = currentIds;
      return;
    }

    const prevIds = prevIdsRef.current;

    // Find truly new events
    const newEvents = events.filter(e => !prevIds.has(e.id) && CRITICAL_TYPES.includes(e.type));

    newEvents.forEach(e => {
      const teamName = e.team === 'home' ? match.home_team_name : match.away_team_name;
      const typeLabel = TYPE_LABELS[e.type] || e.type;
      const playerInfo = e.player_name ? ` — ${e.player_name}` : '';
      const minuteInfo = e.minute ? ` (${e.minute}')` : '';
      fireNotification(
        `${typeLabel}${minuteInfo}`,
        `${teamName}${playerInfo}`
      );
    });

    prevIdsRef.current = currentIds;
  }, [events, match]);
}