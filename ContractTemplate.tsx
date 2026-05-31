import React from 'react';
import { LogoIcon } from './Logo';
import { APP_NAME, TEAM_SIGNATURE } from '../config/brand';

import type { ProposalLineItem, StoredSignature } from '../types/inventory';
import { proposalLineClientLabel, proposalLineTotal } from '../utils/proposalItems';
import type { PixConfig } from '../services/pixStorage';
import type { PaymentPlanSummary } from '../utils/paymentPlan';
import PixPaymentBlock from './PixPaymentBlock';
import ClientProvidedPhotosSection from './ClientProvidedPhotosSection';

export type ContractTemplateData = {
  clientName: string;
  cpf: string;
  clientPhone: string;
  eventAddress: string;
  eventDate: string;
  eventTime: string;
  equipmentName: string;
  duration: string;
  totalValue: string;
  hasSupervisor: boolean;
  pixKey?: string;
  pixHolder?: string;
  pixKeyType?: string;
  pixBank?: string;
  pixConfig?: PixConfig;
  pixTxid?: string;
  lineItems?: ProposalLineItem[];
  /** Uso interno (agenda) — não exibir em PDF ao cliente */
  estimatedServiceHours?: number;
  clientSignature?: StoredSignature;
  licenseeSignature?: StoredSignature;
  paymentPlan?: PaymentPlanSummary | null;
  clientProvidedPhotoUrls?: string[];
};

function formatDatePtBr(dateIso: string) {
  if (!dateIso) return '';
  const [y, m, d] = dateIso.split('-').map((v) => Number(v));
  if (!y || !m || !d) return dateIso;
  return new Date(y, m - 1, d, 12, 0, 0).toLocaleDateString('pt-BR');
}

