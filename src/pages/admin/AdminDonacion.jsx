import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AdminDonacion() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ paypal_url: '', binance_wallet: '', binance_network: '', binance_qr: '', sepa_enabled: false, sepa_name: '', sepa_iban: '', sepa_bic: '', sepa_bank: '', sepa_reference: '' });
  const [uploadingQR, setUploadingQR] = useState(false);

  const load = async () => {
    const all = await base44.entities.DonationSettings.list('-created_date', 1);
    if (all[0]) {
      setSettings(all[0]);
      setForm({
        paypal_url: all[0].paypal_url || '',
        binance_wallet: all[0].binance_wallet || '',
        binance_network: all[0].binance_network || '',
        binance_qr: all[0].binance_qr || '',
        sepa_enabled: all[0].sepa_enabled || false,
        sepa_name: all[0].sepa_name || '',
        sepa_iban: all[0].sepa_iban || '',
        sepa_bic: all[0].sepa_bic || '',
        sepa_bank: all[0].sepa_bank || '',
        sepa_reference: all[0].sepa_reference || '',
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleQRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingQR(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, binance_qr: file_url }));
    setUploadingQR(false);
    toast.success('QR kodi u ngarkua');
  };

  const handleSave = async () => {
    const data = { ...form, active: true };
    if (settings) {
      await base44.entities.DonationSettings.update(settings.id, data);
    } else {
      await base44.entities.DonationSettings.create(data);
    }
    toast.success('Të dhënat u ruajtën');
    load();
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <h2 className="text-lg font-bold mb-6">Cilësimet e Donacionit</h2>
      <div className="space-y-6 max-w-lg">

        {/* PayPal */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">💙 PayPal</h3>
          <div>
            <Label>PayPal Linku (paypal.me/...)</Label>
            <Input value={form.paypal_url} onChange={e => setForm(p => ({ ...p, paypal_url: e.target.value }))} placeholder="https://paypal.me/yourusername" />
          </div>
        </div>

        {/* Binance/Crypto */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">🟡 Binance / Crypto</h3>
          <div>
            <Label>Adresa e Walletit</Label>
            <Input value={form.binance_wallet} onChange={e => setForm(p => ({ ...p, binance_wallet: e.target.value }))} placeholder="0x..." className="font-mono text-xs" />
          </div>
          <div>
            <Label>Rrjeti (Network)</Label>
            <Input value={form.binance_network} onChange={e => setForm(p => ({ ...p, binance_network: e.target.value }))} placeholder="p.sh. BNB Smart Chain (BEP20)" />
          </div>
          <div>
            <Label>QR Kodi (foto)</Label>
            <Input type="file" accept="image/*" onChange={handleQRUpload} disabled={uploadingQR} />
            {uploadingQR && <p className="text-xs text-muted-foreground mt-1">Duke ngarkuar...</p>}
            {form.binance_qr && (
              <div className="mt-2">
                <img src={form.binance_qr} alt="QR Code" className="w-36 h-36 object-contain border rounded-xl" />
              </div>
            )}
          </div>
        </div>

        {/* SEPA */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2">🏦 SEPA Bank Transfer</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.sepa_enabled} onChange={e => setForm(p => ({ ...p, sepa_enabled: e.target.checked }))} className="rounded" />
              <span className="text-xs font-medium">Aktivo</span>
            </label>
          </div>
          {form.sepa_enabled && (
            <div className="space-y-2">
              <div>
                <Label>Emri i Llogarisë (Account Name)</Label>
                <Input value={form.sepa_name} onChange={e => setForm(p => ({ ...p, sepa_name: e.target.value }))} placeholder="p.sh. KosovoScores" />
              </div>
              <div>
                <Label>IBAN</Label>
                <Input value={form.sepa_iban} onChange={e => setForm(p => ({ ...p, sepa_iban: e.target.value }))} placeholder="p.sh. DE89 3704 0044 0532 0130 00" className="font-mono text-xs" />
              </div>
              <div>
                <Label>BIC / SWIFT</Label>
                <Input value={form.sepa_bic} onChange={e => setForm(p => ({ ...p, sepa_bic: e.target.value }))} placeholder="p.sh. COBADEFFXXX" className="font-mono text-xs" />
              </div>
              <div>
                <Label>Banka</Label>
                <Input value={form.sepa_bank} onChange={e => setForm(p => ({ ...p, sepa_bank: e.target.value }))} placeholder="p.sh. Deutsche Bank" />
              </div>
              <div>
                <Label>Referenca / Qëllimi i Pagesës</Label>
                <Input value={form.sepa_reference} onChange={e => setForm(p => ({ ...p, sepa_reference: e.target.value }))} placeholder="p.sh. Donacion KosovoScores" />
              </div>
            </div>
          )}
        </div>

        <Button onClick={handleSave} className="w-full">Ruaj Cilësimet</Button>
      </div>
    </div>
  );
}