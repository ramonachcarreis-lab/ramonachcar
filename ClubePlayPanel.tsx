import { useEffect, useMemo, useState } from 'react';
import { Coins, Users, Gift, RefreshCw, Building2, ChevronRight, Wallet } from 'lucide-react';
import {
  CLUBE_PLAY_NAME,
  PLAY_COIN_NAME,
  REAIS_PER_PLAY_COIN,
  TOKENS_PER_PLAY_COIN,
  unitClubePlayStats,
  formatPlayCoins,
  clubePlaySummaryLabel,
  buildClubePlayView,
} from '../utils/clubePlay';
import {
  aggregateNetworkRedemptionStats,
  buildUnitClubeNetworkRows,
  type UnitClubeNetworkRow,
} from '../utils/clubeUnitNetwork';
import ClubeUnitOpsModal from './ClubeUnitOpsModal';
import { loadLoyaltyRecords, saveLoyaltyRecords, type ClientLoyaltyRecord } from '../utils/loyaltyPoints';
import { runClubePlaySync } from '../utils/clubePlayAuto';
import { ensureUnitRewards } from '../utils/clubeRewards';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';
import { getUnitById, UNITS } from '../utils/units';
import SearchableUnitSelect from './SearchableUnitSelect';
import ClubeRewardCatalog from './ClubeRewardCatalog';
import ClubePlayRedeemModal from './ClubePlayRedeemModal';
import type { ClientDetailData } from './ClientDetailModal';
import { useViewMode } from '../hooks/useViewMode';
import ViewModeToggle from './ViewModeToggle';
import { APP_VIEW_MODE_KEY, cardsContainer } from '../utils/viewModeLayout';

type Props = {
  unitId: string;
  networkView?: boolean;
  onOpenClient?: (data: ClientDetailData) => void;
};

type SubTab = 'clientes' | 'brindes' | 'unidades';

