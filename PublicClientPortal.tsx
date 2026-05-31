import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { History, MapPin, Phone, Loader2 } from 'lucide-react';
import { publicTrackingUrl } from '../utils/workOrder';
import { getUnitById } from '../utils/units';
import { apiUrl } from '../utils/apiBase';
import { checkApiHealth } from '../services/apiHealth';
import PublicApiOfflineMessage from '../components/PublicApiOfflineMessage';

type PortalEvent = {
  client?: string;
  address?: string;
  phone?: string;
  workOrderNumber?: string;
  publicTrackingToken?: string;
  unitId?: string;
  serviceReport?: {
    photoBeforeUrl?: string;
    photoAfterUrl?: string;
    itemPhotos?: {
      itemName: string;
      beforeUrls: string[];
      afterUrls: string[];
      beforeVideoUrls?: string[];
      afterVideoUrls?: string[];
    }[];
  };
};

export default function PublicClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<PortalEvent | null>(null);
  const [apiDown, setApiDown] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    checkApiHealth().then((h) => {
      if (!cancelled && !h.ok) setApiDown(true);
    });
    fetch(apiUrl(`/api/field/public/event/${encodeURIComponent(token)}`))
      .then((res) => (res.ok ? res.json() : null))
      .then((row) => {
        if (!cancelled) {
          setEvent(row);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const unit = event ? getUnitById(event.unitId || 'sp-centro') : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!event) {
    if (apiDown) return <PublicApiOfflineMessage title="Portal do cliente indisponível" />;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <p className="text-slate-600 font-bold text-center max-w-sm">
          Link expirado ou negócio ainda não sincronizado no servidor. Peça um novo link ao comercial.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-md mx-auto space-y-5">
        <div className="text-center">
          <p className="text-sm text-slate-500">{unit?.name}</p>
          <h1 className="text-xl font-black text-slate-900">Portal do cliente</h1>
          <p className="text-xs text-slate-500 mt-1">Olá, {event.client}</p>
        </div>

        <div className="app-panel space-y-2 text-sm">
          <p className="font-mono text-primary-700">{event.workOrderNumber}</p>
          <p className="flex items-start gap-2">
            <MapPin className="w-4 h-4 shrink-0" /> {event.address}
          </p>
          {event.publicTrackingToken && (
            <a
              href={publicTrackingUrl(event.publicTrackingToken)}
              className="text-sky-700 font-bold text-xs underline"
            >
              Acompanhar serviço em tempo real
            </a>
          )}
        </div>

        {(event.serviceReport?.itemPhotos?.length ||
          event.serviceReport?.photoBeforeUrl ||
          event.serviceReport?.photoAfterUrl) && (
          <div className="app-panel space-y-2">
            <p className="text-xs font-black uppercase text-slate-500">Registro do serviço</p>
            {event.serviceReport.itemPhotos?.length ? (
              event.serviceReport.itemPhotos.map((row, i) => (
                <div key={i} className="space-y-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0">
                  <p className="text-[10px] font-bold text-slate-700">{row.itemName}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {row.beforeUrls.filter(Boolean).map((url, j) => (
                      <div key={`b-${j}`}>
                        <p className="text-[10px] font-bold mb-1">Antes {j + 1}</p>
                        <img src={url} alt="Antes" className="rounded-lg w-full h-20 object-cover" />
                      </div>
                    ))}
                    {(row.beforeVideoUrls || []).filter(Boolean).map((url, j) => (
                      <div key={`vb-${j}`}>
                        <p className="text-[10px] font-bold mb-1">Vídeo antes {j + 1}</p>
                        <video src={url} controls playsInline className="rounded-lg w-full h-20 object-cover" />
                      </div>
                    ))}
                    {row.afterUrls.filter(Boolean).map((url, j) => (
                      <div key={`a-${j}`}>
                        <p className="text-[10px] font-bold mb-1">Depois {j + 1}</p>
                        <img src={url} alt="Depois" className="rounded-lg w-full h-20 object-cover" />
                      </div>
                    ))}
                    {(row.afterVideoUrls || []).filter(Boolean).map((url, j) => (
                      <div key={`va-${j}`}>
                        <p className="text-[10px] font-bold mb-1">Vídeo depois {j + 1}</p>
                        <video src={url} controls playsInline className="rounded-lg w-full h-20 object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {event.serviceReport.photoBeforeUrl && (
                  <div>
                    <p className="text-[10px] font-bold mb-1">Antes</p>
                    <img
                      src={event.serviceReport.photoBeforeUrl}
                      alt="Antes"
                      className="rounded-lg w-full h-24 object-cover"
                    />
                  </div>
                )}
                {event.serviceReport.photoAfterUrl && (
                  <div>
                    <p className="text-[10px] font-bold mb-1">Depois</p>
                    <img
                      src={event.serviceReport.photoAfterUrl}
                      alt="Depois"
                      className="rounded-lg w-full h-24 object-cover"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="app-panel">
          <p className="text-xs font-black uppercase text-slate-500 mb-2 flex items-center gap-1">
            <History className="w-4 h-4" /> Seu atendimento
          </p>
          <p className="text-sm text-slate-600">
            O histórico completo fica disponível na unidade após cada visita concluída.
          </p>
        </div>

        <a
          href={`https://wa.me/55${(event.phone || '').replace(/\D/g, '')}`}
          className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-3 rounded-xl"
        >
          <Phone className="w-5 h-5" /> Falar com a unidade
        </a>
      </div>
    </div>
  );
}
