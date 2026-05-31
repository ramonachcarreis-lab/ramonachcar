import { useMemo, useRef, useState } from 'react';
import { X, FileText } from 'lucide-react';
import type { AppEvent } from '../context/EventsContext';
import { useEvents } from '../context/EventsContext';
import { useSettings } from '../context/SettingsContext';
import { buildUnitCatalog } from '../utils/units';
import UpholsteryQuoteBuilder from './UpholsteryQuoteBuilder';
import {
  type UpholsteryLineConfig,
  buildProposalItemsFromConfigs,
  quoteTotalFromItems,
} from '../utils/upholsteryLineConfig';
import { mergeAddonIntoEvent } from '../utils/serviceAddon';
import { eventToTemplateData } from '../utils/crmFlow';
import { generateBulletproofPDF } from '../utils/pdfGenerator';
import { ContractTemplate } from './ContractTemplate';
import { useLicensees } from '../context/LicenseesContext';
import { resolvePixForEvent } from '../services/pixStorage';

type Props = {
  event: AppEvent;
  onClose: () => void;
};

export default function ServiceAddonModal({ event, onClose }: Props) {
  const { updateEvent, pushDocVersion } = useEvents();
  const { getUnitEquipments } = useSettings();
  const { getLicensee } = useLicensees();
  const unitId = event.unitId || 'sp-centro';
  const catalog = useMemo(
    () => buildUnitCatalog(unitId, getUnitEquipments(unitId)),
    [unitId, getUnitEquipments]
  );
  const [addonConfigs, setAddonConfigs] = useState<Record<string, UpholsteryLineConfig>>({});
  const [busy, setBusy] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const addonTotal = quoteTotalFromItems(
    buildProposalItemsFromConfigs(catalog.equipments, addonConfigs)
  );

  const applyAddon = async () => {
    if (!Object.keys(addonConfigs).length) return;
    setBusy(true);
    try {
      const patch = mergeAddonIntoEvent(event, catalog.equipments, addonConfigs);
      updateEvent(event.id, patch, 'Operação');

      const licensee = getLicensee(unitId);
      const pix = resolvePixForEvent({ ...event, ...patch }, getLicensee, event.managedByCommercial);
      const templateData = eventToTemplateData(
        { ...event, ...patch },
        pix,
        catalog.equipments,
        licensee
      );
      pushDocVersion(event.id, {
        type: 'contract',
        label: `Aditivo ${new Date().toLocaleString('pt-BR')}`,
        data: {
          ...templateData,
          equipmentName: `${templateData.equipmentName} + itens extras`,
        },
      });

      if (pdfRef.current) {
        await generateBulletproofPDF(
          pdfRef.current,
          `Aditivo_${event.client.replace(/\s+/g, '_')}_${Date.now()}`
        );
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <p className="text-xs font-black text-amber-700 uppercase">Acrescentar serviço</p>
            <p className="font-bold text-slate-900">{event.client}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-600">
            Adicione itens na hora. O tempo, valor e consumo de produtos são recalculados. Um aditivo de
            contrato é gerado para enviar ao cliente.
          </p>
          <UpholsteryQuoteBuilder
            catalog={catalog.equipments}
            configs={addonConfigs}
            onChange={setAddonConfigs}
          />
          {addonTotal > 0 && (
            <p className="text-sm font-bold text-emerald-800 bg-emerald-50 rounded-xl p-3">
              Valor dos itens novos: R$ {addonTotal.toFixed(2)}
            </p>
          )}
          <button
            type="button"
            disabled={busy || !Object.keys(addonConfigs).length}
            onClick={applyAddon}
            className="w-full bg-primary-900 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <FileText className="w-5 h-5" />
            {busy ? 'Gerando…' : 'Aplicar e gerar aditivo (PDF)'}
          </button>
        </div>
      </div>
      <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none">
        <ContractTemplate
          ref={pdfRef}
          data={eventToTemplateData(
            { ...event, ...mergeAddonIntoEvent(event, catalog.equipments, addonConfigs) },
            resolvePixForEvent(event, getLicensee, event.managedByCommercial),
            catalog.equipments,
            getLicensee(unitId)
          )}
        />
      </div>
    </div>
  );
}