export default function ClubePlayPanel({ unitId: initialUnitId, networkView, onOpenClient }: Props) {
  const { session } = useAuth();
  const { events } = useEvents();
  const isLicensee = session?.role === 'licensee';
  const canEditRewards = isLicensee;
  const canRedeem = session?.role === 'licensee' || session?.role === 'admin' || session?.role === 'commercial';

  const [unitFilter, setUnitFilter] = useState(initialUnitId);
  const [subTab, setSubTab] = useState<SubTab>(networkView ? 'unidades' : 'clientes');
  const [records, setRecords] = useState(() => loadLoyaltyRecords());
  const [redeemTarget, setRedeemTarget] = useState<ClientLoyaltyRecord | null>(null);
  const [unitOpsRow, setUnitOpsRow] = useState<UnitClubeNetworkRow | null>(null);
  const { mode: viewMode, setMode: setViewMode } = useViewMode('grid', APP_VIEW_MODE_KEY);

  const effectiveUnitId = networkView && unitFilter !== 'all' ? unitFilter : networkView ? 'all' : unitFilter;

  useEffect(() => {
    const synced = runClubePlaySync(events, effectiveUnitId === 'all' ? undefined : effectiveUnitId);
    setRecords(synced);
  }, [events, effectiveUnitId]);

  const stats = useMemo(
    () => unitClubePlayStats(records, effectiveUnitId),
    [records, effectiveUnitId]
  );

  const unitNetworkRows = useMemo(
    () => (networkView ? buildUnitClubeNetworkRows(records) : []),
    [records, networkView]
  );

  const networkAgg = useMemo(
    () => aggregateNetworkRedemptionStats(unitNetworkRows),
    [unitNetworkRows]
  );

  const unitRecords = useMemo(() => {
    const list =
      effectiveUnitId === 'all'
        ? records
        : records.filter((r) => r.unitId === effectiveUnitId);
    return [...list].sort((a, b) => b.pointsEarned - a.pointsEarned);
  }, [records, effectiveUnitId]);

  const catalogUnitId = effectiveUnitId === 'all' ? session?.unitId || 'sp-centro' : effectiveUnitId;
  const rewards = useMemo(() => ensureUnitRewards(catalogUnitId), [catalogUnitId, records]);

  const unitOptions = useMemo(
    () => [
      { id: 'all', label: 'Toda a rede', sublabel: 'Comercial / Admin' },
      ...UNITS.map((u) => ({ id: u.id, label: u.name, sublabel: u.city })),
    ],
    []
  );

  const openMember = (r: ClientLoyaltyRecord) => {
    const uid = r.unitId;
    const evs = events.filter(
      (e) =>
        (e.unitId || 'sp-centro') === uid &&
        (e.phone === r.phone || e.client === r.clientName)
    );
    onOpenClient?.({
      name: r.clientName,
      phone: r.phone,
      totalSpent: r.totalSpent,
      rentalsCount: evs.filter((e) => e.financialStatus === 'Pago').length,
      equipments: [...new Set(evs.flatMap((e) => e.equipments))],
      events: evs,
      unitId: uid,
    });
  };

  const resync = () => {
    const synced = runClubePlaySync(events, effectiveUnitId === 'all' ? undefined : effectiveUnitId);
    setRecords(synced);
  };

  return (
    <div className="space-y-5">
      <div className="tone-clube p-4 lg:p-5">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black tone-title">{CLUBE_PLAY_NAME}</h2>
            <p className="text-sm mt-0.5 opacity-90">
              Cada R$ 1 em serviço <strong>pago</strong> vira <strong>1 token</strong>. A cada{' '}
              {TOKENS_PER_PLAY_COIN} tokens → 1 {PLAY_COIN_NAME}. Brindes: baixa direta; descontos e
              serviços: cupom no contrato do evento.
            </p>
            <p className="text-[10px] font-bold mt-1.5 tone-title">
              {networkView
                ? 'Visão comercial/admin: resgates por unidade, caixa de benefício e catálogo disponível — sem repetir saldo de cada cliente aqui.'
                : 'Brindes e resgates são por unidade — cada licenciado monta seu catálogo.'}
            </p>
          </div>
          <button
            type="button"
            onClick={resync}
            className="shrink-0 p-2 rounded-xl border border-[var(--tone-clube-border)] text-[var(--tone-clube-title)] hover:bg-[var(--color-surface-muted)]"
            title="Sincronizar eventos pagos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {networkView && (
        <SearchableUnitSelect
          value={unitFilter}
          onChange={setUnitFilter}
          options={unitOptions}
          className="mb-1"
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {(networkView
          ? [
              { label: 'Unidades', value: networkAgg.units, icon: Building2 },
              { label: 'Clientes c/ resgate', value: networkAgg.membersWhoRedeemed, icon: Users },
              { label: 'Resgates feitos', value: networkAgg.redemptionCount, icon: Gift },
              {
                label: 'Caixa benefício',
                value: `R$ ${networkAgg.caixaBeneficioReais.toLocaleString('pt-BR')}`,
                icon: Wallet,
              },
              { label: 'Itens no catálogo', value: networkAgg.catalogItems, icon: Coins },
            ]
          : [
              { label: 'Membros', value: stats.members, icon: Users },
              { label: 'Coins disponíveis', value: stats.totalPlayCoinsAvailable, icon: Coins },
              { label: 'Coins usadas', value: stats.totalPlayCoinsRedeemed, icon: Gift },
              { label: 'Volume R$', value: `R$ ${stats.totalSpent.toFixed(0)}`, icon: Wallet },
              { label: 'Tokens abertos', value: Math.round(stats.openBalance), icon: Coins },
            ]
        ).map(({ label, value, icon: Icon }) => (
          <div key={label} className="app-panel text-center py-3">
            <Icon className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <p className="text-[9px] font-bold uppercase leading-tight text-[var(--color-text-muted)]">
              {label}
            </p>
            <p className="text-lg font-black text-[var(--color-text)]">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl flex-1 min-w-[200px]">
          {(
            networkView
              ? [
                  { id: 'unidades' as const, label: 'Por unidade' },
                  { id: 'brindes' as const, label: 'Catálogo da unidade' },
                ]
              : [
                  { id: 'clientes' as const, label: 'Clientes' },
                  { id: 'brindes' as const, label: 'Brindes & resgates' },
                ]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-black ${
                subTab === t.id ? 'bg-white text-primary-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {subTab === 'clientes' && !networkView && (
        <div className="app-panel">
          <p className="text-xs font-black text-slate-700 uppercase mb-3">
            Controle de clientes{effectiveUnitId !== 'all' ? ` · ${getUnitById(effectiveUnitId)?.name || effectiveUnitId}` : ' · Rede'}
          </p>
          {unitRecords.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum cliente com Panda Coins ainda. Coins são creditados automaticamente ao confirmar pagamento.
            </p>
          ) : (
            <div
              className={`${cardsContainer(viewMode, 'grid gap-3 sm:grid-cols-2 lg:grid-cols-2')} max-h-[32rem] overflow-y-auto`}
            >
              {unitRecords.map((r, i) => {
                const view = buildClubePlayView(r.phone, r.clientName, r.unitId, events, records);
                return (
                  <div
                    key={`${r.unitId}-${r.clientKey}`}
                    className={`border-2 border-[var(--color-border)] rounded-2xl hover:border-primary-400 transition-colors bg-[var(--color-surface-elevated)] ${
                      viewMode === 'list' ? 'p-4' : 'p-4 sm:p-5'
                    }`}
                  >
                    <div className="flex gap-3 items-start">
                      <span className="w-9 h-9 rounded-xl bg-[var(--tone-warning-bg)] text-[var(--tone-warning-title)] font-black text-sm flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => openMember(r)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="font-black text-[var(--color-text)] text-base truncate">{r.clientName}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{r.phone}</p>
                        {networkView && effectiveUnitId === 'all' && (
                          <p className="text-[10px] font-bold text-primary-700 mt-0.5">
                            {getUnitById(r.unitId)?.name || r.unitId}
                          </p>
                        )}
                        <p className="text-sm font-bold text-amber-400 mt-1">{clubePlaySummaryLabel(view)}</p>
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                      <div className="tone-warning tone-box !p-2 text-center">
                        <p className="text-[9px] font-bold uppercase opacity-80">Coins disp.</p>
                        <p className="text-lg font-black">{view.playCoins}</p>
                      </div>
                      <div className="bg-[var(--color-surface-muted)] rounded-xl py-2 px-1 text-center border border-[var(--color-border)]">
                        <p className="text-[9px] font-bold uppercase text-[var(--color-text-muted)]">Trocadas</p>
                        <p className="text-lg font-black text-[var(--color-text)]">{view.playCoinsRedeemed}</p>
                      </div>
                      <div className="tone-success tone-box !p-2 text-center">
                        <p className="text-[9px] font-bold uppercase opacity-80">Tokens</p>
                        <p className="text-lg font-black">{view.tokensOpen}</p>
                      </div>
                    </div>
                    {view.recentRedemptions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1.5">Já resgatou</p>
                        <ul className="space-y-1">
                          {view.recentRedemptions.map((h) => (
                            <li key={h.id} className="text-[10px] text-slate-600 flex justify-between gap-2">
                              <span className="truncate font-medium">
                                {h.rewardName || h.note}
                                {h.couponCode ? ` · ${h.couponCode}` : ''}
                              </span>
                              <span className="shrink-0 text-slate-400">
                                {new Date(h.date).toLocaleDateString('pt-BR')}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {canRedeem && view.playCoins > 0 && (
                      <button
                        type="button"
                        onClick={() => setRedeemTarget(r)}
                        className="mt-3 w-full text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 py-3 rounded-xl"
                      >
                        Resgatar item / cupom
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {subTab === 'brindes' && (
        <div className="app-panel">
          {networkView && unitFilter === 'all' && (
            <p className="text-xs font-bold mb-3 tone-warning tone-box">
              Selecione uma unidade no filtro acima para ver o catálogo completo, ou abra uma unidade em
              &quot;Por unidade&quot;.
            </p>
          )}
          {networkView && unitFilter !== 'all' && (
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              Catálogo ativo em {getUnitById(catalogUnitId)?.name} — somente leitura para comercial/admin.
            </p>
          )}
          <ClubeRewardCatalog
            unitId={catalogUnitId}
            canEdit={canEditRewards && !networkView}
            viewMode={viewMode}
            onChange={() => setRecords(loadLoyaltyRecords())}
          />
        </div>
      )}

      {subTab === 'unidades' && networkView && (
        <div className="app-panel space-y-3">
          <p className="text-xs font-black text-[var(--color-text-muted)] uppercase flex items-center gap-1">
            <Building2 className="w-4 h-4" />
            Operação do Clube por unidade
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Toque na unidade para ver itens disponíveis, resgates e caixa de benefício (R$ 500 por Panda
            Coin).
          </p>
          {unitNetworkRows.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">Sem resgates ou membros ainda.</p>
          ) : (
            <div className={cardsContainer(viewMode, 'grid gap-3 sm:grid-cols-2')}>
              {unitNetworkRows.map((row) => (
                <button
                  key={row.unitId}
                  type="button"
                  onClick={() => setUnitOpsRow(row)}
                  className="text-left border-2 border-[var(--color-border)] rounded-2xl p-4 hover:border-[var(--accent-primary)] transition-colors bg-[var(--color-surface-muted)] w-full"
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-black text-[var(--color-text)]">{row.unitName}</p>
                    <ChevronRight className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
                  </div>
                  <p className="text-sm font-bold text-[var(--status-success)] mt-2">
                    {row.membersWhoRedeemed} clientes já resgataram · {row.redemptionCount} resgates
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Caixa benefício: R$ {row.caixaBeneficioReais.toLocaleString('pt-BR')} ·{' '}
                    {row.catalogActiveCount} itens no catálogo
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                    Pendente: R$ {row.caixaPendenteReais.toLocaleString('pt-BR')} (
                    {formatPlayCoins(row.coinsAvailable)})
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {unitOpsRow && (
        <ClubeUnitOpsModal row={unitOpsRow} onClose={() => setUnitOpsRow(null)} />
      )}

      {redeemTarget && (
        <ClubePlayRedeemModal
          member={redeemTarget}
          availableCoins={
            buildClubePlayView(
              redeemTarget.phone,
              redeemTarget.clientName,
              redeemTarget.unitId,
              events,
              records
            ).playCoins
          }
          rewards={ensureUnitRewards(redeemTarget.unitId).filter((r) => r.active)}
          records={records}
          registeredBy={session?.name}
          onClose={() => setRedeemTarget(null)}
          onDone={(next) => {
            setRecords(next);
            setRedeemTarget(null);
          }}
        />
      )}
    </div>
  );
}
