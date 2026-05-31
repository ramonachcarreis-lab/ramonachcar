import { useMemo, useState } from 'react';
import ClubePlayBadge from './ClubePlayBadge';
import ClubePlayRedeemList from './ClubePlayRedeemList';
import {
  CLUBE_PLAY_NAME,
  PLAY_COIN_NAME,
  REAIS_PER_PLAY_COIN,
  buildClubePlayView,
  type ClubePlayClientView,
} from '../utils/clubePlay';
import {
  loadLoyaltyRecords,
  saveLoyaltyRecords,
  redeemPlayCoins,
} from '../utils/loyaltyPoints';
import { ensureUnitRewards } from '../utils/clubeRewards';
import type { ClubeReward } from '../utils/clubeRewards';
import { useAuth } from '../context/AuthContext';

type Props = {
  name: string;
  phone: string;
  unitId: string;
  events: import('../context/EventsContext').AppEvent[];
  view: ClubePlayClientView;
  onUpdated?: () => void;
};

export default function ClientClubePlaySection({
  name,
  phone,
  unitId,
  events,
  onUpdated,
}: Props) {
  const { session } = useAuth();
  const [tick, setTick] = useState(0);
  const canRedeem =
    session?.role === 'licensee' || session?.role === 'admin' || session?.role === 'commercial';

  const freshView = useMemo(
    () => buildClubePlayView(phone, name, unitId, events, loadLoyaltyRecords()),
    [phone, name, unitId, events, tick]
  );

  const rewards = useMemo(() => ensureUnitRewards(unitId), [unitId, tick]);

  const handleRedeem = (reward: ClubeReward) => {
    if (!confirm(`Resgatar "${reward.name}" por ${reward.playCoinCost} Panda Coins?`)) return;
    const records = loadLoyaltyRecords();
    const { records: next, ok, error } = redeemPlayCoins(records, {
      clientName: name,
      phone,
      unitId,
      coins: reward.playCoinCost,
      rewardId: reward.id,
      rewardName: reward.name,
      registeredBy: session?.name,
    });
    if (!ok) {
      alert(error);
      return;
    }
    saveLoyaltyRecords(next);
    setTick((t) => t + 1);
    onUpdated?.();
  };

  return (
    <div className="space-y-3">
      <ClubePlayBadge view={freshView} />
      {freshView.playCoinsEarned > freshView.playCoins && (
        <p className="text-[10px] text-slate-600">
          Total ganho: {freshView.playCoinsEarned} · Usadas: {freshView.playCoinsRedeemed} · Disponíveis:{' '}
          {freshView.playCoins}
        </p>
      )}
      {freshView.reaisUntilNextCoin > 0 && freshView.reaisUntilNextCoin < REAIS_PER_PLAY_COIN && (
        <p className="text-[10px] font-bold tone-success tone-box !py-1.5">
          Crédito automático ao pagar. Faltam R$ {freshView.reaisUntilNextCoin.toFixed(2)} para +1 {PLAY_COIN_NAME}
        </p>
      )}
      {!freshView.hasLedger && freshView.totalSpentFromPaidEvents > 0 && (
        <p className="text-[10px] font-bold tone-warning tone-box !py-1.5">
          Serviços pagos detectados — sincronize na aba {CLUBE_PLAY_NAME} ou aguarde o próximo pagamento.
        </p>
      )}

      {canRedeem && (
        <div className="tone-clube p-3">
          <p className="text-[10px] font-black uppercase mb-2 tone-title">Trocar Panda Coins</p>
          <ClubePlayRedeemList
            availableCoins={freshView.playCoins}
            rewards={rewards}
            canRedeem
            onRedeem={handleRedeem}
          />
        </div>
      )}

      {freshView.ledger && freshView.ledger.history.length > 0 && (
        <div>
          <p className="ui-label mb-1">Histórico</p>
          <ul className="space-y-1 max-h-36 overflow-y-auto">
            {freshView.ledger.history.slice(0, 12).map((h) => (
              <li
                key={h.id}
                className="text-[10px] text-[var(--color-text-muted)] flex justify-between gap-2 border-b border-[var(--color-border)] py-1"
              >
                <span className="truncate">
                  {h.type === 'redeem'
                    ? `Resgate: ${h.rewardName || h.note}`
                    : `R$ ${h.amount.toFixed(2)}${h.note ? ` · ${h.note}` : ''}`}
                </span>
                <span
                  className={`font-bold shrink-0 ${h.type === 'redeem' ? 'text-red-600' : 'text-amber-700'}`}
                >
                  {h.type === 'redeem' ? `-${h.pointsRedeemed} PC` : `+${h.pointsAdded} PC`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
