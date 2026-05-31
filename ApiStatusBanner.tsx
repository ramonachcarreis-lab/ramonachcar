import { useEffect, useState } from 'react';
import { AlertTriangle, WifiOff } from 'lucide-react';
import { checkApiHealth } from '../services/apiHealth';
import { MSG } from '../utils/userFacingErrors';

const CHECK_MS = 45_000;

export default function ApiStatusBanner({ compact = false }: { compact?: boolean }) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const result = await checkApiHealth();
      if (cancelled) return;
      setOk(result.ok);
    };
    run();
    const timer = window.setInterval(run, CHECK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (ok === null || ok) return null;

  return (
    <div
      role="alert"
      className={
        compact
          ? 'rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-100 flex gap-2 items-start'
          : 'fixed top-0 left-0 right-0 z-[200] px-4 py-2.5 bg-amber-600 text-black text-sm font-bold flex items-start gap-2 shadow-lg'
      }
    >
      <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="flex items-center gap-1 min-w-0">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        {MSG.apiOfflineBanner}
      </p>
    </div>
  );
}
