import { useEffect, useMemo, useState } from 'react';
import { Save, FileSignature, Ticket } from 'lucide-react';
import { AppEvent, useEvents } from '../context/EventsContext';
import EventAddressFields from './EventAddressFields';
import {
  consolidateEventAddress,
  isEventAddressComplete,
  parseEventAddressFromString,
  type EventAddress,
} from '../types/eventAddress';
import { getUnitById, buildUnitCatalog } from '../utils/units';
import { useSettings } from '../context/SettingsContext';
import { proposalItemsFromLegacy, proposalLineClientLabel } from '../utils/proposalItems';
import { isCatalogStudioAsset } from '../config/catalogAssets';
import { clsx } from 'clsx';
import { resolveEstimatedServiceHours, formatEstimatedHoursLabel } from '../utils/eventServiceDisplay';
import {
  buildPaymentPlanSummary,
  calcContractBalance,
  createBalancePaymentEntry,
  getBalancePaymentEntries,
  isPaymentAllocationValid,
  type BalancePaymentEntry,
} from '../utils/paymentPlan';
import { depositPolicyHint, formatDepositBrl, depositPolicyFromLicensee } from '../utils/dateHold';
import { useLicensees } from '../context/LicenseesContext';
import PaymentBalanceStepper from './PaymentBalanceStepper';
import { calcDepositAmount } from '../utils/dateHold';
import { formatCpfInput, cpfDigits } from '../utils/cpf';
import {
  findValidCoupon,
  getClientCoupons,
  isPhysicalBrinde,
  markCouponUsed,
} from '../utils/clubeCoupons';

type Props = {
  event: AppEvent;
  authorLabel: string;
  onSaved?: () => void;
  readOnly?: boolean;
  /** core = CPF/endereço; payment = saldo (no fim do fluxo); all = tudo junto */
  section?: 'all' | 'core' | 'payment';
};

function initialEntries(event: AppEvent): BalancePaymentEntry[] {
  const existing = getBalancePaymentEntries(event);
  if (existing.length) return existing;
  const balance = calcContractBalance(event);
  if (balance <= 0) return [];
  return [createBalancePaymentEntry({ amount: balance, method: 'pix', installments: 1 })];
}

