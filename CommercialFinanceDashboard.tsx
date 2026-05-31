import { useMemo } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { AppEvent } from '../context/EventsContext';
import type { DateRangeValue } from './GoogleStyleDateRangePicker';
import { getPreviousPeriod, pctChange } from '../utils/dateRangeCompare';
import { filterCommercialFinanceEvents } from '../utils/commercialFinance';
import { buildCommercialPerformance } from '../utils/commercialControlStats';
import { getUnitById } from '../utils/units';

type Props = {
  events: AppEvent[];
  dateRange: DateRangeValue;
  commercialFilter: string;
  compare: boolean;
  commercials: { id: string; name: string; goal: number }[];
};

export default function CommercialFinanceDashboard({
  events,
  dateRange,
  commercialFilter,
  compare,
  commercials,
}: Props) {
  const previousRange = useMemo(() => getPreviousPeriod(dateRange), [dateRange]);

  const current = useMemo(
    () => filterCommercialFinanceEvents(events, commercialFilter, dateRange),
    [events, commercialFilter, dateRange]
  );
  const previous = useMemo(
    () =>
      compare ? filterCommercialFinanceEvents(events, commercialFilter, previousRange) : [],
    [compare, events, commercialFilter, previousRange]
  );

  const totalCurrent = current.reduce((s, e) => s + (e.totalValue || 0), 0);
  const totalPrev = previous.reduce((s, e) => s + (e.totalValue || 0), 0);
  const countCurrent = current.length;
  const countPrev = previous.length;
  const ticketCurrent = countCurrent ? totalCurrent / countCurrent : 0;
  const ticketPrev = countPrev ? totalPrev / countPrev : 0;

  const uniqueClients = useMemo(() => {
    const keys = new Set<string>();
    current.forEach((e) => {
      const phone = e.phone?.replace(/\D/g, '');
      keys.add(phone || e.client.toLowerCase());
    });
    return keys.size;
  }, [current]);

  const serviceRanking = useMemo(() => {
    const map = new Map<string, number>();
    current.forEach((e) => {
      e.equipments.forEach((eq) => {
        map.set(eq, (map.get(eq) || 0) + (e.totalValue || 0) / Math.max(e.equipments.length, 1));
      });
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [current]);

  const maxService = serviceRanking[0]?.value || 1;

  const topCommercials = useMemo(() => {
    if (commercialFilter !== 'all') return [];
    const perf = buildCommercialPerformance(events, commercials);
    return [...perf].sort((a, b) => b.revenueMonth - a.revenueMonth).slice(0, 5);
  }, [commercialFilter, events, commercials]);

  const topUnits = useMemo(() => {
    const map = new Map<string, number>();
    current.forEach((e) => {
      const uid = e.unitId || 'sp-centro';
      map.set(uid, (map.get(uid) || 0) + (e.totalValue || 0));
    });
    return [...map.entries()]
      .map(([uid, cur]) => ({ uid, name: getUnitById(uid).name, cur }))
      .sort((a, b) => b.cur - a.cur)
      .slice(0, 5);
  }, [current]);

  const Kpi = ({
    title,
    value,
    delta,
    prefix = '',
  }: {
    title: string;
    value: string;
    delta: number | null;
    prefix?: string;
  }) => (
    <div className="app-panel !p-4">
      <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">{title}</p>
      <p className="text-2xl font-black text-[var(--color-text)] mt-1 tabular-nums">
        {prefix}
        {value}
      </p>
      {compare && delta !== null && (
        <p
          className={`text-xs font-bold mt-1 flex items-center gap-1 ${
            delta >= 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-danger)]'
          }`}
        >
          {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {delta >= 0 ? '+' : ''}
          {delta.toFixed(1)}% vs período anterior
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Kpi
          title="# Vendas"
          value={String(countCurrent)}
          delta={pctChange(countCurrent, countPrev)}
        />
        <Kpi
          title="Faturamento"
          value={totalCurrent.toFixed(0)}
          delta={pctChange(totalCurrent, totalPrev)}
          prefix="R$ "
        />
        <Kpi
          title="Ticket médio"
          value={ticketCurrent.toFixed(0)}
          delta={pctChange(ticketCurrent, ticketPrev)}
          prefix="R$ "
        />
        <Kpi title="Pessoas atendidas" value={String(uniqueClients)} delta={null} />
      </div>

      <div className="app-panel">
        <h3 className="text-sm font-black text-[var(--color-text)] mb-3">Ranking de serviços vendidos</h3>
        {serviceRanking.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">Sem serviços no período.</p>
        ) : (
          <div className="space-y-2">
            {serviceRanking.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-xs font-bold text-[var(--color-text-muted)] mb-1">
                  <span className="truncate pr-2">{s.name}</span>
                  <span className="text-[var(--status-success)] shrink-0">R$ {s.value.toFixed(0)}</span>
                </div>
                <div className="h-3 bg-[var(--color-surface-muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-primary)] rounded-full"
                    style={{ width: `${(s.value / maxService) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {commercialFilter === 'all' && topCommercials.length > 0 && (
        <div className="app-panel">
          <h3 className="text-sm font-black text-[var(--color-text)] mb-1">
            Comparativo — quem vendeu mais no mês
          </h3>
          <p className="text-[10px] text-[var(--color-text-muted)] mb-3">Faturamento do mês calendário</p>
          <div className="space-y-2">
            {topCommercials.map((c, i) => (
              <div key={c.userId} className="flex justify-between items-center text-sm gap-2">
                <span className="font-bold text-[var(--color-text)] truncate">
                  <span className="text-[var(--color-text-muted)] mr-1">#{i + 1}</span>
                  {c.name}
                </span>
                <div className="text-right shrink-0">
                  <span className="font-black text-[var(--accent-primary)] tabular-nums">
                    R$ {c.revenueMonth.toFixed(0)}
                  </span>
                  <span className="block text-[10px] text-[var(--color-text-muted)]">
                    {c.servicesMonth} serv. · conv. {c.conversionPct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topUnits.length > 0 && (
        <div className="app-panel">
          <h3 className="text-sm font-black text-[var(--color-text)] mb-1">Faturamento por unidade</h3>
          <p className="text-[10px] text-[var(--color-text-muted)] mb-3">No período selecionado</p>
          <div className="space-y-2">
            {topUnits.map((u, i) => (
              <div key={u.uid} className="flex justify-between items-center text-sm gap-2">
                <span className="font-bold text-[var(--color-text)] truncate">
                  <span className="text-[var(--color-text-muted)] mr-1">#{i + 1}</span>
                  {u.name}
                </span>
                <span className="font-black text-[var(--status-success)] shrink-0 tabular-nums">
                  R$ {u.cur.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
