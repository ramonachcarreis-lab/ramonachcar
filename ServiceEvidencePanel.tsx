import { useCallback, useEffect, useState } from 'react';
import { Link2, Loader2, MessageCircle, Copy, CheckCircle2, UserX } from 'lucide-react';
import type { AppEvent } from '../context/EventsContext';
import type { ServiceReportEvidence } from '../types/serviceReport';
import { PHOTOS_PER_PHASE, VIDEOS_PER_PHASE } from '../types/serviceReport';
import type { StoredSignature } from '../types/inventory';
import DigitalSignaturePanel from './DigitalSignaturePanel';
import CameraPhotoInput from './CameraPhotoInput';
import CameraVideoInput from './CameraVideoInput';
import { compressImageFile } from '../utils/imageCompress';
import { fieldOpsApi } from '../services/fieldOpsApi';
import { useToast } from '../context/ToastContext';
import { isPreServiceInspectionReady, syncChecklistWithReport } from '../utils/serviceReport';
import { normalizeChecklist } from '../utils/serviceChecklist';
import {
  allItemBeforeMediaComplete,
  buildServiceReportWithItems,
  ensureItemPhotos,
  patchItemPhotoUrl,
  patchItemVideoUrl,
} from '../utils/serviceItemPhotos';
import {
  buildServiceSignatureUrl,
  buildServiceSignatureWhatsAppMessage,
} from '../utils/serviceSignatureLink';
import { copyToClipboard } from '../utils/copyToClipboard';
import { openWhatsApp } from '../utils/openWhatsApp';
import { fileToDataUrl } from '../utils/mediaDataUrl';

type Props = {
  event: AppEvent;
  canEdit: boolean;
  /** Comercial/admin: vê fotos, vídeos e status — sem câmera nem assinatura. */
  viewOnly?: boolean;
  onUpdate: (patch: {
    serviceReport?: ServiceReportEvidence;
    serviceChecklist?: AppEvent['serviceChecklist'];
  }) => void;
};

type SignatureStage = 'pre' | 'post';
type BusyKey = string | 'sign-pre' | 'sign-post' | 'remote-pre' | 'remote-post' | null;

