import { useMemo, useState } from 'react';
import LicenseeDetailModal from '../components/LicenseeDetailModal';
import type { LicenseeProfile } from '../context/LicenseesContext';

import {
  Building2,
  MessageCircle,
  Instagram,
  ExternalLink,
  Trophy,
  Calendar,
  Search,
  Star,
  Download,
} from 'lucide-react';
import {
  loadEvaluations,
  networkEvaluationSummary,
  unitEvaluationSummary,
} from '../services/evaluationStorage';
import StarRating from '../components/StarRating';
import { downloadEvaluationsPdf } from '../utils/evaluationExport';
import { useAuth } from '../context/AuthContext';
import { useViewMode } from '../hooks/useViewMode';
import ViewModeToggle from '../components/ViewModeToggle';
import { APP_VIEW_MODE_KEY, cardsContainer } from '../utils/viewModeLayout';

import { useLicensees } from '../context/LicenseesContext';

import { useEvents } from '../context/EventsContext';

import { getWhatsAppLink } from '../utils/formatters';
import { WHATSAPP_LABELS } from '../utils/whatsappContact';

import { normalizeGoogleBusinessUrl, normalizeInstagramUrl } from '../utils/units';

import { isFuture, startOfDay } from 'date-fns';



type RankSort = 'rating' | 'revenue';

