import React from 'react';
import { LogoIcon } from './Logo';
import type { AppEvent } from '../context/EventsContext';

export type CommercialSalesReportMeta = {
  commercialName: string;
  periodLabel: string;
  unitLabel: string;
  received: number;
  pending: number;
  salesCount: number;
  comparePct?: number | null;
};

type Props = {
  sales: AppEvent[];
  meta: CommercialSalesReportMeta;
  unitName: (unitId?: string) => string;
};

export const CommercialSalesReportTemplate = React.forwardRef<HTMLDivElement, Props>(
  ({ sales, meta, unitName }, ref) => {
    const generatedAt = new Date().toLocaleString('pt-BR');
    const total = meta.received + meta.pending;

    return (
      <div
        ref={ref}
        className="bg-white text-slate-900"
        style={{ width: 794, padding: 40, fontSize: 11, lineHeight: 1.4 }}
      >
        <div className="flex items-start justify-between border-b-2 border-primary-900 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <LogoIcon className="w-11 h-11" />
            <div>
              <p className="text-sm font-black text-slate-900">Estofado Pro</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Comercial</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-base font-black uppercase text-slate-900">Relatório de vendas</h1>
            <p className="text-xs font-bold text-primary-800 mt-0.5">{meta.commercialName}</p>
            <p className="text-[10px] text-slate-500 mt-1">Gerado em {generatedAt}</p>
          </div>
        </div>

        <p className="text-xs font-bold text-slate-600 mb-4">
          Período: {meta.periodLabel} · {meta.unitLabel}
        </p>

        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
            <p className="text-[9px] font-black text-emerald-800 uppercase">Recebido</p>
            <p className="text-lg font-black text-emerald-900">
              R$ {meta.received.toFixed(2).replace('.', ',')}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-[9px] font-black text-amber-800 uppercase">A receber</p>
            <p className="text-lg font-black text-amber-900">
              R$ {meta.pending.toFixed(2).replace('.', ',')}
            </p>
          </div>
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 text-center">
            <p className="text-[9px] font-black text-primary-800 uppercase">Total</p>
            <p className="text-lg font-black text-primary-900">
              R$ {total.toFixed(2).replace('.', ',')}
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-[9px] font-black text-slate-600 uppercase">Vendas</p>
            <p className="text-lg font-black text-slate-900">{meta.salesCount}</p>
            {meta.comparePct != null && (
              <p className="text-[9px] font-bold text-slate-600 mt-0.5">
                {meta.comparePct >= 0 ? '+' : ''}
                {meta.comparePct.toFixed(0)}% vs período ant.
              </p>
            )}
          </div>
        </div>

        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-primary-900 text-white">
              <th className="text-left p-2 font-black">Cliente</th>
              <th className="text-left p-2 font-black">Data</th>
              <th className="text-left p-2 font-black">Unidade</th>
              <th className="text-center p-2 font-black">Status</th>
              <th className="text-right p-2 font-black">Valor</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((e, i) => (
              <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-200 p-2 font-bold">{e.client}</td>
                <td className="border border-slate-200 p-2 whitespace-nowrap">
                  {new Date(e.date).toLocaleDateString('pt-BR')} {e.time}
                </td>
                <td className="border border-slate-200 p-2">{unitName(e.unitId)}</td>
                <td className="border border-slate-200 p-2 text-center">{e.financialStatus}</td>
                <td className="border border-slate-200 p-2 text-right font-black text-emerald-800">
                  R$ {(e.totalValue || 0).toFixed(2).replace('.', ',')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-[9px] text-slate-400 mt-8 border-t border-slate-200 pt-3">
          Estofado Pro · Relatório confidencial · {sales.length} venda(s)
        </p>
      </div>
    );
  }
);

CommercialSalesReportTemplate.displayName = 'CommercialSalesReportTemplate';
