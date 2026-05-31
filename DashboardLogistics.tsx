import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Truck,
  MapPin,
  Fuel,
  CheckCircle2,
  PlayCircle,
  Circle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Calendar,
  Route,
  Wallet,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import CalendarView, { type CalendarDayEvent } from '../components/CalendarView';
import LogisticsMonthChart from '../components/LogisticsMonthChart';
import { useNavigate } from 'react-router-dom';
import { format, isSameDay, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEvents } from '../context/EventsContext';
import { useSettings } from '../context/SettingsContext';
import { useFinancials } from '../context/FinancialsContext';
import { useAuth } from '../context/AuthContext';
import { useLogisticsRoute } from '../hooks/useLogisticsRoute';
import {
  buildLogisticsStops,
  logisticsStopsSummary,
  reorderStopsByAddresses,
} from '../utils/logisticsPlanner';
import {
  getLogisticsDayRecord,
  listLogisticsRecordsForMonth,
  sumMonthLogisticsPosted,
  upsertLogisticsDayRecord,
  dateKeyFromDate,
} from '../utils/logisticsRecords';
import { postLogisticsFuelExpense } from '../utils/postLogisticsExpense';
import { wasLogisticsExpensePosted } from '../utils/dayLogisticsExpense';
import { optimizeEventOrder } from '../utils/routeOptimizer';
import { loadTechnicianLocation } from '../services/fieldOpsStorage';
import LiveLocationPreview from '../components/LiveLocationPreview';
import { mapsWarningForRole } from '../utils/mapsUi';

