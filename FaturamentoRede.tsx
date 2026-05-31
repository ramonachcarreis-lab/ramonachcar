import { useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '../context/EventsContext';
import { useLicensees } from '../context/LicenseesContext';
import GoogleStyleDateRangePicker, {
  resolveDateRange,
  type DateRangeValue,
} from '../components/GoogleStyleDateRangePicker';
import NetworkFinanceDashboard from '../components/NetworkFinanceDashboard';
import SearchableUnitSelect from '../components/SearchableUnitSelect';
import FinanceExportBar from '../components/FinanceExportBar';
import FinanceLiveSales from '../components/FinanceLiveSales';
import AppSwitch from '../components/AppSwitch';

export default function FaturamentoRede() {
  const navigate = useNavigate();
  const { events } = useEvents();
  const { licensees } = useLicensees();
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');
  const [compare, setCompare] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    resolveDateRange('last_30')
  );

  const unitOptions = useMemo(
    () =>
      licensees.map((l) => ({
        id: l.id,
        label: l.name,
        sublabel: `${l.city} · ${l.state}`,
      })),
    [licensees]
  );

  const scopeLabel =
    unitFilter === 'all'
      ? 'rede'
      : unitOptions.find((u) => u.id === unitFilter)?.label || unitFilter;

  return (
    <div className="page-container-wide pt-6 pb-28">
      <header className="mb-4 flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate('/sales-dashboard')}
          className="p-2 bg-white rounded-xl border border-slate-100 shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-primary-900">Financeiro</h1>
        </div>
      </header>

      <SearchableUnitSelect
        value={unitFilter}
        onChange={setUnitFilter}
        options={unitOptions}
        className="mb-3"
      />

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
        unitFilter={unitFilter}
        compare={compare}
      />

      <FinanceExportBar
        events={events}
        dateRange={dateRange}
        unitFilter={unitFilter}
        scopeLabel={scopeLabel}
      />

      <div className="relative my-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente, telefone, unidade ou equipamento..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-100 font-medium bg-white"
        />
      </div>

      <FinanceLiveSales
        events={events}
        dateRange={dateRange}
        unitFilter={unitFilter}
        search={search}
      />
    </div>
  );
}
