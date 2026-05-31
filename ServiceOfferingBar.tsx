import { SERVICE_VISUAL, type ServiceVisualKind } from '../config/catalogVisuals';
import {
  formatProductLinesSummary,
  HIGIENIZACAO_PRODUCTS,
  IMPERMEABILIZACAO_PRODUCTS,
  productsForTreatment,
} from '../config/serviceProducts';

type Props = {
  className?: string;
  compact?: boolean;
};

const ORDER: ServiceVisualKind[] = ['higienizacao', 'completo'];

export default function ServiceOfferingBar({ className = '', compact }: Props) {
  return (
    <div
      className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} ${className}`}
    >
      {ORDER.map((key) => {
        const s = SERVICE_VISUAL[key];
        const products = productsForTreatment(
          key,
          HIGIENIZACAO_PRODUCTS,
          IMPERMEABILIZACAO_PRODUCTS
        );
        return (
          <div
            key={key}
            className="flex items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2.5"
          >
            <img src={s.icon} alt="" className="w-10 h-10 shrink-0 rounded-lg" />
            <div className="min-w-0">
              <p className="text-[11px] font-black text-[var(--color-text)] leading-tight">
                {s.label}
              </p>
              {!compact && (
                <>
                  <p className="text-[9px] text-[var(--color-text-muted)] leading-snug mt-0.5">
                    {s.description}
                  </p>
                  <p className="text-[9px] font-bold text-amber-800/90 mt-1.5 leading-snug">
                    Produtos no atendimento: {formatProductLinesSummary(products)}
                  </p>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
