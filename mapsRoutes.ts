import type { Express, Request, Response } from 'express';
import {
  calculateLogisticsRoute,
  geocodeAddress,
  getMapsStatus,
  searchAddresses,
} from './maps/mapsService';

export function registerMapsRoutes(app: Express): void {
  app.get('/api/maps/status', (_req, res) => {
    res.json(getMapsStatus());
  });

  app.get('/api/maps/autocomplete', async (req, res) => {
    const q = String(req.query.q || '');
    try {
      const suggestions = await searchAddresses(q);
      res.json({ suggestions });
    } catch (e) {
      console.error('[maps/autocomplete]', e);
      res.status(500).json({ suggestions: [], error: 'Busca indisponível' });
    }
  });

  app.post('/api/maps/geocode', async (req, res) => {
    const { address } = req.body as { address?: string };
    if (!address?.trim()) {
      return res.status(400).json({ error: 'address obrigatório' });
    }
    try {
      const result = await geocodeAddress(address);
      if (!result) return res.status(404).json({ error: 'Endereço não encontrado' });
      res.json(result);
    } catch (e) {
      console.error('[maps/geocode]', e);
      res.status(500).json({ error: 'Erro ao geocodificar' });
    }
  });

  app.post('/api/maps/route', async (req, res) => {
    const { headquarters, waypoints } = req.body as {
      headquarters?: string;
      waypoints?: string[];
    };
    try {
      const result = await calculateLogisticsRoute({
        headquarters: headquarters || '',
        waypoints: Array.isArray(waypoints) ? waypoints : [],
      });
      res.json({ ok: true, ...result });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao calcular rota';
      res.status(400).json({ ok: false, error: msg });
    }
  });

  app.post('/api/calculate-logistics', async (req, res) => {
    try {
      const { headquarters, waypoints } = req.body as {
        headquarters?: string;
        waypoints?: string[];
      };
      const result = await calculateLogisticsRoute({
        headquarters: headquarters || '',
        waypoints: Array.isArray(waypoints) ? waypoints : [],
      });
      res.json({
        success: true,
        distanceKm: result.distanceKm,
        provider: result.provider,
        approximate: result.approximate,
        warning: result.warning,
        mapLinks: result.mapLinks,
        legs: result.legs,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao calcular logística';
      res.status(400).json({ success: false, error: msg });
    }
  });
}
