export type EvaluationQuestion = {
  id: string;
  label: string;
  /** 0–5 estrelas */
  required?: boolean;
};

export const DEFAULT_EVALUATION_QUESTIONS: EvaluationQuestion[] = [
  { id: 'overall', label: 'Satisfação geral com o serviço', required: true },
  { id: 'quality', label: 'Qualidade da limpeza / remoção de sujeira', required: true },
  { id: 'punctuality', label: 'Pontualidade no horário combinado', required: true },
  { id: 'care', label: 'Cuidado com o tecido e com o ambiente', required: false },
  { id: 'recommend', label: 'Indicaria a Estofado Pro a um amigo?', required: true },
];

export type EvaluationAnswer = {
  questionId: string;
  score: number;
};

export type EventEvaluation = {
  id: string;
  eventId: number;
  unitId: string;
  unitName: string;
  clientName: string;
  licenseeName?: string;
  /** Nota do licenciado (atendimento no local) — 1 a 5 */
  licenseeScore?: number;
  /** Nota do comercial da rede — 1 a 5 */
  commercialScore?: number;
  commercialDisplayName?: string;
  answers: EvaluationAnswer[];
  averageScore: number;
  comment?: string;
  submittedAt: string;
};

export function computeEvaluationAverage(ev: Pick<
  EventEvaluation,
  'licenseeScore' | 'commercialScore' | 'answers' | 'averageScore'
>): number {
  const parts: number[] = [];
  if (ev.licenseeScore != null && ev.licenseeScore > 0) parts.push(ev.licenseeScore);
  if (ev.commercialScore != null && ev.commercialScore > 0) parts.push(ev.commercialScore);
  const scored = (ev.answers || []).filter((a) => a.score > 0);
  scored.forEach((a) => parts.push(a.score));
  if (parts.length) {
    return Math.round((parts.reduce((s, n) => s + n, 0) / parts.length) * 10) / 10;
  }
  return ev.averageScore || 0;
}
