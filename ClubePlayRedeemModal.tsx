import { useState } from 'react';
import { Gift, Ticket, CheckCircle2, Package } from 'lucide-react';
import type { ClubeReward } from '../utils/clubeRewards';
import { REWARD_CATEGORY_LABELS } from '../utils/clubeRewards';
import {
  createClubeCoupon,
  isPhysicalBrinde,
  saveClubeCoupons,
  loadClubeCoupons,
} from '../utils/clubeCoupons';
import { formatPlayCoins } from '../utils/clubePlay';
import { rewardsAffordable } from '../utils/clubeRewards';
import RewardPhotoThumb from './RewardPhotoThumb';
import type { ClientLoyaltyRecord } from '../utils/loyaltyPoints';
import { redeemPlayCoins } from '../utils/loyaltyPoints';
import { saveLoyaltyRecords } from '../utils/loyaltyPoints';

type Props = {
  member: ClientLoyaltyRecord;
  availableCoins: number;
  rewards: ClubeReward[];
  onClose: () => void;
  onDone: (nextRecords: ClientLoyaltyRecord[]) => void;
  records: ClientLoyaltyRecord[];
  registeredBy?: string;
};

export default function ClubePlayRedeemModal({
  member,
  availableCoins,
  rewards,
  onClose,
  onDone,
  records,
  registeredBy,
}: Props) {
  const [selected, setSelected] = useState<ClubeReward | null>(null);
  const [lastCoupon, setLastCoupon] = useState<string | null>(null);
  const affordable = rewardsAffordable(availableCoins, rewards);

  const confirmRedeem = () => {
    if (!selected) return;
    let couponCode: string | undefined;
    let note = `Brinde: ${selected.name}`;

    if (!isPhysicalBrinde(selected.category)) {
      const coupon = createClubeCoupon({
        unitId: member.unitId,
        clientPhone: member.phone,
        clientName: member.clientName,
        rewardId: selected.id,
        rewardName: selected.name,
        rewardCategory: selected.category,
        discountPercent: selected.discountPercent,
        validityDays: selected.validityDays ?? 90,
        playCoinsSpent: selected.playCoinCost,
      });
      saveClubeCoupons([...loadClubeCoupons(), coupon]);
      couponCode = coupon.code;
      setLastCoupon(coupon.code);
      note = `Cupom ${coupon.code} — ${selected.name}${
        selected.discountPercent ? ` (${selected.discountPercent}% off)` : ''
      }. Válido até ${new Date(coupon.validUntil).toLocaleDateString('pt-BR')}. Use no contrato do evento.`;
    }

    const { records: next, ok, error } = redeemPlayCoins(records, {
      clientName: member.clientName,
      phone: member.phone,
      unitId: member.unitId,
      coins: selected.playCoinCost,
      rewardId: selected.id,
      rewardName: selected.name,
      registeredBy,
      couponCode,
      rewardCategory: selected.category,
      note,
    });

    if (!ok) {
      alert(error || 'Não foi possível resgatar');
      return;
    }
    saveLoyaltyRecords(next);
    onDone(next);
    if (isPhysicalBrinde(selected.category)) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/70 p-2 sm:p-4">
      <div className="app-modal w-full max-w-lg sm:max-w-xl max-h-[90vh]">
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] shrink-0">
          <p className="font-black text-lg text-[var(--color-text)]">Resgatar — {member.clientName}</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Saldo: {formatPlayCoins(availableCoins)} · selecione o item e confirme a baixa
          </p>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2">
          {affordable.length === 0 ? (
            <p className="ui-caption">Nenhum item disponível com o saldo atual.</p>
          ) : (
            affordable.map((r) => {
              const physical = isPhysicalBrinde(r.category);
              const isSel = selected?.id === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected(r)}
                  className={`w-full text-left flex items-center gap-3 border-2 rounded-xl p-3 transition-colors ${
                    isSel ? 'tone-item-selected' : 'tone-item hover:border-[var(--color-border-strong)]'
                  }`}
                >
                  {physical ? (
                    <Package className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Ticket className="w-5 h-5 text-violet-400 shrink-0" />
                  )}
                  <RewardPhotoThumb photoRef={r.photoIds?.[0]} className="w-14 h-14 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[var(--color-text)]">{r.name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {REWARD_CATEGORY_LABELS[r.category]} · {r.playCoinCost} Panda Coin
                      {r.discountPercent ? ` · ${r.discountPercent}% desconto` : ''}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-subtle)] mt-0.5">
                      {physical
                        ? 'Baixa imediata — retirada do brinde é fora do sistema'
                        : 'Gera cupom exclusivo para usar em um evento (contrato)'}
                    </p>
                  </div>
                </button>
              );
            })
          )}

          {lastCoupon && selected && !isPhysicalBrinde(selected.category) && (
            <div className="tone-accent tone-box mt-3">
              <p className="text-xs font-black uppercase flex items-center gap-1 tone-title">
                <CheckCircle2 className="w-4 h-4" />
                Cupom gerado
              </p>
              <p className="text-2xl font-black tracking-wider mt-1 text-[var(--color-text)]">{lastCoupon}</p>
              <p className="text-[10px] mt-1 opacity-90">
                Informe este código no formulário do contrato do evento. Coins já debitadas.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] shrink-0 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-[var(--color-border)] font-bold rounded-xl text-sm text-[var(--color-text)]"
          >
            {lastCoupon ? 'Fechar' : 'Cancelar'}
          </button>
          {!lastCoupon && (
            <button
              type="button"
              disabled={!selected}
              onClick={confirmRedeem}
              className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-emerald-500"
            >
              <Gift className="w-4 h-4" />
              Confirmar resgate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
