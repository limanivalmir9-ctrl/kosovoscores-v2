import { useState, useEffect } from 'react';
import { Heart, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useSeo } from '@/lib/seo';

export default function Donacion() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [sepaOpen, setSepaOpen] = useState(false);

  useSeo({
    title: 'Donacion | KosovoScores',
    description: 'Mbështet projektin KosovoScores me një donacion vullnetar përmes PayPal, Binance/Crypto ose transfertës bankare SEPA.',
    canonicalPath: '/donacion',
  });

  useEffect(() => {
    base44.entities.DonationSettings.list('-created_date', 1).then(all => {
      setSettings(all[0] || null);
      setLoading(false);
    });
  }, []);

  const copyWallet = () => {
    if (!settings?.binance_wallet) return;
    navigator.clipboard.writeText(settings.binance_wallet);
    setCopied(true);
    toast.success('Adresa u kopjua!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const copyField = (value, field) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    toast.success('U kopjua!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const hasPayPal = settings?.paypal_url;
  const hasCrypto = settings?.binance_wallet || settings?.binance_qr;
  const hasSepa = settings?.sepa_enabled && settings?.sepa_iban;

  if (!hasPayPal && !hasCrypto && !hasSepa) return (
    <div className="py-4 text-center">
      <div className="w-14 h-14 rounded-full bg-live/10 mx-auto mb-3 flex items-center justify-center">
        <Heart className="w-7 h-7 text-live" />
      </div>
      <h1 className="text-lg font-bold">Mbështet KosovoScores</h1>
      <p className="text-sm text-muted-foreground mt-2">Metodat e donacionit do të shtohen së shpejti.</p>
    </div>
  );

  return (
    <div className="py-4">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-live/10 mx-auto mb-3 flex items-center justify-center">
          <Heart className="w-7 h-7 text-live" />
        </div>
        <h1 className="text-lg font-bold">Mbështet KosovoScores</h1>
        <p className="text-sm text-muted-foreground mt-1">Ndihmoni projektin tonë me një donacion vullnetar</p>
      </div>

      <div className="space-y-4">
        {/* PayPal */}
        {hasPayPal && (
          <div className="bg-card rounded-2xl border-2 border-blue-300 p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">💙</span>
              <div>
                <p className="font-bold text-base">PayPal</p>
                <p className="text-xs text-muted-foreground">Kliko butonin për të donuar</p>
              </div>
            </div>
            <Button
              onClick={() => window.open(settings.paypal_url, '_blank')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold"
            >
              <span className="mr-2">💙</span> Dono me PayPal
            </Button>
          </div>
        )}

        {/* Crypto / Binance */}
        {hasCrypto && (
          <div className="bg-card rounded-2xl border-2 border-yellow-300 p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🟡</span>
              <div>
                <p className="font-bold text-base">Binance / Crypto</p>
                {settings?.binance_network && <p className="text-xs text-muted-foreground">{settings.binance_network}</p>}
              </div>
            </div>
            {settings?.binance_qr && (
              <div className="flex justify-center mb-4">
                <img src={settings.binance_qr} alt="QR Code" className="w-48 h-48 object-contain rounded-xl border border-border" />
              </div>
            )}
            {settings?.binance_wallet && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-semibold">Adresa e Walletit:</p>
                <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                  <span className="font-mono text-xs flex-1 break-all">{settings.binance_wallet}</span>
                  <button onClick={copyWallet} className="shrink-0 text-primary hover:text-primary/80">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEPA */}
        {hasSepa && (
          <div className="bg-card rounded-2xl border-2 border-green-300 p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🏦</span>
              <div>
                <p className="font-bold text-base">SEPA Bank Transfer</p>
                <p className="text-xs text-muted-foreground">Transfertë bankare brenda BE</p>
              </div>
            </div>
            <Button
              onClick={() => setSepaOpen(o => !o)}
              variant="outline"
              className="w-full border-green-400 text-green-700 dark:text-green-400 font-bold flex items-center justify-center gap-2"
            >
              {sepaOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {sepaOpen ? 'Fshih të dhënat bankare' : 'Shfaq të dhënat bankare'}
            </Button>
            {sepaOpen && (
              <div className="mt-4 space-y-2 text-sm">
                {[
                  { label: 'Emri', value: settings.sepa_name, field: 'name' },
                  { label: 'IBAN', value: settings.sepa_iban, field: 'iban', mono: true },
                  { label: 'BIC/SWIFT', value: settings.sepa_bic, field: 'bic', mono: true },
                  { label: 'Banka', value: settings.sepa_bank, field: 'bank' },
                  { label: 'Referenca', value: settings.sepa_reference, field: 'ref' },
                ].filter(r => r.value).map(row => (
                  <div key={row.field} className="flex items-center justify-between gap-2 bg-muted rounded-xl px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground font-semibold">{row.label}</p>
                      <p className={`${row.mono ? 'font-mono text-xs' : 'text-sm font-medium'} break-all`}>{row.value}</p>
                    </div>
                    <button onClick={() => copyField(row.value, row.field)} className="shrink-0 text-primary hover:text-primary/80">
                      {copiedField === row.field ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-4">
        Faleminderit për mbështetjen tuaj! 🙏
      </p>
    </div>
  );
}