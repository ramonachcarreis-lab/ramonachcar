import { useEffect, useMemo, useState } from 'react';
import { Search, Clock, Radio } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEvents, type AppEvent } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { useCommercialProfile } from '../context/CommercialProfileContext';
import ServiceTrackCard from '../components/ServiceTrackCard';
import EventOperationsSheet from '../components/EventOperationsSheet';
import { listCommercialTempoLive } from '../utils/commercialTempo';
import { listNetworkTempoLive, getEventSellerLabel, getEventExecutorLabel } from '../utils/networkMacro';
import { useNowTick } from '../hooks/useNowTick';
import { useViewMode } from '../hooks/useViewMode';
import ViewModeToggle from '../components/ViewModeToggle';
import { APP_VIEW_MODE_KEY, cardsContainer } from '../utils/viewModeLayout';

export default function TempoComercial() {
  const { events } = useEvents();
  const { session } = useAuth();
  const { profile: commercialProfile } = useCommercialProfile();
  const isAdmin = session?.role === 'admin';
  const commercialName = session?.name || commercialProfile.name;
  const navigate = useNavigate();
  const location = useLocation();
  const highlightId = (location.state as { openDealId?: number } | null)?.openDealId;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const { mode: viewMode, setMode: setViewMode } = useViewMode('grid', APP_VIEW_MODE_KEY);
  const now = useNowTick(1000);

  const liveEvents = useMemo(() => {
    if (isAdmin) return listNetworkTempoLive(events, now, searchTerm);
    return listCommercialTempoLive(events, now, searchTerm, commercialName);
  }, [events, searchTerm, now, isAdmin, commercialName]);

  useEffect(() => {
    if (!highlightId) return;
    const ev = liveEvents.find((e) => e.id === highlightId) ?? events.find((e) => e.id === highlightId);
    if (ev) setSelectedEvent(ev);
  }, [highlightId, liveEvents, events]);

  const renderEvent = (event: AppEvent) => (
    <div
      key={event.id}
      className={highlightId === event.id ? 'ring-2 ring-primary-400 rounded-2xl' : ''}
    >
      <ServiceTrackCard
        event={event}
        role="commercial"
        macro={isAdmin}
        sellerLabel={isAdmin ? getEventSellerLabel(event) : undefined}
        executorLabel={isAdmin ? getEventExecutorLabel(event) : undefined}
        onSelect={() => setSelectedEvent(event)}
      />
    </div>
  );

  return (
    <div className="page-container-wide">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--color-text)]">
            {isAdmin ? 'Tempo da Rede' : 'Tempo'}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            {isAdmin
              ? 'Serviços ao vivo hoje em todas as unidades'
              : 'Serviços em execução agora — toque no card para detalhes'}
          </p>
        </div>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </header>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] w-5 h-5" />
        <input
          type="text"
          placeholder={
            isAdmin
              ? 'Buscar cliente, unidade, comercial ou endereço...'
              : 'Buscar venda, telefone ou endereço...'
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border-2 rounded-2xl py-3.5 pl-12 pr-4 font-medium min-h-[48px]"
        />
      </div>

      {liveEvents.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)]">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-40 text-[var(--color-text-muted)]" />
          <p className="font-bold text-[var(--color-text)]">
            {isAdmin ? 'Nenhum serviço ao vivo na rede.' : 'Nenhum serviço ao vivo hoje.'}
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
            Negociações, pagamentos e montagem pendentes estão na Agenda. Aqui aparecem só
            visitas confirmadas ou serviços em andamento.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <button
              type="button"
              onClick={() => navigate('/agenda-comercial')}
              className="text-sm font-bold text-[var(--color-primary-400)] hover:underline"
            >
              Ir à Agenda
            </button>
            {!isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/crm')}
                className="text-sm font-bold text-[var(--color-text-muted)] hover:underline"
              >
                Ir ao Controle Comercial
              </button>
            )}
          </div>
        </div>
      ) : (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-5 h-5 text-emerald-500" aria-hidden />
            <h2 className="text-lg font-bold text-[var(--color-text)]">
              Ao vivo hoje
              <span className="text-xs font-bold text-[var(--color-text-muted)] bg-[var(--color-surface-muted)] px-2 py-0.5 rounded-full ml-2">
                {liveEvents.length}
              </span>
            </h2>
          </div>
          <div className={cardsContainer(viewMode, 'grid gap-3 sm:grid-cols-2')}>
            {liveEvents.map(renderEvent)}
          </div>
        </section>
      )}

      {selectedEvent && (
        <EventOperationsSheet
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          showRentalTimer
          sellerLabel={isAdmin ? getEventSellerLabel(selectedEvent) : undefined}
          executorLabel={isAdmin ? getEventExecutorLabel(selectedEvent) : undefined}
          onOpenCrm={() => {
            setSelectedEvent(null);
            navigate('/crm', { state: { openDealId: selectedEvent.id } });
          }}
        />
      )}
    </div>
  );
}
