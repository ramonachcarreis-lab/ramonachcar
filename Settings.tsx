import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  MapPin,
  Fuel,
  Truck,
  DollarSign,
  Plus,
  Trash2,
  MessageCircle,
  Instagram,
  ExternalLink,
  QrCode,
  ImageIcon,
} from 'lucide-react';
import type { Equipment } from '../types/inventory';
import { useViewMode } from '../hooks/useViewMode';
import ViewModeToggle from '../components/ViewModeToggle';
import ImageEditorModal from '../components/ImageEditorModal';
import { saveEquipmentPhoto, deleteEquipmentPhoto } from '../utils/equipmentPhotos';
import { PHOTO_RULES, validateImageFile } from '../utils/imageRules';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useLicensees } from '../context/LicenseesContext';
import NotificationsSettings from '../components/NotificationsSettings';
import AppSwitch from '../components/AppSwitch';
import { loadNotifyPrefs, saveNotifyPrefs } from '../utils/webPushSubscribe';
import LicenseeBusinessExtras from '../components/LicenseeBusinessExtras';
import StockInventoryPanel from '../components/StockInventoryPanel';
import CatalogInventoryCard from '../components/CatalogInventoryCard';
import ServiceOfferingBar from '../components/ServiceOfferingBar';
import { defaultDirtTiersForCatalogId } from '../config/catalogDefaults';
import { LABEL_ADD_CATALOG_PIECE, LABEL_NEW_CATALOG_PIECE } from '../config/brand';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const navigate = useNavigate();
  const { settings, setSettings, getUnitEquipments, setUnitEquipments, resetUnitCatalog } =
    useSettings();
  const { session } = useAuth();
  const { getLicensee, updateLicensee } = useLicensees();
  const isLicensee = session?.role === 'licensee';
  const canEditInventory = isLicensee;
  const unitId = session?.unitId || 'sp-centro';
  const { mode: inventoryViewMode, setMode: setInventoryViewMode } = useViewMode('grid');
  const unitEquipments = getUnitEquipments(unitId);
  const profile = getLicensee(unitId);

  const [activeTab, setActiveTab] = useState<'empresa' | 'logistics' | 'pricing' | 'estoque'>(
    isLicensee ? 'empresa' : 'logistics'
  );
  const [empresaDraft, setEmpresaDraft] = useState(profile);

  useEffect(() => {
    setEmpresaDraft(getLicensee(unitId));
  }, [unitId, getLicensee]);

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoEditor, setPhotoEditor] = useState<{ file: File; equipmentId: string } | null>(null);
  const [photoError, setPhotoError] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (photoError) toast.error(photoError);
  }, [photoError, toast]);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [expandEquipmentId, setExpandEquipmentId] = useState<string | null>(null);
  const inventorySectionRef = useRef<HTMLDivElement>(null);

  const onlyDigits = (v: string) => v.replace(/\D/g, '');
  const formatCep = (v: string) => {
    const digits = onlyDigits(v).slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const consolidateHq = (hq: typeof settings.headquarters) => {
    const first = [hq.logradouro?.trim(), hq.numero?.trim()].filter(Boolean).join(', ');
    const second = [hq.bairro?.trim(), hq.cidade?.trim()].filter(Boolean).join(' - ');
    const third = [hq.uf?.trim(), hq.cep?.trim()].filter(Boolean).join(', ');
    return [first, second, third].filter(Boolean).join(' | ');
  };

  const fetchViaCep = async (cepDigits: string) => {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      const json = await res.json();
      if (json?.erro) return;
      setSettings((prev) => ({
        ...prev,
        headquarters: {
          ...prev.headquarters,
          logradouro: json.logradouro || prev.headquarters.logradouro,
          bairro: json.bairro || prev.headquarters.bairro,
          cidade: json.localidade || prev.headquarters.cidade,
          uf: json.uf || prev.headquarters.uf,
        },
      }));
    } catch {
      // silent
    }
  };

  const handleHqCepBlur = () => {
    const digits = onlyDigits(settings.headquarters.cep);
    if (digits.length === 8) fetchViaCep(digits);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleHqChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const field = name.replace('headquarters.', '') as keyof typeof settings.headquarters;
    if (field === 'cep') {
      const formatted = formatCep(value);
      setSettings((prev) => ({
        ...prev,
        headquarters: { ...prev.headquarters, cep: formatted },
      }));
      return;
    }
    if (field === 'uf') {
      setSettings((prev) => ({
        ...prev,
        headquarters: { ...prev.headquarters, uf: value.toUpperCase().slice(0, 2) },
      }));
      return;
    }
    setSettings((prev) => ({
      ...prev,
      headquarters: { ...prev.headquarters, [field]: value },
    }));
  };

  const patchUnitEquipment = (id: string, patch: Partial<Equipment>) => {
    if (!canEditInventory) return;
    setUnitEquipments(
      unitId,
      unitEquipments.map((eq) => (eq.id === id ? { ...eq, ...patch } : eq))
    );
  };

  const handleEquipmentChange = (
    id: string,
    field: 'name' | 'price' | 'type' | 'stockQuantity',
    value: string
  ) => {
    if (field === 'stockQuantity') {
      patchUnitEquipment(id, { stockQuantity: Math.max(1, parseInt(value, 10) || 1) });
      return;
    }
    patchUnitEquipment(id, { [field]: value } as Partial<Equipment>);
  };

  const addEquipment = () => {
    if (!canEditInventory) return;
    const id = `${unitId}-extra-${Date.now()}`;
    setExpandEquipmentId(id);
    setUnitEquipments(unitId, [
      ...unitEquipments,
      {
        id,
        name: LABEL_NEW_CATALOG_PIECE,
        price: '100.00',
        type: 'service',
        photos: [],
        stockQuantity: 1,
        dirtTiers: defaultDirtTiersForCatalogId('sofa').map((t) => ({
          ...t,
          products: t.products.map((p) => ({ ...p })),
          impermeabilizacaoProducts: (t.impermeabilizacaoProducts || []).map((p) => ({ ...p })),
        })),
      },
    ]);
    requestAnimationFrame(() => {
      inventorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  };

  const removeEquipment = (id: string) => {
    if (!canEditInventory) return;
    setUnitEquipments(
      unitId,
      unitEquipments.filter((eq) => eq.id !== id)
    );
  };

  const startPhotoUpload = (id: string, files: FileList | null) => {
    if (!files?.length || !canEditInventory) return;
    const eq = unitEquipments.find((e) => e.id === id);
    if (!eq) return;
    const count = (eq.photoIds?.length || 0);
    if (count >= PHOTO_RULES.maxPhotosPerItem) {
      setPhotoError(`Máximo ${PHOTO_RULES.maxPhotosPerItem} fotos por item.`);
      return;
    }
    const file = files[0];
    const v = validateImageFile(file);
    if (!v.ok) {
      setPhotoError(v.message);
      return;
    }
    setPhotoError('');
    if (activeTab !== 'pricing') setActiveTab('pricing');
    requestAnimationFrame(() => {
      inventorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    setPhotoEditor({ file, equipmentId: id });
  };

  const confirmPhoto = (dataUrl: string) => {
    if (!photoEditor || photoSaving) return;
    const eq = unitEquipments.find((e) => e.id === photoEditor.equipmentId);
    if (!eq) return;
    const equipmentId = photoEditor.equipmentId;
    setPhotoEditor(null);
    setPhotoSaving(true);
    window.setTimeout(() => {
      try {
        const photoId = saveEquipmentPhoto(dataUrl);
        const current = getUnitEquipments(unitId);
        const target = current.find((e) => e.id === equipmentId);
        if (target) {
          setUnitEquipments(unitId, [
            ...current.map((e) =>
              e.id === equipmentId
                ? {
                    ...e,
                    photoIds: [...(e.photoIds || []), photoId].slice(0, PHOTO_RULES.maxPhotosPerItem),
                  }
                : e
            ),
          ]);
        }
        setPhotoError('');
      } catch (e) {
        setPhotoError(e instanceof Error ? e.message : 'Erro ao salvar foto');
      } finally {
        setPhotoSaving(false);
      }
    }, 50);
  };

  const removePhoto = (eqId: string, index: number) => {
    const eq = unitEquipments.find((e) => e.id === eqId);
    const ids = eq?.photoIds || [];
    const removed = ids[index];
    if (removed) deleteEquipmentPhoto(removed);
    patchUnitEquipment(eqId, {
      photoIds: ids.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSettings(prev => ({
      ...prev,
      headquarters_address: consolidateHq(prev.headquarters),
    }));
    // Mock Supabase update
    // await supabase.from('franchisee_settings').update(settings).eq('unit_id', user.id)
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // The context automatically saves to localStorage via useEffect
    
    setIsSaving(false);
    setSaved(true);
    toast.success('Configurações salvas.');
    setTimeout(() => setSaved(false), 3000);
  };

  if (session?.role === 'commercial') {
    return <Navigate to="/perfil-comercial" replace />;
  }
  if (session?.role === 'admin') {
    return <Navigate to="/admin-comercial" replace />;
  }

  return (
    <div className="page-container">
      {photoEditor && (
        <ImageEditorModal
          file={photoEditor.file}
          onConfirm={confirmPhoto}
          onCancel={() => setPhotoEditor(null)}
        />
      )}
      {photoSaving && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-[8000] bg-primary-900 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
          Salvando foto…
        </div>
      )}
      <div className="page-stack">
        <header className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="app-btn-icon">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-heading text-2xl">Minha Empresa</h1>
            <p className="page-subtitle text-sm">Configurações Globais</p>
          </div>
        </header>

        <NotificationsSettings />

        {photoError && (
          <p className="text-sm font-bold text-red-400 bg-red-950/40 border border-red-800/50 rounded-xl p-3">
            {photoError}
          </p>
        )}

        <nav className="settings-tab-bar" aria-label="Seções de configuração">
          {isLicensee && (
            <button
              type="button"
              onClick={() => setActiveTab('empresa')}
              className={`settings-tab-btn ${activeTab === 'empresa' ? 'settings-tab-btn--active' : ''}`}
            >
              Minha Empresa
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('logistics')}
            className={`settings-tab-btn ${activeTab === 'logistics' ? 'settings-tab-btn--active' : ''}`}
          >
            Logística
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`settings-tab-btn ${activeTab === 'pricing' ? 'settings-tab-btn--active' : ''}`}
          >
            Peças
          </button>
          {isLicensee && (
            <button
              type="button"
              onClick={() => setActiveTab('estoque')}
              className={`settings-tab-btn ${activeTab === 'estoque' ? 'settings-tab-btn--active' : ''}`}
            >
              Estoque
            </button>
          )}
        </nav>

        <div className="space-y-4 w-full min-w-0">
        {activeTab === 'empresa' && isLicensee && (
          <div className="app-panel space-y-4 w-full">
            <p className="text-sm text-[var(--color-text-muted)]">
              Estes dados aparecem para o comercial e nos fluxos de WhatsApp da unidade.
            </p>

            <div className="tone-info tone-box space-y-3">
              <p className="text-xs font-black uppercase tone-title">Tempo de casa / Período de atividade</p>
              <AppSwitch
                checked={Boolean(empresaDraft.inauguratedAt)}
                onChange={(on) =>
                  setEmpresaDraft({
                    ...empresaDraft,
                    inauguratedAt: on
                      ? empresaDraft.inauguratedAt || new Date().toISOString().slice(0, 10)
                      : null,
                    plannedInaugurationAt: on ? null : empresaDraft.plannedInaugurationAt,
                  })
                }
                label="Unidade em período de atividade"
                description="Desligado = informar previsão de início da atividade"
              />
              {empresaDraft.inauguratedAt ? (
                <div>
                  <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                    Data de início da atividade
                  </label>
                  <input
                    type="date"
                    value={empresaDraft.inauguratedAt.slice(0, 10)}
                    onChange={(e) =>
                      setEmpresaDraft({
                        ...empresaDraft,
                        inauguratedAt: e.target.value
                          ? new Date(e.target.value + 'T12:00:00').toISOString()
                          : null,
                      })
                    }
                    className="app-input mt-1 font-bold min-h-[48px]"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                    Fora do período — previsão de início (dia / mês / ano)
                  </label>
                  <input
                    type="date"
                    value={empresaDraft.plannedInaugurationAt?.slice(0, 10) || ''}
                    onChange={(e) =>
                      setEmpresaDraft({
                        ...empresaDraft,
                        plannedInaugurationAt: e.target.value
                          ? new Date(e.target.value + 'T12:00:00').toISOString()
                          : null,
                      })
                    }
                    className="app-input mt-1 font-bold min-h-[48px]"
                  />
                  <p className="text-[10px] text-[var(--color-text-muted)] font-bold mt-1">
                    Exibido para o comercial como: Fora do período · previsão dd/mm/aaaa
                  </p>
                </div>
              )}
            </div>

            {(
              [
                ['whatsapp', 'WhatsApp (alertas automáticos + contato)', MessageCircle],
                ['instagram', 'Instagram', Instagram],
                ['googleBusinessUrl', 'Google Business (URL)', ExternalLink],
              ] as const
            ).map(([field, label, Icon]) => (
              <div key={field}>
                <label className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">
                  <Icon className="w-4 h-4" />
                  {label}
                </label>
                <input
                  value={empresaDraft[field]}
                  onChange={(e) => setEmpresaDraft({ ...empresaDraft, [field]: e.target.value })}
                  className="app-input font-medium min-h-[48px]"
                />
              </div>
            ))}

            <LicenseeBusinessExtras draft={empresaDraft} onChange={setEmpresaDraft} />

            <div className="tone-success tone-box space-y-3">
              <p className="text-xs font-black uppercase flex items-center gap-2 tone-title">
                <QrCode className="w-4 h-4 shrink-0" />
                PIX da unidade (suas negociações diretas)
              </p>
              <p className="ui-caption">
                Usado nas propostas de clientes que você negocia sem passar pelo comercial.
              </p>
              <AppSwitch
                checked={empresaDraft.pixEnabled !== false}
                onChange={(on) => setEmpresaDraft({ ...empresaDraft, pixEnabled: on })}
                label="PIX ativo nas negociações diretas"
                description="Desligado = propostas sem bloco PIX da unidade"
              />
              <div
                className={
                  empresaDraft.pixEnabled === false ? 'tone-section-off space-y-3' : 'space-y-3'
                }
              >
                <input
                  placeholder="Titular / nome da conta"
                  value={empresaDraft.pixHolderName || ''}
                  disabled={empresaDraft.pixEnabled === false}
                  onChange={(e) =>
                    setEmpresaDraft({ ...empresaDraft, pixHolderName: e.target.value })
                  }
                  className="app-input font-medium min-h-[48px]"
                />
                <select
                  value={empresaDraft.pixKeyType || 'phone'}
                  disabled={empresaDraft.pixEnabled === false}
                  onChange={(e) =>
                    setEmpresaDraft({
                      ...empresaDraft,
                      pixKeyType: e.target.value as typeof empresaDraft.pixKeyType,
                    })
                  }
                  className="app-input font-bold min-h-[48px]"
                >
                  <option value="phone">Telefone</option>
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="random">Chave aleatória</option>
                </select>
                <input
                  placeholder="Chave PIX"
                  value={empresaDraft.pixKey || ''}
                  disabled={empresaDraft.pixEnabled === false}
                  onChange={(e) => setEmpresaDraft({ ...empresaDraft, pixKey: e.target.value })}
                  className="app-input font-bold min-h-[48px]"
                />
                <input
                  placeholder="Banco (opcional)"
                  value={empresaDraft.pixBankName || ''}
                  disabled={empresaDraft.pixEnabled === false}
                  onChange={(e) =>
                    setEmpresaDraft({ ...empresaDraft, pixBankName: e.target.value })
                  }
                  className="app-input font-medium min-h-[48px]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                updateLicensee(unitId, empresaDraft);
                if (empresaDraft.whatsapp?.trim()) {
                  const p = loadNotifyPrefs();
                  saveNotifyPrefs({
                    ...p,
                    phone: empresaDraft.whatsapp.trim(),
                    whatsappAuto: true,
                  });
                }
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
              }}
              className="w-full bg-primary-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 min-h-[48px]"
            >
              <Save className="w-5 h-5" />
              Salvar perfil da unidade
            </button>
          </div>
        )}

        {activeTab === 'logistics' && (
          <div className="app-panel space-y-5 w-full min-w-0">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <MapPin className="w-4 h-4 text-primary-600" />
                Endereço da Sede (Ponto de Partida)
              </label>
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CEP</label>
                  <input
                    type="text"
                    name="headquarters.cep"
                    value={settings.headquarters.cep}
                    onChange={handleHqChange}
                    onBlur={handleHqCepBlur}
                    inputMode="numeric"
                    maxLength={9}
                    className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none text-sm font-medium transition-colors"
                    placeholder="00000-000"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    name="headquarters.logradouro"
                    value={settings.headquarters.logradouro}
                    onChange={handleHqChange}
                    className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none text-sm font-medium transition-colors"
                    placeholder="Rua, Avenida..."
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    name="headquarters.numero"
                    value={settings.headquarters.numero}
                    onChange={handleHqChange}
                    className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none text-sm font-medium transition-colors"
                    placeholder="100"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    name="headquarters.bairro"
                    value={settings.headquarters.bairro}
                    onChange={handleHqChange}
                    className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none text-sm font-medium transition-colors"
                    placeholder="Bairro"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    UF
                  </label>
                  <select
                    name="headquarters.uf"
                    value={settings.headquarters.uf}
                    onChange={handleHqChange}
                    className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none text-sm font-medium transition-colors bg-white"
                  >
                    <option value="" disabled>
                      UF
                    </option>
                    {[
                      'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
                    ].map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    name="headquarters.cidade"
                    value={settings.headquarters.cidade}
                    onChange={handleHqChange}
                    className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none text-sm font-medium transition-colors"
                    placeholder="Cidade"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">Usado para cálculo automático de rotas.</p>
              <p className="text-[11px] text-slate-500 mt-2 font-semibold">
                Endereço consolidado: <span className="font-bold text-slate-700">{consolidateHq(settings.headquarters) || '—'}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  Consumo (Km/L)
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  name="vehicle_km_per_liter"
                  value={settings.vehicle_km_per_liter}
                  onChange={handleChange}
                  className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none text-sm font-bold transition-colors"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <Fuel className="w-4 h-4 text-accent-coral" />
                  Preço Combustível
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    name="current_fuel_price"
                    value={settings.current_fuel_price}
                    onChange={handleChange}
                    className="w-full border-2 border-slate-100 rounded-xl py-3 pl-9 pr-3 focus:border-primary-500 focus:outline-none text-sm font-bold transition-colors"
                  />
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'pricing' && (
          <div ref={inventorySectionRef} className="app-panel space-y-5 scroll-mt-4 w-full min-w-0">
            {!canEditInventory && (
              <p className="text-sm font-bold tone-warning tone-box">
                O cadastro de itens e fotos é feito apenas pelo operador da unidade. Você pode
                visualizar o catálogo abaixo.
              </p>
            )}
            <ServiceOfferingBar className="mb-2" />
            <p className="text-xs text-slate-600">
              <strong>Catálogo residencial da rede</strong> — sofá, poltrona, colchão, tapete, rede,
              puff, cadeira e cabeceira. Defina o <strong>preço por sujidade</strong> (ou R$/m² no
              tapete). Consumo de produtos já vem proporcional à área da peça; use{' '}
              <strong>Editar produtos e tempo</strong> só se precisar ajustar. Tipo de tecido no
              orçamento altera o consumo automaticamente.
            </p>
            <p className="text-[10px] text-slate-500">
              Fotos: JPG/PNG/WebP · máx. {PHOTO_RULES.maxFileSizeMb}MB · mín. {PHOTO_RULES.minWidth}×
              {PHOTO_RULES.minHeight}px · proporção 4:3 após ajuste
            </p>
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary-600" />
                Catálogo de peças
                {isLicensee && (
                  <span className="text-[10px] font-bold text-primary-600 normal-case">
                    · {getLicensee(unitId).name}
                  </span>
                )}
              </h2>
              <ViewModeToggle mode={inventoryViewMode} onChange={setInventoryViewMode} />
            </div>

            {canEditInventory && (
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      'Restaurar o catálogo padrão Estofado Pro? Itens antigos (festas/brinquedos) serão removidos.'
                    )
                  ) {
                    resetUnitCatalog(unitId);
                  }
                }}
                className="w-full py-2.5 rounded-xl border-2 border-amber-400 text-amber-900 font-bold text-sm hover:bg-amber-50"
              >
                Restaurar catálogo residencial da rede (8 peças + presets)
              </button>
            )}

            <div
              className={
                inventoryViewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 gap-4'
                  : 'space-y-4'
              }
            >
              {unitEquipments.map((eq) => (
                <CatalogInventoryCard
                  key={eq.id}
                  equipment={eq}
                  defaultOpen={eq.id === expandEquipmentId}
                  canEdit={canEditInventory}
                  onPatch={(patch) => patchUnitEquipment(eq.id, patch)}
                  onRemove={() => removeEquipment(eq.id)}
                  onAddPhoto={(files) => startPhotoUpload(eq.id, files)}
                  onRemovePhoto={(index) => removePhoto(eq.id, index)}
                />
              ))}
            </div>

            {canEditInventory && (
              <button
                type="button"
                onClick={addEquipment}
                className="w-full py-3 border-2 border-dashed border-primary-200 text-primary-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary-50 transition-colors"
              >
                <Plus className="w-5 h-5" />
                {LABEL_ADD_CATALOG_PIECE}
              </button>
            )}
          </div>
        )}

        {activeTab === 'estoque' && isLicensee && <StockInventoryPanel unitId={unitId} />}
      </div>

        {activeTab !== 'empresa' && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`w-full py-4 flex items-center justify-center gap-2 min-h-[48px] ${
              saved ? 'btn-success' : 'btn-primary'
            } disabled:opacity-70`}
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Salvando...' : saved ? 'Configurações Salvas!' : 'Salvar Configurações'}
          </button>
        )}
      </div>
    </div>
  );
}
