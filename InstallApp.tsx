import { Smartphone, Download, ExternalLink } from 'lucide-react';
import { appPublicUrl } from '../utils/apiBase';

/** Instalação PWA / link para gerar APK (PWABuilder). */
export default function InstallApp() {
  const origin = appPublicUrl();
  const pwaBuilderUrl = origin
    ? `https://www.pwabuilder.com/reportcard?url=${encodeURIComponent(origin)}`
    : 'https://www.pwabuilder.com/';

  return (
    <div className="min-h-screen bg-[var(--color-bg-app)] text-[var(--color-text)] p-6 flex items-center justify-center">
      <div className="app-panel max-w-md w-full space-y-4">
        <h1 className="text-2xl font-black text-[var(--accent-primary)] flex items-center gap-2">
          <Smartphone className="w-7 h-7" />
          App no celular
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          O Estofado Pro é um app web (PWA). Você pode instalar na tela inicial sem loja de aplicativos.
        </p>

        <div className="tone-info tone-box space-y-2 text-sm">
          <p className="font-bold">Android / iPhone</p>
          <ol className="list-decimal list-inside space-y-1 text-[var(--color-text-muted)]">
            <li>Abra o site no Chrome ou Safari</li>
            <li>Menu → &quot;Instalar app&quot; ou &quot;Adicionar à Tela de Início&quot;</li>
            <li>Use como aplicativo nativo</li>
          </ol>
        </div>

        <div className="tone-box border border-[var(--accent-primary)]/40 space-y-2">
          <p className="text-xs font-black uppercase text-[var(--accent-primary)] flex items-center gap-2">
            <Download className="w-4 h-4" />
            Gerar arquivo APK (Android)
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Gere um APK para instalar no Android e distribuir por link ou WhatsApp (sem Google Play).
          </p>
          <a
            href={pwaBuilderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
          >
            Abrir PWABuilder (gerar APK)
            <ExternalLink className="w-4 h-4" />
          </a>
          {origin && (
            <p className="text-[10px] font-mono text-[var(--color-text-muted)] break-all">{origin}</p>
          )}
        </div>

        <a href="/login" className="block text-center text-sm font-bold text-[var(--accent-primary)] underline">
          Voltar ao login
        </a>
      </div>
    </div>
  );
}
