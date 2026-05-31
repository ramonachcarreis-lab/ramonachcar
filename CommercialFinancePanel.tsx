import { useMemo, useState } from 'react';
import { Search, Target, User } from 'lucide-react';
import type { AppEvent } from '../context/EventsContext';
import GoogleStyleDateRangePicker, {
  resolveDateRange,
  type DateRangeValue,
} from './GoogleStyleDateRangePicker';
import CommercialFinanceDashboard from './CommercialFinanceDashboard';
import CommercialFinanceLiveSales from './CommercialFinanceLiveSales';
import AppSwitch from './AppSwitch';
import { buildCommercialPerformance } from '../utils/commercialControlStats';

type CommercialOption = { id: string; name: string; goal: number };

type Props = {
  events: AppEvent[];
  commercials: CommercialOption[];
  selectedCommercial: string;
  onSelectCommercial: (name: string) => void;
  onUpdateGoal: (userId: string, goal: number) => void;
};

export default function CommercialFinancePanel({
  events,
  commercials,
  selectedCommercial,
  onSelectCommercial,
  onUpdateGoal,
}: Props) {
  const [search, setSearch] = useState('');
  const [compare, setCompare] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => resolveDateRange('last_30'));

  const commercialFilter = selectedCommercial === 'all' ? 'all' : selectedCommercial;

  const selectedMeta = useMemo(() => {
    const perf = buildCommercialPerformance(events, commercials);
    if (commercialFilter === 'all') return null;
    return perf.find((p) => p.name === commercialFilter) ?? null;
  }, [events, commercials, commercialFilter]);

  const selectedUser = commercials.find((c) => c.name === commercialFilter);

  return (
    <div className="space-y-4 mb-6">
      <div className="app-panel space-y-3">
        <p className="text-xs font-black uppercase text-[var(--color-text-muted)] flex items-center gap-1">
          <User className="w-4 h-4" />
          Faturamento comercial
        </p>

        <select
          value={commercialFilter}
          onChange={(e) => {
            const v = e.target.value;
            onSelectCommercial(v === 'all' ? 'all' : v);
          }}
          className="app-input w-full font-bold"
        >
          <option value="all">Todos os comerciais (rede comercial)</option>
          {commercials.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <GoogleStyleDateRangePicker value={dateRange} onChange={setDateRange} />

        <AppSwitch
          checked={compare}
          onChange={setCompare}
          label="Comparar com período anterior"
        />
      </div>

      {selectedMeta && selectedUser && (
        <div className="app-panel space-y-3 border border-[var(--accent-primary)]/25">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase text-[var(--accent-primary)]">
                {selectedMeta.name}
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {selectedMeta.rank}º no ranking · {selectedMeta.shareOfTeamRevenuePct}% da equipe no mês
              </p>
            </div>
            <p className="text-lg font-black text-[var(--color-text)] tabular-nums">
              R$ {selectedMeta.revenueMonth.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="rounded-lg bg-[var(--color-surface-muted)] p-2">
              <p className="text-[10px] font-bold text-[var(--color-text-muted)]">Crescimento</p>
              <p className="text-sm font-black text-[var(--color-text)]">
                {selectedMeta.growthPct >= 0 ? '+' : ''}
                {selectedMeta.growthPct.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg bg-[var(--color-surface-muted)] p-2">
              <p className="text-[10px] font-bold text-[var(--color-text-muted)]">Conversão</p>
              <p className="text-sm font-black text-[var(--color-text)]">
                {selectedMeta.conversionPct.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg bg-[var(--color-surface-muted)] p-2">
              <p className="text-[10px] font-bold text-[var(--color-text-muted)]">Atendidos</p>
              <p className="text-sm font-black text-[var(--color-text)]">
                {selectedMeta.clientsServedMonth}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--color-surface-muted)] p-2">
              <p className="text-[10px] font-bold text-[var(--color-text-muted)]">Acumulado</p>
              <p className="text-sm font-black text-[var(--color-text)]">
                R$ {selectedMeta.revenueTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase flex items-center gap-1">
            <Target className="w-3 h-3" />
            Meta individual R$
          </label>
          <input
            type="number"
            min={0}
            defaultValue={selectedUser.goal}
            onBlur={(e) => onUpdateGoal(selectedUser.id, Number(e.target.value) || 0)}
            className="app-input w-full font-bold"
          />
        </div>
      )}

      <CommercialFinanceDashboard
        events={events}
        dateRange={dateRange}
        commercialFilter={commercialFilter}
        compare={compare}
        commercials={commercials}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente, telefone ou equipamento..."
          className="app-input w-full !pl-10"
        />
      </div>

      <CommercialFinanceLiveSales
        events={events}
        dateRange={dateRange}
        commercialFilter={commercialFilter}
        search={search}
      />
    </div>
  );
}
