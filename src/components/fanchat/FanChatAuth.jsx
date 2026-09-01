import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Eye, EyeOff, UserPlus, LogIn, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const AVATAR_EMOJIS = ['⚽','🏆','🦁','🔥','⚡','🎯','🦅','💪','🌟','🎮','👑','🎪'];

export default function FanChatAuth({ mode, onSuccess, onSwitch, onBack }) {
  const [form, setForm] = useState({ username: '', display_name: '', email: '', password: '', confirmPassword: '', avatar_emoji: '⚽' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const isRegister = mode === 'register';

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (isRegister) {
      if (!form.username || !form.display_name || !form.email || !form.password) { setError('Plotëso të gjitha fushat'); return; }
      if (form.password !== form.confirmPassword) { setError('Fjalëkalimet nuk përputhen'); return; }
      if (form.password.length < 6) { setError('Fjalëkalimi duhet të ketë të paktën 6 karaktere'); return; }
      if (!/^[a-zA-Z0-9_]+$/.test(form.username)) { setError('Username mund të ketë vetëm shkronja, numra dhe _'); return; }
    } else {
      if (!form.username || !form.password) { setError('Plotëso të gjitha fushat'); return; }
    }

    setLoading(true);
    try {
      const payload = isRegister
        ? { action: 'register', ...form }
        : { action: 'login', username: form.username, password: form.password };

      const res = await base44.functions.invoke('fanChatAuth', payload);

      if (res.data?.ok) {
        if (isRegister) {
          setSuccess(res.data.message || 'U regjistrove! Kontrollo emailin për konfirmim. Pas konfirmimit, prit aprovimin nga admini.');
        } else {
          onSuccess(res.data.user);
        }
      } else {
        setError(res.data?.error || 'Gabim i panjohur. Provo përsëri.');
      }
    } catch (err) {
      setError('Gabim i lidhjes. Kontrollo internetin dhe provo përsëri.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) { setError('Shkruaj email-in tënd'); return; }
    setLoading(true); setError('');
    try {
      await base44.functions.invoke('fanChatAuth', { action: 'forgot_password', email: forgotEmail });
      setSuccess('Nëse email-i ekziston, do të marrësh një link për rivendosje fjalëkalimi.');
    } catch {
      setError('Gabim i lidhjes. Provo përsëri.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password view
  if (forgotMode) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <button onClick={() => { setForgotMode(false); setError(''); setSuccess(''); }} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5 hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Kthehu tek hyrja
          </button>
          <div className="bg-white rounded-2xl shadow-xl border border-border/50 overflow-hidden">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-800 px-6 py-7 text-center">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">🔑</div>
              <h2 className="text-xl font-bold text-white">Harrove fjalëkalimin?</h2>
              <p className="text-blue-200 text-sm mt-1">Do të dërgojmë link për rivendosje</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Field label="Email-i i llogarisë tënde">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
                  placeholder="email@shembull.com"
                  className="input-base"
                />
              </Field>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2.5">⚠️ {error}</div>}
              {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-3 py-2.5 flex items-start gap-2"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />{success}</div>}
              {!success && (
                <button onClick={handleForgotPassword} disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 transition-all shadow-md">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '📧 Dërgo Link-un'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
        <style>{`.input-base{width:100%;border:1px solid hsl(var(--border));border-radius:0.75rem;padding:0.625rem 0.875rem;font-size:0.875rem;background:hsl(var(--background));outline:none;transition:box-shadow 0.15s,border-color 0.15s;}.input-base:focus{border-color:hsl(var(--primary));box-shadow:0 0 0 3px hsl(var(--primary)/0.15);}`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Back */}
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5 hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Kthehu tek chat
        </button>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-border/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-7 text-center">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
              {isRegister ? '👤' : '⚽'}
            </div>
            <h2 className="text-xl font-bold text-white">
              {isRegister ? 'Regjistrohu' : 'Mirë se vjen!'}
            </h2>
            <p className="text-blue-200 text-sm mt-1">
              {isRegister ? 'Bashkohu me komunitetin e fanave' : 'Hyr në llogarinë tënde'}
            </p>
          </div>

          <div className="px-6 py-5">
            {/* Avatar picker - register only */}
            {isRegister && (
              <div className="mb-4">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Avatari yt</label>
                <div className="flex flex-wrap gap-1.5">
                  {AVATAR_EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, avatar_emoji: em }))}
                      className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${
                        form.avatar_emoji === em
                          ? 'bg-blue-600 shadow-md ring-2 ring-blue-400 scale-110'
                          : 'bg-muted hover:bg-muted/70'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {isRegister && (
                <Field label="Emri i plotë">
                  <input
                    value={form.display_name}
                    onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                    placeholder="Si do të shfaqesh në chat"
                    className="input-base"
                  />
                </Field>
              )}

              <Field label="Username">
                <input
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  placeholder={isRegister ? 'vetëm shkronja, numra, _' : 'Username-i yt'}
                  autoComplete="username"
                  className="input-base"
                />
              </Field>

              {isRegister && (
                <Field label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@shembull.com"
                    autoComplete="email"
                    className="input-base"
                  />
                </Field>
              )}

              <Field label="Fjalëkalimi">
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min. 6 karaktere"
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    onKeyDown={e => e.key === 'Enter' && !isRegister && handleSubmit()}
                    className="input-base pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>

              {isRegister && (
                <Field label="Konfirmo fjalëkalimin">
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Shkruaj sërish"
                    autoComplete="new-password"
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    className="input-base"
                  />
                </Field>
              )}
            </div>

            {/* Error / Success */}
            {error && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2.5 flex items-start gap-2">
                <span className="text-base shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mt-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-3 py-2.5 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
                <span>{success}</span>
              </div>
            )}

            {/* Submit */}
            {!success && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md"
              >
                {loading
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : isRegister
                    ? <><UserPlus className="w-4 h-4" /> Regjistrohu</>
                    : <><LogIn className="w-4 h-4" /> Hyr</>
                }
              </button>
            )}

            {/* Switch + Forgot */}
            <div className="mt-4 text-center border-t border-border/50 pt-4 space-y-2">
              <button
                type="button"
                onClick={() => { setError(''); setSuccess(''); onSwitch(isRegister ? 'login' : 'register'); }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
              >
                {isRegister ? 'Ke tashmë llogari? ' : 'Nuk ke llogari? '}
                <span className="font-semibold text-primary">{isRegister ? 'Hyr →' : 'Regjistrohu →'}</span>
              </button>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => { setError(''); setSuccess(''); setForgotMode(true); }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Harrove fjalëkalimin?
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Inline style for inputs */}
      <style>{`
        .input-base {
          width: 100%;
          border: 1px solid hsl(var(--border));
          border-radius: 0.75rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          background: hsl(var(--background));
          outline: none;
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        .input-base:focus {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}