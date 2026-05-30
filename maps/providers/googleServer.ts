import { cacheGet, cacheSet } from '../cache';
import type { AddressSuggestion, GeocodeResult, LatLng, RouteResult } from '../types';

function googleKey(): string {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();
}

export function isGoogleConfigured(): boolean {
  return googleKey().length > 10;
}

export async function googleGeocode(address: string): Promise<GeocodeResult | null> {
  const key = googleKey();
  if (!key) return null;

  const q = address.trim();
  const cacheKey = `g_geo:${q.toLowerCase()}`;
  const cached = cacheGet<GeocodeResult>(cacheKey);
  if (cached) return cached;

  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?` +
    new URLSearchParams({ address: q, key, region: 'br', language: 'pt-BR' });

  try {
    const res = await fetch(url);
    const json = (await res.json()) as {
      status: string;
      results?: Array<{
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
      }>;
    };

    if (json.status !== 'OK' || !json.results?.[0]) {
      if (json.status === 'OVER_QUERY_LIMIT' || json.status === 'REQUEST_DENIED') {
        console.warn('[google-geocode]', json.status);
      }
      return null;
    }

    const r = json.results[0];
    const result: GeocodeResult = {
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
      formattedAddress: r.formatted_address,
      provider: 'google',
      approximate: false,
    };
    cacheSet(cacheKey, result);
    return result;
  } catch (e) {
    console.warn('[google-geocode]', e);
    return null;
  }
}

export async function googleAutocomplete(input: string): Promise<AddressSuggestion[]> {
  const key = googleKey();
  if (!key || input.trim().length < 3) return [];

  const cacheKey = `g_ac:${input.toLowerCase()}`;
  const cached = cacheGet<AddressSuggestion[]>(cacheKey, 60 * 60 * 1000);
  if (cached) return cached;

  const url =
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
    new URLSearchParams({
      input,
      key,
      language: 'pt-BR',
      components: 'country:br',
    });

  try {
    const res = await fetch(url);
    const json = (await res.json()) as {
      status: string;
      predictions?: Array<{ description: string; place_id: string }>;
    };
    if (json.status !== 'OK' || !json.predictions) return [];

    const out = json.predictions.slice(0, 6).map((p) => ({
      label: p.description,
      placeId: p.place_id,
      lat: null as number | null,
      lng: null as number | null,
    }));
    cacheSet(cacheKey, out);
    return out;
  } catch {
    return [];
  }
}

export async function googleDirectionsRoute(
  headquarters: string,
  waypoints: string[],
  geocoded: Map<string, LatLng>
): Promise<Pick<RouteResult, 'distanceKm' | 'legs'> | null> {
  const key = googleKey();
  if (!key) return null;

  const hq = geocoded.get(headquarters.toLowerCase());
  if (!hq) return null;

  const wpCoords = waypoints
    .map((w) => geocoded.get(w.toLowerCase()))
    .filter((c): c is LatLng => Boolean(c));
  if (wpCoords.length === 0) return null;

  const cacheKey = `g_dir:${headquarters}|${waypoints.join('|')}`;
  const cached = cacheGet<{ distanceKm: number; legs: RouteResult['legs'] }>(cacheKey, 6 * 60 * 60 * 1000);
  if (cached) return cached;

  const origin = `${hq.lat},${hq.lng}`;
  const destination = origin;
  const wp = wpCoords.map((c) => `${c.lat},${c.lng}`).join('|');

  const url =
    `https://maps.googleapis.com/maps/api/directions/json?` +
    new URLSearchParams({
      origin,
      destination,
      waypoints: `optimize:true|${wp}`,
      key,
      language: 'pt-BR',
      region: 'br',
    });

  try {
    const res = await fetch(url);
    const json = (await res.json()) as {
      status: string;
      routes?: Array<{
        legs?: Array<{ distance: { value: number }; start_address: string; end_address: string }>;
      }>;
    };

    if (json.status !== 'OK' || !json.routes?.[0]?.legs) {
      console.warn('[google-directions]', json.status);
      return null;
    }

    let meters = 0;
    const legs: RouteResult['legs'] = [];
    for (const leg of json.routes[0].legs) {
      meters += leg.distance?.value || 0;
      legs.push({
        from: leg.start_address,
        to: leg.end_address,
        distanceKm: (leg.distance?.value || 0) / 1000,
      });
    }

    const result = { distanceKm: meters / 1000, legs };
    cacheSet(cacheKey, result);
    return result;
  } catch (e) {
    console.warn('[google-directions]', e);
    return null;
  }
}
