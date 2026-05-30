import { CITY_COORDINATES } from '../../src/utils/geocodes';
import { estimateDrivingKm, haversineKm, ROAD_FACTOR } from './haversine';
import {
  googleAutocomplete,
  googleDirectionsRoute,
  googleGeocode,
  isGoogleConfigured,
} from './providers/googleServer';
import { nominatimGeocode, nominatimSearch } from './providers/nominatim';
import { osrmTripRoute } from './providers/osrm';
import type {
  AddressSuggestion,
  GeocodeResult,
  MapsProviderId,
  MapsStatus,
  RouteResult,
  LatLng,
} from './types';

function providerPriority(): MapsProviderId[] {
  const raw = process.env.MAPS_PROVIDER_PRIORITY || 'google,osm,estimate';
  const list = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is MapsProviderId => ['google', 'osm', 'estimate'].includes(s as MapsProviderId));
  return list.length ? list : ['google', 'osm', 'estimate'];
}

export function getMapsStatus(): MapsStatus {
  const priority = providerPriority();
  const googleConfigured = isGoogleConfigured();
  return {
    googleConfigured,
    osmAvailable: true,
    priority,
    hint: googleConfigured
      ? 'Google ativo com fallback OpenStreetMap se a cota falhar.'
      : 'Sem chave Google: rotas e endereços usam OpenStreetMap (grátis).',
  };
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const q = address.trim();
  if (!q) return null;

  const order = providerPriority().filter((p) => p !== 'estimate');

  for (const p of order) {
    if (p === 'google' && isGoogleConfigured()) {
      const g = await googleGeocode(q);
      if (g) return g;
    }
    if (p === 'osm') {
      const o = await nominatimGeocode(q);
      if (o) return o;
    }
  }

  const cityGuess = guessCityCoords(q);
  if (cityGuess) {
    return {
      lat: cityGuess.lat,
      lng: cityGuess.lng,
      formattedAddress: q,
      provider: 'estimate',
      approximate: true,
    };
  }

  return null;
}

function guessCityCoords(text: string): LatLng | null {
  for (const city of Object.keys(CITY_COORDINATES)) {
    if (text.toLowerCase().includes(city.toLowerCase())) {
      return CITY_COORDINATES[city];
    }
  }
  return CITY_COORDINATES['São Paulo'];
}

export async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  if (isGoogleConfigured() && providerPriority().includes('google')) {
    const g = await googleAutocomplete(q);
    if (g.length) return g;
  }

  return nominatimSearch(q);
}

function buildMapLinks(points: LatLng[], labels: string[]): RouteResult['mapLinks'] {
  const googleDest = labels[labels.length - 1] || '';
  const googleWp = labels.slice(1, -1).join('|');
  const google =
    points.length >= 2
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(labels[0] || '')}&destination=${encodeURIComponent(googleDest)}${googleWp ? `&waypoints=${encodeURIComponent(googleWp)}` : ''}&travelmode=driving`
      : `https://maps.google.com/?q=${encodeURIComponent(labels[0] || '')}`;

  const osmCoordPath = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const osm =
    points.length >= 2
      ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${osmCoordPath}`
      : `https://www.openstreetmap.org/?mlat=${points[0]?.lat}&mlon=${points[0]?.lng}#map=16/${points[0]?.lat}/${points[0]?.lng}`;

  return { google, osm };
}

export async function calculateLogisticsRoute(params: {
  headquarters: string;
  waypoints: string[];
}): Promise<RouteResult> {
  const headquarters = params.headquarters.trim();
  const waypoints = params.waypoints.map((w) => w.trim()).filter(Boolean);

  if (!headquarters) {
    throw new Error('Endereço da sede não configurado.');
  }
  if (waypoints.length === 0) {
    throw new Error('Nenhum endereço de evento para calcular a rota.');
  }

  const allLabels = [headquarters, ...waypoints];
  const geocoded = new Map<string, LatLng>();
  const failed: string[] = [];

  for (const label of allLabels) {
    const key = label.toLowerCase();
    if (geocoded.has(key)) continue;
    const hit = await geocodeAddress(label);
    if (hit) {
      geocoded.set(key, { lat: hit.lat, lng: hit.lng });
    } else {
      failed.push(label);
    }
  }

  const hqPoint = geocoded.get(headquarters.toLowerCase());
  if (!hqPoint) {
    throw new Error('Não foi possível localizar o endereço da sede. Revise em Configurações.');
  }

  const wpPoints = waypoints
    .map((w) => geocoded.get(w.toLowerCase()))
    .filter((p): p is LatLng => Boolean(p));

  if (wpPoints.length === 0) {
    throw new Error(
      failed.length
        ? `Endereços não encontrados: ${failed.slice(0, 3).join('; ')}`
        : 'Nenhum endereço de evento válido.'
    );
  }

  const tripPoints = [hqPoint, ...wpPoints];
  const pointsForLinks = [...tripPoints, hqPoint];

  let warning: string | null = null;
  if (failed.length) {
    warning = `Alguns endereços foram ignorados (não localizados): ${failed.join(', ')}`;
  }

  const order = providerPriority();

  for (const p of order) {
    if (p === 'google' && isGoogleConfigured()) {
      const g = await googleDirectionsRoute(headquarters, waypoints, geocoded);
      if (g && g.distanceKm > 0) {
        return {
          distanceKm: Math.round(g.distanceKm * 10) / 10,
          provider: 'google',
          approximate: false,
          legs: g.legs,
          mapLinks: buildMapLinks(pointsForLinks, allLabels),
          warning,
          orderedAddresses: allLabels,
        };
      }
      /* Fallback silencioso para OSM/estimativa — sem aviso técnico na UI. */
    }

    if (p === 'osm') {
      const o = await osrmTripRoute(tripPoints, [headquarters, ...waypoints]);
      if (o && o.distanceKm > 0) {
        return {
          distanceKm: Math.round(o.distanceKm * 10) / 10,
          provider: 'osm',
          approximate: false,
          legs: o.legs,
          mapLinks: buildMapLinks(pointsForLinks, o.orderedAddresses),
          warning,
          orderedAddresses: o.orderedAddresses,
        };
      }
    }
  }

  const estimatePoints = [hqPoint, ...wpPoints, hqPoint];
  const straight = estimateDrivingKm(estimatePoints);
  const legs: RouteResult['legs'] = [];
  for (let i = 0; i < estimatePoints.length - 1; i++) {
    legs.push({
      from: allLabels[i] || `Ponto ${i + 1}`,
      to: allLabels[i + 1] || headquarters,
      distanceKm: haversineKm(estimatePoints[i], estimatePoints[i + 1]) * ROAD_FACTOR,
    });
  }

  return {
    distanceKm: Math.round(straight * 10) / 10,
    provider: 'estimate',
    approximate: true,
    legs,
    mapLinks: buildMapLinks(pointsForLinks, allLabels),
    warning:
      (warning ? `${warning} ` : '') +
      'Distância estimada (linha urbana). Para rota exata, configure Google Maps ou revise os endereços.',
    orderedAddresses: allLabels,
  };
}
