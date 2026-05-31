import React from 'react';
import { LogoIcon } from './Logo';
import type { EventEvaluation } from '../types/evaluation';
import { DEFAULT_EVALUATION_QUESTIONS } from '../types/evaluation';

export type EvaluationsReportMeta = {
  title: string;
  subtitle?: string;
  average: number;
  count: number;
};

type Props = {
  evaluations: EventEvaluation[];
  meta: EvaluationsReportMeta;
};

function stars(score: number) {
  const full = Math.round(score);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

export const EvaluationsReportTemplate = React.forwardRef<HTMLDivElement, Props>(
  ({ evaluations, meta }, ref) => {
    const generatedAt = new Date().toLocaleString('pt-BR');

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
              <p className="text-[10px] font-bold text-slate-500 uppercase">Pós-serviço</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-base font-black uppercase text-slate-900">{meta.title}</h1>
            {meta.subtitle && (
              <p className="text-xs font-bold text-primary-800 mt-0.5">{meta.subtitle}</p>
            )}
            <p className="text-[10px] text-slate-500 mt-1">Gerado em {generatedAt}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-[9px] font-black text-amber-800 uppercase">Nota média</p>
            <p className="text-2xl font-black text-amber-900 mt-1">
              {meta.average.toFixed(1).replace('.', ',')}
            </p>
            <p className="text-[10px] text-amber-700">{stars(meta.average)}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-[9px] font-black text-slate-500 uppercase">Avaliações</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{meta.count}</p>
          </div>
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 text-center">
            <p className="text-[9px] font-black text-primary-700 uppercase">Escala</p>
            <p className="text-sm font-black text-primary-900 mt-2">0 a 5 estrelas</p>
          </div>
        </div>

        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-primary-900 text-white">
              <th className="text-left p-2 font-black">Data</th>
              <th className="text-left p-2 font-black">Unidade</th>
              <th className="text-left p-2 font-black">Cliente</th>
              <th className="text-center p-2 font-black">Nota</th>
              <th className="text-left p-2 font-black">Comentário</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((ev, i) => (
              <tr
                key={ev.id}
                className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                style={{ verticalAlign: 'top' }}
              >
                <td className="border border-slate-200 p-2 whitespace-nowrap">
                  {new Date(ev.submittedAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="border border-slate-200 p-2 font-bold">{ev.unitName}</td>
                <td className="border border-slate-200 p-2">{ev.clientName}</td>
                <td className="border border-slate-200 p-2 text-center font-black text-amber-800">
                  {ev.averageScore.toFixed(1)}
                </td>
                <td className="border border-slate-200 p-2 max-w-[200px]">
                  {ev.comment || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {evaluations.length > 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-[10px] font-black uppercase text-slate-500">Detalhamento por pergunta</p>
            {evaluations.slice(0, 12).map((ev) => (
              <div key={`d-${ev.id}`} className="border border-slate-200 rounded-lg p-3">
                <p className="font-black text-slate-800 text-xs mb-1">
                  {ev.clientName} · {ev.unitName} · {ev.averageScore.toFixed(1)} ★
                </p>
                {(ev.licenseeScore != null || ev.commercialScore != null) && (
                  <p className="text-[9px] text-indigo-800 font-bold mb-1">
                    Licenciado: {ev.licenseeScore != null ? `${ev.licenseeScore}/5` : '—'}
                    {ev.commercialScore != null
                      ? ` · Comercial (${ev.commercialDisplayName || 'rede'}): ${ev.commercialScore}/5`
                      : ''}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-1">
                  {DEFAULT_EVALUATION_QUESTIONS.map((q) => {
                    const a = ev.answers.find((x) => x.questionId === q.id);
                    return (
                      <p key={q.id} className="text-[9px] text-slate-600">
                        <span className="font-bold">{q.label}:</span>{' '}
                        {a != null ? `${a.score}/5` : '—'}
                      </p>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[9px] text-slate-400 mt-8 border-t border-slate-200 pt-3">
          Estofado Pro · Relatório confidencial · {evaluations.length} registro(s)
        </p>
      </div>
    );
  }
);

EvaluationsReportTemplate.displayName = 'EvaluationsReportTemplate';