export const ContractTemplate = React.forwardRef<HTMLDivElement, { data: ContractTemplateData }>(
  ({ data }, ref) => {
    const generatedAt = new Date().toLocaleDateString('pt-BR');
    const total = data.totalValue ? Number(data.totalValue) : null;
    const totalLabel =
      total != null && Number.isFinite(total) ? `R$ ${total.toFixed(2).replace('.', ',')}` : '—';
    const agreedHeadline = data.paymentPlan?.lines.find((l) =>
      l.startsWith('Forma de pagamento acordada')
    );

    return (
      <div
        ref={ref}
        className="bg-white text-slate-900 doc-selectable"
        style={{
          width: 794,
          padding: '24px 28px',
          fontSize: 11,
          lineHeight: 1.5,
          letterSpacing: '0.02em',
        }}
      >
        <div className="flex items-start justify-between border-b border-slate-200 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <LogoIcon className="w-9 h-9" />
            <div>
              <p className="text-xs font-bold text-slate-800">{APP_NAME}</p>
              <p className="text-[10px] text-slate-400">Documento para assinatura</p>
            </div>
          </div>
          <div className="text-right max-w-[55%]">
            <h1 className="text-sm font-black tracking-tight text-slate-900 leading-tight">
              CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ESTOFADOS
            </h1>
            <p className="text-[10px] text-slate-400 mt-0.5">Gerado em {generatedAt}</p>
          </div>
        </div>

        <section className="mb-2">
          <h2 className="text-[10px] font-black uppercase text-slate-500 mb-1.5">Dados do Contratante</h2>
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <div className="border border-slate-200 rounded-lg p-2">
              <p className="font-bold text-slate-400 uppercase text-[9px]">Nome</p>
              <p className="font-semibold mt-0.5">{data.clientName || '—'}</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-2">
              <p className="font-bold text-slate-400 uppercase text-[9px]">CPF</p>
              <p className="font-semibold mt-0.5">{data.cpf || '—'}</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-2">
              <p className="font-bold text-slate-400 uppercase text-[9px]">WhatsApp</p>
              <p className="font-semibold mt-0.5">{data.clientPhone || '—'}</p>
            </div>
          </div>
        </section>

        <section className="mb-2">
          <h2 className="text-[10px] font-black uppercase text-slate-500 mb-1.5">Dados do Serviço</h2>
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <div className="border border-slate-200 rounded-lg p-2">
              <p className="font-bold text-slate-400 uppercase text-[9px]">Data / Hora</p>
              <p className="font-semibold mt-0.5">
                {data.eventDate ? formatDatePtBr(data.eventDate) : '—'}
                {data.eventTime ? ` às ${data.eventTime}` : ''}
              </p>
            </div>
            <div className="border border-slate-200 rounded-lg p-2">
              <p className="font-bold text-slate-400 uppercase text-[9px]">Duração</p>
              <p className="font-semibold mt-0.5">{data.duration || '—'}</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-2 col-span-1">
              <p className="font-bold text-slate-400 uppercase text-[9px]">Visita técnica</p>
              <p className="font-semibold mt-0.5">Conforme proposta</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-2 col-span-3">
              <p className="font-bold text-slate-400 uppercase text-[9px]">Endereço</p>
              <p className="font-semibold mt-0.5">{data.eventAddress || '—'}</p>
            </div>
          </div>
        </section>

        <section className="mb-2">
          <h2 className="text-[10px] font-black uppercase text-slate-500 mb-1.5">Objeto e Valores</h2>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="border border-slate-200 rounded-lg p-2">
              <p className="font-bold text-slate-400 uppercase text-[9px]">Itens / Serviços</p>
              <p className="font-semibold mt-0.5">{data.equipmentName || '—'}</p>
            </div>
            <div className="border-2 border-primary-700 rounded-lg p-2 bg-primary-50">
              <p className="font-black text-primary-900 uppercase text-[9px]">Valor Total</p>
              <p className="text-lg font-black text-primary-900 mt-0.5">{totalLabel}</p>
            </div>
          </div>
          {(data.lineItems || []).length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(data.lineItems || []).map((row) => (
                <div
                  key={`${row.equipmentId}-${row.name}`}
                  className="border border-slate-200 rounded-lg p-2 flex gap-2 items-start"
                >
                  {row.photoUrl ? (
                    <img
                      src={row.photoUrl}
                      alt=""
                      className="w-14 h-14 media-cover rounded-md shrink-0 border border-slate-100"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-md bg-slate-100 shrink-0 flex items-center justify-center text-[8px] text-slate-400 text-center px-1">
                      Sem foto
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-[10px] leading-tight">
                      {proposalLineClientLabel(row)}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      R$ {proposalLineTotal(row).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <ClientProvidedPhotosSection
          urls={data.clientProvidedPhotoUrls || []}
          variant="print"
          maxPhotos={8}
          columns={4}
        />

        {data.paymentPlan && data.paymentPlan.lines.length > 0 && (
          <section className="mb-2">
            <h2 className="text-[10px] font-black uppercase text-slate-500 mb-1.5">
              Forma de pagamento
            </h2>
            {agreedHeadline && (
              <p className="text-[10px] font-black text-emerald-900 bg-emerald-50 border-2 border-emerald-600 rounded-lg p-2 mb-1.5">
                {agreedHeadline}
              </p>
            )}
            <div className="border border-slate-200 rounded-lg p-2 text-[9px] space-y-1 bg-slate-50">
              {data.paymentPlan.lines
                .filter((line) => line !== agreedHeadline)
                .map((line) => (
                  <p key={line} className="text-slate-800">
                    {line}
                  </p>
                ))}
            </div>
          </section>
        )}

        {data.pixConfig && total != null && total > 0 && (
          <section className="mb-3">
            <h2 className="text-[10px] font-black uppercase text-slate-500 mb-1.5">PIX (pagamento)</h2>
            <PixPaymentBlock
              pix={data.pixConfig}
              amount={total}
              txid={data.pixTxid}
              compact
              variant="print"
            />
          </section>
        )}

        <section className="mb-2">
          <h2 className="text-[10px] font-black uppercase text-slate-500 mb-1">Termos (CDC)</h2>
          <div className="space-y-1 text-[8.5px] leading-snug text-justify text-slate-700">
            <p>
              <span className="font-bold">Cláusula 1 — Escopo.</span> O PRESTADOR executará higienização e/ou
              impermeabilização dos itens descritos na proposta, com produtos adequados ao tipo de tecido
              informado pelo CONTRATANTE.
            </p>
            <p>
              <span className="font-bold">Cláusula 2 — Acesso.</span> O CONTRATANTE garante acesso ao local,
              energia elétrica e água quando necessários, e declara o estado real dos itens (sujidade e tecido).
            </p>
            <p>
              <span className="font-bold">Cláusula 3 — Prazo.</span> O tempo estimado depende do tipo de item e
              condição; variações por sujidade extrema ou tecido delicado serão comunicadas antes da execução.
            </p>
            <p>
              <span className="font-bold">Cláusula 4 — Garantia.</span> Reclamações sobre o serviço devem ser
              feitas em até 48h após a execução, com registro fotográfico quando aplicável (CDC).
            </p>
          </div>
        </section>

        <section className="mt-3">
          <h2 className="text-[10px] font-black uppercase text-slate-500 mb-2">
            Formalização
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-lg p-2 min-h-[72px]">
              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Prestador ({APP_NAME})</p>
              {data.licenseeSignature?.imageDataUrl ? (
                <>
                  <img
                    src={data.licenseeSignature.imageDataUrl}
                    alt=""
                    className="h-10 object-contain"
                  />
                  <p className="text-[8px] text-slate-600 mt-0.5">
                    {data.licenseeSignature.signerName}
                    {data.licenseeSignature.signedAt
                      ? ` · ${new Date(data.licenseeSignature.signedAt).toLocaleString('pt-BR')}`
                      : ''}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[9px] text-slate-700 font-semibold mt-1">
                    Contrato emitido eletronicamente pela unidade licenciada.
                  </p>
                  <p className="text-[8px] text-slate-500 mt-1">
                    Cadastre a assinatura fixa em Minha Empresa para exibir aqui.
                  </p>
                </>
              )}
            </div>
            <div className="border border-slate-200 rounded-lg p-2 min-h-[72px]">
              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Contratante</p>
              {data.clientSignature?.imageDataUrl ? (
                <>
                  <img
                    src={data.clientSignature.imageDataUrl}
                    alt=""
                    className="h-10 object-contain"
                  />
                  <p className="text-[8px] text-slate-600 mt-0.5">
                    {data.clientSignature.signerName}
                    {data.clientSignature.signedAt
                      ? ` · ${new Date(data.clientSignature.signedAt).toLocaleString('pt-BR')}`
                      : ''}
                  </p>
                </>
              ) : (
                <p className="text-[9px] text-slate-400 italic">Aguardando assinatura digital remota</p>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }
);

ContractTemplate.displayName = 'ContractTemplate';
