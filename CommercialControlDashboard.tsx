import { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  DollarSign,
  Percent,
  Trophy,
  BarChart3,
} from 'lucide-react';
import type { AppEvent } from '../context/EventsContext';
import {
  buildCommercialPerformance,
  formatBrlShort,
  formatPct,
  type CommercialPerformance,
} from '../utils/commercialControlStats';

type Props = {
  events: AppEvent[];
  commercials: { id: string; name: string; goal: number }[];
  selectedName: string;
  onSelectCommercial: (name: string) => void;
  onUpdateGoal: (userId: string, goal: number) => void;
};

function GrowthBadge({ value }: { value: number }) {
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-black ${
        positive ? 'text-[var(--status-success)]' : 'text-[var(--status-danger)]'
      }`}
    >
      <Icon className="w-4 h-4" />
      {formatPct(value)}
    </span>
  );
}

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof DollarSign;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
      <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)] flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </p>
      <p className="text-xl font-black text-[var(--color-text)] mt-1 tabular-nums">{value}</p>
      {sub ? <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{sub}</p> : null}
    </div>
  );
}

function SelectedDetail({ row }: { row: CommercialPerformance }) {
  const metaPct = Math.min((row.revenueMonth / Math.max(row.goal, 1)) * 100, 100);

  return (
    <div className="app-panel space-y-4 border border-[var(--accent-primary)]/25">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-[var(--accent-primary)]">Faturamento do colaborador</p>
          <h2 className="text-lg font-black text-[var(--color-text)] mt-0.5">{row.name}</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {row.rank}º no ranking da equipe · {row.shareOfTeamRevenuePct}% do faturamento comercial do mês
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 px-3 py-2">
          <Trophy className="w-5 h-5 text-[var(--accent-primary)]" />
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Posição</p>
            <p className="text-lg font-black text-[var(--accent-primary)]">
              {row.rank}/{row.totalCommercials}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <StatTile
          label="Faturamento mês"
          value={formatBrlShort(row.revenueMonth)}
          sub={`Meta ${formatBrlShort(row.goal)}`}
          icon={DollarSign}
        />
        <StatTile
          label="Faturamento geral"
          value={formatBrlShort(row.revenueTotal)}
          sub="Acumulado (vendas fechadas)"
          icon={BarChart3}
        />
        <StatTile
          label="Crescimento"
          value={formatPct(row.growthPct)}
          sub={`Mês ant. ${formatBrlShort(row.revenuePrevMonth)}`}
          icon={TrendingUp}
        />
        <StatTile
          label="Conversão"
          value={`${row.conversionPct.toFixed(1)}%`}
          sub={`${row.closedMonth} fechados · ${row.funnelOpen} no funil`}
          icon={Percent}
        />
        <StatTile
          label="Pessoas atendidas"
          value={String(row.clientsServedMonth)}
          sub={`${row.clientsServedTotal} no histórico`}
          icon={Users}
        />
        <StatTile
          label="Serviços fechados"
          value={String(row.servicesMonth)}
          sub={`${row.closedPrevMonth} no mês anterior`}
          icon={Target}
        />
      </div>

      <div>
        <div className="flex justify-between text-xs font-bold text-[var(--color-text-muted)] mb-1">
          <span>Meta individual do mês</span>
          <span className="text-[var(--color-text)]">
            {formatBrlShort(row.revenueMonth)} / {formatBrlShort(row.goal)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
          <div
            className="h-full bg-[var(--status-success)] rounded-full transition-all"
            style={{ width: `${metaPct}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        <GrowthBadge value={row.growthPct} />
        <span className="text-[var(--color-text-muted)]">
          Comparativo: {row.closedMonth >= row.closedPrevMonth ? 'vendeu mais' : 'vendeu menos'} que o mês
          anterior ({row.closedPrevMonth} → {row.closedMonth} serviços)
        </span>
      </div>
    </div>
  );
}

