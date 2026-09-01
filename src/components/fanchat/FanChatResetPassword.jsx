import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FanChatResetPassword({ token, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!password || password.length < 6) { setError('Fjalëkalimi duhet të ketë të paktën 6 karaktere'); return; }
    if (password !== confirm) { setError('Fjalëkalimet nuk përputhen'); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('fanChatAuth', { action: 'reset_password', token, new_password: password });
      if (res.data?.ok) {
        setSuccess(true);
        setTimeout(() => onDone(), 2500);
      } else {
        setError(res.data?.error || 'Token i pavlefshëm. Provo sërish.');
      }
    } catch {
      setError('Gabim i lidhjes. Provo përsëri.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl border border-border/50 overflow-hidden">
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-7 text-center">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">🔑</div>
            <h2 className="text-xl font-bold text-white">Rivendos Fjalëkalimin</h2>
            <p className="text-blue-200 text-sm mt-1">Shkruaj fjalëkalimin e ri</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            {success ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <p className="text-sm font-semibold text-green-700">Fjalëkalimi u ndryshua me sukses!</p>
                <p className="text-xs text-muted-foreground">Duke të ridrejtuar...</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Fjalëkalimi i ri</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 6 karaktere"
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Konfirmo fjalëkalimin</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="Shkruaj sërish"
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2.5 flex items-start gap-2">
                    <span>⚠️</span><span>{error}</span>
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🔑 Ndrysho Fjalëkalimin'}
                </button>
                <button onClick={onDone} className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mt-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Kthehu tek chat
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}