import { useEffect, useMemo, useState } from 'react';
import { Calendar, MapPin, MessageCircle, X, Star, ExternalLink, Send, Filter } from 'lucide-react';
import { getWhatsAppLink } from '../utils/formatters';
import { WHATSAPP_LABELS } from '../utils/whatsappContact';
import {
  buildMaintenanceWhatsAppLink,
  buildOpportunityWhatsAppLink,
} from '../utils/crmOpportunityMessage';
import type { MaintenanceItemDue } from '../utils/returningClients';
import { formatLeadTitle } from '../utils/eventTypes';
import type { AppEvent } from '../context/EventsContext';
import { buildClubePlayView } from '../utils/clubePlay';
import { loadLoyaltyRecords } from '../utils/loyaltyPoints';
import ClientClubePlaySection from './ClientClubePlaySection';
import ReferralEarningsBadge from './ReferralEarningsBadge';
import { buildEvaluationUrl, buildEvaluationWhatsAppMessage } from '../utils/evaluationLink';
import { dealHandlerLabel, unitDisplayName } from '../utils/displayLabels';
import { useEvaluations } from '../context/EvaluationsContext';
import { isEventEligibleForEvaluation } from '../utils/evaluationEligible';
import EvaluationDetailModal from './EvaluationDetailModal';
import { copyToClipboard } from '../utils/copyToClipboard';
import type { EventEvaluation } from '../types/evaluation';

export type ClientDetailData = {
  name: string;
  phone: string;
  totalSpent: number;
  rentalsCount: number;
  equipments: string[];
  events: AppEvent[];
  unitId?: string;
  honoreeName?: string;
  eventType?: AppEvent['eventType'];
  eventDetail?: string;
  daysUntilAnniversary?: number;
  maintenanceItems?: MaintenanceItemDue[];
};

type HistoryFilter = 'todos' | 'abertos' | 'finalizados' | 'cancelados';

type Props = {
  client: ClientDetailData;
  onClose: () => void;
};

function isFinalizedEvent(e: AppEvent): boolean {
  return isEventEligibleForEvaluation(e);
}

