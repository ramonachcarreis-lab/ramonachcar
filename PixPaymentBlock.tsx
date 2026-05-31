import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { PixConfig } from '../services/pixStorage';
import { buildPixDynamicPayment } from '../utils/pixDynamic';
import { COPY } from '../utils/copyPtBr';
import { copyToClipboard } from '../utils/copyToClipboard';

const RECEIPT_HINT = COPY.pixComprovante;

type Props = {
  pix: PixConfig;
  amount: number;
  txid?: string;
  compact?: boolean;
  /** screen = prévia CRM (dark); print = PDF / documento branco */
  variant?: 'screen' | 'print';
};

export default function PixPaymentBlock({
  pix,
  amount,
  txid,
  compact,
  variant = 'screen',
}: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiaECola, setCopiaECola] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await buildPixDynamicPayment(pix, amount, { txid });
        if (!cancelled) {
          setQrDataUrl(result.qrDataUrl);
          setCopiaECola(result.copiaECola);
          setError('');
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao gerar PIX');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pix.key, pix.holderName, amount, txid]);

  const copy = async () => {
    if (!copiaECola) return;
    const ok = await copyToClipboard(copiaECola);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  if (error) {
    return (
      <p className="text-xs font-medium text-[var(--status-danger)] doc-selectable">
        {error}. Cadastre a chave PIX em Configurações.
      </p>
    );
  }

  if (!qrDataUrl) {
    return <p className="text-xs text-[var(--text-secondary)]">Gerando QR PIX…</p>;
  }

  const isPrint = variant === 'print';
  const rootClass = isPrint
    ? `pix-block--print doc-selectable ${compact ? 'p-3' : 'p-4'}`
    : `pix-block--screen doc-selectable ${compact ? '' : ''}`;

  const amountLabel = `R$ ${amount.toFixed(2).replace('.', ',')}`;

  return (
    <div className={rootClass}>
      <p className="pix-block__title">{COPY.pagamentoPix}</p>
      <p className="pix-block__holder">{pix.holderName}</p>
      <p className="pix-block__amount">{amountLabel}</p>
      <p className="pix-block__hint">{RECEIPT_HINT}</p>

      <div className={`flex flex-col gap-4 ${isPrint ? 'sm:flex-row sm:items-start' : 'lg:flex-row lg:items-start'}`}>
        <img
          src={qrDataUrl}
          alt="QR Code PIX"
          className={`rounded-lg bg-white shrink-0 border ${
            isPrint ? 'w-36 h-36 p-2 border-emerald-100' : 'w-40 h-40 p-2 border-[var(--border-subtle)]'
          }`}
        />
        <div className="flex-1 min-w-0 space-y-2">
          <p className={`text-xs leading-relaxed ${isPrint ? 'text-slate-600' : 'text-[var(--text-secondary)]'}`}>
            {COPY.escanearQr}
          </p>
          <p className="pix-block__copia-label">{COPY.copiaCola}</p>
          <textarea
            readOnly
            value={copiaECola}
            rows={4}
            aria-label="Código PIX copia e cola"
            className="pix-block__copia-field doc-selectable"
            onFocus={(e) => e.target.select()}
          />
          <button type="button" onClick={copy} className="pix-block__copy-btn">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar código PIX'}
          </button>
        </div>
      </div>
    </div>
  );
}
