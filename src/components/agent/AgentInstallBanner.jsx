import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

/**
 * AgentInstallBanner
 * PWA-style install prompt for the agent portal. Shows an "Install as app"
 * banner when the browser fires beforeinstallprompt (Chrome/Android/Edge).
 * Does not change any portal functionality — purely an install UX nudge.
 */
export default function AgentInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (standalone) { setInstalled(true); return; }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    const installedHandler = () => { setInstalled(true); setVisible(false); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible || installed) return null;

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/5 p-3 flex items-center gap-3 shadow-sm">
      <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
        <Download className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold">Instalo si Aplikacion</p>
        <p className="text-[10px] text-muted-foreground">Shto në ekranin bazë për akses më të shpejtë</p>
      </div>
      <button onClick={handleInstall} className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg shrink-0 active:scale-95 transition-transform">
        Instalo
      </button>
      <button onClick={() => setVisible(false)} className="text-muted-foreground p-1 hover:text-foreground" aria-label="Mbyll">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}