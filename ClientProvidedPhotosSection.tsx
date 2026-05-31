import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { CLIENT_STATE_PHOTOS } from '../utils/proposalDocumentCopy';

type Props = {
  urls: string[];
  variant?: 'screen' | 'print';
  maxPhotos?: number;
  columns?: 3 | 4;
};

function PhotoThumb({ src, alt, variant }: { src: string; alt: string; variant: 'screen' | 'print' }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div
        className={`flex items-center justify-center ${
          variant === 'screen'
            ? 'bg-[var(--bg-input)] border-[var(--border-subtle)]'
            : 'bg-slate-100 border-slate-200'
        } border rounded-lg aspect-[4/3]`}
      >
        <ImageIcon className="w-6 h-6 opacity-40" />
      </div>
    );
  }
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="block aspect-[4/3] rounded-lg overflow-hidden border border-[var(--border-subtle)] hover:ring-2 hover:ring-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
      title="Abrir foto em tamanho maior"
    >
      <img
        src={src}
        alt={alt}
        onError={() => setBroken(true)}
        className="w-full h-full object-cover"
      />
    </a>
  );
}

export default function ClientProvidedPhotosSection({
  urls,
  variant = 'screen',
  maxPhotos = 8,
  columns = 3,
}: Props) {
  const list = urls.slice(0, maxPhotos);
  if (!list.length) return null;

  const gridClass =
    columns === 4
      ? 'grid grid-cols-2 sm:grid-cols-4 gap-3'
      : 'grid grid-cols-2 sm:grid-cols-3 gap-3';

  return (
    <section className={`doc-section doc-selectable ${variant === 'print' ? 'mb-3' : ''}`}>
      <h3 className={variant === 'print' ? 'text-[10px] font-black uppercase text-primary-800 mb-2 bg-primary-50 px-2 py-1 rounded' : 'doc-section-title'}>
        {variant === 'print' ? CLIENT_STATE_PHOTOS.title : CLIENT_STATE_PHOTOS.titleShort}
      </h3>
      <p
        className={
          variant === 'print'
            ? 'text-[10px] text-slate-700 mb-3 leading-relaxed'
            : 'text-xs text-[var(--text-secondary)] mb-3 leading-relaxed max-w-prose'
        }
        style={{ wordSpacing: '0.05em' }}
      >
        {CLIENT_STATE_PHOTOS.description}
      </p>
      <div className={gridClass}>
        {list.map((url, idx) => (
          <PhotoThumb
            key={`${idx}-${url.slice(0, 24)}`}
            src={url}
            alt={`${CLIENT_STATE_PHOTOS.altPrefix} — foto ${idx + 1}`}
            variant={variant}
          />
        ))}
      </div>
    </section>
  );
}
