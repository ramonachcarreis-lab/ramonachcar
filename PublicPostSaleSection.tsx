import { Instagram, Star, Users, ExternalLink } from 'lucide-react';
import { CLUBE_NAME } from '../config/brand';
import { COPY } from '../utils/copyPtBr';
import { REFERRAL_COMMISSION_RATE } from '../utils/referralCommission';
import type { UnitSocialLinks } from '../utils/unitSocialLinks';

type Props = {
  social: UnitSocialLinks;
  /** Destaque do Clube + indicação (10% em tokens) */
  showClubeReferral?: boolean;
  compact?: boolean;
};

export default function PublicPostSaleSection({
  social,
  showClubeReferral = true,
  compact = false,
}: Props) {
  const pct = Math.round(REFERRAL_COMMISSION_RATE * 100);
  const hasInstagram = Boolean(social.instagramUrl);
  const hasGoogle = Boolean(social.googleReviewUrl);

  if (!hasInstagram && !hasGoogle && !showClubeReferral) return null;

  return (
    <section
      className={`app-panel space-y-4 border border-[var(--accent-primary)]/25 ${
        compact ? '!p-4' : ''
      }`}
      aria-labelledby="pos-venda-titulo"
    >
      <div>
        <p
          id="pos-venda-titulo"
          className="text-xs font-black uppercase tracking-wide text-[var(--accent-primary)]"
        >
          Pós-venda · sua opinião importa
        </p>
        <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
          Obrigado por confiar na Estofado Pro. Siga nossa unidade e deixe sua avaliação — isso
          ajuda muito a equipe {social.unitName}.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {hasInstagram && (
          <a
            href={social.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] no-underline hover:border-[var(--accent-primary)] transition-colors"
          >
            <Instagram className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
            Siga a gente no Instagram
            <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0" />
          </a>
        )}
        {hasGoogle && (
          <a
            href={social.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl border-2 border-[var(--status-success)]/40 bg-[color-mix(in_srgb,var(--status-success)_12%,transparent)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] no-underline hover:border-[var(--status-success)] transition-colors"
          >
            <Star className="w-5 h-5 text-[var(--status-success)] shrink-0 fill-[var(--status-success)]" />
            Avalie a gente no Google
            <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0" />
          </a>
        )}
      </div>

      {showClubeReferral && (
        <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/8 p-4 space-y-2">
          <p className="text-xs font-black uppercase text-[var(--accent-primary)] flex items-center gap-1.5">
            <Users className="w-4 h-4 shrink-0" />
            {CLUBE_NAME} · indique e ganhe
          </p>
          <p className="text-sm text-[var(--text-primary)] leading-relaxed">
            Indicou um amigo ou parente? Quando o serviço dele for <strong>concluído e pago</strong>,
            você recebe <strong>{pct}% do valor pago em tokens</strong> no {CLUBE_NAME} para trocar por
            benefícios.
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            {COPY.indicadorGanhaTokens} Passe seu contato de indicação na próxima conversa com a
            unidade pelo WhatsApp.
          </p>
        </div>
      )}
    </section>
  );
}
