import { useMemo } from 'react';
import { format, getDaysInMonth, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { LogisticsDayRecord } from '../utils/logisticsRecords';
import { dateKeyFromDate } from '../utils/logisticsRecords';

type Props = {
  month: Date;
  records: LogisticsDayRecord[];
  /** km do dia selecionado ainda não lançado */
  todayEstimateKm?: number;
  todayEstimateFuel?: number;
  todayKey?: string;
  isTodayPosted?: boolean;
  selectedDayKey?: string;
  onSelectDay?: (date: Date) => void;
};

function formatPtMoney(value: number) {
  return `R$ ${value.toFixed(0).replace('.', ',')}`;
}

export default function LogisticsMonthChart({
  month,
  records,
  todayEstimateKm = 0,
  todayEstimateFuel = 0,
  todayKey,
  isTodayPosted,
  selectedDayKey,
  onSelectDay,
}: Props) {
  const chartData = useMemo(() => {
    const start = startOfMonth(month);
    const days = getDaysInMonth(month);
    const byKey = new Map(records.map((r) => [r.dateKey, r]));

    return Array.from({ length: days }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), i + 1);
      const key = dateKeyFromDate(d);
      const date = d;
      const rec = byKey.get(key);
      let km = rec?.distanceKm ?? 0;
      let fuel = rec?.fuelCost ?? 0;
      if (todayKey === key && !isTodayPosted && todayEstimateKm > 0) {
        km = todayEstimateKm;
        fuel = todayEstimateFuel;
      }
      return {
        key,
        date,
        day: i + 1,
        label: format(d, 'd', { locale: ptBR }),
        km,
        fuel,
        posted: Boolean(rec?.postedAt),
      };
    });
  }, [month, records, todayKey, todayEstimateKm, todayEstimateFuel, isTodayPosted]);

  const maxKm = Math.max(...chartData.map((d) => d.km), 1);
  const maxFuel = Math.max(...chartData.map((d) => d.fuel), 1);
  const totalKm = chartData.reduce((s, d) => s + d.km, 0);
  const totalFuel = chartData.reduce((s, d) => s + d.fuel, 0);
  const activeDays = chartData.filter((d) => d.km > 0).length;

  return (
    <section className="app-panel p-4 space-y-3">
      <div className="flex flex-wrap justify-between items-start gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">
            Gráfico do mês
          </p>
          <p className="text-sm font-black text-[var(--color-text)] capitalize">
            {format(month, "MMMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="text-right text-[10px] font-bold text-[var(--color-text-muted)]">
          <p>{totalKm.toFixed(1)} km total</p>
          <p className="text-accent-coral">{formatPtMoney(totalFuel)} combustível</p>
          <p>{activeDays} dia(s) com rota</p>
        </div>
      </div>

      <div className="flex gap-3 text-[10px] font-bold text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-primary-500" /> km
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-accent-coral/80" /> R$ combustível
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> lançado
        </span>
      </div>

      <div className="relative h-36 flex items-end gap-0.5 sm:gap-1 pt-2 border-b border-[var(--color-border)]">
        {chartData.map((d) => {
          const kmH = d.km > 0 ? Math.max(8, (d.km / maxKm) * 100) : 0;
          const fuelH = d.fuel > 0 ? Math.max(6, (d.fuel / maxFuel) * 85) : 0;
          const isSelected = selectedDayKey === d.key;
          const canSelect = Boolean(onSelectDay);
          const barTitle = `${d.label}: ${d.km.toFixed(1)} km · ${formatPtMoney(d.fuel)}${d.posted ? ' · lançado' : ''}${canSelect ? ' · toque para ver o dia' : ''}`;
          const barClass = `flex-1 min-w-0 flex flex-col items-center justify-end gap-0.5 group ${
            canSelect
              ? 'cursor-pointer rounded-t hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-primary-500'
              : ''
          } ${isSelected ? 'ring-1 ring-primary-400 rounded-t' : ''}`;

          const barContent = (
            <>
              <div className="w-full flex items-end justify-center gap-px h-28">
                <div
                  className="w-[42%] rounded-t bg-primary-500/90 transition-all group-hover:bg-primary-400"
                  style={{ height: `${kmH}%` }}
                />
                <div
                  className="w-[42%] rounded-t bg-accent-coral/70 transition-all"
                  style={{ height: `${fuelH}%` }}
                />
              </div>
              {d.posted && (
                <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
              )}
              <span className="text-[8px] text-[var(--color-text-subtle)] truncate w-full text-center">
                {d.day % 5 === 0 || d.day === 1 ? d.label : ''}
              </span>
            </>
          );

          return canSelect ? (
            <button
              key={d.key}
              type="button"
              onClick={() => onSelectDay?.(d.date)}
              className={barClass}
              title={barTitle}
              aria-label={`Ver logística de ${d.label}`}
            >
              {barContent}
            </button>
          ) : (
            <div key={d.key} className={barClass} title={barTitle}>
              {barContent}
            </div>
          );
        })}
      </div>
    </section>
  );
}
