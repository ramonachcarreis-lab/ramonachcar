import { readJson, writeJson } from './dataStore';
import type { ClientLoyaltyRecord } from '../src/utils/loyaltyPoints';

const FILE = 'loyalty-points.json';

export function loadServerLoyaltyRecords(): ClientLoyaltyRecord[] {
  const rows = readJson<ClientLoyaltyRecord[]>(FILE, []);
  return Array.isArray(rows) ? rows : [];
}

export function saveServerLoyaltyRecords(records: ClientLoyaltyRecord[]): void {
  writeJson(FILE, records);
}
