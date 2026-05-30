import crypto from 'crypto';
import { readJson, writeJson } from './dataStore';
import type { ContractTemplateData } from '../src/components/ContractTemplate';
import type { StoredSignature } from '../src/types/inventory';

export type SignatureLinkRecord = {
  token: string;
  eventId: number;
  unitId: string;
  clientName: string;
  contractData: ContractTemplateData;
  clientSignature?: StoredSignature;
  createdAt: string;
  signedAt?: string;
};

const FILE = 'signature-links.json';

function loadAll(): SignatureLinkRecord[] {
  return readJson<SignatureLinkRecord[]>(FILE, []);
}

function saveAll(list: SignatureLinkRecord[]) {
  try {
    writeJson(FILE, list);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      msg.includes('ENOSPC') || msg.toLowerCase().includes('no space')
        ? 'Disco cheio no servidor — não foi possível salvar o link.'
        : `Falha ao salvar link: ${msg}`
    );
  }
}

export function createSignatureLink(input: {
  eventId: number;
  unitId: string;
  clientName: string;
  contractData: ContractTemplateData;
}): SignatureLinkRecord {
  const list = loadAll();
  const existing = list
    .filter((r) => r.eventId === input.eventId && !r.signedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  if (existing) {
    existing.contractData = input.contractData;
    existing.clientName = input.clientName;
    saveAll(list);
    return existing;
  }

  const record: SignatureLinkRecord = {
    token: crypto.randomBytes(24).toString('hex'),
    eventId: input.eventId,
    unitId: input.unitId,
    clientName: input.clientName,
    contractData: input.contractData,
    createdAt: new Date().toISOString(),
  };
  list.push(record);
  saveAll(list);
  return record;
}

export function getSignatureByToken(token: string): SignatureLinkRecord | null {
  return loadAll().find((r) => r.token === token) || null;
}

export function getLatestSignatureByEventId(eventId: number): SignatureLinkRecord | null {
  const list = loadAll().filter((r) => r.eventId === eventId);
  if (!list.length) return null;
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function saveClientSignatureByToken(
  token: string,
  signature: StoredSignature
): SignatureLinkRecord | null {
  const list = loadAll();
  const idx = list.findIndex((r) => r.token === token);
  if (idx < 0) return null;
  const row = list[idx];
  if (row.signedAt) return row;

  row.clientSignature = signature;
  row.signedAt = new Date().toISOString();
  row.contractData = {
    ...row.contractData,
    clientSignature: signature,
  };
  list[idx] = row;
  saveAll(list);
  return row;
}
