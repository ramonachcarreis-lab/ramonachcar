import type { PushSubscription } from 'web-push';
import { readJson, writeJson } from './dataStore';

export type StoredSubscription = {
  userId: string;
  role: string;
  displayName: string;
  subscription: PushSubscription;
  createdAt: string;
};

type SubFile = { subscriptions: StoredSubscription[] };

export type UserNotifyPrefs = {
  userId: string;
  pushEnabled: boolean;
  whatsappAuto: boolean;
  phone: string;
  lastAlertIds: string[];
  updatedAt: string;
};

type PrefsFile = { prefs: UserNotifyPrefs[] };

export function listSubscriptions(): StoredSubscription[] {
  return readJson<SubFile>('push-subscriptions.json', { subscriptions: [] }).subscriptions;
}

export function saveSubscription(entry: StoredSubscription): void {
  const list = listSubscriptions().filter((s) => s.userId !== entry.userId);
  list.push(entry);
  writeJson<SubFile>('push-subscriptions.json', { subscriptions: list });
}

export function removeSubscription(userId: string): void {
  const list = listSubscriptions().filter((s) => s.userId !== userId);
  writeJson<SubFile>('push-subscriptions.json', { subscriptions: list });
}

export function getPrefs(userId: string): UserNotifyPrefs | null {
  const all = readJson<PrefsFile>('notify-prefs.json', { prefs: [] }).prefs;
  return all.find((p) => p.userId === userId) || null;
}

export function savePrefs(prefs: UserNotifyPrefs): void {
  const all = readJson<PrefsFile>('notify-prefs.json', { prefs: [] }).prefs;
  const next = all.filter((p) => p.userId !== prefs.userId);
  next.push(prefs);
  writeJson<PrefsFile>('notify-prefs.json', { prefs: next });
}
