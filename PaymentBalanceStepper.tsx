import { useState } from 'react';
import { Plus, Save, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import type { AppEvent } from '../context/EventsContext';
import {
  BALANCE_METHOD_LABELS,
  buildAgreedPaymentHeadline,
  buildPaymentPlanSummary,
  calcContractBalance,
  createBalancePaymentEntry,
  formatBrl,
  INSTALLMENT_OPTIONS,
  isPaymentAllocationValid,
  sumPaymentEntries,
  type BalancePaymentEntry,
  type BalancePaymentMethod,
} from '../utils/paymentPlan';
import { formatDepositBrl } from '../utils/dateHold';

type Props = {
  event: AppEvent;
  suggestedDeposit: number;
  depositPolicyLabel: string;
  entries: BalancePaymentEntry[];
  onChange: (entries: BalancePaymentEntry[]) => void;
  readOnly?: boolean;
  onSave: () => void;
  canSave: boolean;
};

export default function PaymentBalanceStepper({
  event,
  suggestedDeposit,
  depositPolicyLabel,
  entries,
  onChange,
  readOnly,
  onSave,
  canSave,
}: Props) {
  const [step, setStep] = useState<0 | 1>(event.depositPaidAt ? 1 : 0);
  const balanceDue = calcContractBalance(event);
  const allocated = sumPaymentEntries(entries);
  const remaining = Math.round((balanceDue - allocated) * 100) / 100;
  const paymentValid = isPaymentAllocationValid(event, entries);
  const preview = buildPaymentPlanSummary({ ...event, paymentBalanceEntries: entries }, entries);
  const agreedLine = buildAgreedPaymentHeadline(entries);

  const updateEntry = (id: string, patch: Partial<BalancePaymentEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const removeEntry = (id: string) => {
    if (entries.length <= 1) return;
    onChange(entries.filter((e) => e.id !== id));
  };

  const addEntry = () => {
    const rest = Math.max(0, Math.round((balanceDue - allocated) * 100) / 100);
    onChange([
      ...entries,
      createBalancePaymentEntry({
        amount: rest,
        method: 'card',
        installments: 1,
        note: entries.length >= 1 ? `${entries.length + 1}º pagamento` : undefined,
      }),
    ]);
  };

  const fillRemaining = (id: string) => {
    const others = entries.filter((e) => e.id !== id);
    const rest = Math.max(0, Math.round((balanceDue - sumPaymentEntries(others)) * 100) / 100);
    updateEntry(id, { amount: rest });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
        {(['Sinal', 'Saldo'] as const).map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i as 0 | 1)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
              step === i
                ? 'bg-[var(--color-card-bg)] text-[var(--accent-primary)] border border-[var(--border-subtle)]'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="app-panel-muted !p-3 space-y-2 text-sm">
          <p className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Passo 1 — Sinal</p>
          <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
            Política da unidade: {depositPolicyLabel}. Valor sugerido:{' '}
            <strong className="text-[var(--color-text)]">{formatDepositBrl(suggestedDeposit)}</strong>{' '}
            (abatido do total ao confirmar).
          </p>
          {event.depositPaidAt ? (
            <p className="text-xs font-bold text-[var(--status-success)] bg-emerald-950/30 border border-emerald-800/40 rounded-lg px-3 py-2">
              Sinal confirmado em {new Date(event.depositPaidAt).toLocaleDateString('pt-BR')}
              {event.depositAmount != null ? ` · ${formatDepositBrl(event.depositAmount)}` : ''}
            </p>
          ) : (
            <p className="text-xs font-bold text-[var(--status-danger)] bg-red-950/20 border border-red-900/40 rounded-lg px-3 py-2">
              Sinal ainda não confirmado no CRM. Confirme o recebimento na seção acima antes de enviar o
              contrato.
            </p>
          )}
          <button
            type="button"
            onClick={() => setStep(1)}
            className="btn-secondary w-full py-2.5 text-sm flex items-center justify-center gap-1"
          >
            Ir para parcelamento do saldo
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3 max-h-[min(52vh,420px)] overflow-y-auto overscroll-contain pr-0.5">
          <p className="text-xs font-bold uppercase text-[var(--color-text-muted)]">Passo 2 — Saldo</p>
          {balanceDue > 0 ? (
            <>
              <p className="text-sm font-bold text-[var(--color-text)] rounded-lg px-3 py-2 border border-[var(--color-border)] bg-[var(--bg-surface-elevated)]">
                Saldo após sinal: {formatBrl(balanceDue)}
                {!paymentValid && (
                  <span className="block mt-0.5 text-[var(--status-danger)] text-xs">
                    {remaining > 0
                      ? `Falta alocar ${formatBrl(remaining)}`
                      : `Excesso de ${formatBrl(Math.abs(remaining))}`}
                  </span>
                )}
              </p>

              {entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-[var(--color-border)] p-3 space-y-2 bg-[var(--bg-surface-elevated)]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">
                      Pagamento {index + 1}
                    </p>
                    {entries.length > 1 && !readOnly && (
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        className="p-1 text-[var(--status-danger)]"
                        aria-label="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                        Valor (R$)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        disabled={readOnly}
                        value={entry.amount || ''}
                        onChange={(e) =>
                          updateEntry(entry.id, { amount: Number(e.target.value) || 0 })
                        }
                        className="app-input w-full mt-0.5 font-bold"
                      />
                      {!readOnly && remaining > 0.01 && (
                        <button
                          type="button"
                          onClick={() => fillRemaining(entry.id)}
                          className="text-[10px] font-bold text-[var(--accent-primary)] underline mt-0.5"
                        >
                          Usar restante ({formatBrl(remaining)})
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                        Meio
                      </label>
                      <select
                        disabled={readOnly}
                        value={entry.method}
                        onChange={(e) =>
                          updateEntry(entry.id, {
                            method: e.target.value as BalancePaymentMethod,
                          })
                        }
                        className="app-input w-full mt-0.5 font-bold"
                      >
                        {(Object.keys(BALANCE_METHOD_LABELS) as BalancePaymentMethod[]).map((k) => (
                          <option key={k} value={k}>
                            {BALANCE_METHOD_LABELS[k]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                        Parcelas
                      </label>
                      <select
                        disabled={readOnly}
                        value={entry.installments}
                        onChange={(e) =>
                          updateEntry(entry.id, { installments: Number(e.target.value) })
                        }
                        className="app-input w-full mt-0.5 font-bold"
                      >
                        {INSTALLMENT_OPTIONS.map((n) => (
                          <option key={n} value={n}>
                            {n === 1 ? 'À vista (1x)' : `${n}x`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {!readOnly && (
                <button
                  type="button"
                  onClick={addEntry}
                  className="btn-secondary w-full py-2.5 text-sm flex items-center justify-center gap-2 border-dashed"
                >
                  <Plus className="w-4 h-4" />
                  Outra forma de pagamento
                </button>
              )}

              {agreedLine && (
                <p className="text-[11px] font-bold text-[var(--status-success)] border border-emerald-800/40 bg-emerald-950/20 rounded-lg px-3 py-2">
                  {agreedLine}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">
              Saldo zerado após o sinal — nenhuma forma de pagamento adicional necessária.
            </p>
          )}

          {preview && preview.lines.length > 0 && (
            <ul className="text-[10px] text-[var(--color-text-muted)] space-y-0.5 border border-[var(--color-border)] rounded-lg p-2 max-h-24 overflow-y-auto">
              {preview.lines.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="btn-secondary flex-1 py-2.5 text-sm flex items-center justify-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Sinal
            </button>
            {!readOnly && balanceDue > 0 && (
              <button
                type="button"
                disabled={!canSave}
                onClick={onSave}
                className="btn-primary flex-[2] py-2.5 text-sm flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar pagamento
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
