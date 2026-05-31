import { useState, useMemo } from 'react';
import {
  Users,
  CalendarCheck,
  TrendingUp,
  Settings as SettingsIcon,
  Truck,
  Fuel,
  MapPin,
  Star,
  Download,
} from 'lucide-react';
import { loadEvaluations, unitEvaluationSummary } from '../services/evaluationStorage';
import StarRating from '../components/StarRating';
import { downloadUnitEvaluationsPdf } from '../utils/evaluationExport';
import { useLicensees } from '../context/LicenseesContext';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '../context/EventsContext';
import { isSameDay, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { sumMonthLogisticsPosted } from '../utils/logisticsRecords';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { events } = useEvents();
  const { session } = useAuth();
  const { settings } = useSettings();
  const { getLicensee } = useLicensees();
  const [evalPdfLoading, setEvalPdfLoading] = useState(false);
  const toast = useToast();
  const unitId = session?.unitId || 'sp-centro';
  const evaluations = useMemo(() => loadEvaluations(), [events]);
  const unitRating = useMemo(
    () => unitEvaluationSummary(evaluations, unitId),
    [evaluations, unitId]
  );
  const visibleEvents = useMemo(
    () =>
      events.filter(
        (event) => session?.role === 'commercial' || (event.unitId || 'sp-centro') === unitId
      ),
    [events, session?.role, unitId]
  );

  const activeEventsCount = visibleEvents.filter(e => {
    const now = new Date();
    if (!isSameDay(e.date, now)) return false;
    if (e.pickedUp) return false;
    return Boolean(e.isDelivered);
  }).length;

  const todayEventsCount = visibleEvents.filter(e => isSameDay(e.date, new Date())).length;

  const todayRevenue = visibleEvents
    .filter((e) => isSameDay(e.date, new Date()) && e.financialStatus === 'Pago')
    .reduce((sum, e) => sum + (e.totalValue || 0), 0);

  const kmPerLiter = Number(settings.vehicle_km_per_liter) || 10;
  const fuelPrice = Number(settings.current_fuel_price) || 5.5;

  const monthLogistics = useMemo(() => {
    const now = new Date();
    const posted = sumMonthLogisticsPosted(unitId, now.getFullYear(), now.getMonth());
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    let pendingDays = 0;
    visibleEvents.forEach((e) => {
      if (e.status === 'cancelled') return;
      const d = new Date(e.date);
      if (!isWithinInterval(d, { start, end })) return;
      if (e.status === 'confirmed' || e.status === 'completed') pendingDays += 1;
    });
    const roughKm =
      posted.km + Math.max(0, pendingDays - posted.days) * (posted.days > 0 ? posted.km / posted.days : 25);
    return {
      km: Math.round(roughKm),
      fuel: Math.round((roughKm / kmPerLiter) * fuelPrice * 100) / 100,
      postedFuel: posted.fuel,
      postedDays: posted.days,
    };
  }, [visibleEvents, unitId, kmPerLiter, fuelPrice]);

  return (
    <div className="page-container pt-8 pb-24">
      <header className="mb-8 flex justify-between items-start gap-3">
        <div>
          <h1 className="page-heading">Início</h1>
          <p className="page-subtitle">
            Bem-vindo, {session?.name || 'Licenciado'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/configuracoes')}
          className="app-btn-icon shrink-0"
          aria-label="Configurações"
        >
          <SettingsIcon className="w-6 h-6" />
        </button>
      </header>

      {session?.role === 'licensee' && (
        <div className="app-card-rating">
          <div>
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-1">
              Nota na rede
            </p>
            {unitRating.count > 0 ? (
              <p className="text-5xl font-black text-[var(--color-text)] tabular-nums leading-none">
                {unitRating.average.toFixed(1).replace('.', ',')}
              </p>
            ) : (
              <p className="text-3xl font-black text-[var(--color-text-subtle)]">—</p>
            )}
            {unitRating.count > 0 && (
              <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-bold">
                {unitRating.count} avaliação{unitRating.count !== 1 ? 'ões' : ''}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            {unitRating.count > 0 ? (
              <>
                <StarRating value={unitRating.average} size="lg" />
                <button
                  type="button"
                  disabled={evalPdfLoading}
                  onClick={async () => {
                    setEvalPdfLoading(true);
                    try {
                      await downloadUnitEvaluationsPdf(
                        evaluations,
                        unitId,
                        getLicensee(unitId).name
                      );
                    } catch {
                      toast.error('Erro ao gerar PDF.');
                    } finally {
                      setEvalPdfLoading(false);
                    }
                  }}
                  className="mt-2 text-[10px] font-bold text-primary-400 underline disabled:opacity-50"
                >
                  {evalPdfLoading ? 'Gerando…' : 'Baixar PDF'}
                </button>
              </>
            ) : (
              <Star className="w-10 h-10 text-[var(--color-border-strong)]" />
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          type="button"
          onClick={() => navigate('/tempo')}
          className="app-stat-card app-card-interactive cursor-pointer"
        >
          <div className="stat-icon-wrap">
            <Users className="w-5 h-5 text-primary-400" />
          </div>
          <p className="stat-value">{activeEventsCount}</p>
          <p className="stat-label">Serviço em execução</p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/agenda')}
          className="app-stat-card app-card-interactive cursor-pointer"
        >
          <div className="stat-icon-wrap bg-emerald-50">
            <CalendarCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="stat-value">{todayEventsCount}</p>
          <p className="stat-label">Serviços do dia</p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/financas')}
          className="app-stat-card app-card-interactive col-span-2 flex items-center justify-between cursor-pointer"
        >
          <div>
            <div className="stat-icon-wrap bg-orange-50">
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <p className="stat-value">
              R$ {todayRevenue.toFixed(2).replace('.', ',')}
            </p>
            <p className="stat-label">Faturamento Hoje</p>
          </div>
        </button>
      </div>

      <h2 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
        <Truck className="w-5 h-5 text-primary-400" />
        Logística do Mês
      </h2>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          type="button"
          onClick={() => navigate('/logistica')}
          className="app-card-dark cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mb-2">
            <MapPin className="w-4 h-4 text-primary-400" />
          </div>
          <p className="text-2xl font-black text-[var(--color-text)]">
            {monthLogistics.km}
            <span className="text-sm font-medium text-[var(--color-text-muted)] ml-1">km</span>
          </p>
          <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-1">
            Logística mês
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/logistica')}
          className="app-card-dark cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mb-2">
            <Fuel className="w-4 h-4 text-accent-coral" />
          </div>
          <p className="text-2xl font-black text-[var(--color-text)]">
            R$ {monthLogistics.fuel.toFixed(2).replace('.', ',')}
          </p>
          <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-1">
            Combustível mês
          </p>
          {monthLogistics.postedDays > 0 && (
            <p className="text-[9px] text-emerald-600 mt-1 font-bold">
              R$ {monthLogistics.postedFuel.toFixed(2).replace('.', ',')} já em Finanças
            </p>
          )}
        </button>
      </div>
    </div>
  );
}
