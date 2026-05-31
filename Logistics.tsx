/// <reference types="vite/client" />
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MapPin, Calculator, Navigation, Save, AlertTriangle, ExternalLink } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEvents } from '../context/EventsContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { mapsWarningForRole } from '../utils/mapsUi';
import { useLogisticsRoute } from '../hooks/useLogisticsRoute';
import { isSameDay } from 'date-fns';

type LogisticsNavState = {
  eventAddresses?: string[];
  headquarters?: string;
};

export default function Logistics() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state || {}) as LogisticsNavState;
  const { events } = useEvents();
  const { settings } = useSettings();
  const { session } = useAuth();

  const todayAddresses = useMemo(() => {
    return events
      .filter((e) => {
        if (!isSameDay(new Date(e.date), new Date())) return false;
        if (session?.role === 'commercial') return true;
        return (e.unitId || 'sp-centro') === session?.unitId;
      })
      .map((e) => e.address)
      .filter((addr) => addr.trim().length > 0);
  }, [events, session]);

  const [headquarters, setHeadquarters] = useState(
    navState.headquarters || settings.headquarters_address
  );
  const [eventAddresses, setEventAddresses] = useState<string[]>(
    navState.eventAddresses?.length ? navState.eventAddresses : todayAddresses
  );
  const [fuelPrice, setFuelPrice] = useState(settings.current_fuel_price);
  const [kmPerLiter, setKmPerLiter] = useState(settings.vehicle_km_per_liter);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (navState.headquarters) setHeadquarters(navState.headquarters);
    if (navState.eventAddresses?.length) setEventAddresses(navState.eventAddresses);
  }, [navState.headquarters, navState.eventAddresses]);

  const {
    distanceKm: distance,
    cost,
    isCalculating,
    routeError,
    calculate,
    providerLabel,
    approximate,
    warning,
    mapLinks,
    mapsAvailable,
  } = useLogisticsRoute({
    headquarters,
    waypoints: eventAddresses,
    fuelPrice: Number(fuelPrice) || 5.5,
    kmPerLiter: Number(kmPerLiter) || 10,
    enabled: false,
  });

  const saveToFinancials = () => {
    if (distance === null || cost === null) return;
    setSaved(true);
    setTimeout(() => {
      navigate('/financas', {
        state: {
          newExpense: {
            id: Date.now(),
            type: 'expense',
            desc: 'Custo Logístico (Rota)',
            amount: cost,
            date: 'Hoje, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        },
      });
    }, 1500);
  };

  return (
    <div className="p-4 pt-8 max-w-md mx-auto pb-24">
      <header className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="app-btn-icon">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-primary-400 tracking-tight">Logística</h1>
          <p className="page-subtitle text-sm">Cálculo de Rota e Custo</p>
        </div>
      </header>

      <div className="space-y-4">
        <div className="app-panel space-y-4">
          <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            Pontos da Rota
          </h2>

          <div>
            <label className="ui-label block mb-1">
              Sede (Origem/Destino)
            </label>
            <input
              type="text"
              value={headquarters}
              onChange={(e) => setHeadquarters(e.target.value)}
              className="app-input"
            />
          </div>

          {eventAddresses.map((event, index) => (
            <div key={index}>
              <label className="ui-label block mb-1">
                Evento {index + 1}
              </label>
              <input
                type="text"
                value={event}
                onChange={(e) => {
                  const next = [...eventAddresses];
                  next[index] = e.target.value;
                  setEventAddresses(next);
                }}
                className="app-input"
              />
            </div>
          ))}

          {eventAddresses.length === 0 && (
            <p className="text-sm text-slate-500 font-medium">
              Nenhum evento com endereço para hoje. Cadastre contratos ou adicione paradas manualmente.
            </p>
          )}

          <button
            type="button"
            onClick={() => setEventAddresses((prev) => [...prev, ''])}
            className="text-sm font-bold text-primary-700"
          >
            + Adicionar parada
          </button>
        </div>

        <div className="app-panel space-y-4">
          <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            Veículo e Combustível
          </h2>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="ui-label block mb-1">
                Preço Litro (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={fuelPrice}
                onChange={(e) => setFuelPrice(e.target.value)}
                className="app-input font-bold"
              />
            </div>
            <div className="flex-1">
              <label className="ui-label block mb-1">
                Consumo (Km/L)
              </label>
              <input
                type="number"
                step="0.1"
                value={kmPerLiter}
                onChange={(e) => setKmPerLiter(e.target.value)}
                className="app-input font-bold"
              />
            </div>
          </div>
        </div>

        <button
          onClick={calculate}
          disabled={isCalculating || !mapsAvailable || eventAddresses.length === 0}
          className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <Navigation className="w-5 h-5" />
          {isCalculating ? 'Calculando...' : 'Calcular Rota e Custo'}
        </button>

        {(() => {
          const w = mapsWarningForRole(warning, session?.role);
          return w && !routeError ? (
            <div className="tone-warning tone-box text-xs font-bold">{w}</div>
          ) : null;
        })()}

        {routeError && (
          <div className="tone-danger tone-box text-sm font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {routeError}
          </div>
        )}

        {distance !== null && cost !== null && (
          <div className="tone-success tone-box p-5 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="font-black tone-title mb-1 text-lg">Resultado da Rota</h3>
            {providerLabel && (
              <p className="text-[11px] font-bold text-[var(--color-text-muted)] mb-4">
                Fonte: {providerLabel}
                {approximate ? ' · estimativa' : ''}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="app-stat-card !p-3">
                <p className="stat-label">Distância Total</p>
                <p className="stat-value text-xl">{distance.toFixed(1)} km</p>
              </div>
              <div className="app-stat-card !p-3">
                <p className="stat-label">Custo Estimado</p>
                <p className="stat-value text-xl text-accent-coral">R$ {cost.toFixed(2)}</p>
              </div>
            </div>

            <button
              onClick={saveToFinancials}
              disabled={saved}
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saved ? 'Salvo em Finanças!' : 'Lançar como Despesa'}
            </button>
          </div>
        )}

        {mapLinks && distance !== null && (
          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href={mapLinks.google}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center text-sm font-bold py-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] flex items-center justify-center gap-2"
            >
              Abrir no Google Maps
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href={mapLinks.osm}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center text-sm font-bold py-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] flex items-center justify-center gap-2"
            >
              Abrir no mapa gratuito
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
