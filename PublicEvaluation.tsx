import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, CheckCircle2 } from 'lucide-react';
import { DEFAULT_EVALUATION_QUESTIONS, computeEvaluationAverage } from '../types/evaluation';
import { parseEvaluationToken } from '../services/evaluationStorage';
import { useEvents } from '../context/EventsContext';
import { useEvaluations } from '../context/EvaluationsContext';
import { getUnitById } from '../utils/units';
import { commercialDisplayName, unitDisplayName } from '../utils/displayLabels';
import { isAnyCommercialDeal } from '../utils/crmAccess';
import PublicPostSaleSection from '../components/PublicPostSaleSection';
import { getUnitSocialLinks } from '../utils/unitSocialLinks';

function StarRow({
  label,
  sub,
  value,
  onChange,
  required,
}: {
  label: string;
  sub?: string;
  value: number;
  onChange: (n: number) => void;
  required?: boolean;
}) {
  return (
    <div className="border border-[var(--color-border)] rounded-xl p-3 bg-[var(--color-surface-muted)]">
      <p className="text-sm font-bold text-[var(--color-text)] mb-0.5">
        {label}
        {required ? ' *' : ''}
      </p>
      {sub && <p className="text-[10px] text-[var(--color-text-muted)] mb-2">{sub}</p>}
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="p-2 rounded-lg hover:bg-[var(--color-surface-elevated)] transition-colors"
            aria-label={`${n} estrelas`}
          >
            <Star
              className={`w-7 h-7 ${
                value >= n ? 'fill-amber-400 text-amber-400' : 'text-[var(--color-border-strong)]'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PublicEvaluation() {
  const { token } = useParams<{ token: string }>();
  const { events } = useEvents();
  const { getForEvent, submitEvaluation } = useEvaluations();
  const parsed = token ? parseEvaluationToken(token) : null;
  const event = parsed ? events.find((e) => e.id === parsed.eventId) : null;
  const unit = parsed ? getUnitById(parsed.unitId) : null;

  const [licenseeScore, setLicenseeScore] = useState(0);
  const [commercialScore, setCommercialScore] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState('');

  const showCommercial = event
    ? isAnyCommercialDeal(event) || Boolean(event.managedByCommercial?.trim())
    : false;
  const commercialName = event ? commercialDisplayName(event) || 'Comercial da rede' : '';
  const unitName = event ? unitDisplayName(event.unitId) : unit?.name || '';
  const social = getUnitSocialLinks(parsed?.unitId || event?.unitId || 'sp-centro');

  const existingEval = useMemo(() => {
    if (!parsed) return undefined;
    return getForEvent(parsed.eventId);
  }, [parsed, getForEvent, submitted]);

  if (!parsed || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg-app)]">
        <p className="text-[var(--color-text-muted)] font-bold">Link de avaliação inválido ou expirado.</p>
      </div>
    );
  }

  if (existingEval || submitted) {
    const score = existingEval?.averageScore;
    return (
      <div className="min-h-screen bg-[var(--color-bg-app)] p-4 pb-10">
        <div className="max-w-md mx-auto space-y-5">
          <div className="app-panel w-full text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-[var(--status-success)] mx-auto" />
            <p className="text-xl font-black text-[var(--text-primary)]">Obrigado!</p>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Sua avaliação foi registrada com sucesso.
            </p>
            {score != null && score > 0 && (
              <p className="text-sm font-bold text-[var(--accent-primary)]">
                Nota média: {score.toFixed(1)} / 5
              </p>
            )}
            <p className="text-xs text-[var(--text-secondary)]">
              A unidade e a rede verão o resultado no histórico do cliente.
            </p>
          </div>
          <PublicPostSaleSection social={social} showClubeReferral />
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    setSaveError('');
    if (licenseeScore < 1) {
      setSaveError('Avalie o licenciado (atendimento no local) de 1 a 5 estrelas.');
      return;
    }
    if (showCommercial && commercialScore < 1) {
      setSaveError('Avalie o comercial (venda e agendamento) de 1 a 5 estrelas.');
      return;
    }

    const answers = DEFAULT_EVALUATION_QUESTIONS.map((q) => ({
      questionId: q.id,
      score: scores[q.id] ?? 0,
    }));
    const required = DEFAULT_EVALUATION_QUESTIONS.filter((q) => q.required);
    if (required.some((q) => (scores[q.id] ?? 0) < 1)) {
      setSaveError('Responda também as perguntas sobre o serviço (estrelas obrigatórias).');
      return;
    }

    const entry = {
      id: `ev_${Date.now()}`,
      eventId: event.id,
      unitId: parsed.unitId,
      unitName: unit?.name || parsed.unitId,
      clientName: event.client,
      licenseeName: unitName,
      licenseeScore,
      commercialScore: showCommercial ? commercialScore : undefined,
      commercialDisplayName: showCommercial ? commercialName : undefined,
      answers,
      averageScore: 0,
      comment: comment.trim() || undefined,
      submittedAt: new Date().toISOString(),
    };
    entry.averageScore = computeEvaluationAverage(entry);

    const result = submitEvaluation(entry);
    if (!result.ok) {
      if (result.reason === 'already_exists') {
        setSubmitted(true);
        return;
      }
      setSaveError(
        result.reason === 'storage_failed'
          ? 'Não foi possível salvar. Libere espaço no navegador ou saia do modo anônimo e tente de novo.'
          : 'Não foi possível registrar. Tente novamente.'
      );
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-app)] p-4 flex justify-center">
      <div className="app-panel w-full max-w-md space-y-4">
        <div className="text-center">
          <p className="text-xs font-bold text-primary-400 uppercase tracking-wider">Estofado Pro</p>
          <h1 className="text-xl font-black text-[var(--color-text)] mt-1">Avalie o atendimento</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {event.client} · {unit?.name}
          </p>
        </div>

        <StarRow
          label="Licenciado"
          sub={`Atendimento no local · ${unitName}`}
          value={licenseeScore}
          onChange={setLicenseeScore}
          required
        />

        {showCommercial && (
          <StarRow
            label="Comercial"
            sub={`Venda e agendamento · ${commercialName}`}
            value={commercialScore}
            onChange={setCommercialScore}
            required
          />
        )}

        <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)] tracking-wide">
          Sobre o serviço
        </p>

        {DEFAULT_EVALUATION_QUESTIONS.map((q) => (
          <StarRow
            key={q.id}
            label={q.label}
            value={scores[q.id] || 0}
            onChange={(n) => setScores((s) => ({ ...s, [q.id]: n }))}
            required={q.required}
          />
        ))}

        <textarea
          placeholder="Comentário opcional"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] rounded-xl p-3 text-sm min-h-[80px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)]"
        />

        {saveError && (
          <p className="text-xs font-bold text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-3 py-2">
            {saveError}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          className="btn-primary w-full py-3.5 text-sm min-h-[48px]"
        >
          Enviar avaliação
        </button>

        <p className="text-[10px] text-center text-[var(--text-secondary)] leading-relaxed pt-2">
          Depois de enviar, siga no Instagram e avalie no Google — links abaixo na próxima tela.
        </p>
      </div>
    </div>
  );
}
