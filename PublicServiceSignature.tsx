import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, PenLine } from 'lucide-react';
import DigitalSignaturePanel from '../components/DigitalSignaturePanel';
import type { StoredSignature } from '../types/inventory';
import { apiUrl } from '../utils/apiBase';

type PublicPayload = {
  token: string;
  stage?: 'pre' | 'post';
  clientName: string;
  workOrderNumber?: string;
  address?: string;
  signed: boolean;
  clientSignature?: StoredSignature | null;
};

export default function PublicServiceSignature() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicPayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/field/public/service-sign/${encodeURIComponent(token)}`));
      if (!res.ok) {
        setData(null);
        return;
      }
      const row = (await res.json()) as PublicPayload;
      setData(row);
      if (row.signed) setDone(true);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (sig: StoredSignature) => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/api/field/public/service-sign/${encodeURIComponent(token)}/sign`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: sig }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert((json as { error?: string }).error || 'Não foi possível registrar a assinatura.');
        return;
      }
      setDone(true);
      setData((prev) =>
        prev
          ? {
              ...prev,
              signed: true,
              clientSignature: sig,
            }
          : prev
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg-app)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg-app)]">
        <p className="text-[var(--color-text-muted)] font-bold text-center">Link inválido ou expirado.</p>
      </div>
    );
  }

  const isPre = data.stage === 'pre';

  if (done || data.signed) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-app)] p-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-4 app-panel border border-[var(--status-success)]">
          <CheckCircle2 className="w-14 h-14 text-[var(--status-success)] mx-auto" />
          <h1 className="text-xl font-bold text-[var(--color-text)]">Assinatura registrada!</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Obrigado, {data.clientName}. Sua assinatura de {isPre ? 'vistoria inicial' : 'confirmação do serviço'} foi salva com sucesso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-app)] p-4 pb-10">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center pt-4">
          <PenLine className="w-10 h-10 text-indigo-600 mx-auto mb-2" />
          <h1 className="text-2xl font-black text-slate-900">
            {isPre ? 'Vistoria inicial' : 'Confirmação do serviço'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">Olá, {data.clientName}</p>
          {data.workOrderNumber && (
            <p className="text-xs font-mono text-primary-700 mt-1">{data.workOrderNumber}</p>
          )}
          {data.address && <p className="text-xs text-slate-500 mt-2">{data.address}</p>}
        </div>

        <div className="app-panel">
          <p className="text-xs text-slate-600 mb-3">
            {isPre
              ? 'Antes de iniciar, confirme o estado atual do estofado e autorize o início do serviço.'
              : 'A higienização foi concluída. Assine abaixo para confirmar o recebimento do serviço.'}
          </p>
          {isPre && (
            <p className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 rounded-lg px-3 py-2 mb-3">
              Termo: ao assinar como cliente ausente, você declara que verificou por imagens e vídeos o
              estado de conservação e os apontamentos da vistoria prévia antes da execução do serviço.
            </p>
          )}
          {saving && (
            <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Salvando…
            </p>
          )}
          <DigitalSignaturePanel
            title="Cliente"
            signerRole="client"
            signerNameDefault={data.clientName}
            readOnly={false}
            onSave={handleSave}
          />
        </div>
      </div>
    </div>
  );
}