export default function CrmContractForm({
  event,
  authorLabel,
  onSaved,
  readOnly,
  section = 'all',
}: Props) {
  const { updateEvent } = useEvents();
  const { getUnitEquipments } = useSettings();
  const { getLicensee } = useLicensees();
  const [cpf, setCpf] = useState(event.cpf || '');
  const [paymentEntries, setPaymentEntries] = useState<BalancePaymentEntry[]>(() =>
    initialEntries(event)
  );
  const [eventAddress, setEventAddress] = useState<EventAddress>(() =>
    event.eventAddress
      ? { ...event.eventAddress }
      : parseEventAddressFromString(event.address)
  );
  const [couponInput, setCouponInput] = useState(event.couponCode || '');
  const [couponMsg, setCouponMsg] = useState('');

  const unitId = event.unitId || 'sp-centro';
  const clientCoupons = useMemo(
    () => getClientCoupons(event.phone, event.client, unitId).filter((c) => !c.usedAt),
    [event.phone, event.client, unitId, event.updatedAt]
  );

  const balanceDue = useMemo(() => calcContractBalance(event), [event]);
  const unitLicensee = useMemo(
    () => getLicensee(event.unitId || 'sp-centro'),
    [event.unitId, getLicensee]
  );
  const depositPolicy = useMemo(() => depositPolicyFromLicensee(unitLicensee), [unitLicensee]);
  const suggestedDeposit = useMemo(
    () => calcDepositAmount(event.totalValue || 0, depositPolicy.kind, depositPolicy.value),
    [event.totalValue, depositPolicy]
  );

  useEffect(() => {
    setCpf(event.cpf || '');
    setPaymentEntries(initialEntries(event));
    setEventAddress(
      event.eventAddress
        ? { ...event.eventAddress }
        : parseEventAddressFromString(event.address)
    );
  }, [event.id, event.updatedAt, event.totalValue, event.depositPaidAt, event.depositAmount]);

  const catalog = buildUnitCatalog(event.unitId || 'sp-centro', getUnitEquipments(event.unitId || 'sp-centro'));
  const lineItems = proposalItemsFromLegacy(event, catalog.equipments);
  const estHours = resolveEstimatedServiceHours(event);

  const paymentValid = isPaymentAllocationValid(event, paymentEntries);

  const paymentPreview = useMemo(
    () => buildPaymentPlanSummary({ ...event, paymentBalanceEntries: paymentEntries }, paymentEntries),
    [event, paymentEntries]
  );

  const addressOk = isEventAddressComplete(eventAddress);
  const cpfOk = cpfDigits(cpf).length === 0 || cpfDigits(cpf).length === 11;
  const canSubmitCore = addressOk && cpfOk && !readOnly;
  const canSubmitPayment = paymentValid && !readOnly;
  const canSubmit =
    section === 'core'
      ? canSubmitCore
      : section === 'payment'
        ? canSubmitPayment
        : canSubmitCore && canSubmitPayment;

  const applyCoupon = (code: string) => {
    const coupon = findValidCoupon(code, {
      unitId,
      clientPhone: event.phone,
      clientName: event.client,
    });
    if (!coupon) {
      setCouponMsg('Cupom inválido, expirado ou não pertence a este cliente.');
      return;
    }
    if (isPhysicalBrinde(coupon.rewardCategory)) {
      setCouponMsg('Este resgate é brinde físico — não usa cupom no contrato.');
      return;
    }
    const baseTotal = event.couponOriginalTotal ?? event.totalValue ?? 0;
    let newTotal = baseTotal;
    if (coupon.couponType === 'discount' && coupon.discountPercent) {
      newTotal = Math.round(baseTotal * (1 - coupon.discountPercent / 100) * 100) / 100;
    } else if (coupon.couponType === 'free_rental') {
      newTotal = 0;
    }
    setCouponInput(coupon.code);
    setCouponMsg(
      `Cupom aplicado: ${coupon.rewardName}. Valor ${formatBrl(baseTotal)} → ${formatBrl(newTotal)}. Válido até ${new Date(coupon.validUntil).toLocaleDateString('pt-BR')}.`
    );
    updateEvent(
      event.id,
      {
        couponCode: coupon.code,
        couponDiscountPercent: coupon.discountPercent,
        couponRewardName: coupon.rewardName,
        couponOriginalTotal: baseTotal,
        totalValue: newTotal,
      },
      authorLabel
    );
    markCouponUsed(coupon.code, event.id);
  };

  const clearCoupon = () => {
    const restore = event.couponOriginalTotal ?? event.totalValue ?? 0;
    setCouponInput('');
    setCouponMsg('');
    updateEvent(
      event.id,
      {
        couponCode: undefined,
        couponDiscountPercent: undefined,
        couponRewardName: undefined,
        couponOriginalTotal: undefined,
        totalValue: restore,
      },
      authorLabel
    );
  };

  const persistCore = () => {
    if (!canSubmitCore) return;
    updateEvent(
      event.id,
      {
        cpf: cpfDigits(cpf) ? cpf.trim() : undefined,
        address: consolidateEventAddress(eventAddress),
        eventAddress: { ...eventAddress },
      },
      authorLabel
    );
  };

  const persistPayment = () => {
    if (!canSubmitPayment) return;
    const first = paymentEntries[0];
    updateEvent(
      event.id,
      {
        paymentBalanceEntries: paymentEntries,
        paymentBalanceMethod: first?.method,
        paymentBalanceInstallments: first?.installments,
      },
      authorLabel
    );
  };

  const handleSave = () => {
    if (section === 'core') {
      if (!canSubmitCore) return;
      persistCore();
    } else if (section === 'payment') {
      if (!canSubmitPayment) return;
      persistPayment();
    } else {
      if (!canSubmit) return;
      persistCore();
      persistPayment();
    }
    onSaved?.();
  };

  const showCore = section === 'all' || section === 'core';
  const showPayment = section === 'all' || section === 'payment';

  const headerTitle =
    section === 'payment'
      ? 'Pagamento do saldo'
      : section === 'core'
        ? 'Dados do contrato'
        : 'Contrato — formalização';
  const headerSub =
    section === 'payment'
      ? 'Defina antes de enviar o contrato — entra no PDF e no saldo após o sinal.'
      : section === 'core'
        ? 'CPF (opcional) e endereço do serviço'
        : 'CPF, endereço e formas de pagamento';

  return (
    <section className="border-2 border-emerald-200 rounded-2xl overflow-hidden">
      <div className="bg-emerald-800 text-white px-4 py-2.5 flex items-center gap-2">
        <FileSignature className="w-4 h-4 shrink-0" />
        <div>
          <p className="text-xs font-black uppercase">{headerTitle}</p>
          <p className="text-[10px] opacity-85">{headerSub}</p>
        </div>
      </div>

      <div className="p-4 space-y-4 bg-white text-slate-900">
        {showCore && (
        <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 border border-slate-200">
          <p className="text-[10px] font-black text-slate-500 uppercase">Resumo da proposta (somente leitura)</p>
          <p>
            <span className="font-bold text-slate-500">Cliente:</span> {event.client} · {event.phone}
          </p>
          <p>
            <span className="font-bold text-slate-500">Evento:</span> {event.eventType}
            {event.honoreeName ? ` · ${event.honoreeName}` : ''}
          </p>
          <p>
            <span className="font-bold text-slate-500">Data reservada:</span>{' '}
            {new Date(event.date).toLocaleDateString('pt-BR')} · {event.time}
          </p>
          <p>
            <span className="font-bold text-slate-500">Unidade:</span> {getUnitById(event.unitId).name}
          </p>
          <p>
            <span className="font-bold text-slate-500">Valor:</span> R$ {(event.totalValue || 0).toFixed(2)}
          </p>
          {event.depositPaidAt && event.depositAmount != null && (
            <p className="text-emerald-800 font-bold">
              Sinal pago: {formatDepositBrl(event.depositAmount)} em{' '}
              {new Date(event.depositPaidAt).toLocaleDateString('pt-BR')}
            </p>
          )}
          {lineItems.length > 0 && (
            <div>
              <p className="font-bold text-slate-500 mb-1">Itens do serviço:</p>
              <ul className="space-y-1">
                {lineItems.map((row) => (
                  <li key={row.equipmentId} className="flex gap-2 items-center">
                    {row.photoUrl ? (
                      <img
                        src={row.photoUrl}
                        alt=""
                        className={clsx(
                          'w-10 h-10 rounded border border-amber-100',
                          isCatalogStudioAsset(row.photoUrl) ? 'object-contain bg-white' : 'object-cover'
                        )}
                      />
                    ) : null}
                    <span>{proposalLineClientLabel(row)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {estHours != null && (
            <p className="text-xs font-bold text-amber-800 bg-amber-50 rounded-lg px-2 py-1.5">
              Tempo estimado na equipe (interno): {formatEstimatedHoursLabel(estHours)}
            </p>
          )}
        </div>
        )}

        {showPayment && section === 'payment' && (
          <PaymentBalanceStepper
            event={event}
            suggestedDeposit={suggestedDeposit}
            depositPolicyLabel={depositPolicyHint(depositPolicy.kind, depositPolicy.value)}
            entries={paymentEntries}
            onChange={setPaymentEntries}
            readOnly={readOnly}
            onSave={() => {
              persistPayment();
              onSaved?.();
            }}
            canSave={canSubmitPayment}
          />
        )}

        {showPayment && section !== 'payment' && (
        <div className="app-panel-muted !p-4 space-y-2">
          <p className="text-xs font-bold uppercase text-[var(--color-text-muted)]">
            Pagamento (resumo)
          </p>
          {paymentPreview?.lines.map((line) => (
            <p key={line} className="text-[10px] text-[var(--color-text-muted)]">
              • {line}
            </p>
          ))}
        </div>
        )}

        {showCore && (
        <div className="border border-violet-200 bg-violet-50 rounded-xl p-3 space-y-2">
          <p className="text-[10px] font-black text-violet-900 uppercase flex items-center gap-1">
            <Ticket className="w-3.5 h-3.5" />
            Cupom Clube Panda (checkout)
          </p>
          <p className="text-[10px] text-slate-600">
            Desconto, locação grátis ou serviço resgatado gera código único — aplique só neste evento.
          </p>
          {event.couponCode && (
            <p className="text-xs font-bold text-violet-800 bg-white rounded-lg px-2 py-1.5">
              Ativo: {event.couponCode}
              {event.couponRewardName ? ` · ${event.couponRewardName}` : ''}
              {!readOnly && (
                <button type="button" onClick={clearCoupon} className="ml-2 underline text-red-700">
                  Remover
                </button>
              )}
            </p>
          )}
          {!readOnly && !event.couponCode && (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Ex.: PL-ABC123"
                className="flex-1 border-2 border-white rounded-xl p-3 font-mono font-bold text-sm uppercase"
              />
              <button
                type="button"
                onClick={() => applyCoupon(couponInput)}
                className="shrink-0 px-4 py-3 bg-violet-700 text-white font-bold rounded-xl text-sm"
              >
                Aplicar cupom
              </button>
            </div>
          )}
          {clientCoupons.length > 0 && !event.couponCode && !readOnly && (
            <div className="flex flex-wrap gap-1.5">
              {clientCoupons.slice(0, 5).map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => applyCoupon(c.code)}
                  className="text-[10px] font-bold bg-white border border-violet-200 px-2 py-1 rounded-lg text-violet-800"
                >
                  {c.code}
                </button>
              ))}
            </div>
          )}
          {couponMsg && <p className="text-[10px] font-bold text-violet-900">{couponMsg}</p>}
        </div>
        )}

        {showCore && (
        <>
        <div>
          <label className="text-[10px] font-bold text-slate-700 uppercase">CPF do responsável (opcional)</label>
          <input
            disabled={readOnly}
            value={cpf}
            onChange={(e) => setCpf(formatCpfInput(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            className="w-full mt-0.5 border-2 border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-900 min-h-[48px] disabled:bg-slate-50 bg-white"
          />
          {cpfDigits(cpf).length > 0 && cpfDigits(cpf).length < 11 && (
            <p className="text-[10px] font-bold text-amber-800 mt-1">Complete os 11 dígitos ou deixe em branco.</p>
          )}
        </div>

        <EventAddressFields value={eventAddress} onChange={setEventAddress} disabled={readOnly} />
        </>
        )}

        {!readOnly && section !== 'payment' && (
          <>
            {!canSubmit && (
              <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-3">
                {getContractIncompleteReason({
                  ...event,
                  cpf,
                  eventAddress,
                  address: consolidateEventAddress(eventAddress),
                }) ||
                  (balanceDue > 0 && !paymentValid
                    ? 'Distribua o saldo entre as formas de pagamento (soma deve bater com o saldo após o sinal).'
                    : 'Complete os campos acima para continuar.')}
              </p>
            )}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSave}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 min-h-[48px]"
            >
              <Save className="w-4 h-4" />
              {section === 'core' ? 'Salvar dados do contrato' : 'Salvar contrato'}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export function isContractFormComplete(event: AppEvent): boolean {
  return getContractIncompleteReason(event) === null;
}

export function getContractIncompleteReason(event: AppEvent): string | null {
  const cpfLen = cpfDigits(event.cpf).length;
  if (cpfLen > 0 && cpfLen < 11) {
    return 'CPF incompleto — complete 11 dígitos ou apague o campo.';
  }
  const addr = event.eventAddress || parseEventAddressFromString(event.address);
  if (!isEventAddressComplete(addr)) {
    return 'Preencha CEP, rua, número, bairro, cidade e UF do serviço.';
  }
  const entries = getBalancePaymentEntries(event);
  if (calcContractBalance(event) > 0 && !isPaymentAllocationValid(event, entries)) {
    return 'Ajuste as formas de pagamento do saldo — a soma deve igualar o valor restante após o sinal.';
  }
  return null;
}
