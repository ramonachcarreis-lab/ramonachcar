import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Navigation, Fuel, Loader2, Truck, Wrench } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import TimerCard from '../components/TimerCard';
import type { AppEvent } from '../context/EventsContext';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useFinancials } from '../context/FinancialsContext';
import { isSameDay } from 'date-fns';
import { dismantleHint } from '../utils/pickupPriority';
import { useLogisticsRoute } from '../hooks/useLogisticsRoute';
import { wasLogisticsExpensePosted } from '../utils/dayLogisticsExpense';
import { postLogisticsFuelExpense } from '../utils/postLogisticsExpense';
import { buildLogisticsStops } from '../utils/logisticsPlanner';
import { addUnitKmDriven } from '../utils/licenseeMaintenance';
import { useViewMode } from '../hooks/useViewMode';
import ViewModeToggle from '../components/ViewModeToggle';
import { APP_VIEW_MODE_KEY, cardsContainer } from '../utils/viewModeLayout';
import { isLicenseeTempoListed, isEnRouteDisplacement, isServiceInExecution } from '../utils/serviceExecution';
import { useTechnicianGeo } from '../hooks/useTechnicianGeo';
import { useProximityAlerts } from '../hooks/useProximityAlerts';
import ProximityAlertBanner from '../components/ProximityAlertBanner';
import { PROXIMITY_ALERT_KM } from '../config/proximity';