export default function ClientDetailModal({ client, onClose }: Props) {
  const [loyaltyTick, setLoyaltyTick] = useState(0);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('todos');
  const [viewEvaluation, setViewEvaluation] = useState<EventEvaluation | null>(null);
  const [evalMsg, setEvalMsg] = useState('');
  const { evaluations, refresh: refreshEvaluations } = useEvaluations();

  const unitId = client.unitId || 'sp-centro';

  useEffect(() => {
    refreshEvaluations();
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshEvaluations();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refreshEvaluations]);

  const clubeView = useMemo(
    () => buildClubePlayView(client.phone, client.name, unitId, client.events, loadLoyaltyRecords()),
    [client.phone, client.name, unitId, client.events, loyaltyTick]
  );

  const evaluationByEventId = useMemo(() => {
    const map = new Map<number, EventEvaluation>();
    evaluations.forEach((ev) => map.set(ev.eventId, ev));
    return map;
  }, [evaluations]);

  const filteredEvents = useMemo(() => {
    const sorted = [...client.events].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    switch (historyFilter) {
      case 'abertos':
        return sorted.filter((e) => e.status === 'pending' || e.financialStatus === 'Pendente');
      case 'finalizados':
        return sorted.filter((e) => isFinalizedEvent(e));
      case 'cancelados':
        return sorted.filter((e) => e.status === 'cancelled');
      default:
        return sorted;
    }
  }, [client.events, historyFilter]);

  const whatsappHref =
    client.maintenanceItems?.length
      ? buildMaintenanceWhatsAppLink(client.name, client.phone, client.maintenanceItems, {
          eventType: client.eventType,
          daysUntil: client.daysUntilAnniversary,
        })
      : client.daysUntilAnniversary != null
        ? buildOpportunityWhatsAppLink(client.name, client.phone, {
            eventType: client.eventType,
            eventDetail: client.eventDetail,
            honoreeName: client.honoreeName,
            daysUntil: client.daysUntilAnniversary,
            maintenanceItems: client.maintenanceItems,
          })
        : getWhatsAppLink(
          client.phone,
          `Olá ${client.name.split(' ')[0]}! Clube Panda: você tem ${clubeView.playCoins} Panda Coins. Vamos agendar o próximo serviço?`
        );

  const sendEvaluationLink = async (event: AppEvent) => {
    const url = buildEvaluationUrl(event.id, event.unitId || unitId);
    const msg = buildEvaluationWhatsAppMessage(event.client, url, { includeRoles: true });
    window.open(getWhatsAppLink(event.phone, msg), '_blank');
    const ok = await copyToClipboard(url);
    setEvalMsg(ok ? `Link copiado: ${url}` : `Link: ${url}`);
  };

  const openEvaluationFormPreview = (event: AppEvent) => {
    const url = buildEvaluationUrl(event.id, event.unitId || unitId);
    window.open(url, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-[#0f172a99] p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="app-modal w-full max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6 pb-4 border-b border-[var(--color-border)] flex justify-between items-start shrink-0">
          <div>
            <p className="text-[10px] font-bold text-primary-400 uppercase tracking-wider">
              {unitDisplayName(unitId)} · cliente
            </p>
            <h2 className="text-xl sm:text-2xl font-black text-[var(--color-text)]">
              {formatLeadTitle(client.eventType, client.honoreeName, client.name)}
            </h2>
            <p className="text-[var(--color-text-muted)] font-medium">{client.phone}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          <ClientClubePlaySection
            name={client.name}
            phone={client.phone}
            unitId={unitId}
            events={client.events}
            view={clubeView}
            onUpdated={() => setLoyaltyTick((t) => t + 1)}
          />

          <ReferralEarningsBadge phone={client.phone} />

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total em eventos</p>
              <p className="text-lg font-black text-primary-900">R$ {client.totalSpent.toFixed(2)}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Serviços</p>
              <p className="text-lg font-black text-primary-900">{client.rentalsCount}</p>
            </div>
          </div>

          {client.equipments.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Equipamentos já locados</p>
              <div className="flex flex-wrap gap-2">
                {client.equipments.map((eq) => (
                  <span
                    key={eq}
                    className="bg-primary-50 text-primary-700 text-xs font-bold px-3 py-1.5 rounded-lg"
                  >
                    {eq}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Histórico ({filteredEvents.length})
              </p>
              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value as HistoryFilter)}
                className="app-input !py-1.5 !px-2 text-xs font-bold w-auto"
              >
                <option value="todos">Todos</option>
                <option value="abertos">Em aberto</option>
                <option value="finalizados">Finalizados</option>
                <option value="cancelados">Cancelados</option>
              </select>
            </div>
            {evalMsg && (
              <p className="text-[10px] font-bold text-emerald-800 bg-emerald-50 rounded-lg px-2 py-1 mb-2">
                {evalMsg}
              </p>
            )}
            <div className="space-y-2 max-h-64 sm:max-h-80 overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum evento neste filtro.</p>
              ) : (
                filteredEvents.map((event) => {
                  const ev = evaluationByEventId.get(event.id);
                  const finalized = isFinalizedEvent(event);
                  return (
                    <div
                      key={event.id}
                      className="border border-[var(--color-border)] rounded-xl p-3 text-sm bg-[var(--color-surface-muted)]"
                    >
                      <div className="flex justify-between items-start gap-2 font-bold text-[var(--color-text)]">
                        <span>{new Date(event.date).toLocaleDateString('pt-BR')}</span>
                        <span
                          className={`text-[10px] uppercase shrink-0 ${
                            event.financialStatus === 'Pago'
                              ? 'text-emerald-700'
                              : event.status === 'cancelled'
                                ? 'text-red-600'
                                : 'text-amber-700'
                          }`}
                        >
                          {event.financialStatus}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{dealHandlerLabel(event)}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{event.address}</span>
                      </p>
                      <p className="text-xs text-slate-600 mt-1">{event.equipments.join(', ')}</p>

                      {finalized && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          {ev ? (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <Star
                                    key={n}
                                    className={`w-3.5 h-3.5 ${
                                      n <= Math.round(ev.averageScore)
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-slate-200'
                                    }`}
                                  />
                                ))}
                                <span className="text-xs font-bold text-amber-800 ml-1">
                                  {ev.averageScore.toFixed(1)} · avaliou
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setViewEvaluation(ev)}
                                className="text-[10px] font-bold text-primary-700 underline"
                              >
                                Ver avaliação completa
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-slate-500">Ainda não avaliou</p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => sendEvaluationLink(event)}
                                  className="flex-1 min-w-[120px] text-[10px] font-bold bg-[#25D366] text-white py-2 px-2 rounded-lg flex items-center justify-center gap-1"
                                >
                                  <Send className="w-3 h-3" />
                                  Enviar link (WhatsApp)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEvaluationFormPreview(event)}
                                  className="text-[10px] font-bold border border-primary-200 text-primary-800 py-2 px-2 rounded-lg flex items-center justify-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Ver formulário
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] shrink-0">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#25D366] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            {client.maintenanceItems?.length
              ? 'WhatsApp manutenção (1 ano)'
              : client.daysUntilAnniversary != null
                ? 'Enviar oferta ao cliente'
                : WHATSAPP_LABELS.client}
          </a>
        </div>
      </div>

      {viewEvaluation && (
        <EvaluationDetailModal evaluation={viewEvaluation} onClose={() => setViewEvaluation(null)} />
      )}
    </div>
  );
}