export default function CommercialControlDashboard({
  events,
  commercials,
  selectedName,
  onSelectCommercial,
  onUpdateGoal,
}: Props) {
  const performance = useMemo(
    () => buildCommercialPerformance(events, commercials),
    [events, commercials]
  );

  const sorted = useMemo(
    () => [...performance].sort((a, b) => b.revenueMonth - a.revenueMonth),
    [performance]
  );

  const selected =
    selectedName !== 'all' ? performance.find((p) => p.name === selectedName) : null;

  const teamSummary = useMemo(() => {
    if (selected) return null;
    const revenueMonth = sorted.reduce((s, p) => s + p.revenueMonth, 0);
    const clientsServed = sorted.reduce((s, p) => s + p.clientsServedMonth, 0);
    const closed = sorted.reduce((s, p) => s + p.closedMonth, 0);
    const avgConversion =
      sorted.length > 0
        ? Math.round((sorted.reduce((s, p) => s + p.conversionPct, 0) / sorted.length) * 10) / 10
        : 0;
    return { revenueMonth, clientsServed, closed, avgConversion };
  }, [selected, sorted]);

  const maxRevenue = Math.max(...sorted.map((p) => p.revenueMonth), 1);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((c) => {
          const isSelected = selectedName === c.name;
          const metaPct = Math.min((c.revenueMonth / Math.max(c.goal, 1)) * 100, 100);
          return (
            <div
              key={c.userId}
              className={`tempo-live-card transition-all ${
                isSelected ? 'ring-2 ring-[var(--accent-primary)]' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectCommercial(c.name)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="tempo-live-title">{c.name}</p>
                  <span className="text-[10px] font-black text-[var(--accent-primary)]">#{c.rank}</span>
                </div>
                <p className="tempo-live-meta">
                  {c.activeDeals} em andamento · {formatBrlShort(c.revenueMonth)} /{' '}
                  {c.goal.toLocaleString('pt-BR')}
                </p>
                <div className="h-1.5 rounded-full bg-[var(--color-surface-muted)] mt-2 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${metaPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-2">
                  {c.clientsServedMonth} pessoas · conversão {c.conversionPct.toFixed(0)}% ·{' '}
                  <GrowthBadge value={c.growthPct} />
                </p>
              </button>
              <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase flex items-center gap-1 mt-3">
                <Target className="w-3 h-3" />
                Meta individual R$
              </label>
              <input
                type="number"
                min={0}
                defaultValue={c.goal}
                onBlur={(e) => onUpdateGoal(c.userId, Number(e.target.value) || 0)}
                className="w-full border-2 border-[var(--color-border)] rounded-lg py-2 px-2 font-bold text-sm mt-1 bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
          );
        })}
      </div>

      {selected ? (
        <SelectedDetail row={selected} />
      ) : teamSummary ? (
        <div className="app-panel space-y-2">
          <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">
            Faturamento geral da equipe comercial (mês)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatTile
              label="Faturamento mês"
              value={formatBrlShort(teamSummary.revenueMonth)}
              icon={DollarSign}
            />
            <StatTile
              label="Pessoas atendidas"
              value={String(teamSummary.clientsServed)}
              sub="Soma por comercial"
              icon={Users}
            />
            <StatTile
              label="Serviços fechados"
              value={String(teamSummary.closed)}
              icon={Target}
            />
            <StatTile
              label="Conversão média"
              value={`${teamSummary.avgConversion.toFixed(1)}%`}
              icon={Percent}
            />
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Clique em um colaborador acima para ver faturamento individual, crescimento e comparativo
            detalhado.
          </p>
        </div>
      ) : null}

      <div className="app-panel space-y-3">
        <p className="text-xs font-black uppercase text-[var(--color-text-muted)] flex items-center gap-1">
          <BarChart3 className="w-4 h-4" />
          Comparativo individual — faturamento do mês
        </p>
        <div className="space-y-2">
          {sorted.map((p) => {
            const width = Math.max(4, (p.revenueMonth / maxRevenue) * 100);
            const isTop = p.rank === 1;
            const isBottom = p.rank === sorted.length && sorted.length > 1;
            return (
              <div key={p.userId} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectCommercial(p.name)}
                  className={`w-28 sm:w-36 text-left text-xs font-bold truncate shrink-0 ${
                    selectedName === p.name
                      ? 'text-[var(--accent-primary)]'
                      : 'text-[var(--color-text)]'
                  }`}
                >
                  {p.name}
                </button>
                <div className="flex-1 h-7 rounded-lg bg-[var(--color-surface-muted)] overflow-hidden relative">
                  <div
                    className={`h-full rounded-lg ${
                      isTop
                        ? 'bg-[var(--accent-primary)]'
                        : isBottom
                          ? 'bg-slate-600'
                          : 'bg-emerald-600/80'
                    }`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="text-xs font-black text-[var(--color-text)] w-20 text-right tabular-nums shrink-0">
                  {formatBrlShort(p.revenueMonth)}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] w-14 text-right shrink-0 hidden sm:block">
                  {p.servicesMonth} serv.
                </span>
              </div>
            );
          })}
        </div>
        {sorted.length >= 2 && (
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Quem vendeu mais: <strong className="text-[var(--color-text)]">{sorted[0].name}</strong> (
            {formatBrlShort(sorted[0].revenueMonth)}) · Quem vendeu menos:{' '}
            <strong className="text-[var(--color-text)]">{sorted[sorted.length - 1].name}</strong> (
            {formatBrlShort(sorted[sorted.length - 1].revenueMonth)})
          </p>
        )}
      </div>
    </div>
  );
}
