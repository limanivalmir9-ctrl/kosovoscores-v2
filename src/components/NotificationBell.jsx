import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { requestNotificationPermission } from '@/hooks/useFavoriteGoalNotifier';
import { toast } from 'sonner';

export default function NotificationBell() {
  const [permission, setPermission] = useState('default');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
    const saved = localStorage.getItem('ks_notif_enabled');
    setEnabled(saved !== 'false');
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof Notification !== 'undefined') {
        setPermission(Notification.permission);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!('Notification' in window)) return null;

  const isOn = permission === 'granted' && enabled;

  async function handleToggle() {
    if (permission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (granted) {
        setPermission('granted');
        setEnabled(true);
        localStorage.setItem('ks_notif_enabled', 'true');
        toast('✅ Njoftimet u aktivizuan!', { duration: 4000 });
      } else {
        toast.error('Njoftimet janë të bllokuara nga cilësimet e browserit.', { duration: 5000 });
      }
      return;
    }
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('ks_notif_enabled', String(next));
    toast(next ? '🔔 Njoftimet u aktivizuan!' : '🔕 Njoftimet u çaktivizuan!', { duration: 3000 });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={isOn ? "Çaktivizo njoftimet" : "Aktivizo njoftimet"}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '9999px',
        border: `1px solid ${isOn ? 'rgba(255,230,0,0.5)' : 'rgba(255,255,255,0.2)'}`,
        background: isOn ? 'rgba(255,230,0,0.15)' : 'rgba(255,255,255,0.08)',
        cursor: 'pointer',
        outline: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {isOn
        ? <Bell size={8} color="#ffe600cc" />
        : <BellOff size={8} color="rgba(255,255,255,0.4)" />
      }
      {/* Switch track */}
      <div style={{
        position: 'relative',
        width: '20px',
        height: '12px',
        borderRadius: '9999px',
        background: isOn ? 'rgba(255,220,0,0.5)' : 'rgba(255,255,255,0.18)',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}>
        {/* Knob */}
        <div style={{
          position: 'absolute',
          top: '2px',
          left: isOn ? '10px' : '2px',
          width: '8px',
          height: '8px',
          borderRadius: '9999px',
          background: isOn ? '#ffe600' : 'rgba(255,255,255,0.55)',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </div>
    </button>
  );
}