import { MapPin, MessageCircle, ExternalLink, KeyRound } from 'lucide-react';

type Props = {
  showMaps?: boolean;
  showWhatsApp?: boolean;
  compact?: boolean;
};

export default function ApiSetupGuide({
  showMaps = true,
  showWhatsApp = false,
  compact = false,
}: Props) {
  const mapsKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const mapsOk = mapsKey.length > 10;

  return (
    <div className={`space-y-3 ${compact ? '' : 'app-panel'}`}>
      {!compact && (
        <p className="text-sm font-black text-[var(--color-text)] flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-primary-400" />
          Configurar APIs externas
        </p>
      )}

      {showMaps && !mapsOk && (
        <div className="tone-warning tone-box space-y-2">
          <p className="text-xs font-black uppercase tone-title flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Google Maps — localização e rotas
          </p>
          <p className="text-[11px] leading-relaxed opacity-95">
            Opcional: melhora rotas e busca. Sem chave, o servidor usa <strong>OpenStreetMap grátis</strong>{' '}
            (nunca trava). Cole no <strong>.env</strong> se quiser Google:
          </p>
          <code className="block text-[10px] bg-black/30 rounded-lg px-2 py-1.5 font-mono text-amber-200">
            VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
          </code>
          <p className="text-[10px] opacity-80">Depois reinicie: npm run dev</p>
          <a
            href="https://console.cloud.google.com/apis/library"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-400 underline"
          >
            Abrir Google Cloud Console
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {showMaps && mapsOk && (
        <p className="text-xs font-bold text-emerald-400 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Google Maps configurado
        </p>
      )}

      {showWhatsApp && (
        <div
          className={`tone-box border border-[#25D366]/40 bg-[#0a1f14] space-y-2 ${
            compact ? 'p-4 rounded-2xl' : ''
          }`}
        >
          <p className="text-xs font-black text-[#6ee7b7] uppercase flex items-center gap-2">
            <MessageCircle className="w-4 h-4 shrink-0" />
            WhatsApp automático (opcional)
          </p>
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-prose">
            Envia resumo de alertas para o seu número via API oficial da Meta (WhatsApp Business). Não
            é o mesmo que o botão “Falar com cliente”.
          </p>
          <p className="text-xs font-mono text-[var(--color-text-muted)] break-all">
            .env → WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID
          </p>
          <a
            href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6ee7b7] underline"
          >
            Guia Meta WhatsApp Cloud API
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

    </div>
  );
}
