import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import DigitalSignaturePanel from '../components/DigitalSignaturePanel';
import { PrintContractDocument } from '../components/print/PrintContractDocument';
import { generateBulletproofPDF } from '../utils/pdfGenerator';
import { buildPixDynamicPayment, type PixDynamicResult } from '../utils/pixDynamic';
import {
  fetchSignatureLinkPublic,
  submitRemoteSignature,
  type SignatureLinkPublic,
} from '../services/signatureApi';
import type { StoredSignature } from '../types/inventory';
import { formatEventDateLabel } from '../utils/signatureLink';
import { checkApiHealth } from '../services/apiHealth';
import PublicApiOfflineMessage from '../components/PublicApiOfflineMessage';

export default function PublicSignature() {
  const { token } = useParams<{ token: string }>();
  const contractRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<SignatureLinkPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [pdfPix, setPdfPix] = useState<PixDynamicResult | null>(null);
  const [apiDown, setApiDown] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Link inválido.');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const health = await checkApiHealth();
      if (cancelled) return;
      if (!health.ok) {
        setApiDown(true);
        setLoading(false);
        return;
      }
      const row = await fetchSignatureLinkPublic(token);
      if (cancelled) return;
      if (!row) {
        setError('Link inválido ou expirado. Peça um novo link ao comercial Estofado Pro.');
        setData(null);
      } else {
        setData(row);
        setDone(row.signed);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const dateLabel = useMemo(
    () => (data ? formatEventDateLabel(data.contractData.eventDate) : ''),
    [data]
  );

  useEffect(() => {
    if (!data?.contractData.pixConfig) {
      setPdfPix(null);
      return;
    }
    const total = Number(data.contractData.totalValue || 0);
    if (total <= 0) {
      setPdfPix(null);
      return;
    }
    let cancelled = false;
    buildPixDynamicPayment(data.contractData.pixConfig, total, {
      txid: data.contractData.pixTxid,
    })
      .then((r) => {
        if (!cancelled) setPdfPix(r);
      })
      .catch(() => {
        if (!cancelled) setPdfPix(null);
      });
    return () => {
      cancelled = true;
    };
  }, [data]);

  const downloadContract = async () => {
    if (!contractRef.current || !data) return;
    setBusy(true);
    try {
      await generateBulletproofPDF(
        contractRef.current,
        `Contrato_${data.clientName.replace(/\s+/g, '_')}`
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (sig: StoredSignature) => {
    if (!token) return;
    setBusy(true);
    const result = await submitRemoteSignature(token, sig);
    setBusy(false);
    if (!result.ok) {
      window.alert(result.error || 'Não foi possível registrar a assinatura.');
      return;
    }
    setDone(true);
    setData((prev) =>
      prev
        ? {
            ...prev,
            signed: true,
            clientSignature: sig,
            contractData: { ...prev.contractData, clientSignature: sig },
          }
        : prev
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-app)] p-6">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  if (apiDown) {
    return <PublicApiOfflineMessage title="Assinatura do contrato indisponível" />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-app)] p-6">
        <div className="app-panel max-w-md w-full text-center">
          <p className="text-[var(--color-text)] font-bold">{error || 'Contrato não encontrado.'}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-app)] p-4 flex justify-center pb-8">
        <div className="app-panel w-full max-w-md space-y-4 text-center border border-[var(--status-success)]">
          <CheckCircle2 className="w-14 h-14 text-[var(--status-success)] mx-auto" />
          <h1 className="text-xl font-bold text-[var(--color-text)]">Assinatura registrada!</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Obrigado, {data.clientName}. Sua assinatura no contrato Estofado Pro foi salva com sucesso.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={downloadContract}
            className="btn-secondary w-full py-3 flex items-center justify-center gap-2 text-sm"
          >
            <Download className="w-5 h-5" />
            Baixar contrato assinado (PDF)
          </button>
          <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none" aria-hidden>
            <PrintContractDocument ref={contractRef} data={data.contractData} pixPayload={pdfPix} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-app)] p-4 pb-10">
      <div className="max-w-lg mx-auto space-y-4">
        <header className="text-center pt-2">
          <p className="text-xs font-bold text-primary-700 uppercase">Estofado Pro</p>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Assinatura do contratante</h1>
          <p className="text-sm text-slate-600 mt-1">
            {data.clientName} · evento em {dateLabel}
            {data.contractData.eventTime ? ` às ${data.contractData.eventTime}` : ''}
          </p>
        </header>

        <section className="app-panel space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-700" />
            <p className="text-sm font-black text-slate-800">Resumo do contrato</p>
          </div>
          <div className="text-sm text-slate-700 space-y-1.5">
            <p>
              <span className="font-bold text-slate-500">Endereço:</span> {data.contractData.eventAddress || '—'}
            </p>
            <p>
              <span className="font-bold text-slate-500">Equipamentos:</span>{' '}
              {data.contractData.equipmentName || '—'}
            </p>
            <p>
              <span className="font-bold text-slate-500">Valor:</span> R${' '}
              {Number(data.contractData.totalValue || 0).toFixed(2).replace('.', ',')}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={downloadContract}
            className="w-full bg-white border-2 border-primary-200 text-primary-900 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 min-h-[48px]"
          >
            <Download className="w-5 h-5" />
            Baixar contrato para ler (PDF)
          </button>
          <p className="text-[10px] text-slate-500 text-center">
            Recomendamos baixar e ler antes de assinar abaixo.
          </p>
        </section>

        <section>
          <p className="text-xs font-black uppercase text-indigo-800 mb-2 px-1">Sua assinatura</p>
          <DigitalSignaturePanel
            title="Assinatura do contratante"
            signerRole="client"
            signerNameDefault={data.clientName}
            signerDocumentDefault={data.contractData.cpf}
            onSave={handleSave}
          />
          {busy && (
            <p className="text-xs text-center text-slate-500 mt-2 flex items-center justify-center gap-1">
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando…
            </p>
          )}
        </section>
      </div>

      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none" aria-hidden>
        <PrintContractDocument ref={contractRef} data={data.contractData} pixPayload={pdfPix} />
      </div>
    </div>
  );
}
