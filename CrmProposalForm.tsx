import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Gift, Save, FileText, Clock, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { AppEvent, useEvents } from '../context/EventsContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { buildUnitCatalog, UNITS } from '../utils/units';
import ProposalVisualPreview from './ProposalVisualPreview';
import UpholsteryQuoteBuilder from './UpholsteryQuoteBuilder';
import {
  lineItemsToEquipmentNames,
  proposalItemsFromLegacy,
} from '../utils/proposalItems';
import {
  type UpholsteryLineConfig,
  configsFromProposalItems,
  buildProposalItemsFromConfigs,
  quoteTotalFromItems,
  sumEstimatedHours,
} from '../utils/upholsteryLineConfig';
import { consolidateEventAddress } from '../types/eventAddress';
import { countReferralsByPhone } from '../utils/crmOpportunityMessage';
import {
  REFERRAL_COMMISSION_RATE,
  formatReferralCommission,
} from '../utils/referralCommission';
import EventAddressFields from './EventAddressFields';
import ImageEditorModal from './ImageEditorModal';
import HourSelect from './HourSelect';
import {
  buildServiceTimeRange,
  formatDurationHoursLabel,
  roundUpQuarterHours,
  DEFAULT_SERVICE_HOURS,
} from '../utils/serviceScheduling';
import { parseTimeRange } from '../utils/timeSlots';
import {
  EVENT_TYPES,
  formatLeadTitle,
  type EventType,
} from '../utils/eventTypes';
import {
  blockedSlotLabels,
  findNegotiationWarnings,
  findReservedSlotConflicts,
  isHardScheduleBlocked,
} from '../utils/scheduleConflicts';
import {
  isEventAddressComplete,
  parseEventAddressFromString,
  type EventAddress,
} from '../types/eventAddress';

type Props = {
  event: AppEvent;
  authorLabel: string;
  onSaved?: () => void;
  readOnly?: boolean;
  /** Sem borda dupla — scroll no painel pai */
  embedded?: boolean;
};

