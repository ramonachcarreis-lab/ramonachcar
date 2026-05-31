import { clsx } from 'clsx';
import { AlertTriangle, Clock } from 'lucide-react';
import type { AppEvent } from '../context/EventsContext';
import { useRentalCountdown, type RentalTimerStatus } from '../hooks/useRentalCountdown';

const progressTone: Record<RentalTimerStatus, string> = {
  active: 'bg-emerald-500',
  warning: 'bg-amber-400',
  critical: 'bg-[#ff6b4a] animate-pulse',
  completed: 'bg-slate-400',
  idle: 'bg-slate-300',
};

const statusLabel: Record<RentalTimerStatus, string | null> = {
  active: null,
  warning: 'Atenção',
  critical: 'Tempo esgotando',
  completed: 'Tempo finalizado',
  idle: null,
};

type Props = {
  event: AppEvent;
  className?: string;
  /** Destaque maior (cards do Tempo comercial/rede) */
  prominent?: boolean;
};

export default function RentalCountdown({ event, className, prominent = true }: Props) {
  const { timeLeft, status, hasTimer, progressPct, pickupEnd, formatClock } =
    useRentalCountdown(event);

  if (!hasTimer && !event.pickedUp) return null;

  const showBar = hasTimer || event.pickedUp;
  const displayStatus = event.pickedUp ? 'completed' : status;
  const label = statusLabel[displayStatus];

  return (
    <div
      className={clsx(
        prominent && 'rounded-xl border p-3 mb-3',
        prominent && displayStatus === 'critical' && 'border-[#ff6b4a66] bg-[#ff6b4a12]',
        prominent && displayStatus === 'warning' && 'border-amber-500/40 bg-amber-500/10',
        prominent &&
          (displayStatus === 'active' || displayStatus === 'idle') &&
          'border-[var(--tone-success-border)] bg-[var(--tone-success-bg)]',
        prominent && displayStatus === 'completed' && 'border-[var(--color-border)] bg-[var(--color-surface-muted)]',
        className
      )}
    >
      <div className="flex justify-between items-center gap-3 mb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] opacity-90 flex items-center gap-1">
          <Clock className="w-4 h-4 shrink-0" aria-hidden />
          {event.pickedUp ? 'Serviço concluído' : 'Serviço em execução'}
        </p>
        <div
          className={clsx(
            'font-black font-mono tabular-nums tracking-tight',
            prominent ? 'text-3xl sm:text-4xl' : 'text-2xl',
            displayStatus === 'critical' && 'text-[#ff8a70]',
            displayStatus === 'warning' && 'text-amber-500',
            displayStatus === 'completed' && 'text-[var(--color-text-muted)]',
            (displayStatus === 'active' || displayStatus === 'idle') &&
              'text-[var(--tone-success-title)]'
          )}
          aria-live="polite"
          aria-label={`Tempo restante ${formatClock()}`}
        >
          {event.pickedUp ? '00:00' : formatClock()}
        </div>
      </div>

      {showBar && (
        <div
          className="h-2.5 w-full rounded-full overflow-hidden bg-black/10 dark:bg-white/10"
          role="progressbar"
          aria-valuenow={Math.round(progressPct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={clsx(
              'h-full transition-all duration-1000 ease-linear rounded-full',
              progressTone[displayStatus]
            )}
            style={{ width: `${event.pickedUp ? 100 : progressPct}%` }}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 min-h-[1.25rem]">
        {label && (
          <span
            className={clsx(
              'text-xs font-bold uppercase flex items-center gap-1',
              displayStatus === 'critical' && 'text-[#ff8a70]',
              displayStatus === 'warning' && 'text-amber-600 dark:text-amber-400'
            )}
          >
            {displayStatus === 'critical' && <AlertTriangle className="w-4 h-4" aria-hidden />}
            {label}
          </span>
        )}
        {pickupEnd && !event.pickedUp && (
          <span className="text-[10px] font-bold uppercase text-[var(--color-text-muted)] ml-auto">
            Retirada às{' '}
            {pickupEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