export default function ServiceEvidencePanel({ event, canEdit, viewOnly, onUpdate }: Props) {
  const toast = useToast();
  const hideCapture = viewOnly || !canEdit;
  const showSignatures = !viewOnly;
  const [busy, setBusy] = useState<BusyKey>(null);
  const [remoteMode, setRemoteMode] = useState<SignatureStage | null>(null);
  const [remoteToken, setRemoteToken] = useState<string | null>(
    event.serviceReport?.remoteSignatureToken || null
  );
  const [preRemoteToken, setPreRemoteToken] = useState<string | null>(
    event.serviceReport?.preServiceRemoteSignatureToken || null
  );
  const [copied, setCopied] = useState(false);

  const report = event.serviceReport || {};
  const itemPhotos = ensureItemPhotos(event, report);
  const signedPost = Boolean(report.clientSignature?.imageDataUrl);
  const signedPre = Boolean(report.preServiceSignature?.imageDataUrl);
  const preReady = isPreServiceInspectionReady(report, event).ok;
  const beforeMediaOk = allItemBeforeMediaComplete(event, report);

  useEffect(() => {
    setRemoteToken(event.serviceReport?.remoteSignatureToken || null);
  }, [event.serviceReport?.remoteSignatureToken]);

  useEffect(() => {
    setPreRemoteToken(event.serviceReport?.preServiceRemoteSignatureToken || null);
  }, [event.serviceReport?.preServiceRemoteSignatureToken]);

  useEffect(() => {
    if (!remoteToken || signedPost || !canEdit) return;
    let cancelled = false;
    const poll = async () => {
      const row = await fieldOpsApi.fetchServiceSignaturePublic(remoteToken);
      if (cancelled || !row?.signed || !row.clientSignature?.imageDataUrl) return;
      const next: ServiceReportEvidence = {
        ...(event.serviceReport || {}),
        clientSignature: row.clientSignature,
        updatedAt: new Date().toISOString(),
      };
      const checklist = syncChecklistWithReport(
        normalizeChecklist(event.serviceChecklist),
        next,
        event
      );
      onUpdate({ serviceReport: next, serviceChecklist: checklist });
      setRemoteMode(null);
    };
    poll();
    const timer = window.setInterval(poll, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [remoteToken, signedPost, canEdit, event.id, event.serviceReport, event.serviceChecklist, event, onUpdate]);

  useEffect(() => {
    if (!preRemoteToken || signedPre || !canEdit) return;
    let cancelled = false;
    const poll = async () => {
      const row = await fieldOpsApi.fetchServiceSignaturePublic(preRemoteToken);
      if (cancelled || !row?.signed || !row.clientSignature?.imageDataUrl) return;
      const next: ServiceReportEvidence = {
        ...(event.serviceReport || {}),
        preServiceSignature: row.clientSignature,
        updatedAt: new Date().toISOString(),
      };
      onUpdate({ serviceReport: next });
      setRemoteMode(null);
    };
    poll();
    const timer = window.setInterval(poll, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [preRemoteToken, signedPre, canEdit, event.id, event.serviceReport, onUpdate]);

  const applyReport = useCallback(
    async (next: ServiceReportEvidence) => {
      const checklist = syncChecklistWithReport(
        normalizeChecklist(event.serviceChecklist),
        next,
        event
      );
      try {
        await fieldOpsApi.patchServiceReport(event.id, next);
        await fieldOpsApi.patchChecklist(event.id, checklist);
      } catch {
        /* mantém local se API falhar */
      }
      onUpdate({ serviceReport: next, serviceChecklist: checklist });
    },
    [event, onUpdate]
  );

  const uploadItemPhoto = async (
    itemKey: string,
    phase: 'before' | 'after',
    slotIndex: number,
    file: File
  ) => {
    const busyKey = `${itemKey}-${phase}-${slotIndex}`;
    setBusy(busyKey);
    try {
      const dataUrl = await compressImageFile(file);
      const items = patchItemPhotoUrl(itemPhotos, itemKey, phase, slotIndex, dataUrl);
      const next = buildServiceReportWithItems(event, report, items);
      await applyReport(next);
    } catch {
      toast.error('Não foi possível processar a imagem. Tente novamente com a câmera do celular.');
    } finally {
      setBusy(null);
    }
  };

  const uploadItemVideo = async (
    itemKey: string,
    phase: 'before' | 'after',
    slotIndex: number,
    file: File
  ) => {
    const busyKey = `${itemKey}-${phase}-video-${slotIndex}`;
    setBusy(busyKey);
    try {
      const dataUrl = await fileToDataUrl(file);
      const items = patchItemVideoUrl(itemPhotos, itemKey, phase, slotIndex, dataUrl);
      const next = buildServiceReportWithItems(event, report, items);
      await applyReport(next);
    } catch {
      toast.error('Não foi possível processar o vídeo. Tente novamente com até 30 segundos.');
    } finally {
      setBusy(null);
    }
  };

  const saveSignature = async (sig: StoredSignature, stage: SignatureStage) => {
    setBusy(stage === 'pre' ? 'sign-pre' : 'sign-post');
    try {
      let next: ServiceReportEvidence = { ...report };
      if (stage === 'post') {
        try {
          next = await fieldOpsApi.saveServiceSignature(event.id, sig);
        } catch {
          next = {
            ...report,
            clientSignature: sig,
            updatedAt: new Date().toISOString(),
          };
        }
      } else {
        next = {
          ...report,
          preServiceSignature: sig,
          updatedAt: new Date().toISOString(),
        };
      }
      if (stage === 'post') {
        const checklist = syncChecklistWithReport(
          normalizeChecklist(event.serviceChecklist),
          next,
          event
        );
        try {
          await fieldOpsApi.patchChecklist(event.id, checklist);
        } catch {
          /* */
        }
        onUpdate({ serviceReport: next, serviceChecklist: checklist });
      } else {
        await fieldOpsApi.patchServiceReport(event.id, next).catch(() => {});
        onUpdate({ serviceReport: next });
      }
      setRemoteMode(null);
    } finally {
      setBusy(null);
    }
  };

  const ensureRemoteLink = async (stage: SignatureStage): Promise<string | null> => {
    setBusy(stage === 'pre' ? 'remote-pre' : 'remote-post');
    try {
      const row = await fieldOpsApi.createServiceSignatureLink(event.id, stage);
      if (!row?.token) {
        toast.error('Não foi possível gerar o link. Verifique a conexão.');
        return null;
      }
      if (stage === 'pre') setPreRemoteToken(row.token);
      else setRemoteToken(row.token);
      const next: ServiceReportEvidence =
        stage === 'pre'
          ? {
              ...report,
              preServiceRemoteSignatureToken: row.token,
              preServiceRemoteSignatureRequestedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : {
              ...report,
              remoteSignatureToken: row.token,
              remoteSignatureRequestedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
      onUpdate({ serviceReport: next });
      return buildServiceSignatureUrl(row.token);
    } catch {
      toast.error('Servidor indisponível. Tente novamente.');
      return null;
    } finally {
      setBusy(null);
    }
  };

  const sendRemoteWhatsApp = async (stage: SignatureStage) => {
    const token = stage === 'pre' ? preRemoteToken : remoteToken;
    const url = token
      ? buildServiceSignatureUrl(token)
      : await ensureRemoteLink(stage);
    if (!url) return;
    const kindLabel = stage === 'pre' ? 'vistoria inicial' : 'conclusão do serviço';
    const msg = buildServiceSignatureWhatsAppMessage(
      event.client,
      `${event.workOrderNumber || `OS #${event.id}`} · ${kindLabel}`,
      url,
      stage
    );
    const result = openWhatsApp(event.phone, msg);
    if (!result.ok) {
      await copyToClipboard(url);
      toast.error(`${result.error || 'WhatsApp indisponível.'}\n\nLink copiado para colar na conversa.`);
    }
  };

  const copyRemoteLink = async (stage: SignatureStage) => {
    const token = stage === 'pre' ? preRemoteToken : remoteToken;
    const url = token ? buildServiceSignatureUrl(token) : await ensureRemoteLink(stage);
    if (!url) return;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-black text-slate-800 uppercase">Registro do serviço</p>
      <p className="text-[10px] text-slate-500 -mt-2">
        {viewOnly
          ? 'Acompanhamento em tempo real — registro feito pelo licenciado no local.'
          : `${PHOTOS_PER_PHASE} foto + ${VIDEOS_PER_PHASE} vídeo antes e depois por item.`}
      </p>
      {!viewOnly && (
        <div className="rounded-xl border-2 border-indigo-300 bg-indigo-100 p-3 text-[10px] text-indigo-950">
          <p className="font-black uppercase mb-1">Dicas de captação (foto/vídeo bacana)</p>
          <p>
            Foto: enquadre a peça inteira, use luz frontal e foco nítido. Vídeo: 10-20s, movimento
            lento, mostre manchas/detalhes e distância média (sem tremor).
          </p>
        </div>
      )}

      <div className="space-y-4">
        {itemPhotos.map((row) => (
          <div key={row.itemKey} className="rounded-xl border border-slate-200 p-3 space-y-3 bg-slate-50/50">
            <p className="text-xs font-black text-slate-800">{row.itemName}</p>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Antes *</p>
              <div className="grid grid-cols-2 gap-2">
                {row.beforeUrls.map((url, slot) => (
                  <CameraPhotoInput
                    key={`b-${slot}`}
                    label={`Foto ${slot + 1}`}
                    url={url || undefined}
                    disabled={!canEdit}
                    hideCapture={hideCapture}
                    busy={busy === `${row.itemKey}-before-${slot}`}
                    onCapture={(f) => uploadItemPhoto(row.itemKey, 'before', slot, f)}
                  />
                ))}
                {(row.beforeVideoUrls || ['']).map((url, slot) => (
                  <CameraVideoInput
                    key={`vb-${slot}`}
                    label={`Vídeo ${slot + 1}`}
                    url={url || undefined}
                    disabled={!canEdit}
                    hideCapture={hideCapture}
                    busy={busy === `${row.itemKey}-before-video-${slot}`}
                    onCapture={(f) => uploadItemVideo(row.itemKey, 'before', slot, f)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Depois *</p>
              <div className="grid grid-cols-2 gap-2">
                {row.afterUrls.map((url, slot) => (
                  <CameraPhotoInput
                    key={`a-${slot}`}
                    label={`Foto ${slot + 1}`}
                    url={url || undefined}
                    disabled={!canEdit}
                    hideCapture={hideCapture}
                    busy={busy === `${row.itemKey}-after-${slot}`}
                    onCapture={(f) => uploadItemPhoto(row.itemKey, 'after', slot, f)}
                  />
                ))}
                {(row.afterVideoUrls || ['']).map((url, slot) => (
                  <CameraVideoInput
                    key={`va-${slot}`}
                    label={`Vídeo ${slot + 1}`}
                    url={url || undefined}
                    disabled={!canEdit}
                    hideCapture={hideCapture}
                    busy={busy === `${row.itemKey}-after-video-${slot}`}
                    onCapture={(f) => uploadItemVideo(row.itemKey, 'after', slot, f)}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showSignatures && (
      <div className="border-t border-slate-100 pt-3 space-y-3">
        <p className="text-xs font-black text-slate-700 uppercase">Vistoria inicial (antes de começar) *</p>
        {signedPre ? (
          <p className="text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Vistoria inicial assinada.
          </p>
        ) : null}
        {canEdit && !signedPre && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRemoteMode(null)}
              className={`text-xs font-bold px-3 py-2 rounded-lg border min-h-[40px] ${
                remoteMode !== 'pre'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-800 border-slate-300'
              }`}
            >
              Cliente no local
            </button>
            <button
              type="button"
              onClick={() => setRemoteMode('pre')}
              className={`text-xs font-bold px-3 py-2 rounded-lg border min-h-[40px] flex items-center gap-1.5 ${
                remoteMode === 'pre'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-slate-800 border-slate-300'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              Cliente ausente (link de vistoria)
            </button>
          </div>
        )}
        {remoteMode === 'pre' && canEdit && !signedPre ? (
          <div className="border-2 border-violet-400 bg-violet-100 rounded-xl p-3 space-y-2">
            <p className="text-xs font-black text-violet-900 flex items-center gap-1.5">
              <Link2 className="w-4 h-4" />
              Assinatura remota da vistoria
            </p>
            <p className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 rounded-lg px-2 py-1.5">
              Termo (cliente ausente): o cliente ausente assume que verificou via imagens e vídeos o
              estado de conservação e os apontamentos da vistoria prévia antes da execução do serviço.
            </p>
            {preRemoteToken && (
              <p className="text-[10px] font-mono break-all bg-white border rounded-lg p-2 text-slate-600">
                {buildServiceSignatureUrl(preRemoteToken)}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy === 'remote-pre'}
                onClick={() => copyRemoteLink('pre')}
                className="font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1 border border-violet-200 bg-white min-h-[44px]"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copiado!' : 'Copiar link'}
              </button>
              <button
                type="button"
                disabled={busy === 'remote-pre' || !event.phone?.trim()}
                onClick={() => sendRemoteWhatsApp('pre')}
                className="font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1 bg-[#25D366] text-white min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar WhatsApp
              </button>
            </div>
          </div>
        ) : (
          <DigitalSignaturePanel
            title="Cliente (vistoria)"
            signerRole="client"
            signerNameDefault={event.client}
            existing={report.preServiceSignature}
            readOnly={!canEdit || signedPre}
            onSave={(sig) => saveSignature(sig, 'pre')}
          />
        )}
        {!preReady && (
          <p className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
            Para iniciar o serviço: assine a vistoria inicial + registre foto e vídeo de antes em
            todos os itens.
          </p>
        )}
      </div>
      )}

      {viewOnly && (
        <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
          <p className="font-black text-slate-700 uppercase">Assinaturas</p>
          <p className={signedPre ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
            Vistoria: {signedPre ? 'Assinada' : 'Pendente'}
          </p>
          <p className={signedPost ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
            Conclusão: {signedPost ? 'Assinada' : 'Pendente'}
          </p>
        </div>
      )}

      {showSignatures && (
      <div className="border-t border-slate-100 pt-3 space-y-3">
        <p className="text-xs font-black text-slate-700 uppercase">Assinatura de conclusão *</p>

        {signedPost ? (
          <p className="text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Assinatura registrada — checklist atualizado automaticamente.
          </p>
        ) : canEdit ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRemoteMode(null)}
              className={`text-xs font-bold px-3 py-2 rounded-lg border min-h-[40px] ${
                remoteMode !== 'post'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              Cliente no local
            </button>
            <button
              type="button"
              onClick={() => setRemoteMode('post')}
              className={`text-xs font-bold px-3 py-2 rounded-lg border min-h-[40px] flex items-center gap-1.5 ${
                remoteMode === 'post'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              Cliente ausente
            </button>
          </div>
        ) : null}

        {remoteMode === 'post' && canEdit && !signedPost ? (
          <div className="border-2 border-violet-200 bg-violet-50/60 rounded-xl p-3 space-y-2">
            <p className="text-xs font-black text-violet-900 flex items-center gap-1.5">
              <Link2 className="w-4 h-4" />
              Assinatura remota
            </p>
            <p className="text-[10px] text-slate-600">
              Gere o link e envie ao cliente. Ao assinar, o checklist marca automaticamente.
            </p>
            {remoteToken && (
              <p className="text-[10px] font-mono break-all bg-white border rounded-lg p-2 text-slate-600">
                {buildServiceSignatureUrl(remoteToken)}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy === 'remote-post'}
                onClick={() => copyRemoteLink('post')}
                className="font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1 border border-violet-200 bg-white min-h-[44px]"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copiado!' : 'Copiar link'}
              </button>
              <button
                type="button"
                disabled={busy === 'remote-post' || !event.phone?.trim()}
                onClick={() => sendRemoteWhatsApp('post')}
                className="font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1 bg-[#25D366] text-white min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar WhatsApp
              </button>
            </div>
          </div>
        ) : (
          <>
            {busy === 'sign-post' && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Salvando…
              </p>
            )}
            <DigitalSignaturePanel
              title="Cliente"
              signerRole="client"
              signerNameDefault={event.client}
              existing={report.clientSignature}
              readOnly={!canEdit || signedPost}
              onSave={(sig) => saveSignature(sig, 'post')}
            />
          </>
        )}
      </div>
      )}
    </div>
  );
}
