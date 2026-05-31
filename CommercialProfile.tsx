import { useEffect, useMemo, useState } from 'react';
import { Save, User, MessageCircle, Phone, TrendingUp, DollarSign, Target, Download } from 'lucide-react';
import { downloadCommercialSalesPdf } from '../utils/commercialSalesExport';
import { getUnitById } from '../utils/units';
import { isWithinInterval } from 'date-fns';
import { useCommercialProfile } from '../context/CommercialProfileContext';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';
import { useLicensees } from '../context/LicenseesContext';
import { filterMyCommercialClosed } from '../utils/commercialFilters';
import GoogleStyleDateRangePicker, {
  resolveDateRange,
  type DateRangeValue,
} from '../components/GoogleStyleDateRangePicker';
import { getPreviousPeriod, pctChange } from '../utils/dateRangeCompare';
import NotificationsSettings from '../components/NotificationsSettings';
import AppSwitch from '../components/AppSwitch';
import { useViewMode } from '../hooks/useViewMode';
import ViewModeToggle from '../components/ViewModeToggle';
import { APP_VIEW_MODE_KEY, cardsContainer } from '../utils/viewModeLayout';

export default function CommercialProfilePage() {
  const { profile, updateProfile } = useCommercialProfile();
  const { session, login } = useAuth();
  const { events } = useEvents();
  const { licensees } = useLicensees();
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [unitFilter, setUnitFilter] = useState('all');
  const [compare, setCompare] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => resolveDateRange('last_30'));
  const [pdfLoading, setPdfLoading] = useState(false);
  const { mode: viewMode, setMode: setViewMode } = useViewMode('grid', APP_VIEW_MODE_KEY);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const commercialName = session?.name || draft.name || profile.name;
  const mySales = useMemo(
    () => filterMyCommercialClosed(events, commercialName),
    [events, commercialName]
  );

  const filteredSales = useMemo(() => {
    return mySales.filter((e) => {
      const d = new Date(e.date);
      if (!isWithinInterval(d, { start: dateRange.start, end: dateRange.end })) return false;
      if (unitFilter !== 'all' && (e.unitId || 'sp-centro') !== unitFilter) return false;
      return true;
    });
  }, [mySales, dateRange, unitFilter]);

  const myFinance = useMemo(() => {
    const received = filteredSales
      .filter((e) => e.financialStatus === 'Pago')
      .reduce((s, e) => s + (e.totalValue || 0), 0);
    const pending = filteredSales
      .filter((e) => e.financialStatus === 'Pendente')
      .reduce((s, e) => s + (e.totalValue || 0), 0);
    return { received, pending, count: filteredSales.length };
  }, [filteredSales]);

  const compareFinance = useMemo(() => {
    if (!compare) return null;
    const prev = getPreviousPeriod(dateRange);
    const prevSales = mySales.filter((e) => {
      const d = new Date(e.date);
      if (!isWithinInterval(d, { start: prev.start, end: prev.end })) return false;
      if (unitFilter !== 'all' && (e.unitId || 'sp-centro') !== unitFilter) return false;
      return true;
    });
    const prevReceived = prevSales
      .filter((e) => e.financialStatus === 'Pago')
      .reduce((s, e) => s + (e.totalValue || 0), 0);
    return pctChange(myFinance.received, prevReceived);
  }, [compare, dateRange, unitFilter, mySales, myFinance.received]);

  const metaMonth = useMemo(() => {
    const now = new Date();
    const closed = filterMyCommercialClosed(events, commercialName).filter((e) => {
      const d = new Date(e.updatedAt || e.createdAt || e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const achieved = closed.reduce((s, e) => s + (e.totalValue || 0), 0);
    const goal = session?.monthlyGoal ?? profile.monthlyGoal ?? 15000;
    return { achieved, goal, pct: Math.min((achieved / goal) * 100, 100) };
  }, [events, commercialName, profile.monthlyGoal, session?.monthlyGoal]);

  const handleSave = () => {
    updateProfile(draft);
    if (session?.role === 'commercial') {
      login({ ...session, name: draft.name.trim() || session.name });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="page-container pt-6 pb-28">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-primary-900 tracking-tight">Vendas</h1>
      </header>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4 mb-6">
        <p className="text-sm font-bold text-slate-700">Cadastro do comercial</p>

        <div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-1">
            <User className="w-4 h-4" />
            Nome completo
          </label>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="w-full border-2 border-slate-100 rounded-xl py-3 px-3 font-medium min-h-[48px]"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-1">
            <MessageCircle className="w-4 h-4" />
            WhatsApp principal
          </label>
          <input
            value={draft.whatsapp}
            onChange={(e) => setDraft({ ...draft, whatsapp: e.target.value })}
            inputMode="tel"
            className="w-full border-2 border-slate-100 rounded-xl py-3 px-3 font-medium min-h-[48px]"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-1">
            <Phone className="w-4 h-4" />
            Telefone extra (backup)
          </label>
          <input
            value={draft.phoneAlt}
            onChange={(e) => setDraft({ ...draft, phoneAlt: e.target.value })}
            inputMode="tel"
            className="w-full border-2 border-slate-100 rounded-xl py-3 px-3 font-medium min-h-[48px]"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-1">
            <Target className="w-4 h-4" />
            Meta de vendas do mês (R$)
          </label>
          <p className="w-full border-2 border-slate-100 rounded-xl py-3 px-3 font-black min-h-[48px] bg-slate-50 text-primary-900">
            R$ {(session?.monthlyGoal ?? draft.monthlyGoal ?? 15000).toLocaleString('pt-BR')}
          </p>
          <p className="text-[10px] text-amber-700 font-bold mt-1">
            Meta definida pelo administrador. Peça alteração no painel Admin.
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            Mês atual: R$ {metaMonth.achieved.toFixed(0)} de R$ {metaMonth.goal.toFixed(0)} (
            {metaMonth.pct.toFixed(0)}%)
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full bg-primary-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 min-h-[48px]"
        >
          <Save className="w-5 h-5" />
          Salvar cadastro
        </button>
        {saved && <p className="text-center text-sm font-bold text-emerald-600">Cadastro salvo.</p>}
      </div>

      <div className="mb-6">
        <NotificationsSettings />
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Minhas vendas
          </h2>
          <div className="flex flex-wrap items-center gap-2">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          <button
            type="button"
            disabled={pdfLoading || filteredSales.length === 0}
            onClick={async () => {
              setPdfLoading(true);
              try {
                const unitLabel =
                  unitFilter === 'all'
                    ? 'Todas as unidades'
                    : getUnitById(unitFilter).name;
                await downloadCommercialSalesPdf(
                  filteredSales,
                  {
                    commercialName: session?.name || draft.name || 'Comercial',
                    periodLabel: dateRange.label,
                    unitLabel,
                    received: myFinance.received,
                    pending: myFinance.pending,
                    salesCount: myFinance.count,
                    comparePct: compare ? compareFinance : null,
                  },
                  (id) => getUnitById(id || 'sp-centro').name
                );
              } catch {
                alert('Não foi possível gerar o PDF.');
              } finally {
                setPdfLoading(false);
              }
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-primary-800 bg-primary-50 px-3 py-2 rounded-lg disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {pdfLoading ? 'Gerando…' : 'Baixar PDF'}
          </button>
          </div>
        </div>

        <div className="mb-3">
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Unidade</label>
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="w-full border-2 border-slate-100 rounded-xl py-3 px-3 font-bold text-slate-800 min-h-[48px] bg-white"
          >
            <option value="all">Todas as unidades</option>
            {licensees.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <GoogleStyleDateRangePicker value={dateRange} onChange={setDateRange} />
        </div>

        <AppSwitch
          checked={compare}
          onChange={setCompare}
          label="Comparar com período anterior"
          className="mb-4"
        />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-emerald-600 text-white rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase opacity-80">Recebido</p>
            <p className="text-xl font-black">R$ {myFinance.received.toFixed(0)}</p>
            {compareFinance != null && (
              <p className="text-[10px] font-bold mt-1 opacity-90">
                {compareFinance >= 0 ? '+' : ''}
                {compareFinance.toFixed(0)}% vs período anterior
              </p>
            )}
          </div>
          <div className="bg-amber-500 text-white rounded-2xl p-4">
            <DollarSign className="w-5 h-5 mb-1 opacity-80" />
            <p className="text-[10px] font-bold uppercase opacity-80">A receber</p>
            <p className="text-xl font-black">R$ {myFinance.pending.toFixed(0)}</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          {myFinance.count} venda(s) no período · {dateRange.label}
        </p>
        {filteredSales.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-2xl border border-dashed">
            Nenhuma venda no filtro selecionado.
          </p>
        ) : (
          <div className={cardsContainer(viewMode, 'grid gap-2 sm:grid-cols-2')}>
            {filteredSales.map((e) => (
              <div
                key={e.id}
                className={`bg-white border border-slate-100 rounded-xl ${
                  viewMode === 'list' ? 'p-2.5 flex flex-wrap items-center gap-2' : 'p-3'
                }`}
              >
                <div className="flex justify-between">
                  <p className="font-bold text-sm text-slate-800">{e.client}</p>
                  <p className="font-black text-emerald-600 text-sm">
                    R$ {(e.totalValue || 0).toFixed(0)}
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {new Date(e.date).toLocaleDateString('pt-BR')} · {e.time} · {e.financialStatus}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
