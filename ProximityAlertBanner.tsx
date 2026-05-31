import { MapPin, MessageCircle, Navigation } from 'lucide-react';
import type { AppEvent } from '../context/EventsContext';
import { PROXIMITY_ALERT_KM } from '../config/proximity';
import { buildProximityWhatsAppMessage } from '../utils/proximityAlert';
import { openWhatsApp } from '../utils/openWhatsApp';
import { copyToClipboard } from '../utils/copyToClipboard';
import { buildEvaluationUrl } from '../utils/evaluationLink';
import type { ProximityAlertCandidate } from '../utils/proximityAlert';

type Props = {
  alerts: ProximityAlertCandidate[];
  onSent: (eventId: number, distanceKm: number) => void;
};

function AlertRow({
  event,
  distanceKm,
  onSent,
}: {
  event: AppEvent;
  distanceKm: number;
  onSent: (eventId: number, distanceKm: number) => void;
}) {
  const send = () => {
    const msg = buildProximityWhatsAppMessage(event, distanceKm);
    const result = openWhatsApp(event.phone, msg);
    if (!result.ok) {
      const evalUrl = buildEvaluationUrl(event.id, event.unitId || 'sp-centro');
      copyToClipboard(evalUrl);
      window.alert(
        `${result.error || 'Não foi possível abrir o WhatsApp.'}\n\nLink de avaliação copiado.`
      );
      return;
    }
    onSent(event.id, distanceKm);
  };

  return (
    <div className="rounded-xl border border-amber-300/60 bg-white/90 p-3 space-y-2">
      <p className="text-sm font-black text-amber-950">{event.client}</p>
      <p className="text-xs text-amber-900 flex items-center gap-1">
        <Navigation className="w-3.5 h-3.5 shrink-0" />
        A {distanceKm < 1 ? 'menos de 1' : distanceKm.toFixed(1)} km · dentro de {PROXIMITY_ALERT_KM} km
      </p>
      <p className="text-[10px] text-amber-800 line-clamp-2">{event.address}</p>
      <button
        type="button"
        onClick={send}
        className="w-full bg-[#25D366] hover:bg-[#1fb855] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-xs min-h-[44px]"
      >
        <MessageCircle className="w-4 h-4" />
        Enviar aviso + avaliação (licenciado e comercial)
      </button>
    </div>
  );
}

export default function ProximityAlertBanner({ alerts, onSent }: Props) {
  if (!alerts.length) return null;

  return (
    <div className="mb-4 rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 p-4 space-y-3 shadow-sm">
      <div className="flex items-start gap-2">
        <MapPin className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-black uppercase text-amber-900 tracking-wide">
            Cliente a menos de {PROXIMITY_ALERT_KM} km
          </p>
          <p className="text-[10px] text-amber-800 mt-0.5">
            Envie o WhatsApp com link de rastreio e avaliação do licenciado e do comercial. O alerta
            só dispara uma vez por deslocamento.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {alerts.map(({ event, distanceKm }) => (
          <AlertRow key={event.id} event={event} distanceKm={distanceKm} onSent={onSent} />
        ))}
      </div>
    </div>
  );
}
