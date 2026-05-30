import crypto from 'crypto';
import { readJson, writeJson } from './dataStore';
import type { StoredSignature } from '../src/types/inventory';

export type ServiceSignatureLinkRecord = {
  token: string;
  eventId: number;
  stage?: 'pre' | 'post';
  clientName: string;
  workOrderNumber?: string;
  createdAt: string;
  signedAt?: string;
};

const FILE = 'service-signature-links.json';

function loadAll(): ServiceSignatureLinkRecord[] {
  return readJson<ServiceSignatureLinkRecord[]>(FILE, []);
}

function saveAll(list: ServiceSignatureLinkRecord[]) {
  writeJson(FILE, list);
}

export function createOrGetServiceSignatureLink(input: {
  eventId: number;
  clientName: string;
  workOrderNumber?: string;
  existingToken?: string;
  stage?: 'pre' | 'post';
}): ServiceSignatureLinkRecord {
  const list = loadAll();
  const stage = input.stage || 'post';
  if (input.existingToken) {
    const kept = list.find((r) => r.token === input.existingToken && !r.signedAt && (r.stage || 'post') === stage);
    if (kept) {
      kept.clientName = input.clientName;
      kept.workOrderNumber = input.workOrderNumber;
      saveAll(list);
      return kept;
    }
  }
  const open = list
    .filter((r) => r.eventId === input.eventId && !r.signedAt && (r.stage || 'post') === stage)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (open) {
    open.clientName = input.clientName;
    open.workOrderNumber = input.workOrderNumber;
    saveAll(list);
    return open;
  }
  const record: ServiceSignatureLinkRecord = {
    token: crypto.randomBytes(24).toString('hex'),
    eventId: input.eventId,
    stage,
    clientName: input.clientName,
    workOrderNumber: input.workOrderNumber,
    createdAt: new Date().toISOString(),
  };
  list.push(record);
  saveAll(list);
  return record;
}

export function getServiceSignatureByToken(token: string): ServiceSignatureLinkRecord | null {
  return loadAll().find((r) => r.token === token) || null;
}

export function markServiceSignatureSigned(
  token: string,
  _signature: StoredSignature
): ServiceSignatureLinkRecord | null {
  const list = loadAll();
  const idx = list.findIndex((r) => r.token === token);
  if (idx < 0) return null;
  const row = list[idx];
  if (row.signedAt) return row;
  row.signedAt = new Date().toISOString();
  list[idx] = row;
  saveAll(list);
  return row;
}
