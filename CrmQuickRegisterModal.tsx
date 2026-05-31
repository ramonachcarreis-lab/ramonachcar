import { useEffect, useMemo, useState } from 'react';
import { X, UserPlus, AlertCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEvents, AppEvent } from '../context/EventsContext';
import { useCommercialProfile } from '../context/CommercialProfileContext';
import { isCommercialOwnedDeal } from '../utils/crmAccess';
import { UNITS } from '../utils/units';
import { getNextEventId } from '../services/eventsStorage';
import { addDays, format } from 'date-fns';
import { useToast } from '../context/ToastContext';

export type QuickRegisterPrefill = {
  clientName?: string;
  phone?: string;
  address?: string;
  eventDetail?: string;
};

type Props = {
  onClose: () => void;
  onCreated: (event: AppEvent) => void;
  /** Veio do botão Novo Contrato na Agenda — mesmo fluxo de contrato do CRM. */
  contractEntry?: boolean;
  prefill?: QuickRegisterPrefill;
};

export default function CrmQuickRegisterModal({ onClose, onCreated, contractEntry, prefill }: Props) {
  const { session } = useAuth();
  const { events, addEvent } = useEvents();
  const { profile } = useCommercialProfile();
  const toast = useToast();
  const isCommercial = session?.role === 'commercial';
  const [clientName, setClientName] = useState(prefill?.clientName || '');
  const [phone, setPhone] = useState(prefill?.phone || '');
  const [unitId, setUnitId] = useState('sp-centro');

  const phoneDigits = phone.replace(/\D/g, '');
  const commercialName = session?.name || profile.name;

  const duplicateByPhone = useMemo(() => {
    if (phoneDigits.length < 8) return null;
    const pool =
      session?.role === 'licensee'
        ? events.filter((e) => (e.unitId || 'sp-centro') === (session?.unitId || 'sp-centro'))
        : events;
    const matches = pool
      .filter((e) => e.phone.replace(/\D/g, '') === phoneDigits)
      .filter((e) => e.status !== 'cancelled')
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || b.date).getTime() -
          new Date(a.updatedAt || a.createdAt || a.date).getTime()
      );
    return matches[0] ?? null;
  }, [events, phoneDigits, session?.role, session?.unitId]);

  const priorByPhone = useMemo(() => {
    if (!duplicateByPhone) return null;
    if (isCommercial && !isCommercialOwnedDeal(duplicateByPhone, commercialName)) return null;
    return duplicateByPhone;
  }, [duplicateByPhone, isCommercial, commercialName]);

  const isDuplicate = Boolean(duplicateByPhone);
  const canOpenExisting = Boolean(priorByPhone);
  const blockedByOtherSeller =
    isDuplicate && isCommercial && duplicateByPhone && !canOpenExisting;

  useEffect(() => {
    if (!priorByPhone) return;
    if (!clientName.trim()) setClientName(priorByPhone.client);
    if (isCommercial && priorByPhone.unitId) setUnitId(priorByPhone.unitId);
  }, [priorByPhone?.id, priorByPhone?.client, priorByPhone?.unitId, isCommercial]);

  const canSubmit = clientName.trim().length >= 2 && phoneDigits.length >= 10;

  const openExistingDeal = () => {
    if (!priorByPhone) return;
    onCreated(priorByPhone);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (isDuplicate) {
      if (canOpenExisting) {
        openExistingDeal();
      } else {
        toast.error('Este telefone já está cadastrado no CRM por outro comercial.');
      }
      return;
    }

    const defaultDate = addDays(new Date(), 7);
    const newEvent: AppEvent = {
      id: getNextEventId(events),
      client: clientName.trim(),
      phone: phone.trim(),
      address: prefill?.address?.trim() || priorByPhone?.address || 'A definir na proposta',
      time: '12:00 - 14:00',
      lat: null,
      lng: null,
      status: 'pending',
      financialStatus: 'Pendente',
      totalValue: 0,
      duration: '4h',
      equipments: [],
      date: defaultDate,
      unitId: isCommercial ? unitId : session?.unitId || 'sp-centro',
      creatorRole: isCommercial ? 'commercial' : 'licensee',
      managedByCommercial: isCommercial ? session?.name || profile.name : undefined,
      crmFlowStep: 'lead',
      docVersions: [],
      missionState: 'scheduled',
      eventType: priorByPhone?.eventType || 'Residencial',
      honoreeName: priorByPhone?.honoreeName,
      eventDetail: prefill?.eventDetail || priorByPhone?.eventDetail,
      referredByPhone: priorByPhone?.referredByPhone,
      eventAddress: priorByPhone?.eventAddress,
      contactLog: [
        {
          id: `cad-${Date.now()}`,
          text: `Cadastro inicial em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
          clientResponded: false,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    addEvent(newEvent);
    toast.success('Cliente cadastrado. Abrindo negócio…');
    onCreated(newEvent);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-[#0f172a99] backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="app-modal w-full max-w-md rounded-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-[var(--color-border)] flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text)]">
              {contractEntry ? 'Novo contrato' : 'Cadastrar cliente'}
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              {contractEntry
                ? 'Cadastre o cliente → proposta → contrato → link de assinatura remota (igual ao CRM).'
                : 'Nome e telefone — proposta no card do negócio'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="app-btn-icon p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {isCommercial && !isDuplicate && (
            <div>
              <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase">
                Unidade licenciada
              </label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="app-input w-full mt-1 font-bold min-h-[48px]"
                disabled={isDuplicate}
              >
                {UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Nome</label>
            <input
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex: Maria Silva"
              readOnly={isDuplicate}
              className="app-input w-full mt-1 min-h-[48px] disabled:opacity-80"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase">
              Telefone (WhatsApp)
            </label>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="11999999999"
              className="app-input w-full mt-1 min-h-[48px]"
            />
          </div>

          {isDuplicate && (
            <div
              className="rounded-xl border px-3 py-3 space-y-1"
              style={{
                borderColor: 'var(--status-danger)',
                background: 'rgba(239, 68, 68, 0.08)',
              }}
              role="alert"
            >
              <p className="text-xs font-bold text-[var(--color-text)] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[var(--status-danger)] mt-0.5" />
                {blockedByOtherSeller ? (
                  <>
                    Telefone já cadastrado ({duplicateByPhone!.client}) por outro comercial. Novo
                    cadastro bloqueado.
                  </>
                ) : (
                  <>
                    Este telefone já está no CRM ({duplicateByPhone!.client}). Não é possível
                    cadastrar outro negócio com o mesmo número.
                  </>
                )}
              </p>
              {canOpenExisting && (
                <p className="text-[10px] text-[var(--color-text-muted)] pl-6">
                  Use outro telefone ou abra o negócio existente abaixo.
                </p>
              )}
            </div>
          )}

          {isDuplicate && canOpenExisting ? (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={openExistingDeal}
              className="btn-primary w-full py-4 min-h-[52px]"
            >
              <ExternalLink className="w-5 h-5" />
              Abrir negócio existente
            </button>
          ) : isDuplicate ? (
            <button
              type="button"
              disabled
              className="btn-primary w-full py-4 min-h-[52px] opacity-50 cursor-not-allowed"
            >
              Cadastro bloqueado
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-primary w-full py-4 min-h-[52px]"
            >
              <UserPlus className="w-5 h-5" />
              {contractEntry ? 'Cadastrar e iniciar contrato' : 'Cadastrar e abrir card'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
