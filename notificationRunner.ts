import type { AppEvent } from '../src/context/EventsContext';
import { buildAllAppAlerts } from '../src/utils/buildAppAlerts';
import { isVapidConfigured, webpush } from './vapid';
import {
  getPrefs,
  listSubscriptions,
  savePrefs,
  type UserNotifyPrefs,
} from './pushStore';
import { sendWhatsAppText } from './whatsappService';

export type SyncPayload = {
  userId: string;
  role: 'admin' | 'commercial' | 'licensee';
  displayName: string;
  unitId?: string;
  phone?: string;
  pushEnabled?: boolean;
  whatsappAuto?: boolean;
  events: AppEvent[];
};

function reviveEvents(raw: AppEvent[]): AppEvent[] {
  return raw.map((e) => ({
    ...e,
    date: new Date(e.date as unknown as string),
  }));
}

function normalizeAdminPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}

/** Admin da rede usa número fixo do .env; licenciado/comercial usam o WhatsApp cadastrado no app. */
function resolveNotifyPrefs(
  payload: SyncPayload,
  prefs: UserNotifyPrefs
): UserNotifyPrefs {
  if (payload.role === 'admin') {
    const adminPhone = process.env.ADMIN_NOTIFY_PHONE?.trim();
    const adminAuto = process.env.ADMIN_NOTIFY_WHATSAPP_AUTO === 'true';
    if (adminPhone && adminAuto) {
      return {
        ...prefs,
        phone: normalizeAdminPhone(adminPhone),
        whatsappAuto: true,
      };
    }
  }
  return prefs;
}

export async function processNotificationSync(payload: SyncPayload): Promise<{
  newAlerts: number;
  pushSent: number;
  whatsappSent: number;
}> {
  const events = reviveEvents(payload.events);
  const alerts = buildAllAppAlerts(payload.role, events, {
    unitId: payload.unitId,
    displayName: payload.displayName,
    persistLicenseeState: false,
  });
  const alertIds = alerts.map((a) => a.id);

  const prev = getPrefs(payload.userId);
  const prevIds = new Set(prev?.lastAlertIds || []);
  const fresh = alerts.filter((a) => !prevIds.has(a.id));

  const prefs: UserNotifyPrefs = resolveNotifyPrefs(payload, {
    userId: payload.userId,
    pushEnabled: payload.pushEnabled ?? prev?.pushEnabled ?? false,
    whatsappAuto: payload.whatsappAuto ?? prev?.whatsappAuto ?? false,
    phone: payload.phone || prev?.phone || '',
    lastAlertIds: alertIds,
    updatedAt: new Date().toISOString(),
  });
  savePrefs(prefs);

  let pushSent = 0;
  let whatsappSent = 0;

  if (fresh.length === 0) {
    return { newAlerts: 0, pushSent, whatsappSent };
  }

  const top = fresh[0];
  const title = 'Estofado Pro · Alerta';
  const body = top.message;
  const url = top.href;

  if (prefs.pushEnabled && isVapidConfigured()) {
    const sub = listSubscriptions().find((s) => s.userId === payload.userId);
    if (sub) {
      for (const alert of fresh.slice(0, 3)) {
        try {
          await webpush.sendNotification(
            sub.subscription,
            JSON.stringify({
              title,
              body: alert.message,
              url: alert.href,
              tag: alert.id,
            })
          );
          pushSent++;
        } catch (err) {
          console.warn('[push] falha', payload.userId, err);
        }
      }
    }
  }

  if (prefs.whatsappAuto && prefs.phone) {
    const lines = fresh.slice(0, 3).map((a) => `• ${a.message}`).join('\n');
    const msg = `Estofado Pro — ${fresh.length} alerta(s):\n\n${lines}\n\nAbra o app: ${process.env.APP_URL || 'http://localhost:3000'}${url}`;
    const wa = await sendWhatsAppText(prefs.phone, msg);
    if (wa.ok) whatsappSent = 1;
    else console.warn('[whatsapp]', wa.error);
  }

  return { newAlerts: fresh.length, pushSent, whatsappSent };
}
