import { Gift, Lock } from 'lucide-react';
import type { ClubeReward } from '../utils/clubeRewards';
import { rewardsAffordable, rewardsAlmost } from '../utils/clubeRewards';
import { formatPlayCoins } from '../utils/clubePlay';
import RewardPhotoThumb from './RewardPhotoThumb';
import { COPY } from '../utils/copyPtBr';

type Props = {
  availableCoins: number;
  rewards: ClubeReward[];
  onRedeem?: (reward: ClubeReward) => void;
  canRedeem?: boolean;
};

export default function ClubePlayRedeemList({ availableCoins, rewards, onRedeem, canRedeem }: Props) {
  const affordable = rewardsAffordable(availableCoins, rewards);
  const almost = rewardsAlmost(rewards, availableCoins).slice(0, 4);

  if (rewards.length === 0) {
    return <p className="ui-caption">Catálogo de brindes ainda não configurado nesta unidade.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="ui-label">
        Saldo: {formatPlayCoins(availableCoins)} para resgatar
      </p>

      {affordable.length > 0 && (
        <div>
          <p className="text-xs font-black mb-1.5 text-emerald-400">Pode resgatar agora</p>
          <div className="space-y-1.5">
            {affordable.map((r) => (
              <div
                key={r.id}
                className="tone-success tone-box flex items-center justify-between gap-2 !py-2"
              >
                <RewardPhotoThumb photoRef={r.photoIds?.[0]} className="w-12 h-12" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate text-[var(--color-text)]">{r.name}</p>
                  <p className="text-[10px]">
                    {r.playCoinCost} {COPY.playCoins}
                  </p>
                </div>
                {canRedeem && onRedeem && (
                  <button
                    type="button"
                    onClick={() => onRedeem(r)}
                    className="shrink-0 text-xs font-black bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-500"
                  >
                    Resgatar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {almost.length > 0 && (
        <div>
          <p className="text-xs font-black mb-1.5 flex items-center gap-1 tone-title text-[var(--tone-warning-title)]">
            <Lock className="w-3.5 h-3.5" />
            Junte mais coins
          </p>
          <div className="space-y-1.5">
            {almost.map((r) => {
              const missing = r.playCoinCost - availableCoins;
              return (
                <div
                  key={r.id}
                  className="tone-warning tone-box flex items-center justify-between gap-2 !py-2 tone-item-muted !opacity-100"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <Gift className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="text-sm font-bold truncate text-[var(--color-text)]">{r.name}</p>
                      <p className="text-[10px]">
                        {r.playCoinCost} PC · faltam {missing}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {affordable.length === 0 && almost.length === 0 && (
        <p className="ui-caption">Acumule Panda Coins com serviços pagos para desbloquear brindes.</p>
      )}
    </div>
  );
}
