import { useState } from 'react';
import { Camera, ChevronDown, ChevronUp, Trash2, SlidersHorizontal } from 'lucide-react';
import type { Equipment, ServiceDirtTierPricing, DirtTierLevel } from '../types/inventory';
import EquipmentPhotoThumb from './EquipmentPhotoThumb';
import { PHOTO_RULES } from '../utils/imageRules';
import {
  DEFAULT_CARPET_M2,
  defaultDirtTiersForCatalogId,
  isCatalogCarpetId,
} from '../config/catalogDefaults';
import { formatPresetSummary } from '../config/residentialServiceCatalog';
import { normalizeImpermeabilizacaoProducts } from '../config/serviceProducts';
import { SUJIDADE_LABELS } from '../types/upholsteryQuote';
import { baseEquipmentId } from '../config/catalogAssets';
import { isCustomServiceItem } from '../utils/inventorySanitize';
import AppSwitch from './AppSwitch';

const TIER_LEVELS: DirtTierLevel[] = ['baixa', 'media', 'alta'];

type Props = {
  equipment: Equipment;
  defaultOpen?: boolean;
  canEdit: boolean;
  onPatch: (patch: Partial<Equipment>) => void;
  onRemove: () => void;
  onAddPhoto: (files: FileList | null) => void;
  onRemovePhoto: (index: number) => void;
};

