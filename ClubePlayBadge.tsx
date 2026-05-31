import { Coins } from 'lucide-react';
import type { ClubePlayClientView } from '../utils/clubePlay';
import { clubePlaySummaryLabel } from '../utils/clubePlay';

type Props = {
  view: ClubePlayClientView;
  compact?: boolean;
};

export default function ClubePlayBadge({ view, compact }: Props) {
  if (compact) {
    const gasto = view.hasLedger ? view.totalSpentRegistered : view.totalSpentFromPaidEvents;
    return (
      <div className="tone-clube grid grid-cols-4 gap-1 px-1.5 py-1.5 text-center">
        <div>
          <p className="text-[7px] font-bold uppercase opacity-80">Gasto</p>
          <p className="text-[10px] font-black">R$ {gasto.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-[7px] font-bold uppercase opacity-80">Disp.</p>
          <p className="text-[10px] font-black tone-title">{view.playCoins}</p>
        </div>
        <div>
          <p className="text-[7px] font-bold uppercase opacity-80">Usadas</p>
          <p className="text-[10px] font-black">{view.playCoinsRedeemed}</p>
        </div>
        <div>
          <p className="text-[7px] font-bold uppercase opacity-80">Aberto</p>
          <p className="text-[10px] font-black text-emerald-400">R$ {view.openBalanceReais.toFixed(0)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tone-clube p-3">
      <p className="text-[10px] font-black uppercase flex items-center gap-1 mb-1 tone-title">
        <Coins className="w-3.5 h-3.5" />
        Clube Panda
      </p>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-[9px] font-bold uppercase opacity-80">Disponíveis</p>
          <p className="text-lg font-black tone-title">{view.playCoins}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase opacity-80">Usadas</p>
          <p className="text-lg font-black">{view.playCoinsRedeemed}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase opacity-80">Gasto</p>
          <p className="text-sm font-black">
            R${' '}
            {(view.hasLedger ? view.totalSpentRegistered : view.totalSpentFromPaidEvents).toFixed(0)}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase opacity-80">Em aberto</p>
          <p className="text-sm font-black text-emerald-400">R$ {view.openBalanceReais.toFixed(0)}</p>
        </div>
      </div>
      <p className="text-[10px] font-medium mt-2 opacity-90">{clubePlaySummaryLabel(view)}</p>
      {!view.hasLedger && view.totalSpentFromPaidEvents > 0 && (
        <p className="text-[9px] opacity-70 mt-0.5">Crédito automático ao confirmar pagamento</p>
      )}
    </div>
  );
}