export default function CrmProposalForm({
  event,
  authorLabel,
  onSaved,
  readOnly,
  embedded = true,
}: Props) {
  const { events, updateEvent } = useEvents();
  const { settings, getUnitEquipments } = useSettings();
  const { session } = useAuth();
  const isCommercial = session?.role === 'commercial';
  const [unit, setUnit] = useState(event.unitId || 'sp-centro');
  const [eventType, setEventType] = useState<EventType>((event.eventType as EventType) || 'Residencial');
  const [honoreeName, setHonoreeName] = useState(event.honoreeName || '');
  const [hasReferral, setHasReferral] = useState(Boolean(event.referredByPhone));
  const [referredByPhone, setReferredByPhone] = useState(event.referredByPhone || '');
  const [upholsteryConfigs, setUpholsteryConfigs] = useState<Record<string, UpholsteryLineConfig>>({});
  const [eventAddress, setEventAddress] = useState<EventAddress>(() =>
    event.eventAddress
      ? { ...event.eventAddress }
      : parseEventAddressFromString(event.address)
  );
  const [manualTotal, setManualTotal] = useState(String(event.totalValue || ''));
  const [manualEdited, setManualEdited] = useState(Boolean(event.totalValue));
  const [clientPhotoUrls, setClientPhotoUrls] = useState<string[]>(event.clientProvidedPhotoUrls || []);
  const [photoCropFile, setPhotoCropFile] = useState<File | null>(null);
  const [photoQueue, setPhotoQueue] = useState<File[]>([]);
  const [selectedPhotoNames, setSelectedPhotoNames] = useState<string[]>([]);

  const [eventDate, setEventDate] = useState(() => {
    const d = new Date(event.date);
    return format(d, 'yyyy-MM-dd');
  });
  const [serviceStartHour, setServiceStartHour] = useState(12);

  const syncFromEvent = () => {
    const cat = buildUnitCatalog(event.unitId || 'sp-centro', getUnitEquipments(event.unitId || 'sp-centro'));
    const legacy = proposalItemsFromLegacy(event, cat.equipments);
    const configs = configsFromProposalItems(legacy);
    const match = event.time.match(/(\d{1,2}):\d{2}\s*-\s*(\d{1,2}):\d{2}/);
    setUnit(event.unitId || 'sp-centro');
    setEventType((event.eventType as EventType) || 'Residencial');
    setHonoreeName(event.honoreeName || '');
    setHasReferral(Boolean(event.referredByPhone));
    setReferredByPhone(event.referredByPhone || '');
    setUpholsteryConfigs(configs);
    setEventAddress(
      event.eventAddress
        ? { ...event.eventAddress }
        : parseEventAddressFromString(event.address)
    );
    setManualTotal(String(event.totalValue || ''));
    setClientPhotoUrls(event.clientProvidedPhotoUrls || []);
    setEventDate(format(new Date(event.date), 'yyyy-MM-dd'));
    if (match) {
      setServiceStartHour(parseInt(match[1], 10));
    } else {
      const { startHour } = parseTimeRange(event.time || '12:00 - 14:00');
      setServiceStartHour(Math.floor(startHour));
    }
  };

  useEffect(() => {
    syncFromEvent();
  }, [event.id, event.updatedAt, unit, getUnitEquipments]);

  const activeCatalog = buildUnitCatalog(unit, getUnitEquipments(unit));
  const serviceOptions = activeCatalog.equipments.filter((e) => e.type === 'service');

  const previewLineItems = useMemo(
    () => buildProposalItemsFromConfigs(activeCatalog.equipments, upholsteryConfigs),
    [activeCatalog.equipments, upholsteryConfigs]
  );

  const durationHours = useMemo(() => {
    const h = sumEstimatedHours(previewLineItems);
    return h > 0 ? roundUpQuarterHours(h) : DEFAULT_SERVICE_HOURS;
  }, [previewLineItems]);

  const eventTime = useMemo(
    () => buildServiceTimeRange(serviceStartHour, durationHours),
    [serviceStartHour, durationHours]
  );

  const scheduleCheck = useMemo(() => {
    if (!eventDate) return { warnings: [], hardBlock: false, blockedLabels: [] as string[] };
    const [y, m, d] = eventDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const eqNames = Object.values(upholsteryConfigs)
      .filter((c) => c.quantity > 0)
      .map((c) => serviceOptions.find((x) => x.id === c.equipmentId)?.name || '')
      .filter(Boolean);
    const reserved = findReservedSlotConflicts(
      events,
      { unitId: unit, date, time: eventTime },
      event.id
    );
    return {
      warnings: [
        ...findNegotiationWarnings(
          events,
          { unitId: unit, date, time: eventTime, equipmentNames: eqNames },
          event.id
        ),
        ...reserved,
      ],
      hardBlock: isHardScheduleBlocked(events, { unitId: unit, date, time: eventTime }, event.id),
      reserved,
      blockedLabels: blockedSlotLabels(eventTime),
    };
  }, [events, unit, eventDate, eventTime, upholsteryConfigs, serviceOptions, event.id]);

  const computedTotal = useMemo(() => quoteTotalFromItems(previewLineItems), [previewLineItems]);

  const dateKey = eventDate || '';
  const displayTotal = manualEdited ? Number(manualTotal) || 0 : computedTotal;

  const referralCount =
    hasReferral && referredByPhone.trim()
      ? countReferralsByPhone(events, referredByPhone)
      : 0;

  const timeOk = durationHours > 0 && previewLineItems.length > 0;

  const canSubmit =
    eventDate &&
    previewLineItems.length > 0 &&
    isEventAddressComplete(eventAddress) &&
    timeOk &&
    !scheduleCheck.hardBlock &&
    !readOnly;

  const handleSave = () => {
    if (!canSubmit) return;
    const [y, m, d] = eventDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const lineItems = buildProposalItemsFromConfigs(activeCatalog.equipments, upholsteryConfigs);
    const names = lineItemsToEquipmentNames(lineItems);
    const referralDigits = hasReferral ? referredByPhone.replace(/\D/g, '') : '';

    updateEvent(
      event.id,
      {
        unitId: unit,
        eventType,
        honoreeName: honoreeName.trim() || undefined,
        eventDetail: undefined,
        equipments: names,
        proposalItems: lineItems,
        address: consolidateEventAddress(eventAddress),
        eventAddress: { ...eventAddress },
        totalValue: displayTotal,
        referredByPhone: referralDigits || undefined,
        clientProvidedPhotoUrls: clientPhotoUrls,
        date,
        time: eventTime,
        timeSlot: undefined,
        duration: `${durationHours}h`,
        estimatedServiceHours: durationHours,
      },
      authorLabel
    );
    onSaved?.();
  };

  const body = (
    <div className="space-y-4">
      {isCommercial && (
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">
            Unidade executora (licenciado)
          </label>
          <select
            disabled={readOnly}
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value);
              setUpholsteryConfigs({});
              setManualEdited(false);
            }}
            className="w-full mt-0.5 border-2 border-slate-100 rounded-xl p-3 font-bold text-sm min-h-[48px] disabled:bg-slate-50"
          >
            {UNITS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="sm:col-span-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Nome do cliente</label>
          <input
            disabled
            value={event.client}
            className="w-full mt-0.5 border rounded-xl p-3 bg-slate-50 text-sm font-bold min-h-[44px]"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase">WhatsApp</label>
          <input
            disabled
            value={event.phone}
            className="w-full mt-0.5 border rounded-xl p-3 bg-slate-50 text-sm font-bold min-h-[44px]"
          />
        </div>
      </div>

      <section className="border border-slate-100 rounded-xl p-3 space-y-3 bg-slate-50/50">
        <p className="text-xs font-black text-slate-800 uppercase">Evento</p>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo *</label>
          <select
            disabled={readOnly}
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventType)}
            className="w-full mt-0.5 border rounded-xl p-2.5 text-sm min-h-[44px] bg-white"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        {(eventType === 'Residencial' || eventType === 'Comercial') && (
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              Referência do serviço (opcional)
            </label>
            <input
              disabled={readOnly}
              value={honoreeName}
              onChange={(e) => setHonoreeName(e.target.value)}
              placeholder="Ex: Apartamento 82 · sala de estar"
              className="w-full mt-0.5 border rounded-xl p-3 text-sm min-h-[44px]"
            />
            {honoreeName.trim() && (
              <p className="text-[10px] font-bold text-primary-700 mt-1">
                {formatLeadTitle(eventType, honoreeName, event.client)}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="border border-amber-100 rounded-xl p-3 space-y-3 bg-amber-50/40">
        <p className="text-xs font-black text-amber-900 uppercase flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          Agenda — período conforme orçamento
        </p>
        <p className="text-[10px] text-amber-900/90 font-medium">
          O horário de término é calculado automaticamente pela soma do tempo estimado dos itens
          (higienização / impermeabilização).
        </p>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Data do serviço *</label>
          <input
            type="date"
            disabled={readOnly}
            required
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full mt-0.5 border rounded-xl p-3 text-sm min-h-[44px] bg-white"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3" />
            Início na agenda *
          </label>
          <HourSelect
            label="Horário de chegada da equipe"
            valueHour={serviceStartHour}
            onChange={(h) => {
              setServiceStartHour(h);
              setManualEdited(false);
            }}
            disabled={readOnly}
          />
          <div className="mt-2 rounded-xl bg-slate-900 text-white p-3 space-y-1">
            <p className="text-[10px] font-bold uppercase opacity-80">Reserva na agenda</p>
            <p className="text-lg font-black">{eventTime}</p>
            <p className="text-xs opacity-90">
              Duração: {formatDurationHoursLabel(durationHours)} · conforme itens do orçamento
            </p>
          </div>
          {previewLineItems.length === 0 && (
            <p className="text-[10px] font-bold text-amber-800 mt-1">
              Adicione itens ao orçamento para calcular o período de limpeza.
            </p>
          )}
          {scheduleCheck.hardBlock && (
            <p className="text-xs font-bold text-red-700">
              Horário indisponível — data fechada ou reservada (sinal) neste período.
            </p>
          )}
          {scheduleCheck.warnings.length > 0 && (
            <div className="space-y-1">
              {scheduleCheck.warnings.map((w) => (
                <p
                  key={w.eventId}
                  className={`text-[10px] flex gap-1 ${
                    w.severity === 'hard' ? 'text-red-800 font-bold' : 'text-amber-800'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {w.client}: {w.stepLabel}
                  {w.severity === 'soft' ? ' (aviso)' : ''}
                </p>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-700 uppercase flex items-center gap-1">
            <Gift className="w-3.5 h-3.5" />
            Indicação
          </h3>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setHasReferral((v) => !v)}
              className={clsx(
                'w-10 h-6 rounded-full relative',
                hasReferral ? 'bg-emerald-500' : 'bg-slate-200'
              )}
            >
              <span
                className={clsx(
                  'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform',
                  hasReferral && 'translate-x-4'
                )}
              />
            </button>
          )}
        </div>
        {hasReferral && (
          <>
            <input
              disabled={readOnly}
              value={referredByPhone}
              onChange={(e) => setReferredByPhone(e.target.value)}
              placeholder="WhatsApp de quem indicou"
              className="w-full border rounded-xl p-2.5 text-sm min-h-[44px]"
            />
            <p className="text-[10px] text-violet-800 font-medium bg-violet-50 rounded-lg px-2 py-1.5">
              Quem indicou recebe <strong>{Math.round(REFERRAL_COMMISSION_RATE * 100)}%</strong> do valor pago
              (creditado ao confirmar o pagamento).
              {displayTotal > 0 && (
                <>
                  {' '}
                  Estimativa: <strong>{formatReferralCommission(displayTotal * REFERRAL_COMMISSION_RATE)}</strong>
                </>
              )}
              {referralCount > 0 && (
                <> · Este indicador já trouxe {referralCount} negócio(s).</>
              )}
            </p>
          </>
        )}
      </section>

      <section className="border border-slate-100 rounded-xl p-3">
        <UpholsteryQuoteBuilder
          catalog={serviceOptions}
          configs={upholsteryConfigs}
          onChange={(next) => {
            setUpholsteryConfigs(next);
            setManualEdited(false);
          }}
          readOnly={readOnly}
        />
      </section>

      <section className="border border-slate-100 rounded-xl p-3 space-y-2 bg-slate-50/40">
        <p className="text-xs font-black text-[var(--color-text)] uppercase tracking-wide">
          Estado atual dos estofados (opcional)
        </p>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          Fotos que o cliente enviou pelo WhatsApp mostrando como está o sofá/poltrona/tapete hoje — não
          são referência de catálogo. Não é obrigatório para avançar.
        </p>
        {!readOnly && (
          <>
            <input
              id={`client-photos-${event.id}`}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []).slice(
                  0,
                  Math.max(0, 8 - clientPhotoUrls.length)
                );
                if (!files.length) return;
                setSelectedPhotoNames(files.map((f) => f.name));
                setPhotoQueue(files.slice(1));
                setPhotoCropFile(files[0]);
                e.currentTarget.value = '';
              }}
              className="hidden"
            />
            <label
              htmlFor={`client-photos-${event.id}`}
              className="btn-secondary inline-flex items-center justify-center px-3 py-2 text-xs cursor-pointer"
            >
              Selecionar fotos (recorte 4:3)
            </label>
            {photoCropFile && (
              <ImageEditorModal
                file={photoCropFile}
                onConfirm={(dataUrl) => {
                  setClientPhotoUrls((prev) => [...prev, dataUrl].slice(0, 8));
                  if (photoQueue.length > 0) {
                    setPhotoCropFile(photoQueue[0]);
                    setPhotoQueue((q) => q.slice(1));
                  } else {
                    setPhotoCropFile(null);
                  }
                }}
                onCancel={() => {
                  setPhotoCropFile(null);
                  setPhotoQueue([]);
                }}
              />
            )}
          </>
        )}
        {selectedPhotoNames.length > 0 && (
          <p className="text-[10px] font-bold text-slate-500">
            {selectedPhotoNames.length} arquivo(s): {selectedPhotoNames.slice(0, 2).join(', ')}
            {selectedPhotoNames.length > 2 ? ' ...' : ''}
          </p>
        )}
        {clientPhotoUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {clientPhotoUrls.map((url, idx) => (
              <div key={`${idx}-${url.slice(0, 20)}`} className="relative">
                <img
                  src={url}
                  alt={`Foto cliente ${idx + 1}`}
                  className="w-full h-20 media-cover rounded-lg border border-slate-200"
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setClientPhotoUrls((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded"
                  >
                    X
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {previewLineItems.length > 0 && (
        <ProposalVisualPreview
          clientName={event.client}
          eventDate={eventDate}
          eventTime={eventTime}
          eventAddress={consolidateEventAddress(eventAddress)}
          lineItems={previewLineItems}
          totalValue={displayTotal}
        />
      )}

      <EventAddressFields value={eventAddress} onChange={setEventAddress} disabled={readOnly} />

      <div className="bg-slate-800 text-white rounded-xl p-3">
        <p className="text-[10px] font-bold uppercase opacity-80">Valor da proposta</p>
        <p className="text-2xl font-black">R$ {displayTotal.toFixed(2)}</p>
        {!readOnly && (
          <input
            type="number"
            step="0.01"
            value={manualTotal}
            onChange={(e) => {
              setManualEdited(true);
              setManualTotal(e.target.value);
            }}
            className="w-full mt-2 border border-white/30 bg-white/10 rounded-lg p-2 text-sm font-bold"
          />
        )}
      </div>

      {!readOnly && (
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSave}
          className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[52px]"
        >
          <Save className="w-4 h-4" />
          Salvar proposta e reservar data
        </button>
      )}
    </div>
  );

  if (embedded) {
    return (
      <section className="border-2 border-primary-200 rounded-2xl overflow-hidden">
        <div className="bg-primary-900 text-white px-4 py-2.5 flex items-center gap-2 sticky top-0 z-[1]">
          <FileText className="w-4 h-4 shrink-0" />
          <div>
            <p className="text-xs font-black uppercase tracking-wide">Proposta comercial</p>
            <p className="text-[10px] opacity-80">Visita técnica · itens · sujidade · agenda</p>
          </div>
        </div>
        <div className="p-4 bg-white">{body}</div>
      </section>
    );
  }

  return body;
}

export function isProposalFormComplete(event: AppEvent): boolean {
  const hasItems =
    event.proposalItems?.some((r) => r.quantity > 0) ||
    ((event.equipments?.length ?? 0) > 0 && !event.equipments?.includes('A definir'));
  const addr = event.eventAddress || parseEventAddressFromString(event.address);
  const hasDate = Boolean(event.date) && !Number.isNaN(new Date(event.date).getTime());
  const hasTime = Boolean(event.time?.trim()) && event.time !== 'A definir';
  return (
    hasDate &&
    hasTime &&
    Boolean(event.eventType) &&
    hasItems &&
    isEventAddressComplete(addr) &&
    (event.totalValue || 0) > 0
  );
}
