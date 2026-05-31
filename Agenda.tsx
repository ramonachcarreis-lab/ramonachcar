import { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  FileText,
  MessageCircle,
  X,
  DollarSign,
  Package,
  CheckCircle,
  Trash2,
  Navigation2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCountdown, getSetupCountdownSeconds } from '../utils/eventTimers';
import { useNavigate } from 'react-router-dom';
import CalendarView from '../components/CalendarView';
import { isSameDay } from 'date-fns';
import { useSettings } from '../context/SettingsContext';
import { useEvents, AppEvent } from '../context/EventsContext';
import { useToast } from '../context/ToastContext';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useFinancials } from '../context/FinancialsContext';
import { getWhatsAppLink } from '../utils/formatters';
import {
  buildCommercialWhatsAppHref,
  canContactClientInAgenda,
  WHATSAPP_LABELS,
} from '../utils/whatsappContact';
import { isAnyCommercialDeal } from '../utils/crmAccess';
import { commercialDealHint, contactClientBlockedHint } from '../utils/displayLabels';
import { getMapsLink } from '../utils/units';
import { useAuth } from '../context/AuthContext';
import {
  canAcknowledgeSale,
  canCancelEvent,
  canMarkAsPaid,
  canNotifyEnRoute,
} from '../utils/workflowGuards';
import { buildEnRouteWhatsAppHref } from '../utils/whatsappContact';
import { resolveDateHoldStatus } from '../utils/dateHold';
import {
  agendaDaySortPriority,
  getAgendaDayBadge,
  isAgendaDayEvent,
  isLicenseeCommercialHandoff,
  showLicenseeAckButton,
  showLicenseeMarkPaid,
  showLicenseeNotifyEnRoute,
} from '../utils/agendaEvents';
import { useViewMode } from '../hooks/useViewMode';
import ViewModeToggle from '../components/ViewModeToggle';
import { APP_VIEW_MODE_KEY, cardsContainer } from '../utils/viewModeLayout';
import {
  eventServiceItemLabels,
  resolveEstimatedServiceHours,
  formatEstimatedHoursLabel,
} from '../utils/eventServiceDisplay';
import ClientTrackingLink from '../components/ClientTrackingLink';

