import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Truck,
  CheckCircle2,
  Loader2,
  Camera,
  Coins,
  Sparkles,
  Star,
  ExternalLink,
} from 'lucide-react';
import { fieldOpsApi } from '../services/fieldOpsApi';
import { checkApiHealth } from '../services/apiHealth';
import PublicApiOfflineMessage from '../components/PublicApiOfflineMessage';
import { getUnitById } from '../utils/units';
import LiveLocationPreview from '../components/LiveLocationPreview';
import { CLUBE_NAME, COIN_NAME, COINS_NAME } from '../config/brand';
import { formatPlayCoins } from '../utils/clubePlay';
import PublicPostSaleSection from '../components/PublicPostSaleSection';
import { getUnitSocialLinks } from '../utils/unitSocialLinks';
import { REFERRAL_COMMISSION_RATE } from '../utils/referralCommission';

const STATUS_UI: Record<
  string,
  { label: string; desc: string; icon: typeof Truck }
> = {
  scheduled: { label: 'Agendado', desc: 'Seu serviço está confirmado na agenda.', icon: Clock },
  en_route: {
    label: 'Equipe a caminho',
    desc: 'Nossa equipe já saiu para o seu endereço.',
    icon: Truck,
  },
  on_site: {
    label: 'No local',
    desc: 'A equipe chegou ao endereço.',
    icon: Truck,
  },
  in_progress: {
    label: 'Serviço em andamento',
    desc: 'A higienização está sendo realizada no local.',
    icon: Loader2,
  },
  completed: {
    label: 'Serviço concluído',
    desc: 'Obrigado! Seu estofado já foi atendido.',
    icon: CheckCircle2,
  },
  cancelled: { label: 'Cancelado', desc: 'Este agendamento foi cancelado.', icon: Clock },
};

