import React from 'react';
import { LogoIcon } from './Logo';
import type { ContractTemplateData } from './ContractTemplate';
import PixPaymentBlock from './PixPaymentBlock';
import ClientProvidedPhotosSection from './ClientProvidedPhotosSection';
import { proposalLineClientLabel, proposalLineTotal } from '../utils/proposalItems';

function formatDatePtBr(dateIso: string) {
  if (!dateIso) return '';
  const [y, m, d] = dateIso.split('-').map((v) => Number(v));
  if (!y || !m || !d) return dateIso;
  return new Date(y, m - 1, d, 12, 0, 0).toLocaleDateString('pt-BR');
}

export const ProposalTemplate = React.forwardRef<HTMLDivElement, { data: ContractTemplateData }>(
  ({ data }, ref) => {
    const generatedAt = new Date().toLocaleDateString('pt-BR');
    const total = data.totalValue ? Number(data.totalValue) : null;
    const totalLabel =
      total != null && Number.isFinite(total) ? `R$ ${total.toFixed(2).replace('.', ',')}` : '—';

    return (
      <div
        ref={ref}
        className="bg-white text-slate-900"
        style={{ width: 794, padding: '24px 28px', fontSize: 11, lineHeight: 1.35 }}
      >
        <div className="flex items-start justify-between border-b-2 border-primary-900 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <LogoIcon className="w-12 h-12" />
            <div>
              <p className="text-sm font-black text-primary-900">Estofado Pro</p>
              <p className="text-[10px] text-slate-500">Higienização · Impermeabilização · Proteção completa</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-base font-black text-primary-900 uppercase">Proposta Comercial</h1>
            <p className="text-[10px] text-slate-500 mt-1">Emitida em {generatedAt}</p>
          </div>
        </div>

        <p className="text-sm mb-4">
          Prezado(a) <strong>{data.clientName || 'Cliente'}</strong>,
        </p>
        <p className="text-[11px] text-slate-700 mb-4 text-justify leading-relaxed" style={{ wordSpacing: '0.06em' }}>
          Segue nossa proposta para o serviço de higienização e impermeabilização de estofados. Valores e
          condições válidos conforme disponibilidade de agenda na data solicitada.
        </p>

        <section className="mb-3">
          <h2 className="text-[10px] font-black uppercase text-primary-800 mb-2 bg-primary-50 px-2 py-1 rounded">
            Dados do evento
          </h2>
          <table className="w-full text-[10px] border-collapse">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 font-bold text-slate-500 w-28">Data / Horário</td>
                <td>
                  {formatDatePtBr(data.eventDate)} {data.eventTime ? `· ${data.eventTime}` : ''}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 font-bold text-slate-500">Endereço</td>
                <td>{data.eventAddress || '—'}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 font-bold text-slate-500 align-top">Itens</td>
                <td>
                  {data.lineItems && data.lineItems.length > 0 ? (
                    <ul className="space-y-2">
                      {data.lineItems.map((row) => (
                        <li key={`${row.equipmentId}-${row.name}`} className="flex gap-2 items-center">
                          {row.photoUrl ? (
                            <img
                              src={row.photoUrl}
                              alt=""
                              className="w-12 h-12 rounded object-cover border border-slate-200"
                            />
                          ) : null}
                          <span>
                            {proposalLineClientLabel(row)}
                            {' — '}
                            <strong>R$ {proposalLineTotal(row).toFixed(2).replace('.', ',')}</strong>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    data.equipmentName || '—'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 font-bold text-slate-500">Janela de atendimento</td>
                <td>{data.duration || 'Conforme horário acordado'}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <ClientProvidedPhotosSection
          urls={data.clientProvidedPhotoUrls || []}
          variant="print"
          maxPhotos={8}
          columns={4}
        />

        <div className="bg-amber-50 border-2 border-amber-400 text-slate-900 rounded-xl p-4 mb-4 text-center">
          <p className="text-[10px] uppercase font-bold text-amber-900">Investimento total</p>
          <p className="text-2xl font-black mt-1 text-slate-900">{totalLabel}</p>
        </div>

        {data.pixConfig && total != null && total > 0 ? (
          <section className="mb-4">
            <PixPaymentBlock
              pix={data.pixConfig}
              amount={total}
              txid={data.pixTxid}
              compact
              variant="print"
            />
          </section>
        ) : data.pixKey ? (
          <section className="mb-4 border-2 border-emerald-200 bg-emerald-50 rounded-xl p-3">
            <p className="text-[10px] font-black uppercase text-emerald-900 mb-1">Pagamento PIX</p>
            <p className="text-[11px] font-bold text-slate-800">{data.pixHolder}</p>
            <p className="text-sm font-black text-emerald-800 mt-1 break-all">{data.pixKey}</p>
          </section>
        ) : null}

        <section className="mb-3 text-[9px] text-slate-600 space-y-1">
          <p>• Execução conforme horário acordado.</p>
          <p>• Serviço realizado por equipe treinada, com produtos adequados ao tecido.</p>
          <p>• Proposta sujeita à confirmação de pagamento e disponibilidade.</p>
          <p>• Após aceite, será emitido contrato para assinatura digital.</p>
        </section>

        <div className="border-t border-slate-200 pt-3 mt-4 text-[10px] text-slate-500">
          <p>Contato: {data.clientPhone || '—'}</p>
          <p className="mt-2 font-bold text-slate-700">Aguardamos seu retorno!</p>
          <p className="text-primary-900 font-black mt-1">Equipe Estofado Pro</p>
        </div>
      </div>
    );
  }
);

ProposalTemplate.displayName = 'ProposalTemplate';
