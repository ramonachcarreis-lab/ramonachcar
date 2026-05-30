import { cacheGet, cacheSet, waitNominatimSlot } from '../cache';
import type { AddressSuggestion, GeocodeResult, LatLng } from '../types';

const USER_AGENT = 'PlayLivery-Pro/1.0 (logistics; contact: admin@playlivery.com.br)';

async function nominatimFetch(url: string): Promise<Response> {
  await waitNominatimSlot();
  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
}

export async function nominatimSearch(query: string, limit = 6): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const cacheKey = `nom_search:${q.toLowerCase()}`;
  const cached = cacheGet<AddressSuggestion[]>(cacheKey, 24 * 60 * 60 * 1000);
  if (cached) return cached;

  const url =
    `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({
      q,
      format: 'json',
      addressdetails: '1',
      limit: String(limit),
      countrycodes: 'br',
    });

  const res = await nominatimFetch(url);
  if (!res.ok) return [];

  const rows = (await res.json()) as Array<{
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
  }>;

  const out = rows.map((r) => ({
    label: r.display_name,
    placeId: String(r.place_id),
    lat: Number.parseFloat(r.lat),
    lng: Number.parseFloat(r.lon),
  }));

  cacheSet(cacheKey, out);
  return out;
}

export async function nominatimGeocode(address: string): Promise<GeocodeResult | null> {
  const q = address.trim();
  if (!q) return null;

  const cacheKey = `nom_geo:${q.toLowerCase()}`;
  const cached = cacheGet<GeocodeResult>(cacheKey);
  if (cached) return cached;

  const hits = await nominatimSearch(q, 1);
  if (hits[0]?.lat == null || hits[0]?.lng == null) return null;

  const hit = hits[0];
  const result: GeocodeResult = {
    lat: hit.lat!,
    lng: hit.lng!,
    formattedAddress: hit.label,
    provider: 'osm',
    approximate: false,
  };
  cacheSet(cacheKey, result);
  return result;
}

export async function nominatimReverse(lat: number, lng: number): Promise<string | null> {
  const cacheKey = `nom_rev:${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = cacheGet<string>(cacheKey);
  if (cached) return cached;

  const url =
    `https://nominatim.openstreetmap.org/reverse?` +
    new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'json',
    });

  const res = await nominatimFetch(url);
  if (!res.ok) return null;
  const json = (await res.json()) as { display_name?: string };
  const name = json.display_name || null;
  if (name) cacheSet(cacheKey, name);
  return name;
}

export function coordsFromLatLngList(points: LatLng[]): string {
  return points.map((p) => `${p.lng},${p.lat}`).join(';');
}
