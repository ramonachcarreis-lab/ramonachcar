import type { MouseEvent } from 'react';
import { clsx } from 'clsx';
import { useState } from 'react';
import {
  Gift,
  PackageCheck,
  Bell,
  Clock,
  Plus,
  MapPin,
  Navigation2,
  Play,
} from 'lucide-react';
import {
  buildClientWhatsAppHref,
  buildCommercialWhatsAppHref,
  WHATSAPP_LABELS,
} from '../utils/whatsappContact';
import ServiceAddonModal from './ServiceAddonModal';
import ServiceChecklistPanel from './ServiceChecklistPanel';
import ServiceEvidencePanel from './ServiceEvidencePanel';
import LiveLocationPreview from './LiveLocationPreview';
import ClientTrackingLink from './ClientTrackingLink';
import { AppEvent } from '../context/EventsContext';
import { getWhatsAppLink } from '../utils/formatters';
import { buildFeedbackMessage, countClientRentals } from '../utils/loyaltyFeedback';
import { useEvents } from '../context/EventsContext';
import EventContactButtons from './EventContactButtons';
import RentalCountdown from './RentalCountdown';
import { getUnitById } from '../utils/units';
import { canMarkAsPickedUp, canStartServiceOnSite } from '../utils/workflowGuards';
import { isEnRouteDisplacement, isServiceInExecution } from '../utils/serviceExecution';
import { formatTravelDuration } from '../utils/travelDuration';
import {
  resolveEstimatedServiceHours,
  formatEstimatedHoursLabel,
} from '../utils/eventServiceDisplay';
import { allItemAfterMediaComplete, allItemBeforeMediaComplete } from '../utils/serviceItemPhotos';

interface TimerCardProps {
  key?: string | number;
  data: AppEvent;
  onComplete: (id: number) => void;
  onStartOnSite?: (id: number) => boolean;
  onNotifyPickup?: (id: number) => void;
  onUpdateChecklist?: (id: number, checklist: AppEvent['serviceChecklist']) => void;
  onUpdateEvidence?: (
    id: number,
    patch: { serviceReport?: AppEvent['serviceReport']; serviceChecklist?: AppEvent['serviceChecklist'] }
  ) => void;
  onSelect?: () => void;
}

