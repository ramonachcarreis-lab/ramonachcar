import { X, Gift, Users, Wallet, Package } from 'lucide-react';
import type { UnitClubeNetworkRow } from '../utils/clubeUnitNetwork';
import { ensureUnitRewards, REWARD_CATEGORY_LABELS } from '../utils/clubeRewards';
import { formatPlayCoins } from '../utils/clubePlay';
import RewardPhotoThumb from './RewardPhotoThumb';

type Props = {
  row: UnitClubeNetworkRow;
  onClose: () => void;
};

export default function ClubeUnitOpsModal({ row, onClose }: Props) {
  const catalog = ensureUnitRewards(row.unitId).filter((r) => r.active);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="app-modal w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="p-5 border-b border-[var(--color-border)] shrink-0 flex justify-between items-start gap-3">
          <div>
            <p className="text-xs font-bold text-[var(--accent-primary)] uppercase">Clube Panda · Unidade</p>
            <h2 className="text-xl font-black text-[var(--color-text)]">{row.unitName}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--color-surface-muted)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
              <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)] flex items-center gap-1">
                <Users className="w-3 h-3" />
                Clientes que resgataram
              </p>
              <p className="text-2xl font-black text-[var(--color-text)] mt-1">
                {row.membersWhoRedeemed}
                <span className="text-sm font-bold text-[var(--color-text-muted)]"> / {row.members}</span>
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
              <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)] flex items-center gap-1">
                <Gift className="w-3 h-3" />
                Resgates realizados
              </p>
              <p className="text-2xl font-black text-[var(--color-text)] mt-1">{row.redemptionCount}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 col-span-2">
              <p className="text-[10px] font-bold uppercase text-[var(--status-success)] flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                Caixa de benefício (já entregue)
              </p>
              <p className="text-xl font-black text-[var(--color-text)] mt-1">
                R$ {row.caixaBeneficioReais.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                {formatPlayCoins(row.coinsRedeemed)} usadas · reserva pendente R${' '}
                {row.caixaPendenteReais.toLocaleString('pt-BR')} ({formatPlayCoins(row.coinsAvailable)})
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
              <Package className="w-4 h-4" />
              Itens disponíveis no catálogo ({catalog.length})
            </p>
            {catalog.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                Nenhum item ativo — o licenciado configura em Brindes & resgates.
              </p>
            ) : (
              <ul className="space-y-2">
                {catalog.map((item) => (
                  <li
                    key={item.id}
                    className="flex gap-3 border border-[var(--color-border)] rounded-xl p-3 bg-[var(--color-surface-muted)]"
                  >
                    {item.photoIds?.[0] ? (
                      <RewardPhotoThumb photoRef={item.photoIds[0]} className="w-14 h-14 rounded-lg shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-[var(--color-surface)] flex items-center justify-center shrink-0">
                        <Gift className="w-6 h-6 text-[var(--color-text-muted)]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-[var(--color-text)]">{item.name || 'Sem nome'}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        {REWARD_CATEGORY_LABELS[item.category]} · {item.playCoinCost} Panda Coin
                        {item.discountPercent ? ` · ${item.discountPercent}% off` : ''}
                      </p>
                      {item.description && (
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {row.recentRedemptions.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase text-[var(--color-text-muted)] mb-2">
                Últimos resgates na unidade
              </p>
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {row.recentRedemptions.map((h, i) => (
                  <li
                    key={`${h.date}-${h.clientName}-${i}`}
                    className="text-xs flex justify-between gap-2 border-b border-[var(--color-border)] pb-1"
                  >
                    <span className="text-[var(--color-text)] truncate font-medium">
                      {h.clientName} — {h.rewardName}
                      {h.couponCode ? ` (${h.couponCode})` : ''}
                    </span>
                    <span className="text-[var(--color-text-muted)] shrink-0">
                      {new Date(h.date).toLocaleDateString('pt-BR')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