export default function Agenda() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { events, fieldHydrating, markAsPaid, cancelEvent, notifyEnRoute, acknowledgeByLicensee } =
    useEvents();
  const toast = useToast();
  const { addTransaction } = useFinancials();
  const { session } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const { mode: viewMode, setMode: setViewMode } = useViewMode('grid', APP_VIEW_MODE_KEY);

  const visibleEvents = events.filter((event) => {
    if (session?.role === 'commercial') return true;
    return (event.unitId || 'sp-centro') === session?.unitId;
  });
  const filteredEvents = useMemo(
    () =>
      visibleEvents
        .filter((e) => isSameDay(e.date, selectedDate))
        .filter(isAgendaDayEvent)
        .sort((a, b) => agendaDaySortPriority(a) - agendaDaySortPriority(b)),
    [visibleEvents, selectedDate]
  );

  const calendarEvents = visibleEvents
    .filter((e) => e.status !== 'cancelled')
    .map((e) => {
      const hold = resolveDateHoldStatus(e);
      const dateHold =
        hold === 'closed' ? 'closed' : hold === 'reserved' ? 'reserved' : hold === 'negotiating' ? 'negotiating' : undefined;
      return {
        date: e.date,
        status: (e.status === 'confirmed' ? 'confirmed' : 'pending') as
          | 'confirmed'
          | 'pending'
          | 'maintenance',
        dateHold,
      };
    });

  const handleMarkPaid = () => {
    if (!selectedEvent) return;
    const guard = canMarkAsPaid(selectedEvent);
    if (!guard.ok) {
      toast.error(guard.reason);
      return;
    }
    if (!markAsPaid(selectedEvent.id)) return;
    addTransaction({
      id: Date.now(),
      type: 'income',
      desc: `Serviço ${selectedEvent.client}`,
      amount: selectedEvent.totalValue || 0,
      date: 'Hoje, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      eventId: selectedEvent.id,
    });
    setSelectedEvent({ ...selectedEvent, financialStatus: 'Pago', status: 'confirmed' });
  };

  const handleCancelEvent = () => {
    if (!selectedEvent) return;
    const guard = canCancelEvent(selectedEvent);
    if (!guard.ok) {
      toast.error(guard.reason);
      return;
    }
    if (!window.confirm(`Cancelar o evento de ${selectedEvent.client}? O registro permanece no histórico.`)) {
      return;
    }
    cancelEvent(selectedEvent.id);
    setSelectedEvent(null);
  };

  const handleNotifyEnRoute = () => {
    if (!selectedEvent) return;
    const guard = canNotifyEnRoute(selectedEvent);
    if (!guard.ok) {
      toast.error(guard.reason);
      return;
    }
    if (!notifyEnRoute(selectedEvent.id)) return;
    const href = buildEnRouteWhatsAppHref(selectedEvent);
    window.open(href, '_blank', 'noopener,noreferrer');
    setSelectedEvent(null);
    navigate('/tempo', { state: { highlightId: selectedEvent.id } });
  };

  const handoff = selectedEvent ? isLicenseeCommercialHandoff(selectedEvent) : false;
  const ackGuard = selectedEvent ? canAcknowledgeSale(selectedEvent) : null;
  const enRouteGuard = selectedEvent ? canNotifyEnRoute(selectedEvent) : null;
  const payGuard = selectedEvent ? canMarkAsPaid(selectedEvent) : null;
  const showAck = selectedEvent ? showLicenseeAckButton(selectedEvent) : false;
  const showPay = selectedEvent ? showLicenseeMarkPaid(selectedEvent) : false;
  const showNotify = selectedEvent ? showLicenseeNotifyEnRoute(selectedEvent, new Date()) : false;

  return (
    <div className="page-container pt-8 pb-24">
      <header className="mb-4">
        <h1 className="page-heading">Agenda</h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Serviços agendados · &quot;Estou a caminho&quot; abre o deslocamento em Tempo
        </p>
      </header>

      <div className="mb-4 space-y-3">
        <button
          type="button"
          onClick={() => setCalendarOpen((o) => !o)}
          className="w-full app-panel flex items-center justify-between gap-3 py-3 px-4 hover:border-[var(--color-border-strong)] transition-colors"
          aria-expanded={calendarOpen}
          aria-label={calendarOpen ? 'Recolher calendário' : 'Expandir calendário'}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5 text-[var(--bg-canvas)]" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)] tracking-wider">
                Data selecionada
              </p>
              <p className="text-lg font-black text-[var(--color-text)] capitalize">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
          {calendarOpen ? (
            <ChevronUp className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" />
          )}
        </button>

        {calendarOpen && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <CalendarView events={calendarEvents} onSelectDate={setSelectedDate} />
            <p className="text-[10px] text-[var(--color-text-muted)] flex flex-wrap gap-3 justify-center">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Em negociação
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> Reservada (sinal)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600" /> Fechada
              </span>
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          <button
            type="button"
            onClick={() =>
              navigate('/crm', { state: { quickRegister: true, contractEntry: true } })
            }
            className="btn-primary px-4 py-2.5 text-sm shrink-0"
            title="Proposta, contrato e assinatura remota (mesmo fluxo do CRM)"
          >
            <FileText className="w-5 h-5" />
            Novo Contrato
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="mb-2">
          <h2 className="text-lg font-bold text-[var(--color-text)]">Eventos do Dia</h2>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
            Km e combustível são calculados em Logística ao concluir os serviços no Tempo (sede →
            clientes → sede).
          </p>
        </div>
        
        {fieldHydrating ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="empty-state-panel">
            <p className="font-medium">Nenhum evento negociado ou pago nesta data.</p>
          </div>
        ) : (
          <div className={cardsContainer(viewMode, 'grid gap-3 sm:grid-cols-2')}>
          {filteredEvents.map((event) => {
            const setupSec = getSetupCountdownSeconds(event);
            const badge = getAgendaDayBadge(event);
            const estHours = resolveEstimatedServiceHours(event);
            const itemLabels = eventServiceItemLabels(event);
            return (
            <div 
              key={event.id} 
              onClick={() => setSelectedEvent(event)}
              className={`app-stat-card app-card-interactive relative overflow-hidden cursor-pointer ${
                viewMode === 'list' ? 'p-3 flex flex-wrap items-center gap-3' : 'p-5'
              }`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${badge.borderClass}`} />
              
              <div className={`flex-1 min-w-0 ${viewMode === 'list' ? '' : 'w-full'}`}>
              <div className="flex justify-between items-start gap-2 mb-1">
                <h3 className="font-bold text-[var(--color-text)]">{event.client}</h3>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${badge.badgeClass}`}>
                  {badge.label}
                </span>
              </div>

              {viewMode === 'grid' ? (
                <>
              <p className="text-xs font-bold text-primary-300 bg-primary-950/60 border border-primary-800/40 rounded-lg px-2 py-1.5 mb-2 inline-block">
                {formatCountdown(setupSec)}
              </p>
              <div className="space-y-2 text-sm text-slate-600 font-medium">
                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {event.time}
                  {estHours != null && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                      {formatEstimatedHoursLabel(estHours)}
                    </span>
                  )}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{event.address}</span>
                </p>
              </div>
              {itemLabels.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                  {itemLabels.map((eq) => (
                    <span
                      key={eq}
                      className="bg-slate-50 text-slate-500 text-xs font-bold px-2 py-1 rounded-lg"
                    >
                      {eq}
                    </span>
                  ))}
                </div>
              )}
                </>
              ) : (
                <p className="text-xs text-slate-500">
                  {formatCountdown(setupSec)} · {event.time}
                  {estHours != null ? ` · ${formatEstimatedHoursLabel(estHours)}` : ''}
                </p>
              )}
              </div>
            </div>
          );
          })}
          </div>
        )}
      </div>

      {/* Bottom Sheet / Modal for Event Details */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[#0f172a99] backdrop-blur-sm p-0 sm:p-6 animate-in fade-in duration-200">
          <div 
            className="bg-white w-full max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 pb-4 border-b border-slate-100 shrink-0 flex justify-between items-start">
              <div>
                <span
                  className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full mb-2 ${
                    getAgendaDayBadge(selectedEvent).badgeClass
                  }`}
                >
                  {selectedEvent.pickedUp
                    ? 'Retirado'
                    : selectedEvent.isDelivered
                      ? 'Em Andamento'
                      : getAgendaDayBadge(selectedEvent).label}
                </span>
                <h2 className="text-2xl font-black text-slate-800 leading-tight">{selectedEvent.client}</h2>
                {selectedEvent.workOrderNumber && (
                  <p className="text-xs font-mono text-primary-700 mt-1">{selectedEvent.workOrderNumber}</p>
                )}
              </div>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Horário</p>
                    <p className="font-medium text-slate-700">{selectedEvent.time}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Financeiro</p>
                    <p className={`font-bold ${selectedEvent.financialStatus === 'Pago' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {selectedEvent.financialStatus}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[#FFC10733] text-amber-600 rounded-xl">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Itens do serviço</p>
                    <p className="font-medium text-slate-700">
                      {eventServiceItemLabels(selectedEvent).join(' · ') || '—'}
                    </p>
                    {resolveEstimatedServiceHours(selectedEvent) != null && (
                      <p className="text-xs font-bold text-amber-800 mt-1">
                        Tempo estimado na equipe:{' '}
                        {formatEstimatedHoursLabel(resolveEstimatedServiceHours(selectedEvent)!)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {selectedEvent.financialStatus === 'Pago' && selectedEvent.publicTrackingToken && (
                <ClientTrackingLink event={selectedEvent} />
              )}

              <div className="space-y-3">
                {canContactClientInAgenda(selectedEvent, session?.role) ? (
                  <a
                    href={getWhatsAppLink(
                      selectedEvent.phone,
                      `Olá, sou da Estofado Pro. Estou entrando em contato sobre o evento: ${selectedEvent.client}.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-colors shadow-sm shadow-[0_1px_2px_#25D36633]"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {WHATSAPP_LABELS.client}
                  </a>
                ) : session?.role === 'licensee' ? (
                  <>
                    <p className="text-xs font-bold text-violet-800 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
                      {contactClientBlockedHint(selectedEvent)}
                    </p>
                    {isAnyCommercialDeal(selectedEvent) && buildCommercialWhatsAppHref(selectedEvent) && (
                      <a
                        href={buildCommercialWhatsAppHref(selectedEvent)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-primary-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-5 h-5" />
                        {WHATSAPP_LABELS.commercial}
                      </a>
                    )}
                  </>
                ) : null}

                <a
                  href={getMapsLink(selectedEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
                >
                  <MapPin className="w-5 h-5" />
                  Abrir localização
                </a>

                {handoff &&
                  session?.role === 'licensee' &&
                  selectedEvent.financialStatus !== 'Pago' && (
                  <p className="text-xs font-bold text-violet-800 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
                    {commercialDealHint(selectedEvent)}
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                Gestão do Evento
              </h3>

              <div className="space-y-3">
                {showAck && (
                  <button
                    type="button"
                    disabled={ackGuard != null && !ackGuard.ok}
                    title={ackGuard && !ackGuard.ok ? ackGuard.reason : undefined}
                    onClick={() => {
                      if (!acknowledgeByLicensee(selectedEvent.id)) {
                        const g = canAcknowledgeSale(selectedEvent);
                        if (!g.ok) toast.error(g.reason);
                        return;
                      }
                      setSelectedEvent({
                        ...selectedEvent,
                        licenseeAckAt: new Date().toISOString(),
                      });
                    }}
                    className="w-full bg-amber-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Confirmar serviço
                  </button>
                )}

                {handoff && !selectedEvent.commercialClosed && (
                  <p className="text-sm font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    Aguardando fechamento e pagamento no painel do negócio do responsável comercial.
                  </p>
                )}

                {handoff &&
                  selectedEvent.commercialClosed &&
                  selectedEvent.financialStatus === 'Pendente' && (
                    <p className="text-sm font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3">
                      Liberação após pagamento confirmado e contrato assinado no painel do negócio.
                    </p>
                  )}

                {handoff &&
                  selectedEvent.financialStatus === 'Pago' &&
                  !selectedEvent.contractSignatures?.client?.imageDataUrl &&
                  !showAck && (
                    <p className="text-sm font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3">
                      Aguardando assinatura do contrato pelo cliente.
                    </p>
                  )}

                {showNotify && (
                  <button
                    type="button"
                    disabled={enRouteGuard != null && !enRouteGuard.ok}
                    title={enRouteGuard && !enRouteGuard.ok ? enRouteGuard.reason : undefined}
                    onClick={handleNotifyEnRoute}
                    className="w-full bg-sky-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-sky-700 transition-colors disabled:opacity-50"
                  >
                    <Navigation2 className="w-5 h-5" />
                    Estou a caminho (abre Tempo)
                  </button>
                )}

                {selectedEvent.financialStatus === 'Pago' &&
                  !selectedEvent.isDelivered &&
                  !showNotify &&
                  !showAck && (
                    <p className="text-sm font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3">
                      Operação no dia do serviço (
                      {new Date(selectedEvent.date).toLocaleDateString('pt-BR')}).
                    </p>
                  )}

                {showPay && (
                  <button
                    type="button"
                    disabled={payGuard != null && !payGuard.ok}
                    title={payGuard && !payGuard.ok ? payGuard.reason : undefined}
                    onClick={handleMarkPaid}
                    className="w-full bg-green-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Marcar como Pago
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCancelEvent}
                  className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  Cancelar Evento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
