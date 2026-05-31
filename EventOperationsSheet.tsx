import { useEffect } from 'react';
import {
  X,
  Clock,
  MapPin,
  DollarSign,
  Package,
  MessageCircle,
  Building2,
  User,
  Handshake,
  ExternalLink,
} from 'lucide-react';
import { type AppEvent, useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { useLicensees } from '../context/LicenseesContext';
import { getUnitById } from '../utils/units';
import {
  WHATSAPP_LABELS,
  buildClientWhatsAppHref,
  buildCommercialWhatsAppHref,
  buildLicenseeWhatsAppHref,
  canContactClientInAgenda,
} from '../utils/whatsappContact';
import { isAnyCommercialDeal } from '../utils/crmAccess';
import { commercialClientContactHint, contactClientBlockedHint } from '../utils/displayLabels';
import {
  resolveEstimatedServiceHours,
  formatEstimatedHoursLabel,
} from '../utils/eventServiceDisplay';
import MissionStatusIcon from './MissionStatusIcon';
import { getLiveOperationalStatus } from '../utils/networkMacro';
import RentalCountdown from './RentalCountdown';
import NetworkEventLiveBadge from './NetworkEventLiveBadge';
import { useNowTick } from '../hooks/useNowTick';
import { allItemAfterMediaComplete, allItemBeforeMediaComplete } from '../utils/serviceItemPhotos';
import LiveLocationPreview from './LiveLocationPreview';
import ClientTrackingLink from './ClientTrackingLink';
import { publicTrackingUrl } from '../utils/workOrder';
import ServiceEvidencePanel from './ServiceEvidencePanel';
import ServiceChecklistPanel from './ServiceChecklistPanel';
import { fieldOpsApi, mergeFieldEventsFromServer } from '../services/fieldOpsApi';

type Props = {
  event: AppEvent;
  onClose: () => void;
  /** Exibe cronômetro de locação (Tempo ao vivo) */
  showRentalTimer?: boolean;
  sellerLabel?: string;
  executorLabel?: string;
  onOpenCrm?: () => void;
};

export default function EventOperationsSheet({
  event,
  onClose,
  showRentalTimer = false,
  sellerLabel,
  executorLabel,
  onOpenCrm,
}: Props) {
  const { events, updateEvent } = useEvents();
  const { session } = useAuth();
  const { getLicensee } = useLicensees();
  const role = session?.role;
  const isAdmin = role === 'admin';
  const isCommercial = role === 'commercial';
  const oversightView = isAdmin || isCommercial;
  const now = useNowTick(1000);

  const liveEvent = events.find((e) => e.id === event.id) ?? event;
  const unit = getUnitById(liveEvent.unitId);
  const lic = getLicensee(liveEvent.unitId || 'sp-centro');
  const live = getLiveOperationalStatus(liveEvent, now);
  const canClient = canContactClientInAgenda(liveEvent, role);
  const commercialHref = buildCommercialWhatsAppHref(liveEvent);
  const licenseeHref = lic.whatsapp
    ? buildLicenseeWhatsAppHref(liveEvent, lic.whatsapp, lic.name, {
        isAdmin,
        sellerLabel,
      })
    : null;

  const showLicenseeBtn = isAdmin || isCommercial;
  const showCommercialBtn =
    role === 'licensee' && isAnyCommercialDeal(liveEvent) && commercialHref;
  const trackingMsg = liveEvent.publicTrackingToken
    ? `Olá ${liveEvent.client}! Aqui está o link para acompanhar o status do seu serviço em tempo real:\n\n${publicTrackingUrl(liveEvent.publicTrackingToken)}`
    : '';
  const preSigned = Boolean(liveEvent.serviceReport?.preServiceSignature?.imageDataUrl);
  const postSigned = Boolean(liveEvent.serviceReport?.clientSignature?.imageDataUrl);
  const beforeMediaOk = allItemBeforeMediaComplete(liveEvent, liveEvent.serviceReport);
  const afterMediaOk = allItemAfterMediaComplete(liveEvent, liveEvent.serviceReport);
  const showFieldPanels =
    oversightView &&
    (liveEvent.isDelivered ||
      liveEvent.enRouteNotifiedAt ||
      Boolean(liveEvent.serviceReport?.itemPhotos?.length));

  const syncFieldFromApi = async () => {
    if (!oversightView) return;
    try {
      const serverRows = await fieldOpsApi.fetchEvents();
      const remote = serverRows.find((e) => e.id === liveEvent.id);
      if (!remote) return;
      const [merged] = mergeFieldEventsFromServer([liveEvent], [remote]);
      const patch: Partial<AppEvent> = {};
      if (merged.serviceReport !== liveEvent.serviceReport) patch.serviceReport = merged.serviceReport;
      if (merged.serviceChecklist !== liveEvent.serviceChecklist) {
        patch.serviceChecklist = merged.serviceChecklist;
      }
      if (Object.keys(patch).length) {
        updateEvent(liveEvent.id, patch, 'Sincronização Tempo');
      }
    } catch {
      /* API offline — mantém dados locais */
    }
  };

  useEffect(() => {
    if (!showFieldPanels) return;
    syncFieldFromApi();
    const timer = window.setInterval(syncFieldFromApi, 5000);
    return () => window.clearInterval(timer);
  }, [liveEvent.id, showFieldPanels]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="app-modal w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="event-ops-title"
      >
        <div className="p-5 pb-4 border-b border-[var(--color-border)] shrink-0 flex justify-between items-start gap-3">
          <div className="min-w-0">
            <MissionStatusIcon event={liveEvent} size="md" className="mb-2" />
            <h2
              id="event-ops-title"
              className="text-2xl font-black text-[var(--color-text)] leading-tight truncate"
            >
              {liveEvent.client}
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] font-medium mt-0.5">
              {unit.name}
              {liveEvent.time ? ` · ${liveEvent.time}` : ''}
            </p>
            {sellerLabel && (
              <p className="text-xs font-bold text-primary-500 mt-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Vendeu: {sellerLabel}
              </p>
            )}
            {executorLabel && (
              <p className="text-xs font-bold text-[var(--color-text-muted)] flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                Executa: {executorLabel}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {showRentalTimer && !liveEvent.pickedUp && (
            <RentalCountdown event={liveEvent} prominent />
          )}

          <NetworkEventLiveBadge event={liveEvent} />

          <p className="text-sm font-bold text-[var(--color-text)] bg-[var(--color-surface-muted)] rounded-xl px-3 py-2">
            {live.label}
            {live.detail ? (
              <span className="block text-xs font-medium text-[var(--color-text-muted)] mt-1">
                {live.detail}
              </span>
            ) : null}
          </p>

          {showFieldPanels && (
            <div className="space-y-3">
              <ServiceEvidencePanel
                event={liveEvent}
                canEdit={false}
                viewOnly
                onUpdate={(patch) => updateEvent(liveEvent.id, patch, 'Comercial (sync)')}
              />
              <ServiceChecklistPanel
                event={liveEvent}
                canEdit={false}
                onUpdate={(checklist) =>
                  updateEvent(liveEvent.id, { serviceChecklist: checklist }, 'Comercial (sync)')
                }
              />
            </div>
          )}

          <div className="space-y-4">
            {!showFieldPanels && (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase mb-2">
                  Evidências da operação
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <p className={preSigned ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                    Vistoria assinada: {preSigned ? 'OK' : 'Pendente'}
                  </p>
                  <p className={beforeMediaOk ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                    Foto/vídeo antes: {beforeMediaOk ? 'OK' : 'Pendente'}
                  </p>
                  <p className={postSigned ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                    Conclusão assinada: {postSigned ? 'OK' : 'Pendente'}
                  </p>
                  <p className={afterMediaOk ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                    Foto/vídeo depois: {afterMediaOk ? 'OK' : 'Pendente'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--tone-info-bg)] text-[var(--tone-info-title)]">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Horário</p>
                <p className="font-medium text-[var(--color-text)]">{liveEvent.time}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {new Date(liveEvent.date).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
                {resolveEstimatedServiceHours(liveEvent) != null && (
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mt-1">
                    {formatEstimatedHoursLabel(resolveEstimatedServiceHours(liveEvent)!)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--tone-success-bg)] text-[var(--tone-success-title)]">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Financeiro</p>
                <p
                  className={`font-bold ${
                    liveEvent.financialStatus === 'Pago'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {liveEvent.financialStatus}
                  {liveEvent.totalValue != null ? ` · R$ ${liveEvent.totalValue.toFixed(2)}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-text)]">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Endereço</p>
                <p className="font-medium text-[var(--color-text)] text-sm break-words">
                  {liveEvent.address}
                </p>
              </div>
            </div>

            {(liveEvent.proposalItems?.length || liveEvent.equipments?.length) ? (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-text)]">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase">
                    Itens do serviço
                  </p>
                  <p className="font-medium text-[var(--color-text)]">
                    {(liveEvent.proposalItems?.map((r) => r.name) || liveEvent.equipments || []).join(' · ')}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            {showLicenseeBtn && licenseeHref && (
              <a
                href={licenseeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Building2 className="w-5 h-5" />
                {WHATSAPP_LABELS.licensee}
              </a>
            )}

            {canClient ? (
              <a
                href={buildClientWhatsAppHref(liveEvent, trackingMsg || undefined)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full btn-primary py-3.5"
              >
                <MessageCircle className="w-5 h-5" />
                {trackingMsg ? 'Reforçar link de acompanhamento' : WHATSAPP_LABELS.client}
              </a>
            ) : role === 'licensee' ? (
              <p className="text-xs font-bold text-violet-800 dark:text-violet-200 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-xl px-3 py-2">
                {contactClientBlockedHint(liveEvent)}
              </p>
            ) : isCommercial && !canClient ? (
              <p className="text-xs font-bold text-violet-800 dark:text-violet-200 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-xl px-3 py-2">
                {commercialClientContactHint()}
              </p>
            ) : null}

            {showCommercialBtn && commercialHref && (
              <a
                href={commercialHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full btn-outline py-3.5"
              >
                <Handshake className="w-5 h-5" />
                {WHATSAPP_LABELS.commercial}
              </a>
            )}

            <LiveLocationPreview
              lat={liveEvent.technicianLat}
              lng={liveEvent.technicianLng}
              updatedAt={liveEvent.technicianGeoUpdatedAt}
            />
            <ClientTrackingLink event={liveEvent} compact />

            {onOpenCrm && (isAdmin || isCommercial) && (
              <button type="button" onClick={onOpenCrm} className="w-full btn-outline py-3.5">
                <ExternalLink className="w-5 h-5" />
                Ver no Controle Comercial
              </button>
            )}
          </div>

          {oversightView && showFieldPanels && (
            <p className="text-xs font-bold text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-3">
              Acompanhamento em tempo real: fotos, vídeos e checklist do licenciado — sem captura nem
              assinatura pelo comercial.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
