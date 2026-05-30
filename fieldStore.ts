import { readJson, writeJson } from './dataStore';
import type { ServiceReportEvidence } from '../src/types/serviceReport';
import type { ServiceChecklistState } from '../src/types/fieldOperations';

/** Evento serializado (date em ISO). */
export type StoredFieldEvent = Record<string, unknown> & {
  id: number;
  publicTrackingToken?: string;
  customerPortalToken?: string;
  serviceChecklist?: ServiceChecklistState;
  serviceReport?: ServiceReportEvidence;
};

const EVENTS_FILE = 'field-events.json';

export function loadFieldEvents(): StoredFieldEvent[] {
  return readJson<StoredFieldEvent[]>(EVENTS_FILE, []);
}

export function saveFieldEvents(events: StoredFieldEvent[]): void {
  writeJson(EVENTS_FILE, events);
}

export function upsertFieldEvent(event: StoredFieldEvent): StoredFieldEvent {
  const list = loadFieldEvents();
  const idx = list.findIndex((e) => e.id === event.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...event };
  } else {
    list.push(event);
  }
  saveFieldEvents(list);
  return list.find((e) => e.id === event.id)!;
}

export function replaceFieldEvents(events: StoredFieldEvent[]): void {
  saveFieldEvents(events);
}

export function getFieldEventById(id: number): StoredFieldEvent | null {
  return loadFieldEvents().find((e) => e.id === id) || null;
}

export function getFieldEventByTrackingToken(token: string): StoredFieldEvent | null {
  return (
    loadFieldEvents().find(
      (e) => e.publicTrackingToken === token || e.customerPortalToken === token
    ) || null
  );
}

export function patchFieldEvent(
  id: number,
  patch: Partial<StoredFieldEvent>
): StoredFieldEvent | null {
  const list = loadFieldEvents();
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  saveFieldEvents(list);
  return list[idx];
}
