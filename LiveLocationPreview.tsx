type Props = {
  lat?: number | null;
  lng?: number | null;
  updatedAt?: string | null;
  className?: string;
  compact?: boolean;
  showMockPins?: boolean;
};

function formatAgo(updatedAt?: string | null): string {
  if (!updatedAt) return 'sem atualização';
  const diff = Math.max(0, Date.now() - new Date(updatedAt).getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'agora';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  return `${h} h atrás`;
}

export default function LiveLocationPreview({
  lat,
  lng,
  updatedAt,
  className,
  compact = false,
  showMockPins = true,
}: Props) {
  if (lat == null || lng == null) {
    return (
      <div className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 ${className || ''}`}>
        <p className="text-[11px] font-bold text-[var(--color-text-muted)]">
          Localização em tempo real indisponível no momento.
        </p>
      </div>
    );
  }

  const zoom = compact ? 15 : 16;
  const src = `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;

  return (
    <div className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2 ${className || ''}`}>
      <p className="text-[10px] font-black uppercase tracking-wide text-[var(--color-text-muted)] px-1 pb-1">
        Localização ao vivo do licenciado · {formatAgo(updatedAt)}
      </p>
      <div
        className={`relative overflow-hidden rounded-lg border border-[var(--color-border)] ${compact ? 'h-32' : 'h-44'}`}
      >
        <iframe title="Localização em tempo real" src={src} className="w-full h-full" loading="lazy" />
        {showMockPins && (
          <>
            <span className="absolute left-[18%] top-[62%] bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow">
              Licenciado
            </span>
            <span className="absolute left-[58%] top-[32%] bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow">
              Cliente
            </span>
            <span className="absolute left-[42%] top-[74%] bg-violet-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow">
              Sede
            </span>
          </>
        )}
      </div>
      {showMockPins && (
        <p className="text-[10px] text-[var(--color-text-muted)] px-1 pt-1">
          Pins fictícios para validação visual (Licenciado, Cliente e Sede).
        </p>
      )}
    </div>
  );
}