export default function Licensees() {
  const { session } = useAuth();
  const { licensees } = useLicensees();
  const { events } = useEvents();
  const canExport = session?.role === 'admin' || session?.role === 'commercial';

  const [search, setSearch] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [rankSort, setRankSort] = useState<RankSort>('rating');
  const [detailLic, setDetailLic] = useState<
    (LicenseeProfile & { revenue: number; salesCount: number; rating: { count: number; average: number } }) | null
  >(null);
  const { mode: viewMode, setMode: setViewMode } = useViewMode('grid', APP_VIEW_MODE_KEY);

  const evaluations = useMemo(() => loadEvaluations(), [events]);
  const networkRating = useMemo(() => networkEvaluationSummary(evaluations), [evaluations]);

  const networkRevenue = useMemo(
    () =>
      events
        .filter((e) => e.status === 'confirmed' && e.financialStatus === 'Pago')
        .reduce((s, e) => s + (e.totalValue || 0), 0),
    [events]
  );



  const ranked = useMemo(() => {

    return [...licensees]

      .map((lic) => {

        const unitEvents = events.filter(

          (e) => (e.unitId || 'sp-centro') === lic.id && e.status === 'confirmed'

        );

        const revenue = unitEvents.reduce((s, e) => s + (e.totalValue || 0), 0);

        const upcoming = events.filter(

          (e) =>

            (e.unitId || 'sp-centro') === lic.id &&

            e.status === 'confirmed' &&

            (isFuture(startOfDay(new Date(e.date))) ||

              startOfDay(new Date(e.date)).getTime() === startOfDay(new Date()).getTime())

        );

        const rating = unitEvaluationSummary(evaluations, lic.id);
        return { ...lic, revenue, salesCount: unitEvents.length, upcoming, rating };

      })

      .filter(

        (l) =>

          l.name.toLowerCase().includes(search.toLowerCase()) ||

          l.city.toLowerCase().includes(search.toLowerCase())

      )

      .sort((a, b) => {
        if (rankSort === 'rating') {
          const ra = a.rating.count > 0 ? a.rating.average : -1;
          const rb = b.rating.count > 0 ? b.rating.average : -1;
          if (rb !== ra) return rb - ra;
          if (b.rating.count !== a.rating.count) return b.rating.count - a.rating.count;
        }
        return b.revenue - a.revenue;
      });

  }, [licensees, events, search, evaluations, rankSort]);



  return (

    <div className="page-container-wide">

      <header className="mb-4 app-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-black text-[var(--color-text)]">Rede de Licenciados</h1>
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {networkRating.count > 0 ? (
            <div className="flex items-center gap-2">
              <StarRating value={networkRating.average} size="md" showValue count={networkRating.count} />
              <span className="text-xs text-[var(--color-text-muted)]">média da rede (pós-serviço)</span>
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">Ranking por estrelas ativa quando houver avaliações dos clientes.</p>
          )}
          {canExport && (
            <button
              type="button"
              disabled={pdfLoading || networkRating.count === 0}
              onClick={async () => {
                setPdfLoading(true);
                try {
                  await downloadEvaluationsPdf(evaluations, {
                    title: 'Avaliações da rede',
                    subtitle: 'Todas as unidades',
                  });
                } catch {
                  alert('Não foi possível gerar o PDF. Tente de novo.');
                } finally {
                  setPdfLoading(false);
                }
              }}
              className="ml-auto text-xs font-bold text-primary-800 bg-primary-50 px-3 py-2 rounded-lg flex items-center gap-1 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {pdfLoading ? 'Gerando PDF…' : 'Baixar PDF das avaliações'}
            </button>
          )}
        </div>
      </header>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-4">
        <button
          type="button"
          onClick={() => setRankSort('rating')}
          className={`flex-1 py-2 rounded-lg text-xs font-black ${
            rankSort === 'rating' ? 'bg-white text-primary-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Ranking por avaliação
        </button>
        <button
          type="button"
          onClick={() => setRankSort('revenue')}
          className={`flex-1 py-2 rounded-lg text-xs font-black ${
            rankSort === 'revenue' ? 'bg-white text-primary-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Por faturamento
        </button>
      </div>



      <div className="relative mb-4">

        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

        <input

          value={search}

          onChange={(e) => setSearch(e.target.value)}

          placeholder="Buscar unidade ou cidade..."

          className="w-full pl-10 pr-4 py-3.5 rounded-2xl border-2 border-slate-100 font-medium min-h-[48px]"

        />

      </div>



      <div className={cardsContainer(viewMode, 'grid gap-3 sm:grid-cols-2')}>
        {ranked.map((lic, index) => (
          <div
            key={lic.id}
            role="button"
            tabIndex={0}
            onClick={() => setDetailLic(lic)}
            onKeyDown={(e) => e.key === 'Enter' && setDetailLic(lic)}
            className={`w-full text-left app-panel hover:border-[var(--color-border-strong)] hover:shadow-md transition-all cursor-pointer ${
              viewMode === 'list' ? 'p-3 flex flex-wrap items-center gap-3' : 'p-4'
            }`}
          >

            <div className="flex gap-3 items-start mb-3">

              <div

                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${

                  index === 0

                    ? 'bg-amber-100 text-amber-800'

                    : index === 1

                      ? 'bg-slate-200 text-slate-700'

                      : 'bg-slate-100 text-slate-600'

                }`}

              >

                {index + 1}

              </div>

              <div className="flex-1 min-w-0">

                <p className="font-black text-[var(--color-text)]">{lic.name}</p>

                <p className="text-xs text-[var(--color-text-muted)]">

                  {lic.city} · {lic.state}

                </p>

                <div className="mt-1.5">
                  {lic.rating.count > 0 ? (
                    <StarRating value={lic.rating.average} size="sm" showValue count={lic.rating.count} />
                  ) : (
                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Sem avaliações ainda
                    </p>
                  )}
                </div>
                <p className="text-[10px] font-bold text-emerald-700 mt-1 flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  R$ {lic.revenue.toFixed(0)} · {lic.salesCount} vendas
                </p>

              </div>

            </div>



            {viewMode === 'grid' && (
            <div className="flex flex-wrap gap-2 mb-3 w-full">
              {lic.whatsapp ? (

                <a

                  href={getWhatsAppLink(lic.whatsapp, `Olá ${lic.name}, equipe comercial Estofado Pro.`)}

                  target="_blank"

                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}

                  className="flex-1 min-w-[120px] bg-[#25D366] text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-1 min-h-[44px]"

                >

                  <MessageCircle className="w-4 h-4" />
                  {WHATSAPP_LABELS.licensee}

                </a>

              ) : (

                <span className="text-xs text-slate-400 flex-1 py-3">WhatsApp não cadastrado</span>

              )}

              {lic.instagram ? (

                <a

                  href={normalizeInstagramUrl(lic.instagram)}

                  target="_blank"

                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}

                  className="p-3 border border-slate-200 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"

                  title="Instagram"

                >

                  <Instagram className="w-5 h-5" />

                </a>

              ) : null}

              {lic.googleBusinessUrl ? (

                <a

                  href={normalizeGoogleBusinessUrl(lic.googleBusinessUrl)}

                  target="_blank"

                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}

                  className="p-3 border border-slate-200 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"

                  title="Google Business"

                >

                  <ExternalLink className="w-5 h-5" />

                </a>

              ) : null}

            </div>
            )}

            {viewMode === 'grid' && (
            <div className="bg-slate-50 rounded-xl p-3 w-full">

              <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-2">

                <Calendar className="w-3 h-3" />

                Próximos serviços ({lic.upcoming.length})

              </p>

              {lic.upcoming.length === 0 ? (

                <p className="text-xs text-slate-400">Nenhum evento confirmado próximo.</p>

              ) : (

                <ul className="space-y-1">

                  {lic.upcoming.slice(0, 3).map((ev) => (

                    <li key={ev.id} className="text-xs text-[var(--color-text)] font-medium">

                      {new Date(ev.date).toLocaleDateString('pt-BR')} — {ev.client}

                    </li>

                  ))}

                </ul>

              )}

            </div>
            )}
            {viewMode === 'list' && (
              <p className="text-[10px] font-bold text-primary-700 shrink-0">Detalhes →</p>
            )}
            {viewMode === 'grid' && (
              <p className="text-[10px] font-bold text-primary-700 mt-2 w-full">Toque para ver detalhes e comparativos →</p>
            )}
          </div>

        ))}

      </div>



      {detailLic && (
        <LicenseeDetailModal
          licensee={detailLic}
          events={events}
          networkRevenue={networkRevenue}
          rating={detailLic.rating}
          evaluations={evaluations.filter((e) => e.unitId === detailLic.id)}
          canExportEvaluations={canExport}
          onClose={() => setDetailLic(null)}
        />
      )}

    </div>

  );

}

