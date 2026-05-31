import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { clsx } from 'clsx';
import {
  Calendar,
  MapPin,
  Building2,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react';
import { isSameDay, startOfDay } from 'date-fns';
import { useEvents, type AppEvent } from '../context/EventsContext';
import { useLicensees } from '../context/LicenseesContext';
import { useAuth } from '../context/AuthContext';
import { useCommercialProfile } from '../context/CommercialProfileContext';
import { filterMyCommercialClosed } from '../utils/commercialFilters';
import {
  filterNetworkAgenda,
  getEventSellerLabel,
  getEventExecutorLabel,
  isNetworkTempoActive,
} from '../utils/networkMacro';
import {
  buildClientWhatsAppHref,
  buildLicenseeWhatsAppHref,
} from '../utils/whatsappContact';
import MissionStatusIcon from '../components/MissionStatusIcon';
import { getUnitById } from '../utils/units';
import NetworkEventLiveBadge from '../components/NetworkEventLiveBadge';
import EventOperationsSheet from '../components/EventOperationsSheet';
import EventContactButtons from '../components/EventContactButtons';
import { useNowTick } from '../hooks/useNowTick';
import { useViewMode } from '../hooks/useViewMode';
import ViewModeToggle from '../components/ViewModeToggle';
import { APP_VIEW_MODE_KEY, cardsContainer } from '../utils/viewModeLayout';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AGENDA_CATEGORY_OPTIONS,
  matchesAgendaCategory,
  countByAgendaCategory,
  type AgendaCategoryFilter,
} from '../utils/agendaCategories';
import { isExcludedUnit } from '../utils/excludedUnits';

