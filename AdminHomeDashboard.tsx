import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarCheck2,
  Handshake,
  TrendingUp,
  Target,
  Users,
  Radio,
  ClipboardList,
  FolderPlus,
} from 'lucide-react';
import { useEvents } from '../context/EventsContext';
import { loadUsers } from '../services/usersStorage';
import { loadNetworkGoal, saveNetworkGoal } from '../services/networkGoalStorage';
import { filterCommercialClosed } from '../utils/commercialFilters';
import { isAnyCommercialDeal } from '../utils/crmAccess';
import { listNetworkTempoLive } from '../utils/networkMacro';
import { filterNetworkAgenda } from '../utils/networkMacro';
import { isCommercialOwnedDeal } from '../utils/crmAccess';
import { startOfMonth, endOfMonth, isWithinInterval, isSameDay } from 'date-fns';
import { useLicensees } from '../context/LicenseesContext';

export default function AdminHomeDashboard() {
  const navigate = useNavigate();
  const { events } = useEvents();
  const { licensees } = useLicensees();
  const [networkGoal, setNetworkGoal] = useState(() => loadNetworkGoal().monthlyGoal);
  const [goalSaved, setGoalSaved] = useState(false);

  const stats = useMemo(() => {
    const now = new Date();
    const interval = { start: startOfMonth(now), end: endOfMonth(now) };
    const negotiations = events.filter(
      (e) => e.status === 'pending' && (isAnyCommercialDeal(e) || e.creatorRole === 'licensee')
    );
    const closedMonth = filterCommercialClosed(events).filter((e) => {
      const d = new Date(e.updatedAt || e.createdAt || e.date);
      return isWithinInterval(d, interval);
    });
    const monthRevenue = closedMonth.reduce((s, e) => s + (e.totalValue || 0), 0);
    const liveToday = listNetworkTempoLive(events, now).length;
    const agendaToday = filterNetworkAgenda(events).filter((e) =>
      isSameDay(new Date(e.date), now)
    ).length;
    const commercialUsers = loadUsers().filter((u) => u.role === 'commercial' && u.active);
    return {
      negotiations: negotiations.length,
      closedMonth: closedMonth.length,
      monthRevenue,
      liveToday,
      agendaToday,
      commercialCount: commercialUsers.length,
      unitCount: licensees.length,
    };
  }, [events, licensees]);

  const commercialRanking = useMemo(() => {
    const users = loadUsers().filter((u) => u.role === 'commercial' && u.active);
    const now = new Date();
    const interval = { start: startOfMonth(now), end: endOfMonth(now) };
    return users
      .map((u) => {
        const owned = events.filter((e) => isCommercialOwnedDeal(e, u.displayName));
        const active = owned.filter((e) => e.status === 'pending').length;
        const closed = filterCommercialClosed(owned).filter((e) => {
          const d = new Date(e.updatedAt || e.createdAt || e.date);
          return isWithinInterval(d, interval);
        });
        const revenue = closed.reduce((s, e) => s + (e.totalValue || 0), 0);
        const goal = u.monthlyGoal || 15000;
        return {
          id: u.id,
          name: u.displayName,
          active,
          revenue,
          goal,
          pct: Math.min((revenue / goal) * 100, 100),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [events]);

  const networkPct = Math.min((stats.monthRevenue / networkGoal) * 100, 100);

  const persistGoal = () => {
    saveNetworkGoal(networkGoal);
    setGoalSaved(true);
    setTimeout(() => setGoalSaved(false), 2000);
  };

  return (
    <div className="page-container-wide">
      <div className="app-hero-panel bg-primary-900 text-white rounded-3xl p-6 shadow-lg mb-6">
        <header className="mb-5">
          <h1 className="text-3xl font-black tracking-tight text-white">Início · Rede</h1>
          <p className="text-sm text-primary-200 mt-1">
            Meta macro, vendas por comercial e operação ao vivo
          </p>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <button
            type="button"
            onClick={() => navigate('/crm')}
            className="app-hero-stat rounded-2xl p-4 text-left"
          >
            <Handshake className="w-5 h-5 text-primary-200" />
            <p className="text-2xl font-black mt-2 text-white">{stats.negotiations}</p>
            <p className="text-[10px] font-bold text-primary-200 uppercase">Negociações</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/crm', { state: { pipeline: 'fechados' } })}
            className="app-hero-stat rounded-2xl p-4 text-left"
          >
            <TrendingUp className="w-5 h-5 text-primary-200" />
            <p className="text-2xl font-black mt-2 text-white">{stats.closedMonth}</p>
            <p className="text-[10px] font-bold text-primary-200 uppercase">Fechados no mês</p>
          </button>
          <button
            type="button"
            onClick={() =>
              navigate('/agenda-comercial', { state: { agendaCategory: 'em_execucao' } })
            }
            className="app-hero-stat rounded-2xl p-4 text-left"
          >
            <Radio className="w-5 h-5 text-emerald-300" />
            <p className="text-2xl font-black mt-2 text-white">{stats.liveToday}</p>
            <p className="text-[10px] font-bold text-primary-200 uppercase">Em execução hoje</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/agenda-comercial')}
            className="app-hero-stat rounded-2xl p-4 text-left"
          >
            <CalendarCheck2 className="w-5 h-5 text-primary-200" />
            <p className="text-2xl font-black mt-2 text-white">{stats.agendaToday}</p>
            <p className="text-[10px] font-bold text-primary-200 uppercase">Agenda hoje</p>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="bg-[#1e3a5f] rounded-2xl p-4 text-white">
            <p className="text-[10px] uppercase font-bold text-amber-200 flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              Meta da rede (mês)
            </p>
            <div className="flex flex-wrap items-end gap-2 mt-2">
              <label className="sr-only" htmlFor="network-goal">
                Meta da rede
              </label>
              <span className="text-lg font-bold text-amber-200/90">R$</span>
              <input
                id="network-goal"
                type="number"
                min={0}
                step={1000}
                value={networkGoal}
                onChange={(e) => setNetworkGoal(Number(e.target.value) || 0)}
                onBlur={persistGoal}
                className="flex-1 min-w-[120px] bg-black/25 border border-white/20 rounded-xl py-2 px-3 font-black text-xl text-white"
              />
            </div>
            <p className="text-2xl font-black mt-2">
              R$ {stats.monthRevenue.toLocaleString('pt-BR')}{' '}
              <span className="text-sm font-bold text-amber-200/90">
                realizado ({networkPct.toFixed(0)}%)
              </span>
            </p>
            <div className="w-full h-2 rounded-full bg-black/30 overflow-hidden mt-3">
              <div
                className="h-2 bg-amber-400 rounded-full transition-all"
                style={{ width: `${networkPct}%` }}
              />
            </div>
            {goalSaved && (
              <p className="text-[10px] text-emerald-300 mt-1 font-bold">Meta da rede salva.</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/faturamento-rede')}
            className="bg-[#172554] rounded-2xl p-4 w-full text-left hover:bg-[#1e3a8a] transition-colors text-white"
          >
            <p className="text-[10px] uppercase font-bold text-blue-200">Financeiro · rede</p>
            <p className="text-2xl font-black mt-1">
              {stats.unitCount} unidades · {stats.commercialCount} comerciais
            </p>
            <p className="text-[10px] text-blue-200 mt-2">Faturamento e comparativos →</p>
          </button>
        </div>

        {commercialRanking.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase text-primary-200 mb-2 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              Vendas por comercial (mês)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {commercialRanking.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    navigate('/crm', {
                      state: { channelFilter: 'commercial', commercialPersonFilter: c.name },
                    })
                  }
                  className="app-hero-stat rounded-xl p-3 text-left hover:brightness-110"
                >
                  <p className="font-bold text-white text-sm truncate">{c.name}</p>
                  <p className="text-xs text-primary-200 mt-0.5">
                    R$ {c.revenue.toLocaleString('pt-BR')} / {c.goal.toLocaleString('pt-BR')} ·{' '}
                    {c.pct.toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-amber-200/80 mt-1">{c.active} neg. em andamento</p>
                  <div className="h-1.5 rounded-full bg-black/30 mt-2 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid-actions">
          <button
            type="button"
            onClick={() => navigate('/crm')}
            className="app-hero-btn-solid w-full py-3.5 font-bold rounded-2xl flex items-center justify-center gap-2"
          >
            <ClipboardList className="w-5 h-5" />
            Controle Comercial
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="app-hero-btn-ghost w-full py-3.5 font-bold rounded-2xl flex items-center justify-center gap-2"
          >
            <FolderPlus className="w-5 h-5" />
            Cadastro
          </button>
          <button
            type="button"
            onClick={() => navigate('/agenda-comercial')}
            className="app-hero-btn-ghost w-full py-3.5 font-bold rounded-2xl flex items-center justify-center gap-2"
          >
            <CalendarCheck2 className="w-5 h-5" />
            Agenda da rede
          </button>
        </div>
      </div>

      <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-2 app-panel-muted !py-3">
        <Building2 className="w-4 h-4 text-primary-400 shrink-0" />
        Metas individuais dos comerciais em Controle Comercial. Negociações por comercial e
        licenciado na mesma tela.
      </p>
    </div>
  );
}
