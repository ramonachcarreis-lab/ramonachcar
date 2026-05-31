import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarCheck2,
  Handshake,
  TrendingUp,
  Settings as SettingsIcon,
  CheckCircle,
  Clock,
  Target,
} from 'lucide-react';
import { useEvents } from '../context/EventsContext';
import { useCommercialProfile } from '../context/CommercialProfileContext';
import { useAuth } from '../context/AuthContext';
import { filterMyCommercialClosed } from '../utils/commercialFilters';
import { buildCommercialAlerts } from '../utils/commercialAlerts';
import { isCommercialOwnedDeal } from '../utils/crmAccess';
import { isSameDay, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import AdminHomeDashboard from './AdminHomeDashboard';

export default function SalesDashboard() {
  const { session } = useAuth();
  if (session?.role === 'admin') {
    return <AdminHomeDashboard />;
  }
  return <CommercialSalesDashboard />;
}

function CommercialSalesDashboard() {
  const navigate = useNavigate();
  const { events } = useEvents();
  const { profile } = useCommercialProfile();
  const { session } = useAuth();
  const commercialName = session?.name || profile.name;
  const myEvents = useMemo(
    () => events.filter((e) => isCommercialOwnedDeal(e, commercialName)),
    [events, commercialName]
  );
  const commercialAlerts = useMemo(() => buildCommercialAlerts(myEvents), [myEvents]);

  const stats = useMemo(() => {
    const confirmed = myEvents.filter((e) => e.status === 'confirmed').length;
    const pending = myEvents.filter((e) => e.financialStatus === 'Pendente' && e.status !== 'cancelled').length;
    const activeUnits = new Set(myEvents.map((e) => e.unitId || 'sp-centro')).size;
    const risk = commercialAlerts.filter((a) => a.type === 'operational_risk').length;
    const gtv = myEvents
      .filter((event) => event.status === 'confirmed' || event.status === 'completed')
      .reduce((sum, event) => sum + (event.totalValue || 0), 0);
    const eventsToday = myEvents.filter((event) => isSameDay(new Date(event.date), new Date())).length;
    const followupCount = commercialAlerts.filter(
      (a) => a.type === 'client_no_response' || a.type === 'followup_stale'
    ).length;
    return { confirmed, pending, activeUnits, risk, gtv, eventsToday, followupCount };
  }, [myEvents, commercialAlerts]);

  const metaStats = useMemo(() => {
    const now = new Date();
    const interval = { start: startOfMonth(now), end: endOfMonth(now) };
    const closed = filterMyCommercialClosed(events, commercialName).filter((e) => {
      const d = new Date(e.updatedAt || e.createdAt || e.date);
      return isWithinInterval(d, interval);
    });
    const achieved = closed.reduce((s, e) => s + (e.totalValue || 0), 0);
    const goal = session?.monthlyGoal ?? profile.monthlyGoal ?? 15000;
    return { achieved, goal, count: closed.length, pct: Math.min((achieved / goal) * 100, 100) };
  }, [events, commercialName, profile.monthlyGoal, session?.monthlyGoal]);

  return (
    <div className="page-container-wide">
      <div className="app-hero-panel bg-primary-900 text-white rounded-3xl p-6 shadow-lg mb-6">
        <header className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Início Comercial</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/perfil-comercial')}
            className="w-12 h-12 app-hero-stat rounded-2xl flex items-center justify-center hover:brightness-110 transition-colors"
            aria-label="Configurações comerciais"
          >
            <SettingsIcon className="w-6 h-6 text-white" />
          </button>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <button
            type="button"
            onClick={() => navigate('/crm')}
            className="app-hero-stat rounded-2xl p-4 text-left"
          >
            <Handshake className="w-5 h-5 text-primary-200" />
            <p className="text-2xl font-black mt-2 text-white tabular-nums">{stats.confirmed}</p>
            <p className="text-[10px] font-bold text-primary-200 uppercase">Contratos Fechados</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/crm')}
            className="app-hero-stat rounded-2xl p-4 text-left"
          >
            <Clock className="w-5 h-5 text-primary-200" />
            <p className="text-2xl font-black mt-2 text-white">{stats.followupCount}</p>
            <p className="text-[10px] font-bold text-primary-200 uppercase">Follow-up</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/agenda-comercial')}
            className="app-hero-stat rounded-2xl p-4 text-left"
          >
            <CalendarCheck2 className="w-5 h-5 text-primary-200" />
            <p className="text-2xl font-black mt-2 text-white">{stats.eventsToday}</p>
            <p className="text-[10px] font-bold text-primary-200 uppercase">Serviços do dia</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/licenciados')}
            className="app-hero-stat rounded-2xl p-4 text-left"
          >
            <Building2 className="w-5 h-5 text-primary-200" />
            <p className="text-2xl font-black mt-2 text-white">{stats.activeUnits}</p>
            <p className="text-[10px] font-bold text-primary-200 uppercase">Unidades</p>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => navigate('/perfil-comercial')}
            className="bg-[#1e3a5f] rounded-2xl p-4 w-full text-left hover:bg-[#234876] transition-colors active:scale-[0.99] text-white"
          >
            <p className="text-[10px] uppercase font-bold text-amber-200 flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              Meta do mês · suas vendas
            </p>
            <p className="text-2xl font-black mt-1 tabular-nums">
              R$ {metaStats.achieved.toFixed(0)}{' '}
              <span className="text-sm font-bold text-amber-200/90">
                / {metaStats.goal.toFixed(0)}
              </span>
            </p>
            <div className="w-full h-2 rounded-full bg-black/30 overflow-hidden mt-3">
              <div
                className="h-2 bg-amber-400 rounded-full"
                style={{ width: `${metaStats.pct}%` }}
              />
            </div>
            <p className="text-[10px] text-amber-100/90 mt-1">
              {metaStats.count} contrato(s) fechado(s) · editar meta em Vendas →
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/faturamento-rede')}
            className="bg-[#172554] rounded-2xl p-4 w-full text-left hover:bg-[#1e3a8a] transition-colors active:scale-[0.99] text-white"
          >
            <p className="text-[10px] uppercase font-bold text-blue-200">Financeiro · rede toda</p>
            <p className="text-2xl font-black mt-1">R$ {stats.gtv.toFixed(0)}</p>
            <div className="w-full h-2 rounded-full bg-black/30 overflow-hidden mt-3">
              <div
                className="h-2 bg-emerald-400 rounded-full"
                style={{ width: `${Math.min((stats.gtv / 50000) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-blue-200 mt-1">
              Filtro por unidade, período e comparativos →
            </p>
          </button>
        </div>

        <div className="grid-actions">
          <button
            type="button"
            onClick={() => navigate('/crm', { state: { quickRegister: true } })}
            className="btn-success w-full py-3.5"
          >
            <CheckCircle className="w-5 h-5" />
            Cadastrar Nova Venda
          </button>
          <button
            type="button"
            onClick={() => navigate('/crm')}
            className="app-hero-btn-solid w-full py-3.5 font-bold rounded-2xl flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-5 h-5" />
            Acompanhar Vendas
          </button>
          <button
            type="button"
            onClick={() =>
              navigate('/agenda-comercial', { state: { agendaCategory: 'em_execucao' } })
            }
            className="app-hero-btn-ghost w-full py-3.5 font-bold rounded-2xl flex items-center justify-center gap-2"
          >
            <CalendarCheck2 className="w-5 h-5" />
            Serviços em execução
          </button>
        </div>
      </div>

    </div>
  );
}