export default function PublicServiceStatus() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof fieldOpsApi.fetchPublicTrack>>>(null);
  const [apiDown, setApiDown] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    checkApiHealth().then((h) => {
      if (!cancelled && !h.ok) setApiDown(true);
    });
    const load = () =>
      fieldOpsApi.fetchPublicTrack(token).then((row) => {
        if (!cancelled) {
          setData(row);
          setLoading(false);
        }
      });
    load();
    const timer = window.setInterval(load, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token]);

  const unit = data?.unitId ? getUnitById(data.unitId) : null;
  const col = data?.status || 'scheduled';
  const ui = STATUS_UI[col] || STATUS_UI.scheduled;
  const Icon = ui.icon;
  const flowSteps = [
    { key: 'closed', label: 'Fechado', done: true },
    {
      key: 'scheduled',
      label: 'Agendado',
      done: ['scheduled', 'en_route', 'on_site', 'in_progress', 'completed'].includes(col),
    },
    {
      key: 'en_route',
      label: 'A caminho',
      done: ['en_route', 'on_site', 'in_progress', 'completed'].includes(col),
    },
    {
      key: 'in_progress',
      label: 'Em execução',
      done: ['in_progress', 'completed'].includes(col),
    },
    { key: 'completed', label: 'Concluído', done: col === 'completed' },
  ];
  const isCompleted = col === 'completed';
  const showRewards = isCompleted && Boolean(data?.clubePlay || data?.evaluationUrl);
  const social = getUnitSocialLinks(data?.unitId || 'sp-centro', data?.social ?? undefined);
  const referralPct = Math.round(REFERRAL_COMMISSION_RATE * 100);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg-app)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  if (!data) {
    if (apiDown) return <PublicApiOfflineMessage title="Acompanhamento do serviço indisponível" />;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg-app)]">
        <p className="text-[var(--color-text-muted)] font-bold text-center max-w-sm">
          Link inválido, expirado ou serviço ainda não sincronizado no servidor.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-app)] p-4 pb-10">
      <div className="max-w-md mx-auto space-y-5">
        <div className="text-center pt-2">
          <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase">{unit?.name || 'Estofado Pro'}</p>
          <h1 className="text-xl font-black text-[var(--color-text)] mt-1">Acompanhe seu serviço</h1>
          <p className="text-xs font-mono text-[var(--accent-primary)] mt-1">{data.workOrderNumber}</p>
        </div>

        <div className="app-panel space-y-3">
          <p className="text-xs font-black uppercase text-[var(--color-text-muted)]">Fluxo completo do serviço</p>
          <div className="grid grid-cols-2 gap-2">
            {flowSteps.map((step) => (
              <div
                key={step.key}
                className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                  step.done
                    ? 'border-[var(--status-success)]/40 bg-emerald-950/30 text-[var(--status-success)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]'
                }`}
              >
                {step.done ? 'OK · ' : ''}
                {step.label}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Este link acompanha todas as etapas em tempo real, desde o fechamento até a conclusão.
          </p>
        </div>

        <div className="app-panel text-center space-y-3">
          <Icon
            className={`w-12 h-12 mx-auto ${
              col === 'in_progress'
                ? 'text-[var(--status-success)] animate-pulse'
                : col === 'completed'
                  ? 'text-[var(--accent-primary)]'
                  : 'text-[var(--accent-primary)]'
            }`}
          />
          <p className="text-lg font-black text-[var(--color-text)]">{ui.label}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{ui.desc}</p>
        </div>

        {showRewards && (
          <div className="app-panel space-y-4 border border-[var(--accent-primary)]/30">
            <div className="flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-[var(--accent-primary)] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black uppercase text-[var(--accent-primary)]">{CLUBE_NAME}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                  Seu saldo de fidelidade após este serviço
                </p>
              </div>
            </div>

            {data.clubePlay && (
              <>
              <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5 p-3">
                <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                  <strong>Indique alguém:</strong> quando o serviço indicado for concluído e pago, você
                  ganha <strong>{referralPct}% do valor em tokens</strong> no {CLUBE_NAME}.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)] mb-1">Seus tokens</p>
                  <p className="text-2xl font-black text-[var(--color-text)]">{data.clubePlay.tokensOpen}</p>
                  {data.clubePlay.tokensToNextCoin > 0 && (
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                      Faltam {data.clubePlay.tokensToNextCoin} p/ +1 {COIN_NAME}
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 p-3 text-center">
                  <Coins className="w-4 h-4 mx-auto text-[var(--accent-primary)] mb-1" />
                  <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)] mb-1">
                    {COINS_NAME}
                  </p>
                  <p className="text-2xl font-black text-[var(--accent-primary)]">{data.clubePlay.playCoins}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                    {formatPlayCoins(data.clubePlay.playCoins)} disponíveis
                  </p>
                  {data.clubePlay.playCoinsRedeemed > 0 && (
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {data.clubePlay.playCoinsRedeemed} já usadas
                    </p>
                  )}
                </div>
              </div>
              </>
            )}

            {data.evaluationUrl && (
              <div className="space-y-2 pt-1 border-t border-[var(--color-border)]">
                <p className="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-[var(--accent-primary)]" />
                  Avalie nosso atendimento
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  Sua opinião ajuda a melhorar o serviço — leva menos de 1 minuto.
                </p>
                <a
                  href={data.evaluationUrl}
                  className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 no-underline min-h-[48px]"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir link de avaliação
                </a>
                <p className="text-[10px] text-[var(--color-text-muted)] break-all font-mono text-center">
                  {data.evaluationUrl}
                </p>
              </div>
            )}
          </div>
        )}

        <LiveLocationPreview
          lat={data.technicianLat ?? null}
          lng={data.technicianLng ?? null}
          updatedAt={data.technicianGeoUpdatedAt ?? null}
        />

        <div className="app-panel space-y-2 text-sm">
          <p>
            <span className="font-bold text-[var(--color-text-muted)]">Cliente:</span>{' '}
            <span className="text-[var(--color-text)]">{data.client}</span>
          </p>
          <p className="flex items-start gap-2 text-[var(--color-text)]">
            <MapPin className="w-4 h-4 shrink-0 text-[var(--color-text-muted)]" />
            {data.address}
          </p>
          <p>
            <span className="font-bold text-[var(--color-text-muted)]">Previsão:</span>{' '}
            <span className="text-[var(--color-text)]">{data.time}</span>
          </p>
          {data.etaMinutes != null && col === 'en_route' && (
            <p className="text-[var(--status-success)] font-bold">
              Chegada estimada: ~{data.etaMinutes} min
            </p>
          )}
          {(data.hasPhotoBefore || data.hasPhotoAfter) && (
            <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 pt-1">
              <Camera className="w-3.5 h-3.5" />
              {data.hasPhotoBefore && data.hasPhotoAfter
                ? 'Registro fotográfico concluído'
                : data.hasPhotoBefore
                  ? 'Foto antes registrada'
                  : 'Foto depois registrada'}
            </p>
          )}
          {data.clientSigned && (
            <p className="text-xs font-bold text-[var(--status-success)]">
              Serviço aceito e assinado por você.
            </p>
          )}
        </div>

        {isCompleted && <PublicPostSaleSection social={social} showClubeReferral />}

        <p className="text-[10px] text-center text-[var(--color-text-muted)] leading-relaxed">
          Dúvidas? Contato: {data.phone ? `WhatsApp ${data.phone}` : unit?.whatsapp || 'unidade'}
        </p>
      </div>
    </div>
  );
}
