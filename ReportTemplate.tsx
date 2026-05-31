import React from 'react';
import { LogoIcon } from './Logo';
import { LABEL_SERVICE_COUNT, LABEL_TOP_ITEMS, LABEL_ITEM_COLUMN, LABEL_SERVICE_QTY } from '../config/brand';

export type ReportTemplateData = {
  month: string;
  year: string;
  totalRentals: number;
  totalIncome: number;
  totalPending: number;
  totalCancelled: number;
  topEquipments: { name: string; count: number }[];
  recentEvents: { date: string; client: string; value: number; status: string }[];
};

export const ReportTemplate = React.forwardRef<HTMLDivElement, { data: ReportTemplateData }>(
  ({ data }, ref) => {
    const generatedAt = new Date().toLocaleDateString('pt-BR');

    return (
      <div
        ref={ref}
        className="bg-white text-slate-900"
        style={{
          width: 794, // ~A4 at 96dpi
          minHeight: 1123,
          padding: 48,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-5 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center">
              <LogoIcon className="w-12 h-12" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Estofado Pro</p>
              <p className="text-xs font-semibold text-slate-400">Relatório Gerencial</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
              Relatório de Desempenho
            </h1>
            <p className="text-sm font-bold text-primary-900 mt-1">
              {data.month} {data.year}
            </p>
            <p className="text-xs font-semibold text-slate-400 mt-1">Gerado em {generatedAt}</p>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <section className="mb-8">
          <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 mb-4">
            Resumo do Mês
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{LABEL_SERVICE_COUNT}</p>
              <p className="text-xl font-black text-slate-900 mt-1">{data.totalRentals}</p>
            </div>
            <div className="border border-slate-200 rounded-xl p-4 bg-emerald-50">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Receita (Paga)</p>
              <p className="text-xl font-black text-emerald-700 mt-1">
                R$ {data.totalIncome.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="border border-slate-200 rounded-xl p-4 bg-orange-50">
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">A Receber</p>
              <p className="text-xl font-black text-orange-700 mt-1">
                R$ {data.totalPending.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="border border-slate-200 rounded-xl p-4 bg-red-50">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Cancelamentos</p>
              <p className="text-xl font-black text-red-700 mt-1">{data.totalCancelled}</p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 mb-4">
            {LABEL_TOP_ITEMS}
          </h2>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">{LABEL_ITEM_COLUMN}</th>
                  <th className="px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">{LABEL_SERVICE_QTY}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.topEquipments.map((eq, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-slate-900">{eq.name}</td>
                    <td className="px-4 py-3 font-bold text-slate-700 text-right">{eq.count}</td>
                  </tr>
                ))}
                {data.topEquipments.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-slate-400 font-medium">
                      Nenhum dado disponível.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Últimos Eventos */}
        <section>
          <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 mb-4">
            Eventos do Mês
          </h2>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentEvents.map((ev, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-slate-900">{ev.date}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{ev.client}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ev.status === 'Pago' ? 'bg-emerald-50 text-emerald-700' :
                        ev.status === 'Pendente' ? 'bg-orange-50 text-orange-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {ev.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 text-right">
                      R$ {ev.value.toFixed(2).replace('.', ',')}
                    </td>
                  </tr>
                ))}
                {data.recentEvents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400 font-medium">
                      Nenhum evento registrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200 text-center">
          <p className="text-xs font-bold text-slate-400">Estofado Pro — Gestão de limpeza e impermeabilização</p>
        </div>
      </div>
    );
  }
);

ReportTemplate.displayName = 'ReportTemplate';