function formatPtMoney(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export default function DashboardLogistics() {
  const navigate = useNavigate();
  const { events } = useEvents();
  const { settings } = useSettings();
  const { addTransaction } = useFinancials();
  const { session } = useAuth();
  const unitId = session?.unitId || 'sp-centro';
  const isLicensee = session?.role === 'licensee';

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [routeOrderIds, setRouteOrderIds] = useState<number[] | null>(null);
  const [liveTechPos, setLiveTechPos] = useState<{ lat: number; lng: number; updatedAt?: string } | null>(
    null
  );

  const hq =
    settings.headquarters_address ||
    [
      settings.headquarters.logradouro,
      settings.headquarters.numero,
      settings.headquarters.cidade,
      settings.headquarters.uf,
    ]
      .filter(Boolean)
      .join(', ');

  const kmPerLiter = Number(settings.vehicle_km_per_liter) || 10;
  const fuelPrice = Number(settings.current_fuel_price) || 5.5;

  const rawStops = useMemo(
    () =>
      buildLogisticsStops(events, {
        date: selectedDate,
        unitId: session?.role === 'commercial' ? undefined : unitId,
        includeCommercial: session?.role === 'commercial',
      }),
    [events, selectedDate, unitId, session?.role]
  );

  const orderedStops = useMemo(() => {
    if (!routeOrderIds?.length) return rawStops;
    const byId = new Map(rawStops.map((s) => [s.eventId, s]));
    const ordered = routeOrderIds.map((id) => byId.get(id)).filter(Boolean) as typeof rawStops;
    const rest = rawStops.filter((s) => !routeOrderIds.includes(s.eventId));
    return [...ordered, ...rest];
  }, [rawStops, routeOrderIds]);

  const executedStops = useMemo(
    () => orderedStops.filter((s) => s.pickedUp),
    [orderedStops]
  );

  const allServicesDone =
    rawStops.length > 0 && rawStops.every((s) => s.pickedUp);

  const waypointAddresses = useMemo(
    () => executedStops.map((s) => s.address),
    [executedStops]
  );

  const {
    distanceKm,
    cost,
    routeError,
    providerLabel,
    approximate,
    warning,
    mapLinks,
    legs,
    orderedAddresses,
    isCalculating,
    calculate,
  } = useLogisticsRoute({
    headquarters: hq,
    waypoints: waypointAddresses,
    fuelPrice,
    kmPerLiter,
    enabled: executedStops.length > 0,
  });

  const displayWarning = mapsWarningForRole(warning, session?.role);

  const stops = useMemo(
    () => reorderStopsByAddresses(orderedStops, orderedAddresses || undefined),
    [orderedStops, orderedAddresses]
  );

  const handleOptimizeRoute = () => {
    const dayEvents = events.filter((e) => {
      if ((e.unitId || 'sp-centro') !== unitId) return false;
      if (e.status === 'cancelled') return false;
      return isSameDay(new Date(e.date), selectedDate);
    });
    const optimized = optimizeEventOrder(dayEvents, null, null);
    setRouteOrderIds(optimized.map((e) => e.id));
    calculate();
  };

  const stopSummary = logisticsStopsSummary(stops);

  const dayRecord = useMemo(
    () => getLogisticsDayRecord(unitId, selectedDate),
    [unitId, selectedDate, distanceKm, cost]
  );

  const isPosted = dayRecord?.postedAt || wasLogisticsExpensePosted(unitId, selectedDate);
  const hasValidRoute = distanceKm !== null && cost !== null;

  const chartMonth = useMemo(() => startOfMonth(selectedDate), [selectedDate]);
  const monthRows = useMemo(
    () =>
      listLogisticsRecordsForMonth(
        unitId,
        chartMonth.getFullYear(),
        chartMonth.getMonth()
      ),
    [unitId, chartMonth, events, cost]
  );
  const monthPosted = useMemo(
    () =>
      sumMonthLogisticsPosted(
        unitId,
        chartMonth.getFullYear(),
        chartMonth.getMonth()
      ),
    [unitId, monthRows, chartMonth]
  );

  const selectedDayKey = dateKeyFromDate(selectedDate);
  const todayKey = dateKeyFromDate(new Date());

  const monthEstimateKm = useMemo(() => {
    const start = startOfMonth(chartMonth);
    const end = endOfMonth(chartMonth);
    const daysWithService = new Set<string>();
    events.forEach((e) => {
      if ((e.unitId || 'sp-centro') !== unitId) return;
      if (e.status === 'cancelled') return;
      const d = new Date(e.date);
      if (!isWithinInterval(d, { start, end })) return;
      if (e.status === 'confirmed' || e.status === 'completed') {
        daysWithService.add(dateKeyFromDate(d));
      }
    });
    const postedKm = monthPosted.km;
    let extraKm = 0;
    if (
      selectedDayKey === todayKey &&
      daysWithService.has(todayKey) &&
      allServicesDone &&
      hasValidRoute &&
      !isPosted
    ) {
      extraKm = distanceKm || 0;
    }
    return Math.round((postedKm + extraKm) * 10) / 10;
  }, [
    events,
    unitId,
    monthPosted.km,
    allServicesDone,
    hasValidRoute,
    distanceKm,
    isPosted,
    chartMonth,
    selectedDayKey,
    todayKey,
  ]);

  const monthEstimateFuel = (monthEstimateKm / kmPerLiter) * fuelPrice;

  const logisticsCalendarEvents = useMemo((): CalendarDayEvent[] => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const recordByKey = new Map(monthRows.map((r) => [r.dateKey, r]));
    const stopsByKey = new Map<string, number>();

    events.forEach((e) => {
      if ((e.unitId || 'sp-centro') !== unitId) return;
      if (e.status === 'cancelled') return;
      const d = new Date(e.date);
      if (!isWithinInterval(d, { start, end })) return;
      if (e.status !== 'confirmed' && e.status !== 'completed' && e.status !== 'pending') {
        return;
      }
      const key = dateKeyFromDate(d);
      stopsByKey.set(key, (stopsByKey.get(key) || 0) + 1);
    });

    const keys = new Set([...stopsByKey.keys(), ...recordByKey.keys()]);
    const out: CalendarDayEvent[] = [];
    keys.forEach((key) => {
      const [y, m, d] = key.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const rec = recordByKey.get(key);
      const stops = stopsByKey.get(key) || 0;
      let dateHold: CalendarDayEvent['dateHold'];
      if (rec?.postedAt) dateHold = 'closed';
      else if (stops > 0) dateHold = 'reserved';
      else if (rec?.distanceKm) dateHold = 'negotiating';

      out.push({
        date,
        status: rec?.postedAt || stops > 0 ? 'confirmed' : 'pending',
        dateHold,
      });
    });
    return out;
  }, [events, unitId, monthRows, selectedDate]);

  useEffect(() => {
    if (allServicesDone && hasValidRoute && cost !== null && distanceKm !== null && !isPosted) {
      upsertLogisticsDayRecord({
        unitId,
        dateKey: dateKeyFromDate(selectedDate),
        distanceKm,
        fuelCost: cost,
        stopCount: stops.length,
        approximate,
        legs: legs || undefined,
      });
    }
  }, [
    allServicesDone,
    distanceKm,
    cost,
    isPosted,
    hasValidRoute,
    unitId,
    selectedDate,
    stops.length,
    approximate,
    legs,
  ]);

  const isToday = isSameDay(selectedDate, new Date());

  useEffect(() => {
    const sync = () => {
      const loc = loadTechnicianLocation(unitId);
      if (loc?.lat != null && loc?.lng != null) setLiveTechPos(loc);
      else setLiveTechPos(null);
    };
    sync();
    const timer = window.setInterval(sync, 10000);
    return () => window.clearInterval(timer);
  }, [unitId]);

  useEffect(() => {
    if (!allServicesDone || !hasValidRoute || cost == null || distanceKm == null || isPosted) return;
    postLogisticsFuelExpense({
      unitId,
      date: selectedDate,
      distanceKm,
      fuelCost: cost,
      stopCount: stops.length,
      provider: approximate ? 'estimate' : undefined,
      approximate,
      legs: legs || undefined,
      addTransaction,
    });
  }, [
    allServicesDone,
    hasValidRoute,
    cost,
    distanceKm,
    isPosted,
    unitId,
    selectedDate,
    stops.length,
    approximate,
    legs,
    addTransaction,
  ]);

  return (
    <div className="page-container pt-8 pb-24 max-w-lg mx-auto">
      <header className="mb-5 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="app-btn-icon">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="page-heading flex items-center gap-2">
            <Truck className="w-7 h-7 text-primary-400 shrink-0" />
            Logística
          </h1>
          <p className="page-subtitle text-sm">Rotas, combustível e despesas</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/calculadora-logistica')}
          className="text-[10px] font-bold text-primary-400 uppercase shrink-0"
        >
          Simular
        </button>
      </header>

      <div className="mb-4 space-y-3">
        <button
          type="button"
          onClick={() => setCalendarOpen((o) => !o)}
          className="w-full app-panel flex items-center justify-between gap-3 py-3 px-4 hover:border-[var(--color-border-strong)] transition-colors"
          aria-expanded={calendarOpen}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)] tracking-wider">
                Data da rota
              </p>
              <p className="text-lg font-black text-[var(--color-text)] capitalize truncate">
                {isToday
                  ? `Hoje — ${format(selectedDate, "d 'de' MMMM", { locale: ptBR })}`
                  : format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                {stopSummary.total} parada{stopSummary.total !== 1 ? 's' : ''} · {stopSummary.done}{' '}
                concluída{stopSummary.done !== 1 ? 's' : ''}
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
            <CalendarView
              events={logisticsCalendarEvents}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setRouteOrderIds(null);
              }}
            />
            <p className="text-[10px] text-[var(--color-text-muted)] flex flex-wrap gap-3 justify-center">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600" /> Despesa lançada
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> Serviços no dia
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Rota calculada
              </span>
            </p>
          </div>
        )}
      </div>

      <LogisticsMonthChart
        month={chartMonth}
        records={monthRows}
        todayKey={todayKey}
        selectedDayKey={selectedDayKey}
        onSelectDay={(d) => {
          setSelectedDate(d);
          setRouteOrderIds(null);
        }}
        todayEstimateKm={
          isSameDay(selectedDate, new Date()) && !isPosted && allServicesDone ? distanceKm || 0 : 0
        }
        todayEstimateFuel={
          isSameDay(selectedDate, new Date()) && !isPosted && allServicesDone && distanceKm
            ? cost || 0
            : 0
        }
        isTodayPosted={isPosted}
      />
      <p className="text-[10px] text-[var(--color-text-muted)] -mt-2 mb-4 text-center">
        Toque em um dia no gráfico para ver km e combustível daquela data.
      </p>

      <section className="app-panel mb-4 p-3">
        <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
          <Wallet className="w-3.5 h-3.5" />
          Resumo do mês — despesas lançadas
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-black text-[var(--color-text)]">{monthPosted.km}</p>
            <p className="text-[9px] font-bold uppercase text-[var(--color-text-muted)]">km real</p>
          </div>
          <div>
            <p className="text-lg font-black text-accent-coral">{formatPtMoney(monthPosted.fuel)}</p>
            <p className="text-[9px] font-bold uppercase text-[var(--color-text-muted)]">combustível</p>
          </div>
          <div>
            <p className="text-lg font-black text-[var(--color-text)]">{monthPosted.days}</p>
            <p className="text-[9px] font-bold uppercase text-[var(--color-text-muted)]">dias</p>
          </div>
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-2">
          Estimativa do mês (incl. hoje): ~{monthEstimateKm} km · ~
          {formatPtMoney(monthEstimateFuel)}
        </p>
      </section>

      {displayWarning && (
        <p className="mb-3 text-xs font-bold text-amber-400/90 app-panel-muted !py-2">{displayWarning}</p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="app-stat-card">
          <MapPin className="w-4 h-4 text-primary-400 mb-1" />
          <p className="stat-value text-2xl">
            {distanceKm !== null ? distanceKm.toFixed(1) : '—'}
            <span className="text-sm font-medium text-[var(--color-text-muted)] ml-1">km</span>
          </p>
          <p className="stat-label">Rota do dia</p>
          {providerLabel && (
            <p className="text-[9px] text-[var(--color-text-muted)] mt-1">
              {providerLabel}
              {approximate ? ' · estimativa' : ' · otimizada'}
            </p>
          )}
        </div>
        <div className="app-stat-card">
          <Fuel className="w-4 h-4 text-accent-coral mb-1" />
          <p className="stat-value text-2xl text-accent-coral">
            {cost !== null ? formatPtMoney(cost) : '—'}
          </p>
          <p className="stat-label">Combustível</p>
          <p className="text-[9px] text-[var(--color-text-muted)] mt-1">
            {kmPerLiter} km/L · R$ {fuelPrice.toFixed(2)}/L
          </p>
        </div>
      </div>

      <section className="app-panel mb-4 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
            <Route className="w-4 h-4 text-primary-400" />
            Trajeto do dia (automático)
          </h2>
          {!isLicensee && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleOptimizeRoute}
                disabled={rawStops.length < 2}
                className="text-[10px] font-bold text-emerald-600 disabled:opacity-40"
              >
                Otimizar ordem
              </button>
              <button
                type="button"
                onClick={() => calculate()}
                disabled={isCalculating || executedStops.length === 0}
                className="text-[10px] font-bold text-primary-400 flex items-center gap-1 disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
                Recalcular
              </button>
            </div>
          )}
        </div>

        <p className="text-[11px] text-[var(--color-text-muted)] mb-3">
          Sede → clientes atendidos → sede. O sistema calcula sozinho quando você conclui cada serviço
          no Tempo; não é preciso gerar rota manualmente.
        </p>

        {rawStops.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
            Nenhum serviço com endereço neste dia. Confira a Agenda.
          </p>
        ) : executedStops.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
            {rawStops.length} serviço(s) agendado(s). Ao concluir no Tempo, km e combustível aparecem aqui.
          </p>
        ) : (
          <div className="relative pl-4 border-l-2 border-[var(--color-border)] space-y-5">
            <div className="relative">
              <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary-500 border-2 border-[var(--color-bg-app)]" />
              <p className="text-xs font-bold text-[var(--color-text-muted)]">Sede — saída</p>
              <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2">{hq}</p>
            </div>

            {executedStops.map((stop, index) => (
              <div key={stop.eventId} className="relative">
                <div className="absolute -left-[25px] top-1 bg-[var(--color-bg-app)] rounded-full">
                  {stop.pickedUp ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : stop.isDelivered ? (
                    <PlayCircle className="w-5 h-5 text-primary-400" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-[var(--color-surface-muted)] text-[10px] font-black flex items-center justify-center text-[var(--color-text)]">
                      {index + 1}
                    </span>
                  )}
                </div>
                <div className="app-card-dark !p-3">
                  <div className="flex justify-between gap-2">
                    <p className="text-xs font-bold text-[var(--color-text-muted)]">{stop.time}</p>
                    {stop.financialStatus === 'Pago' && (
                      <span className="text-[9px] font-black uppercase text-emerald-500">Pago</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-[var(--color-text)]">{stop.client}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{stop.address}</p>
                </div>
              </div>
            ))}

            <div className="relative">
              <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary-500 border-2 border-[var(--color-bg-app)]" />
              <p className="text-xs font-bold text-[var(--color-text-muted)]">Sede — retorno</p>
            </div>
          </div>
        )}

        {legs && legs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
            <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)] mb-2">
              Trechos (km)
            </p>
            <ul className="space-y-1 max-h-36 overflow-y-auto">
              {legs.map((leg, i) => (
                <li
                  key={`${i}-${leg.from}`}
                  className="text-[10px] text-[var(--color-text-muted)] flex justify-between gap-2"
                >
                  <span className="truncate flex-1">
                    {leg.from} → {leg.to}
                  </span>
                  <span className="font-bold shrink-0">{leg.distanceKm.toFixed(1)} km</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {mapLinks && hasValidRoute && (
          <div className="flex flex-col gap-2 mt-4">
            <a
              href={mapLinks.google}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center text-xs font-bold py-2.5 rounded-xl border border-[var(--color-border)] flex items-center justify-center gap-2"
            >
              Abrir rota no Google Maps
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </section>

      {liveTechPos && (
        <section className="app-panel mb-4 p-4 space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-400" />
            Localização ao vivo do licenciado
          </h2>
          <LiveLocationPreview
            lat={liveTechPos.lat}
            lng={liveTechPos.lng}
            updatedAt={liveTechPos.updatedAt}
            compact
          />
        </section>
      )}

      <section className="app-panel p-4 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-500" />
          Despesa de combustível
        </h2>
        <p className="text-xs text-[var(--color-text-muted)]">
          Lança automaticamente em <strong>Finanças</strong> como despesa, com descrição{' '}
          <em>Combustível · Logística · data</em>.
        </p>

        {isPosted ? (
          <div className="tone-success tone-box text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            Despesa já lançada
            {dayRecord?.fuelCost != null && ` · ${formatPtMoney(dayRecord.fuelCost)}`}
          </div>
        ) : (
          <p className="text-sm font-bold text-emerald-300 bg-emerald-950/30 border border-emerald-700 rounded-xl px-3 py-2">
            Quando todos os serviços do dia estiverem concluídos, a despesa de combustível vai para
            Finanças automaticamente.
          </p>
        )}

        {routeError && (
          <p className="text-xs font-bold text-red-400 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {routeError}
          </p>
        )}
      </section>
    </div>
  );
}