export default function AgendaComercial() {
  const { events } = useEvents();
  const { getLicensee } = useLicensees();
  const { session } = useAuth();
  const { profile: commercialProfile } = useCommercialProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = session?.role === 'admin';
  const commercialName = session?.name || commercialProfile.name;
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [categoryFilter, setCategoryFilter] = useState<AgendaCategoryFilter>('todos');

  useEffect(() => {
    const cat = (location.state as { agendaCategory?: AgendaCategoryFilter } | null)
      ?.agendaCategory;
    if (cat) setCategoryFilter(cat);
  }, [location.state]);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const now = useNowTick(1000);

  const sourceEvents = useMemo(() => {
    const base = isAdmin ? filterNetworkAgenda(events) : filterMyCommercialClosed(events, commercialName);
    return base.filter((e) => !isExcludedUnit(e.unitId));
  }, [events, isAdmin, commercialName]);

  const categoryCounts = useMemo(
    () => countByAgendaCategory(sourceEvents, now),
    [sourceEvents, now]
  );

  const dayEvents = useMemo(
    () =>
      sourceEvents
        .filter((e) => isSameDay(new Date(e.date), selectedDate))
        .filter((e) => matchesAgendaCategory(e, categoryFilter, now))
        .sort((a, b) => a.time.localeCompare(b.time)),
    [sourceEvents, selectedDate, categoryFilter, now]
  );

  const { mode: viewMode, setMode: setViewMode } = useViewMode('grid', APP_VIEW_MODE_KEY);

  return (
    <div className="page-container-wide">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text)]">
            {isAdmin ? 'Agenda da Rede' : 'Agenda Comercial'}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Toque no evento para ver detalhes · WhatsApp licenciado ou cliente
          </p>
        </div>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </header>

      <input
        type="date"
        value={selectedDate.toISOString().slice(0, 10)}
        onChange={(e) => setSelectedDate(startOfDay(new Date(e.target.value + 'T12:00:00')))}
        className="w-full mb-4 border-2 rounded-xl py-3 px-4 font-bold min-h-[48px]"
      />

      <div className="app-card-dark mb-4 space-y-2">
        <p className="text-xs font-black text-[var(--color-text-muted)] uppercase">
          Situação do evento
        </p>
        <div className="flex flex-wrap gap-2">
          {AGENDA_CATEGORY_OPTIONS.map((cat) => {
            const count =
              cat.id === 'todos'
                ? sourceEvents.filter((e) => isSameDay(new Date(e.date), selectedDate)).length
                : sourceEvents.filter(
                    (e) =>
                      isSameDay(new Date(e.date), selectedDate) &&
                      matchesAgendaCategory(e, cat.id, now)
                  ).length;
            const active = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-2 rounded-full text-xs font-bold border min-h-[40px] ${
                  active
                    ? 'bg-primary-600 text-white border-primary-500'
                    : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                }`}
              >
                {cat.label}
                {count > 0 ? (
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                      active ? 'bg-white/20' : 'bg-[var(--color-surface-elevated)]'
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-[var(--color-text-subtle)]">
          Filtro aplicado ao dia selecionado · rede: {categoryCounts.negociando} neg. ·{' '}
          {categoryCounts.aguardando} aguard. · {categoryCounts.em_execucao} exec.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-[var(--color-text)] flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {selectedDate.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
          <span className="text-xs font-bold text-[var(--color-text-muted)] bg-[var(--color-surface-muted)] px-2 py-0.5 rounded-full">
            {dayEvents.length}
          </span>
        </h2>

        {dayEvents.length === 0 ? (
          <div className="text-center py-10 text-[var(--color-text-muted)] app-panel-muted border border-dashed text-sm">
            {categoryFilter === 'todos'
              ? isAdmin
                ? 'Nenhum evento na rede neste dia.'
                : 'Nenhuma venda sua neste dia.'
              : 'Nenhum evento nesta categoria para o dia selecionado.'}
          </div>
        ) : (
          <div className={cardsContainer(viewMode, 'grid gap-3 sm:grid-cols-2')}>
            {dayEvents.map((event) => {
              const unit = getUnitById(event.unitId);
              const lic = getLicensee(event.unitId || 'sp-centro');
              const ack = Boolean(event.licenseeAckAt);
              const seller = getEventSellerLabel(event);
              const licenseeHref = lic.whatsapp
                ? buildLicenseeWhatsAppHref(event, lic.whatsapp, lic.name, {
                    isAdmin,
                    sellerLabel: seller,
                  })
                : null;
              const stop = (e: MouseEvent) => e.stopPropagation();

              return (
                <div
                  key={event.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedEvent(event)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedEvent(event);
                    }
                  }}
                  className={clsx(
                    'app-card-dark cursor-pointer hover:border-primary-300 active:scale-[0.99] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                    viewMode === 'list' ? '!p-3 flex flex-wrap items-center gap-3' : ''
                  )}
                >
                  <div
                    className={
                      viewMode === 'list' ? 'flex-1 min-w-[140px]' : 'flex justify-between gap-2 mb-2 w-full'
                    }
                  >
                    <div>
                      <p className="font-bold text-[var(--color-text)]">{event.client}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{unit.name}</p>
                      {isAdmin && (
                        <p className="text-[10px] font-bold text-primary-500 mt-1 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Vendeu: {seller}
                        </p>
                      )}
                    </div>
                    <MissionStatusIcon event={event} size="sm" />
                  </div>

                  {viewMode === 'grid' && (
                    <>
                      <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mb-2">
                        <Clock className="w-3.5 h-3.5" />
                        {event.time}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] flex items-start gap-1 mb-3">
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{event.address}</span>
                      </p>
                      <NetworkEventLiveBadge event={event} className="mb-3" />
                      {event.status === 'confirmed' && (
                        <div
                          className={`text-xs font-bold px-3 py-2 rounded-xl mb-3 flex items-center gap-2 ${
                            ack
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          {ack ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Building2 className="w-4 h-4" />
                          )}
                          {ack
                            ? `OK do licenciado · ${getEventExecutorLabel(event)}`
                            : `Aguardando OK · ${getEventExecutorLabel(event)}`}
                        </div>
                      )}
                    </>
                  )}

                  {viewMode === 'list' && (
                    <p className="text-[10px] text-[var(--color-text-muted)] shrink-0 hidden sm:block">
                      {event.time} · {event.financialStatus}
                    </p>
                  )}

                  <EventContactButtons
                    licenseeHref={licenseeHref}
                    clientHref={buildClientWhatsAppHref(event)}
                    onClickCapture={stop}
                    className={viewMode === 'list' ? 'shrink-0 max-w-[280px]' : ''}
                  />

                  {viewMode === 'grid' && (
                    <p className="text-[10px] text-center text-[var(--color-text-muted)] mt-2 font-bold uppercase">
                      Ver detalhes
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selectedEvent && (
        <EventOperationsSheet
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          showRentalTimer={isNetworkTempoActive(selectedEvent) && !selectedEvent.pickedUp}
          sellerLabel={isAdmin ? getEventSellerLabel(selectedEvent) : undefined}
          executorLabel={isAdmin ? getEventExecutorLabel(selectedEvent) : undefined}
          onOpenCrm={() => {
            setSelectedEvent(null);
            navigate('/crm', { state: { openDealId: selectedEvent.id } });
          }}
        />
      )}
    </div>
  );
}
