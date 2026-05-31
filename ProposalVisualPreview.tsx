import { useState } from 'react';
import { clsx } from 'clsx';
import { ImageIcon } from 'lucide-react';
import { isCatalogStudioAsset } from '../config/catalogAssets';
import type { ProposalLineItem } from '../types/inventory';
import type { PixConfig } from '../services/pixStorage';
import PixPaymentBlock from './PixPaymentBlock';
import ClientProvidedPhotosSection from './ClientProvidedPhotosSection';

function PreviewImage({ src }: { src: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <ImageIcon className="w-8 h-8 text-[var(--text-secondary)]" />;
  return (
    <img
      src={src}
      alt=""
      onError={() => setBroken(true)}
      className={clsx(
        'w-full h-full',
        isCatalogStudioAsset(src) ? 'object-contain bg-[var(--bg-canvas)]' : 'media-cover'
      )}
    />
  );
}

type Props = {
  clientName: string;
  eventDate: string;
  eventTime: string;
  eventAddress: string;
  lineItems: ProposalLineItem[];
  totalValue: number;
  pix?: PixConfig | null;
  pixTxid?: string;
  clientProvidedPhotoUrls?: string[];
  depositAmount?: number;
};

export default function ProposalVisualPreview({
  clientName,
  eventDate,
  eventTime,
  eventAddress,
  lineItems,
  totalValue,
  pix,
  pixTxid,
  clientProvidedPhotoUrls = [],
  depositAmount,
}: Props) {
  const dateLabel = eventDate
    ? new Date(eventDate + 'T12:00:00').toLocaleDateString('pt-BR')
    : '—';

  return (
    <section className="proposal-preview shadow-sm doc-selectable">
      <div className="proposal-preview__header">
        <p className="text-xs font-bold uppercase tracking-wide">Prévia da proposta</p>
        <p className="text-[10px] font-medium opacity-90">Documento claro para envio ao cliente</p>
      </div>
      <div className="proposal-preview__body space-y-5 doc-readable">
        <div className="doc-section space-y-0">
          <div className="doc-field-row">
            <span className="doc-field-label">Cliente</span>
            <span className="doc-field-value">{clientName}</span>
          </div>
          <div className="doc-field-row">
            <span className="doc-field-label">Data</span>
            <span className="doc-field-value">
              {dateLabel} · {eventTime || '—'}
            </span>
          </div>
          <div className="doc-field-row">
            <span className="doc-field-label">Local</span>
            <span className="doc-field-value">{eventAddress || '—'}</span>
          </div>
        </div>

        <div className="doc-section">
          <p className="doc-section-title">Itens do serviço</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {lineItems.map((row) => (
              <div
                key={`${row.equipmentId}-${row.name}`}
                className="rounded-xl border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-surface-elevated)]"
              >
                <div className="aspect-[4/3] bg-[var(--bg-input)] flex items-center justify-center">
                  {row.photoUrl ? (
                    <PreviewImage src={row.photoUrl} />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-[var(--text-secondary)]" />
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-xs font-bold text-[var(--text-primary)] leading-snug">{row.name}</p>
                  <p className="text-xs font-bold text-[var(--status-success)] tabular-nums">
                    R$ {(row.unitPrice * row.quantity).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <ClientProvidedPhotosSection urls={clientProvidedPhotoUrls} variant="screen" maxPhotos={6} />

        <div className="proposal-total-box">
          <p className="proposal-total-label">Investimento total</p>
          <p className="proposal-total-value">R$ {totalValue.toFixed(2).replace('.', ',')}</p>
          {depositAmount != null && depositAmount > 0 && (
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              Sinal sugerido: R$ {depositAmount.toFixed(2).replace('.', ',')} (abatido do total ao
              confirmar)
            </p>
          )}
        </div>

        {pix && totalValue > 0 && (
          <PixPaymentBlock pix={pix} amount={totalValue} txid={pixTxid} compact variant="screen" />
        )}
      </div>
    </section>
  );
}
