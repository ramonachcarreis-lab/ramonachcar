import { cacheGet, cacheSet } from '../cache';
import type { LatLng, RouteLeg, RouteResult } from '../types';

const OSRM_BASE = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';

export async function osrmTripRoute(
  points: LatLng[],
  addressLabels: string[]
): Promise<Pick<RouteResult, 'distanceKm' | 'legs' | 'orderedAddresses'> | null> {
  if (points.length < 2) return null;

  const coordKey = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
  const cacheKey = `osrm_trip:${coordKey}`;
  const cached = cacheGet<{ distanceKm: number; legs: RouteLeg[]; order: number[] }>(cacheKey, 12 * 60 * 60 * 1000);
  if (cached) {
    const orderedAddresses = cached.order.map((i) => addressLabels[i] || '');
    return { distanceKm: cached.distanceKm, legs: cached.legs, orderedAddresses };
  }

  const coordPath = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const url =
    `${OSRM_BASE}/trip/v1/driving/${coordPath}?` +
    new URLSearchParams({
      roundtrip: 'true',
      source: 'first',
      steps: 'false',
      overview: 'false',
    });

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      code?: string;
      trips?: Array<{
        distance: number;
        legs?: Array<{ distance: number }>;
      }>;
      waypoints?: Array<{ waypoint_index: number }>;
    };

    if (json.code !== 'Ok' || !json.trips?.[0]) return null;

    const trip = json.trips[0];
    const distanceKm = trip.distance / 1000;
    const order =
      json.waypoints?.map((w) => w.waypoint_index) ??
      addressLabels.map((_, i) => i);

    const orderedAddresses = order.map((i) => addressLabels[i] || '');
    const legs: RouteLeg[] = [];
    if (trip.legs?.length) {
      for (let i = 0; i < trip.legs.length; i++) {
        legs.push({
          from: orderedAddresses[i] || `Ponto ${i + 1}`,
          to: orderedAddresses[i + 1] || orderedAddresses[0] || 'Retorno',
          distanceKm: trip.legs[i].distance / 1000,
        });
      }
    }

    cacheSet(cacheKey, { distanceKm, legs, order });
    return { distanceKm, legs, orderedAddresses };
  } catch (e) {
    console.warn('[osrm]', e);
    return null;
  }
}
