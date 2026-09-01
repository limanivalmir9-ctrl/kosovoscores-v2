import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle } from 'lucide-react';

export default function FanChatVerify({ token, onDone }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    (async () => {
      const res = await base44.functions.invoke('fanChatAuth', { action: 'verify', token });
      setStatus(res.data?.ok ? 'success' : 'error');
    })();
  }, [token]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      {status === 'loading' && (
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
      )}
      {status === 'success' && (
        <>
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Email-i u konfirmua! ✅</h2>
          <p className="text-muted-foreground text-sm mb-2">Regjistrimi yt u pranua me sukses.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 max-w-xs">
            <p className="text-amber-800 text-sm font-medium">⏳ Llogaria jote është në pritje të <strong>aprovimit nga admini</strong>. Do të njoftohesh kur të aprovohet.</p>
          </div>
          <button onClick={onDone} className="bg-primary text-white font-bold rounded-xl px-6 py-3">Kthehu</button>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Gabim</h2>
          <p className="text-muted-foreground text-sm mb-6">Token-i është i pavlefshëm ose ka skaduar.</p>
          <button onClick={onDone} className="bg-primary text-white font-bold rounded-xl px-6 py-3">Kthehu</button>
        </>
      )}
    </div>
  );
}