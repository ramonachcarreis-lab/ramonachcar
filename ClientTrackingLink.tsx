import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { publicTrackingUrl } from '../utils/workOrder';
import type { AppEvent } from '../context/EventsContext';

type Props = {
  event: AppEvent;
  compact?: boolean;
};

export default function ClientTrackingLink({ event, compact }: Props) {
  const [copied, setCopied] = useState(false);
  const token = event.publicTrackingToken;
  if (!token) return null;

  const url = publicTrackingUrl(token);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copie o link para o cliente:', url);
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="text-xs font-bold text-sky-700 flex items-center gap-1"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado!' : 'Copiar link do cliente'}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-slate-600 flex items-center gap-1"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Abrir
        </a>
      </div>
    );
  }

  return (
    <div className="tone-info tone-box space-y-2">
      <p className="text-xs font-black uppercase">Link para o cliente acompanhar</p>
      <p className="text-[10px] break-all text-slate-600">{url}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="text-xs font-bold bg-sky-600 text-white px-3 py-2 rounded-lg flex items-center gap-1"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copiado!' : 'Copiar e enviar'}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold border px-3 py-2 rounded-lg flex items-center gap-1"
        >
          <ExternalLink className="w-4 h-4" /> Visualizar
        </a>
      </div>
    </div>
  );
}
