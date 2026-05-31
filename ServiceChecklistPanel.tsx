import { CheckCircle2, Circle, Lock } from 'lucide-react';
import type { AppEvent } from '../context/EventsContext';
import {
  normalizeChecklist,
  toggleChecklistItem,
  checklistValidation,
  type ChecklistItemId,
} from '../utils/serviceChecklist';
import { AUTO_CHECKLIST_IDS } from '../utils/serviceReport';

type Props = {
  event: AppEvent;
  canEdit: boolean;
  onUpdate: (checklist: AppEvent['serviceChecklist']) => void;
};

export default function ServiceChecklistPanel({ event, canEdit, onUpdate }: Props) {
  const state = normalizeChecklist(event.serviceChecklist);
  const validation = checklistValidation(state);

  const toggle = (id: ChecklistItemId) => {
    if (!canEdit || AUTO_CHECKLIST_IDS.has(id)) return;
    const item = state.items.find((i) => i.id === id);
    onUpdate(toggleChecklistItem(state, id, !item?.done));
  };

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex justify-between items-center gap-2">
        <p className="text-xs font-black text-slate-800 uppercase">Checklist do serviço</p>
        {validation.ok ? (
          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> OK
          </span>
        ) : (
          <span className="text-[10px] font-bold text-amber-700">
            {validation.missing.length} pendência(s)
          </span>
        )}
      </div>
      <p className="text-[10px] text-slate-500">
        Fotos e assinatura marcam automaticamente ao registrar no bloco acima.
      </p>
      <ul className="space-y-1.5">
        {state.items.map((item) => {
          const auto = AUTO_CHECKLIST_IDS.has(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={!canEdit || auto}
                onClick={() => toggle(item.id)}
                className="w-full flex items-start gap-2 text-left text-xs py-1 disabled:opacity-60"
                title={auto ? 'Preenchido automaticamente pelo registro do serviço' : undefined}
              >
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                )}
                <span className={item.done ? 'text-slate-600 line-through' : 'text-slate-800'}>
                  {item.label}
                  {item.required && <span className="text-red-500"> *</span>}
                  {auto && (
                    <Lock className="inline w-3 h-3 ml-1 text-slate-400" aria-hidden />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
