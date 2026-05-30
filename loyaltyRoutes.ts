import type { Express, Request, Response } from 'express';
import { sendError } from './apiResponse';
import type { ClientLoyaltyRecord } from '../src/utils/loyaltyPoints';
import { loadServerLoyaltyRecords, saveServerLoyaltyRecords } from './loyaltyStore';

export function registerLoyaltyRoutes(app: Express): void {
  app.get('/api/loyalty/records', (_req, res) => {
    res.json({ records: loadServerLoyaltyRecords() });
  });

  app.put('/api/loyalty/records', (req, res) => {
    const records = req.body?.records as ClientLoyaltyRecord[] | undefined;
    if (!Array.isArray(records)) {
      return sendError(res, 400, 'Corpo inválido: records[]');
    }
    saveServerLoyaltyRecords(records);
    res.json({ ok: true, count: records.length });
  });
}
