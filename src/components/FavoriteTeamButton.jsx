import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { requestNotificationPermission } from '@/hooks/useFavoriteGoalNotifier';

// localStorage key for followed clubs
const LS_KEY = 'ks_followed_clubs';

function getFollowed() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function setFollowed(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}

// Sync followed clubs to push subscription record
async function syncFollowedToPush(clubIds) {
  try {
    const res = await base44.functions.invoke('pushNotifications', { action: 'getVapidKey' });
    const vapidPublicKey = res?.data?.vapidPublicKey;
    if (!vapidPublicKey || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (!existing) return;

    await base44.functions.invoke('pushNotifications', {
      action: 'updateFavorites',
      subscription: existing.toJSON(),
      favorite_club_ids: clubIds,
    });
  } catch (_) {}
}

export default function FavoriteTeamButton({ clubId, clubName, size = 'default' }) {
  const [followed, setFollowedState] = useState(() => getFollowed().includes(clubId));

  useEffect(() => {
    setFollowedState(getFollowed().includes(clubId));
  }, [clubId]);

  const toggle = async () => {
    const current = getFollowed();
    let next;

    if (followed) {
      next = current.filter(id => id !== clubId);
      setFollowedState(false);
      setFollowed(next);
      await syncFollowedToPush(next);
      toast(`🔕 Nuk ndjek më ${clubName}`);
    } else {
      // Request notification permission first
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.error('Lejo njoftimet në cilësimet e browser-it për të ndjekur skuadrën');
        return;
      }
      next = [...current.filter(id => id !== clubId), clubId];
      setFollowedState(true);
      setFollowed(next);
      await syncFollowedToPush(next);
      toast.success(`🔔 Po ndjek ${clubName}! Do marrësh njoftime për gola & kartona.`);
    }
  };

  const isSmall = size === 'sm';

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 rounded-xl border font-semibold transition-all active:scale-95 ${
        isSmall ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'
      } ${
        followed
          ? 'bg-primary/10 border-primary/30 text-primary'
          : 'bg-muted border-border text-muted-foreground hover:border-primary/30 hover:text-primary'
      }`}
    >
      {followed
        ? <Bell className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        : <BellOff className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      }
      <span>{followed ? 'Duke Ndjekur' : 'Ndiq'}</span>
    </button>
  );
}