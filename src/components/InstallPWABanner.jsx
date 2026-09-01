import { useState, useEffect } from 'react';
import { X, Share2, MoreVertical, Plus, Home } from 'lucide-react';
import { trackEvent } from '@/lib/trackAnalytics';

const DISMISSED_KEY = 'ks_install_guide_dismissed';

function detectDevice() {
  const ua = navigator.userAgent;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isStandalone) return 'installed';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'other';
}

export default function InstallPWABanner() {
  const [device, setDevice] = useState(null);
  const [show, setShow] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const d = detectDevice();
    setDevice(d);
    // Never show the banner — PWA install prompt is disabled
    setShow(false);
  }, []);

  const dismiss = (installed = false) => {
    if (installed) trackEvent('pwa_installed');
    localStorage.setItem(DISMISSED_KEY, '1');
    setShow(false);
    setShowModal(false);
  };

  if (!show) return null;

  return (
    <>
      {/* Bottom banner */}
      {!showModal && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-primary/30 shadow-2xl px-4 py-3 flex items-center gap-3">
          <img
            src="https://media.base44.com/images/public/69c340685dca7075d7622e15/702c80214_8c53466ae_logo.png"
            alt="KS"
            className="w-10 h-10 rounded-xl shrink-0 object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">Shto KS Agent si App</p>

            <p className="text-xs text-muted-foreground">Hap shpejt pa browser</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-primary-foreground text-xs font-bold px-3 py-2 rounded-xl shrink-0"
          >
            Si?
          </button>
          <button onClick={dismiss} className="text-muted-foreground p-1 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Full-screen guide modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center">
          <div className="bg-card w-full max-w-sm rounded-t-3xl p-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <img
                  src="https://media.base44.com/images/public/69c340685dca7075d7622e15/702c80214_8c53466ae_logo.png"
                  alt="KS"
                  className="w-10 h-10 rounded-xl object-cover"
                />
                <div>
                  <p className="font-bold text-sm">KS Agent</p>
                  <p className="text-xs text-muted-foreground">Instalo si App</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {device === 'ios' ? (
              <IOSGuide />
            ) : (
              <AndroidGuide />
            )}

            <button
              onClick={() => dismiss(false)}
              className="mt-4 w-full text-center text-xs text-muted-foreground py-2"
            >
              Mos trego më
            </button>
            <button
              onClick={() => dismiss(true)}
              className="w-full text-center text-xs font-bold text-purple-600 py-1"
            >
              ✅ E instalova!
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function IOSGuide() {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-center mb-4">Hapat për iPhone / iPad</p>

      <Step number={1} icon={<Share2 className="w-5 h-5 text-blue-500" />}>
        Shtyp butonin <strong className="text-blue-500">Share</strong>{' '}
        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500 rounded text-white">
          <Share2 className="w-3.5 h-3.5" />
        </span>{' '}
        në fund të Safari
      </Step>

      <Step number={2} icon={<Plus className="w-5 h-5 text-green-500" />}>
        Scroll poshtë dhe shtyp{' '}
        <strong>"Add to Home Screen"</strong>
      </Step>

      <Step number={3} icon={<Home className="w-5 h-5 text-primary" />}>
        Shtyp <strong>"Add"</strong> — ikonën do ta gjesh në Home Screen!
      </Step>

      <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mt-2">
        <p className="text-xs text-orange-700 dark:text-orange-400 font-bold">
          ⚠️ Nëse ke instaluar KosovoScores, Match Feed do shtohet si ikonë e veçantë në Safari — iOS lejon shumë ikona nga i njëjti domain!
        </p>
      </div>
    </div>
  );
}

function AndroidGuide() {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-center mb-4">Hapat për Android</p>

      <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mb-2">
        <p className="text-xs text-orange-700 dark:text-orange-400 font-bold">
          ⚠️ Nëse ke instaluar KosovoScores, përdor <strong>Firefox</strong> ose <strong>Samsung Internet</strong> për Match Feed!
        </p>
      </div>

      <Step number={1} icon={<MoreVertical className="w-5 h-5 text-gray-500" />}>
        Hap <strong>Firefox</strong> dhe shko te faqja Match Feed
      </Step>

      <Step number={2} icon={<Plus className="w-5 h-5 text-green-500" />}>
        Shtyp menunë <strong>⋮</strong> → zgjedh{' '}
        <strong>"Install"</strong> ose <strong>"Add to Home screen"</strong>
      </Step>

      <Step number={3} icon={<Home className="w-5 h-5 text-primary" />}>
        Konfirmo — do instalohet si app i <strong>veçantë</strong> pa konflikt!
      </Step>
    </div>
  );
}

function Step({ number, icon, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-xs font-bold text-primary">{number}</span>
      </div>
      <div className="flex items-start gap-2 flex-1">
        <span className="shrink-0 mt-0.5">{icon}</span>
        <p className="text-sm text-foreground/80">{children}</p>
      </div>
    </div>
  );
}