function formatMinutes(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}min` : `${h}h`;
}

export default function CatalogInventoryCard({
  equipment: eq,
  defaultOpen = false,
  canEdit,
  onPatch,
  onRemove,
  onAddPhoto,
  onRemovePhoto,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [editProducts, setEditProducts] = useState(false);
  const isCustom = isCustomServiceItem(eq);
  const isCarpet =
    Boolean(eq.carpetPricing) ||
    isCatalogCarpetId(eq.id) ||
    isCatalogCarpetId(baseEquipmentId(eq.id));
  const tiers = eq.dirtTiers || [];
  const carpet = eq.carpetPricing;

  const setChargeByM2 = (enabled: boolean) => {
    if (enabled) {
      onPatch({
        carpetPricing: {
          ...DEFAULT_CARPET_M2,
          products: DEFAULT_CARPET_M2.products.map((p) => ({ ...p })),
          impermeabilizacaoProducts: (DEFAULT_CARPET_M2.impermeabilizacaoProducts || []).map(
            (p) => ({ ...p })
          ),
        },
        dirtTiers: undefined,
      });
      return;
    }
    onPatch({
      carpetPricing: undefined,
      dirtTiers: defaultDirtTiersForCatalogId('sofa').map((t) => ({
        ...t,
        products: t.products.map((p) => ({ ...p })),
        impermeabilizacaoProducts: (t.impermeabilizacaoProducts || []).map((p) => ({ ...p })),
      })),
    });
  };

  const patchTier = (level: DirtTierLevel, patch: Partial<ServiceDirtTierPricing>) => {
    const next = tiers.map((t) => (t.level === level ? { ...t, ...patch } : t));
    onPatch({ dirtTiers: next });
  };

  const patchTierProduct = (
    level: DirtTierLevel,
    index: number,
    field: 'name' | 'ml',
    value: string
  ) => {
    const tier = tiers.find((t) => t.level === level);
    if (!tier) return;
    const products = tier.products.map((p, i) =>
      i === index ? { ...p, [field]: field === 'ml' ? Number(value) || 0 : value } : p
    );
    patchTier(level, { products });
  };

  const patchTierImperProduct = (
    level: DirtTierLevel,
    index: number,
    field: 'name' | 'ml',
    value: string
  ) => {
    const tier = tiers.find((t) => t.level === level);
    if (!tier) return;
    const base = normalizeImpermeabilizacaoProducts(tier.impermeabilizacaoProducts);
    const impermeabilizacaoProducts = base.map((p, i) =>
      i === index ? { ...p, [field]: field === 'ml' ? Number(value) || 0 : value } : p
    );
    patchTier(level, { impermeabilizacaoProducts });
  };

  const resetTierProductsFromNetwork = () => {
    const base = baseEquipmentId(eq.id);
    if (isCarpet && carpet) {
      const fresh = DEFAULT_CARPET_M2;
      onPatch({
        carpetPricing: {
          ...carpet,
          products: fresh.products.map((p) => ({ ...p })),
          impermeabilizacaoProducts: (fresh.impermeabilizacaoProducts || []).map((p) => ({
            ...p,
          })),
        },
      });
      return;
    }
    const freshTiers = defaultDirtTiersForCatalogId(base);
    onPatch({
      dirtTiers: tiers.map((t) => {
        const fresh = freshTiers.find((f) => f.level === t.level);
        if (!fresh) return t;
        return {
          ...t,
          products: fresh.products.map((p) => ({ ...p })),
          impermeabilizacaoProducts: (fresh.impermeabilizacaoProducts || []).map((p) => ({ ...p })),
        };
      }),
    });
  };

  return (
    <div className="border border-slate-100 rounded-2xl bg-slate-50/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full p-4 flex gap-3 items-start text-left hover:bg-slate-50 transition-colors"
      >
        <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
          <EquipmentPhotoThumb equipmentId={eq.id} photoRef={eq.photoIds?.[0]} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 truncate flex items-center gap-2 flex-wrap">
            <span>{eq.name || 'Sem nome'}</span>
            {isCustom && (
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-primary-100 text-primary-800">
                Peça extra
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {isCarpet
              ? carpet
                ? `R$ ${carpet.pricePerM2.toFixed(2)}/m² · ${formatMinutes(carpet.minutesPerM2)}/m²`
                : 'Tapete — configure m²'
              : tiers.length
                ? `3 sujidades · R$ ${tiers.find((t) => t.level === 'baixa')?.price.toFixed(0)} – ${tiers.find((t) => t.level === 'alta')?.price.toFixed(0)}`
                : 'Preço único (legado)'}
          </p>
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
          <p className="text-[10px] text-slate-600 leading-snug rounded-lg bg-slate-100/80 px-2.5 py-2">
            Produtos e ml vêm do <strong>preset da rede</strong> (área de aplicação + sujidade).
            No orçamento, couro/suede/linho ajustam consumo automaticamente. Você define o{' '}
            <strong>preço do serviço</strong>; opcionalmente edita produtos abaixo.
          </p>

          <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
            {(eq.photoIds || []).map((photoId, i) => (
              <div key={photoId} className="relative shrink-0">
                <EquipmentPhotoThumb photoRef={photoId} equipmentId={eq.id} />
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(i)}
                    className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[9px] font-bold px-1 rounded"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {(!eq.photoIds || eq.photoIds.length === 0) && (
              <EquipmentPhotoThumb equipmentId={eq.id} />
            )}
            {canEdit && (eq.photoIds?.length || 0) < PHOTO_RULES.maxPhotosPerItem && (
              <label className="w-20 h-20 shrink-0 rounded-xl border-2 border-dashed border-primary-300 flex flex-col items-center justify-center cursor-pointer text-primary-700 hover:bg-primary-50">
                <Camera className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-0.5">+ Foto</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    onAddPhoto(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Nome da peça
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={eq.name}
              onChange={(e) => onPatch({ name: e.target.value })}
              placeholder="Ex.: Rede de descanso, Estofado SUV…"
              className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-medium disabled:bg-slate-50"
            />
          </div>

          {isCustom && canEdit && (
            <AppSwitch
              checked={isCarpet && Boolean(carpet)}
              onChange={setChargeByM2}
              label="Cobrar por m²"
              description="Ative para tapete cobrado por metro quadrado"
            />
          )}

          {isCarpet && carpet ? (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
              <p className="text-xs font-black text-amber-900 uppercase">Preço por m²</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">R$/m²</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!canEdit}
                    value={carpet.pricePerM2}
                    onChange={(e) =>
                      onPatch({
                        carpetPricing: {
                          ...carpet,
                          pricePerM2: Number(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full border rounded-lg p-2 text-sm font-bold mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tempo/m²</label>
                  <input
                    type="number"
                    min={1}
                    disabled={!canEdit || !editProducts}
                    value={carpet.minutesPerM2}
                    onChange={(e) =>
                      onPatch({
                        carpetPricing: {
                          ...carpet,
                          minutesPerM2: Number(e.target.value) || 1,
                        },
                      })
                    }
                    className="w-full border rounded-lg p-2 text-sm font-bold mt-0.5 disabled:opacity-60"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-600">
                Consumo/m²: {formatPresetSummary(carpet.products)}
                {carpet.impermeabilizacaoProducts?.length
                  ? ` + imperm. ${carpet.impermeabilizacaoProducts.reduce((s, p) => s + p.ml, 0)} ml`
                  : ''}
              </p>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditProducts((v) => !v)}
                  className="text-xs font-bold text-primary-700 flex items-center gap-1"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {editProducts ? 'Ocultar produtos' : 'Editar produtos e tempo'}
                </button>
              )}
              {editProducts && (
                <>
                  <ProductListEditor
                    title="Higienização (ml/m²)"
                    products={carpet.products}
                    canEdit={canEdit}
                    onChange={(products) =>
                      onPatch({ carpetPricing: { ...carpet, products } })
                    }
                  />
                  <ProductListEditor
                    title="Impermeabilização extra (ml/m²)"
                    products={normalizeImpermeabilizacaoProducts(carpet.impermeabilizacaoProducts)}
                    canEdit={canEdit}
                    onChange={(impermeabilizacaoProducts) =>
                      onPatch({ carpetPricing: { ...carpet, impermeabilizacaoProducts } })
                    }
                  />
                  {canEdit && (
                    <button
                      type="button"
                      onClick={resetTierProductsFromNetwork}
                      className="text-[10px] font-bold text-slate-600 underline"
                    >
                      Restaurar preset de produtos da rede
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-800 uppercase">Preço do serviço (R$)</p>
              <div className="grid grid-cols-3 gap-2">
                {TIER_LEVELS.map((level) => {
                  const tier = tiers.find((t) => t.level === level);
                  if (!tier) return null;
                  return (
                    <div key={level} className="rounded-xl border border-slate-200 bg-white p-2.5">
                      <p className="text-[9px] font-black text-slate-600 uppercase mb-1">
                        {SUJIDADE_LABELS[level].replace(' sujidade', '')}
                      </p>
                      <input
                        type="number"
                        step="0.01"
                        disabled={!canEdit}
                        value={tier.price}
                        onChange={(e) =>
                          patchTier(level, { price: Number(e.target.value) || 0 })
                        }
                        className="w-full border rounded-lg p-2 text-sm font-bold"
                      />
                      <p className="text-[9px] text-slate-500 mt-1">
                        {formatPresetSummary(tier.products)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditProducts((v) => !v)}
                  className="w-full py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-white"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {editProducts ? 'Ocultar produtos e tempo' : 'Editar produtos e tempo'}
                </button>
              )}

              {editProducts &&
                TIER_LEVELS.map((level) => {
                  const tier = tiers.find((t) => t.level === level);
                  if (!tier) return null;
                  return (
                    <div
                      key={level}
                      className="rounded-xl border border-slate-200 bg-white p-3 space-y-2"
                    >
                      <p className="text-xs font-black text-slate-800">{SUJIDADE_LABELS[level]}</p>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          Tempo (min)
                        </label>
                        <input
                          type="number"
                          min={1}
                          disabled={!canEdit}
                          value={tier.minutes}
                          onChange={(e) =>
                            patchTier(level, { minutes: Number(e.target.value) || 1 })
                          }
                          className="w-full border rounded-lg p-2 text-sm font-bold mt-0.5"
                        />
                      </div>
                      <ProductListEditor
                        title="Higienização — produtos (ml)"
                        products={tier.products}
                        canEdit={canEdit}
                        onChange={(products) => patchTier(level, { products })}
                        onPatchLine={(i, field, value) =>
                          patchTierProduct(level, i, field, value)
                        }
                      />
                      <ProductListEditor
                        title="Impermeabilização — produtos extras (ml)"
                        products={normalizeImpermeabilizacaoProducts(tier.impermeabilizacaoProducts)}
                        canEdit={canEdit}
                        onChange={(impermeabilizacaoProducts) =>
                          patchTier(level, { impermeabilizacaoProducts })
                        }
                        onPatchLine={(i, field, value) =>
                          patchTierImperProduct(level, i, field, value)
                        }
                      />
                    </div>
                  );
                })}

              {editProducts && canEdit && (
                <button
                  type="button"
                  onClick={resetTierProductsFromNetwork}
                  className="text-[10px] font-bold text-slate-600 underline w-full text-center"
                >
                  Restaurar preset de produtos da rede (esta peça)
                </button>
              )}
            </div>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={onRemove}
              className="w-full py-2 text-accent-coral font-bold text-sm flex items-center justify-center gap-1 border border-[#FF6B4A33] rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
              Remover
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ProductListEditor({
  title = 'Produtos (ml)',
  products,
  canEdit,
  onChange,
  onPatchLine,
}: {
  title?: string;
  products: { name: string; ml: number }[];
  canEdit: boolean;
  onChange?: (products: { name: string; ml: number }[]) => void;
  onPatchLine?: (index: number, field: 'name' | 'ml', value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-slate-500 uppercase">{title}</p>
      {products.map((p, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            disabled={!canEdit}
            value={p.name}
            onChange={(e) =>
              onPatchLine
                ? onPatchLine(i, 'name', e.target.value)
                : onChange?.(
                    products.map((row, j) =>
                      j === i ? { ...row, name: e.target.value } : row
                    )
                  )
            }
            className="flex-1 border rounded-lg px-2 py-1 text-xs font-medium min-w-0"
          />
          <input
            type="number"
            disabled={!canEdit}
            value={p.ml}
            onChange={(e) =>
              onPatchLine
                ? onPatchLine(i, 'ml', e.target.value)
                : onChange?.(
                    products.map((row, j) =>
                      j === i ? { ...row, ml: Number(e.target.value) || 0 } : row
                    )
                  )
            }
            className="w-16 border rounded-lg px-2 py-1 text-xs font-bold"
          />
        </div>
      ))}
    </div>
  );
}
