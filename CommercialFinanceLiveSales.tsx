import { useMemo } from 'react';
import { Radio } from 'lucide-react';
import type { AppEvent } from '../context/EventsContext';
import type { DateRangeValue } from './GoogleStyleDateRangePicker';
import { getCommercialLiveSales } from '../utils/commercialFinance';
import { getUnitById } from '../utils/units';
import { useViewMode } from '../hooks/useViewMode';
import ViewModeToggle from './ViewModeToggle';
import { APP_VIEW_MODE_KEY, cardsContainer } from '../utils/viewModeLayout';

type Props = {
  events: AppEvent[];
  dateRange: DateRangeValue;
  commercialFilter: string;
  search: string;
};

export default function CommercialFinanceLiveSales({
  events,
  dateRange,
  commercialFilter,
  search,
}: Props) {
  const { mode: viewMode, setMode: setViewMode } = useViewMode('grid', APP_VIEW_MODE_KEY);
  const live = useMemo(
    () => getCommercialLiveSales(events, dateRange, commercialFilter, search),
    [events, dateRange, commercialFilter, search]
  );

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[var(--status-success)] animate-pulse" />
          <h2 className="text-lg font-bold text-[var(--color-text)]">Vendas do período</h2>
          <span className="text-xs font-bold text-[var(--status-success)] bg-emerald-950/40 border border-[var(--status-success)]/30 px-2 py-0.5 rounded-full">
            {live.length}
          </span>
        </div>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </div>
      <div
        className={`${cardsContainer(viewMode, 'grid gap-2 sm:grid-cols-2')} max-h-[420px] overflow-y-auto pr-1`}
      >
        {live.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-muted)] bg-[var(--color-surface-muted)] rounded-2xl border border-dashed border-[var(--color-border)] text-sm col-span-full">
            Nenhuma venda fechada no período com esse filtro.
          </div>
        ) : (
          live.map((e) => (
            <div
              key={e.id}
              className={`app-panel !p-3 text-sm ${
                viewMode === 'list' ? 'flex flex-wrap items-center gap-2' : ''
              }`}
            >
              <span className="font-bold truncate flex-1 min-w-[100px] text-[var(--color-text)]">
                {e.client}
              </span>
              <span className="text-[var(--status-success)] font-bold shrink-0 tabular-nums">
                R$ {(e.totalValue || 0).toFixed(0)}
              </span>
              <p
                className={`text-[10px] text-[var(--color-text-muted)] ${
                  viewMode === 'list' ? 'w-full sm:w-auto sm:ml-auto' : 'w-full mt-1'
                }`}
              >
                {getUnitById(e.unitId).name} · {new Date(e.date).toLocaleDateString('pt-BR')} · {e.time}
                {e.managedByCommercial && (
                  <span className="block text-[var(--accent-primary)]">{e.managedByCommercial}</span>
                )}
                {viewMode === 'grid' && (
                  <span className="block truncate">{e.equipments.join(', ')}</span>
                )}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