export default function TimerCard({
  data,
  onComplete,
  onStartOnSite,
  onNotifyPickup,
  onUpdateChecklist,
  onUpdateEvidence,
  onSelect,
}: TimerCardProps) {
  const [addonOpen, setAddonOpen] = useState(false);
  const enRoute = isEnRouteDisplacement(data);
  const inExecution = isServiceInExecution(data);
  const pickupGuard = canMarkAsPickedUp(data);
  const startGuard = canStartServiceOnSite(data);
  const { events, sendServiceFeedback } = useEvents();
  const commercialHref = buildCommercialWhatsAppHref(data);
  const travelLabel = formatTravelDuration(data.enRouteNotifiedAt);

  const whatsappPickupUrl = getWhatsAppLink(
    data.phone,
    `Olá! A equipe Estofado Pro informa que em breve finalizaremos o serviço em "${data.client}". Por favor, garanta o acesso ao local.`
  );

  const rentalCount = countClientRentals(events, data.client);
  const estHours = resolveEstimatedServiceHours(data);
  const stop = (e: MouseEvent) => e.stopPropagation();
  const preSigned = Boolean(data.serviceReport?.preServiceSignature?.imageDataUrl);
  const postSigned = Boolean(data.serviceReport?.clientSignature?.imageDataUrl);
  const beforeMediaOk = allItemBeforeMediaComplete(data, data.serviceReport);
  const afterMediaOk = allItemAfterMediaComplete(data, data.serviceReport);

  return (
    <div
      onClick={onSelect ? () => onSelect() : undefined}
      className={clsx(
        'app-card-dark p-4',
        onSelect && 'cursor-pointer hover:border-primary-300 active:scale-[0.99] transition-all'
      )}
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-[10px] font-mono text-primary-400">{data.workOrderNumber || `#${data.id}`}</p>
          <p className="font-bold text-[var(--color-text)]">{data.client}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{getUnitById(data.unitId).name}</p>
        </div>
        <span
          className={clsx(
            'text-[10px] font-black uppercase px-2 py-1 rounded-full shrink-0',
            enRoute
              ? 'bg-sky-500/20 text-sky-200'
              : inExecution
                ? 'bg-emerald-500/20 text-emerald-200'
                : 'bg-slate-500/20 text-slate-300'
          )}
        >
          {enRoute ? 'A caminho' : inExecution ? 'Em execução' : '—'}
        </span>
      </div>

      <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mb-1 flex-wrap">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        {data.time}
        {estHours != null && (
          <span className="text-[10px] font-bold bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded-full">
            {formatEstimatedHoursLabel(estHours)}
          </span>
        )}
      </p>
      <p className="text-xs text-[var(--color-text-muted)] flex items-start gap-1 mb-2">
        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span className="line-clamp-2">{data.address}</span>
      </p>
      <div className="mb-3 grid grid-cols-3 gap-1.5">
        <span
          className={clsx(
            'text-[10px] font-black uppercase px-2 py-1 rounded-lg text-center',
            preSigned && beforeMediaOk ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'
          )}
        >
          1. Vistoria {preSigned && beforeMediaOk ? 'OK' : 'Pendente'}
        </span>
        <span
          className={clsx(
            'text-[10px] font-black uppercase px-2 py-1 rounded-lg text-center',
            inExecution ? 'bg-sky-500/20 text-sky-200' : 'bg-slate-500/20 text-slate-300'
          )}
        >
          2. Execução {inExecution ? 'Ativa' : '—'}
        </span>
        <span
          className={clsx(
            'text-[10px] font-black uppercase px-2 py-1 rounded-lg text-center',
            postSigned && afterMediaOk ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'
          )}
        >
          3. Conclusão {postSigned && afterMediaOk ? 'OK' : 'Pendente'}
        </span>
      </div>

      {enRoute && travelLabel && (
        <p className="text-xs font-bold text-sky-300 mb-3 flex items-center gap-1">
          <Navigation2 className="w-4 h-4 shrink-0" />
          {travelLabel}
          {data.etaMinutes != null && ` · ETA ~${data.etaMinutes} min`}
        </p>
      )}

      {inExecution && <RentalCountdown event={data} prominent className="mb-3" />}

      {data.pickedUp && (
        <span className="inline-block text-xs font-bold uppercase px-2 py-1 rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text)] mb-3">
          Concluído
        </span>
      )}

      <div className="mb-3" onClick={stop}>
        <ClientTrackingLink event={data} compact />
      </div>

      {enRoute && (
        <div className="space-y-2 mb-3" onClick={stop}>
          <LiveLocationPreview
            lat={data.technicianLat}
            lng={data.technicianLng}
            updatedAt={data.technicianGeoUpdatedAt}
            compact
          />
          <button
            type="button"
            disabled={startGuard != null && !startGuard.ok}
            title={startGuard && !startGuard.ok ? startGuard.reason : undefined}
            onClick={() => {
              if (!onStartOnSite) return;
              if (!startGuard.ok) {
                window.alert(startGuard.reason);
                return;
              }
              onStartOnSite(data.id);
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            Cheguei — iniciar serviço
          </button>
        </div>
      )}

      {inExecution && onUpdateEvidence && (
        <div className="mb-3 space-y-3" onClick={stop}>
          <ServiceEvidencePanel
            event={data}
            canEdit={!data.pickedUp}
            onUpdate={(patch) => onUpdateEvidence(data.id, patch)}
          />
          {onUpdateChecklist && (
            <ServiceChecklistPanel
              event={data}
              canEdit={!data.pickedUp}
              onUpdate={(checklist) => onUpdateChecklist(data.id, checklist)}
            />
          )}
        </div>
      )}

      {inExecution && (
        <>
          <EventContactButtons
            clientHref={buildClientWhatsAppHref(data)}
            commercialHref={commercialHref}
            showCommercial={false}
            onClickCapture={stop}
            className="mb-3"
          />

          <div className="space-y-2 border-t border-[var(--color-border)] pt-3" onClick={stop}>
            <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">
              Finalizar serviço
            </p>
            {!data.pickedUp && (
              <button
                type="button"
                onClick={() => setAddonOpen(true)}
                className="w-full mb-2 border-2 border-amber-400 text-amber-900 bg-amber-50 font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-xs min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                Acrescentar serviço (aditivo)
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={data.pickedUp || !pickupGuard.ok}
                title={!pickupGuard.ok && !data.pickedUp ? pickupGuard.reason : undefined}
                onClick={() => {
                  if (!data.pickedUp) {
                    if (!pickupGuard.ok) {
                      window.alert(pickupGuard.reason);
                      return;
                    }
                    onComplete(data.id);
                  }
                }}
                className="btn-primary text-xs !py-3 !min-h-[44px] !rounded-xl w-full"
              >
                <PackageCheck className="w-4 h-4" />
                {data.pickedUp ? 'Concluído' : 'Concluir serviço'}
              </button>

              {!data.pickedUp && (
                <a
                  href={whatsappPickupUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onNotifyPickup?.(data.id)}
                  className="bg-[#0d9488] hover:brightness-105 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-1 min-h-[44px] w-full"
                >
                  <Bell className="w-4 h-4" />
                  Avisar cliente
                </a>
              )}
            </div>

            {data.pickedUp && !data.feedbackSentBy && (
              <a
                href={getWhatsAppLink(data.phone, buildFeedbackMessage(data, rentalCount))}
                onClick={() => sendServiceFeedback(data.id, 'licensee')}
                className="w-full btn-success text-xs !py-3 !rounded-xl flex items-center justify-center gap-2"
              >
                <Gift className="w-5 h-5" />
                {WHATSAPP_LABELS.postService}
              </a>
            )}
          </div>

          {data.pickupNotifiedAt && !data.pickedUp && (
            <p className="text-xs font-bold text-emerald-500 text-center mt-2">
              Aviso enviado às{' '}
              {new Date(data.pickupNotifiedAt).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </>
      )}

      {addonOpen && <ServiceAddonModal event={data} onClose={() => setAddonOpen(false)} />}
    </div>
  );
}