export default function Timers() {
  const { events, markAsPickedUp, notifyPickup, startRental, updateEvent, addTimelineNote } =
    useEvents();
  const { session } = useAuth();
  const { settings } = useSettings();
  const { addTransaction } = useFinancials();
  const navigate = useNavigate();
  const location = useLocation();
  const highlightId = location.state?.openEventId ?? location.state?.highlightId;
  const [postingExpense, setPostingExpense] = useState(false);
  const { mode: viewMode, setMode: setViewMode } = useViewMode('grid', APP_VIEW_MODE_KEY);

  const unitId = session?.unitId || 'sp-centro';
  const geo = useTechnicianGeo(unitId, true);
  const now = new Date();
  const dayKey = now.toDateString();

  const tempoEvents = useMemo(
    () =>
      events
        .filter((e) => (e.unitId || 'sp-centro') === unitId)
        .filter((e) => isLicenseeTempoListed(e))
        .filter((e) => isSameDay(new Date(e.date), now))
        .sort(
          (a, b) =>
            new Date(a.enRouteNotifiedAt || a.mountedAt || a.actualStartTime || 0).getTime() -
            new Date(b.enRouteNotifiedAt || b.mountedAt || b.actualStartTime || 0).getTime()
        ),
    [events, unitId, dayKey]
  );

  const enRouteEvents = tempoEvents.filter(isEnRouteDisplacement);
  const executionEvents = tempoEvents.filter(isServiceInExecution);
  const proximityAlerts = useProximityAlerts(events, geo.lat, geo.lng);

  const handleProximitySent = (eventId: number, distanceKm: number) => {
    const nowIso = new Date().toISOString();
    const km = Math.round(distanceKm * 10) / 10;
    updateEvent(
      eventId,
      {
        proximityNotifiedAt: nowIso,
        proximityDistanceKm: km,
      },
      'Licenciado'
    );
    addTimelineNote(
      eventId,
      `Cliente avisado a ~${km} km — rastreio e avaliação (licenciado + comercial).`,
      'Licenciado'
    );
  };

  const enRouteMissingGeo = enRouteEvents.filter((e) => e.lat == null || e.lng == null);

  const todayStops = useMemo(
    () => buildLogisticsStops(events, { date: now, unitId }),
    [events, unitId, dayKey]
  );

  const allPickedUpToday =
    todayStops.length > 0 && todayStops.every((s) => s.pickedUp);

  const routeAddresses = useMemo(
    () => todayStops.map((s) => s.address),
    [todayStops]
  );

  const hq =
    settings.headquarters_address ||
    [settings.headquarters.logradouro, settings.headquarters.numero, settings.headquarters.cidade]
      .filter(Boolean)
      .join(', ');

  const { distanceKm, cost, calculate, isCalculating, mapsAvailable } = useLogisticsRoute({
    headquarters: hq,
    waypoints: routeAddresses,
    fuelPrice: Number(settings.current_fuel_price) || 5.5,
    kmPerLiter: Number(settings.vehicle_km_per_liter) || 10,
    enabled: allPickedUpToday && routeAddresses.length > 0,
  });

  const expenseAlreadyPosted = wasLogisticsExpensePosted(unitId, now);
  const priorityHint = useMemo(() => dismantleHint(tempoEvents), [tempoEvents]);
  const lastGeoSyncRef = useRef(0);

  const handleStartOnSite = (id: number) => {
    const ok = startRental(id);
    if (ok) {
      navigate('/tempo', { state: { highlightId: id }, replace: true });
    }
    return ok;
  };

  useEffect(() => {
    if (geo.lat == null || geo.lng == null) return;
    const nowTs = Date.now();
    if (nowTs - lastGeoSyncRef.current < 15000) return;
    lastGeoSyncRef.current = nowTs;
    tempoEvents
      .filter((event) => !event.pickedUp && (event.enRouteNotifiedAt || event.isDelivered))
      .forEach((event) => {
        updateEvent(
          event.id,
          {
            technicianLat: geo.lat,
            technicianLng: geo.lng,
            technicianGeoUpdatedAt: new Date().toISOString(),
          },
          'GPS licenciado'
        );
      });
  }, [geo.lat, geo.lng, tempoEvents, updateEvent]);

  useEffect(() => {
    if (!allPickedUpToday || expenseAlreadyPosted || postingExpense) return;
    if (distanceKm == null || cost == null || cost <= 0) return;
    setPostingExpense(true);
    postLogisticsFuelExpense({
      unitId,
      date: now,
      distanceKm,
      fuelCost: cost,
      stopCount: todayStops.length,
      addTransaction,
    });
    addUnitKmDriven(unitId, distanceKm);
    setPostingExpense(false);
  }, [
    allPickedUpToday,
    expenseAlreadyPosted,
    postingExpense,
    distanceKm,
    cost,
    unitId,
    now,
    todayStops.length,
    addTransaction,
  ]);

  const renderSection = (title: string, icon: typeof Truck, list: AppEvent[], emptyMsg: string) => (
    <section className="space-y-3">
      <h2 className="text-sm font-black text-[var(--color-text)] flex items-center gap-2 uppercase tracking-wide">
        {icon === Truck ? <Truck className="w-4 h-4 text-sky-400" /> : <Wrench className="w-4 h-4 text-emerald-400" />}
        {title}
        <span className="text-[10px] font-bold text-[var(--color-text-muted)]">({list.length})</span>
      </h2>
      {list.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)] app-panel-muted !py-3 text-center">{emptyMsg}</p>
      ) : (
        <div className={cardsContainer(viewMode, 'grid gap-3 sm:grid-cols-2')}>
          {list.map((event) => (
            <div
              key={event.id}
              className={highlightId === event.id ? 'ring-2 ring-primary-400 rounded-2xl' : ''}
            >
              <TimerCard
                data={event}
                onComplete={markAsPickedUp}
                onStartOnSite={handleStartOnSite}
                onNotifyPickup={notifyPickup}
                onUpdateChecklist={(id, checklist) =>
                  updateEvent(id, { serviceChecklist: checklist }, 'Tempo')
                }
                onUpdateEvidence={(id, patch) => updateEvent(id, patch, 'Tempo')}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="page-container pt-8 pb-24">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-primary-900 tracking-tight">Tempo</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Deslocamento e execução — alerta ao cliente a {PROXIMITY_ALERT_KM} km (licenciado)
          </p>
        </div>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </header>

      {geo.lat != null && (
        <p className="text-[10px] font-bold text-emerald-700 mb-3">
          {geo.watching
            ? 'GPS ativo'
            : geo.usingSaved
              ? 'Posição da unidade em uso (salva)'
              : 'Localização disponível'}
          {` · ${geo.lat.toFixed(4)}, ${geo.lng?.toFixed(4)}`}
        </p>
      )}
      {geo.error && geo.lat == null && (
        <p className="text-[10px] font-bold text-amber-700 mb-3">{geo.error}</p>
      )}

      <ProximityAlertBanner alerts={proximityAlerts} onSent={handleProximitySent} />

      {enRouteMissingGeo.length > 0 && (
        <p className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          {enRouteMissingGeo.length} deslocamento(s) sem coordenadas no mapa — cadastre lat/lng no
          endereço para o alerta de {PROXIMITY_ALERT_KM} km.
        </p>
      )}

      {priorityHint && (
        <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs font-bold text-indigo-900 flex gap-2">
          <Navigation className="w-4 h-4 shrink-0" />
          {priorityHint}
        </div>
      )}

      {tempoEvents.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-medium">Nenhum deslocamento ou serviço ativo.</p>
          <p className="text-xs mt-1">
            Serviços pagos do dia aparecem aqui após &quot;Estou a caminho&quot; na Agenda.
          </p>
          <button
            type="button"
            onClick={() => navigate('/agenda')}
            className="mt-4 text-xs font-bold text-primary-700 underline"
          >
            Ir para Agenda
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {renderSection(
            'A caminho',
            Truck,
            enRouteEvents,
            'Nenhum deslocamento ativo. Na Agenda, toque em "Estou a caminho" ao sair.'
          )}
          {renderSection(
            'Em execução',
            Wrench,
            executionEvents,
            'Ao chegar no cliente, toque em &quot;Cheguei — iniciar serviço&quot;.'
          )}
        </div>
      )}

      {allPickedUpToday && (
        <div className="mt-6 bg-slate-900 text-white rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1">
            <Fuel className="w-4 h-4" />
            Encerrar dia — despesa logística
          </p>
          <p className="text-sm text-slate-300">
            Rota: sede → {routeAddresses.length} evento(s) → sede. Combustível calculado automaticamente.
          </p>
          {distanceKm != null && cost != null && (
            <p className="text-lg font-black">
              {distanceKm.toFixed(1)} km · R$ {cost.toFixed(2)}
            </p>
          )}
          <div className="w-full bg-emerald-950/40 border border-emerald-700 text-emerald-200 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
            {postingExpense || isCalculating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processando rota automática...
              </>
            ) : expenseAlreadyPosted ? (
              'Despesa lançada automaticamente em Finanças'
            ) : mapsAvailable ? (
              'Lançamento automático ao fechar rota do dia'
            ) : (
              'Aguardando cálculo da rota automática'
            )}
          </div>
        </div>
      )}
    </div>
  );
}
