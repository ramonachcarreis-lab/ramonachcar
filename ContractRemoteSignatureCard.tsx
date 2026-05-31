import { useState } from 'react';
import { Copy, Download, Link2, MessageCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { copyToClipboard } from '../utils/copyToClipboard';
import { openWhatsApp } from '../utils/openWhatsApp';
import { WHATSAPP_LABELS } from '../utils/whatsappContact';
import {
  buildSignatureUrl,
  buildSignatureWhatsAppMessage,
  formatEventDateLabel,
} from '../utils/signatureLink';

type Props = {
  clientName: string;
  clientPhone: string;
  eventDateIso: string;
  token: string;
  signed: boolean;
  busy?: boolean;
  onDownloadPdf: () => void;
  onOpenSignaturePage?: () => void;
  onSentWhatsApp?: () => void;
  onFeedback?: (msg: string) => void;
};

export default function ContractRemoteSignatureCard({
  clientName,
  clientPhone,
  eventDateIso,
  token,
  signed,
  busy,
  onDownloadPdf,
  onOpenSignaturePage,
  onSentWhatsApp,
  onFeedback,
}: Props) {
  const [copied, setCopied] = useState(false);
  const url = buildSignatureUrl(token);
  const dateLabel = formatEventDateLabel(eventDateIso);

  const copyLink = async () => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const sendWhatsApp = async () => {
    const msg = buildSignatureWhatsAppMessage(clientName, dateLabel, url);
    const result = openWhatsApp(clientPhone, msg);
    if (!result.ok) {
      const text = result.error || 'Não foi possível abrir o WhatsApp.';
      onFeedback?.(text);
      window.alert(`${text}\n\nO link foi copiado para você colar no WhatsApp.`);
      await copyToClipboard(url);
      return;
    }
    onFeedback?.('WhatsApp aberto — toque em Enviar na conversa com o cliente.');
    onSentWhatsApp?.();
  };

  return (
    <div className="border-2 border-violet-200 bg-violet-50/50 rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Link2 className="w-5 h-5 text-violet-700 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-black uppercase text-violet-900">Assinatura digital do contratante</p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            O contratante abre o link, lê o PDF e assina com o dedo — só digital, sem presencial.
          </p>
        </div>
      </div>

      {signed ? (
        <p className="text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Cliente já assinou pelo link remoto.
        </p>
      ) : (
        <p className="text-[10px] font-bold text-amber-800 bg-amber-50 rounded-lg px-2 py-1.5">
          Aguardando assinatura do cliente pelo link.
        </p>
      )}

      <p className="text-[10px] text-slate-600 break-all bg-white border border-violet-100 rounded-lg p-2 font-mono">
        {url}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary py-3 text-xs flex items-center justify-center gap-1.5 min-h-[44px] sm:col-span-2 no-underline"
          onClick={(e) => {
            if (busy) {
              e.preventDefault();
              return;
            }
            onOpenSignaturePage?.();
          }}
        >
          <ExternalLink className="w-4 h-4" />
          Abrir página de assinatura do contratante
        </a>
        <button
          type="button"
          disabled={busy}
          onClick={onDownloadPdf}
          className="btn-secondary py-3 text-xs flex items-center justify-center gap-1.5 min-h-[44px]"
        >
          <Download className="w-4 h-4" />
          Baixar contrato
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={copyLink}
          className="btn-secondary py-3 text-xs flex items-center justify-center gap-1.5 min-h-[44px]"
        >
          <Copy className="w-4 h-4" />
          {copied ? 'Copiado!' : 'Copiar link'}
        </button>
        <button
          type="button"
          disabled={busy || !clientPhone.trim()}
          onClick={sendWhatsApp}
          className="btn-success py-3 text-xs flex items-center justify-center gap-1.5 min-h-[44px] sm:col-span-2"
        >
          <MessageCircle className="w-4 h-4" />
          {WHATSAPP_LABELS.signature}
        </button>
      </div>
    </div>
  );
}
