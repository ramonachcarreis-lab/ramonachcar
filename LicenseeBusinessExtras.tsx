import { useState } from 'react';
import { PenLine, Shield } from 'lucide-react';
import type { LicenseeProfile } from '../context/LicenseesContext';
import type { StoredSignature } from '../types/inventory';
import type { DepositPolicyKind } from '../utils/dateHold';
import { depositPolicyHint, normalizeDepositPolicy } from '../utils/dateHold';
import DigitalSignaturePanel from './DigitalSignaturePanel';
import AppSwitch from './AppSwitch';

type Props = {
  draft: LicenseeProfile;
  onChange: (next: LicenseeProfile) => void;
};

export default function LicenseeBusinessExtras({ draft, onChange }: Props) {
  const [sigName, setSigName] = useState(draft.contractSignature?.signerName || draft.name);
  const policy = normalizeDepositPolicy(draft);
  const depositOn = draft.depositPolicyEnabled !== false;
  const kind = draft.depositPolicyKind ?? policy.kind;
  const value = draft.depositPolicyValue ?? policy.value;

  const onSignatureSave = (sig: StoredSignature) => {
    onChange({ ...draft, contractSignature: sig });
  };

  const setKind = (nextKind: DepositPolicyKind) => {
    onChange({
      ...draft,
      depositPolicyKind: nextKind,
      depositPolicyValue: nextKind === 'percent' ? (value || 20) : value || 0,
    });
  };

  const setValue = (n: number) => {
    onChange({ ...draft, depositPolicyKind: kind, depositPolicyValue: n });
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <div className="tone-accent tone-box space-y-3">
        <p className="text-xs font-black uppercase flex items-center gap-2 tone-title">
          <PenLine className="w-4 h-4" />
          Assinatura fixa nos contratos
        </p>
        <p className="text-[10px] text-[var(--color-text-muted)]">
          Desenhe uma vez. Todos os contratos da unidade (você ou o comercial) usarão esta assinatura do
          locador — o cliente continua assinando pelo link remoto.
        </p>
        <input
          value={sigName}
          onChange={(e) => setSigName(e.target.value)}
          placeholder="Nome do responsável (locador)"
          className="app-input font-bold text-sm"
        />
        <DigitalSignaturePanel
          title="Assinatura do locador"
          signerRole="licensee"
          existing={draft.contractSignature}
          signerNameDefault={sigName || draft.name}
          readOnly={false}
          onSave={onSignatureSave}
        />
        {draft.contractSignature?.imageDataUrl && (
          <button
            type="button"
            onClick={() => onChange({ ...draft, contractSignature: undefined })}
            className="text-xs font-bold text-red-400 underline"
          >
            Remover assinatura salva
          </button>
        )}
      </div>

      <div className="tone-warning tone-box space-y-3">
        <p className="text-xs font-black uppercase flex items-center gap-2 tone-title">
          <Shield className="w-4 h-4 shrink-0" />
          Sinal para reservar data
        </p>
        <p className="text-xs leading-relaxed">
          Ao enviar proposta, o comercial ou você pode marcar se o cliente pagou o sinal. Sem sinal: calendário
          mostra <strong>data em negociação</strong> (aviso). Com sinal: <strong>data reservada</strong> (bloqueia
          o horário). Pagamento integral: <strong>data fechada</strong>.
        </p>
        <AppSwitch
          checked={depositOn}
          onChange={(on) => onChange({ ...draft, depositPolicyEnabled: on })}
          label="Exigir sinal para reservar data"
          description="Desligado = negociação sem bloqueio por sinal no calendário"
        />
        <div className={depositOn ? 'space-y-3' : 'tone-section-off space-y-3'}>
          <div>
            <label className="ui-label">Tipo de sinal</label>
            <select
              value={kind}
              disabled={!depositOn}
              onChange={(e) => setKind(e.target.value as DepositPolicyKind)}
              className="app-input font-bold text-sm mt-0.5"
            >
              <option value="percent">Percentual (%)</option>
              <option value="fixed">Valor fixo (R$)</option>
            </select>
          </div>
          <div>
            <label className="ui-label">
              {kind === 'percent' ? 'Percentual do valor da proposta' : 'Valor fixo do sinal (R$)'}
            </label>
            <input
              type="number"
              min={0}
              max={kind === 'percent' ? 100 : undefined}
              step={kind === 'percent' ? 1 : 0.01}
              value={value}
              disabled={!depositOn}
              onChange={(e) => setValue(Number(e.target.value) || 0)}
              className="app-input font-bold mt-0.5"
            />
            <p className="ui-caption mt-1 font-bold">
              Exemplo no CRM: sinal de {depositPolicyHint(kind, value)}
            </p>
          </div>
          <p className="ui-caption font-medium">
            Sinal sem contrato assinado: use &quot;Liberar reserva&quot; no negócio. Com contrato assinado ou
            impedimento futuro, use &quot;Desistência / impedimento (pós-contrato)&quot; no painel do negócio
            (comercial ou licenciado) — a data volta a negociação e o registro fica na linha do tempo para
            estorno em Finanças.
          </p>
        </div>
      </div>
    </div>
  );
}
