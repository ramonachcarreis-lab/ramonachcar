import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';
import { useFinancials } from '../context/FinancialsContext';
import GoogleStyleDateRangePicker, {
  resolveDateRange,
  type DateRangeValue,
} from '../components/GoogleStyleDateRangePicker';
import NetworkFinanceDashboard from '../components/NetworkFinanceDashboard';
import FinanceExportBar from '../components/FinanceExportBar';
import FinanceLiveSales from '../components/FinanceLiveSales';
import AppSwitch from '../components/AppSwitch';

export default function Financials() {
  const location = useLocation();
  const { session } = useAuth();
  const { events } = useEvents();
  const { transactions, addTransaction } = useFinancials();
  const expenses = transactions.filter((t) => t.type === 'expense');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const exp = (
      location.state as {
        newExpense?: {
          id: number;
          type: 'expense';
          desc: string;
          amount: number;
          date: string;
        };
      }
    )?.newExpense;
    if (exp) {
      addTransaction(exp);
      window.history.replaceState({}, '');
    }
  }, [location.state, addTransaction]);

  const unitId = session?.unitId || 'sp-centro';
  const [compare, setCompare] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    resolveDateRange('last_30')
  );

  return (
    <div className="page-container pt-8 pb-24">
      <header className="mb-4">
        <h1 className="text-3xl font-black text-primary-900 tracking-tight">Financeiro</h1>
        <p className="text-slate-500 font-medium text-sm">Sua unidade · vendas reais e relatórios</p>
      </header>

      <div className="mb-3">
        <GoogleStyleDateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <AppSwitch
        checked={compare}
        onChange={setCompare}
        label="Comparar com período anterior"
        className="mb-4"
      />

      <NetworkFinanceDashboard
        events={events}
        dateRange={dateRange}
        unitFilter={unitId}
        compare={compare}
      />

      <FinanceExportBar
        events={events}
        dateRange={dateRange}
        unitFilter={unitId}
        scopeLabel={unitId}
      />

      <div className="relative my-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar no extrato ao vivo..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-100 font-medium bg-white"
        />
      </div>

      <FinanceLiveSales
        events={events}
        dateRange={dateRange}
        unitFilter={unitId}
        search={search}
      />

      {expenses.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-bold text-slate-800 mb-3">Despesas</h2>
          <div className="space-y-2">
            {expenses.map((t) => (
              <div
                key={t.id}
                className="bg-white border border-slate-100 rounded-xl p-3 flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-slate-800 text-sm">{t.desc}</p>
                  <p className="text-xs text-slate-500">{t.date}</p>
                </div>
                <p className="font-black text-red-600">- R$ {t.amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
