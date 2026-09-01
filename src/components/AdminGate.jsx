import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { checkMasterCode, getAdminSession, setAdminSession, isMasterAdmin } from '@/lib/adminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, AlertTriangle } from 'lucide-react';

export default function AdminGate({ children }) {
  const [session, setSession] = useState(getAdminSession);
  const [code1, setCode1] = useState('');
  const [code2, setCode2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    // Check master admin first
    if (checkMasterCode(code1) && checkMasterCode(code2) && code1 !== code2) {
      const sess = { type: 'master', name: 'Super Admin' };
      setAdminSession(sess);
      setSession(sess);
      setLoading(false);
      return;
    }

    // Check sub-admins
    try {
      const subs = await base44.entities.SubAdmin.filter({ active: true });
      const match = subs.find(s => 
        ((s.code1 === code1.trim() && s.code2 === code2.trim()) ||
         (s.code1 === code2.trim() && s.code2 === code1.trim())) &&
        s.code1 !== s.code2
      );
      if (match) {
        // Update last_login
        await base44.entities.SubAdmin.update(match.id, { last_login: new Date().toISOString() });
        const sess = { type: 'subadmin', name: match.name, allowed_sections: match.allowed_sections || [], id: match.id, code1: code1.trim(), code2: code2.trim() };
        setAdminSession(sess);
        setSession(sess);
      } else {
        setError('Kodet janë të pasakta. Provoni sërish.');
        setCode1('');
        setCode2('');
      }
    } catch {
      setError('Gabim gjatë verifikimit. Provoni sërish.');
    }
    setLoading(false);
  };

  if (session) return children;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary mx-auto mb-3 flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">Akses i Kufizuar</h1>
          <p className="text-sm text-muted-foreground mt-1">Vendos kodet e aksesit</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Kodi 1</label>
            <Input
              type="password"
              value={code1}
              onChange={e => { setCode1(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
              placeholder="●●●●●●"
              className="text-center font-mono tracking-widest text-lg h-12"
              maxLength={8}
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Kodi 2</label>
            <Input
              type="password"
              value={code2}
              onChange={e => { setCode2(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }}
              placeholder="●●●●●●"
              className="text-center font-mono tracking-widest text-lg h-12"
              maxLength={8}
              inputMode="numeric"
              onKeyDown={e => e.key === 'Enter' && code1.length >= 4 && code2.length >= 4 && handleLogin()}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <p className="text-xs">{error}</p>
            </div>
          )}
          <Button
            onClick={handleLogin}
            className="w-full py-5 font-bold"
            disabled={code1.length < 4 || code2.length < 4 || loading}
          >
            {loading ? 'Duke verifikuar...' : 'Hyr në Panel'}
          </Button>
        </div>
      </div>
    </div>
  );
}