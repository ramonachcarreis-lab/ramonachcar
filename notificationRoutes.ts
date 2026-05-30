import type { Express, Request, Response } from 'express';
import { sendError } from './apiResponse';
import webpush from 'web-push';
import { initVapid, isVapidConfigured } from './vapid';
import { getWhatsAppStatus, getWhatsAppStatusVerified } from './whatsappService';
import {
  removeSubscription,
  saveSubscription,
  type StoredSubscription,
} from './pushStore';
import { processNotificationSync, type SyncPayload } from './notificationRunner';

export function registerNotificationRoutes(app: Express): void {
  const { publicKey } = initVapid();

  app.get('/api/notifications/status', async (_req, res) => {
    const adminPhone = process.env.ADMIN_NOTIFY_PHONE?.trim() || '';
    const adminAuto = process.env.ADMIN_NOTIFY_WHATSAPP_AUTO === 'true';
    const digits = adminPhone.replace(/\D/g, '');
    const masked =
      digits.length >= 4 ? `••••${digits.slice(-4)}` : '';
    const whatsapp = await getWhatsAppStatusVerified();
    res.json({
      push: {
        configured: isVapidConfigured(),
        publicKey: publicKey || null,
      },
      whatsapp,
      adminNotify: {
        configured:
          adminAuto && digits.length >= 10 && whatsapp.configured && whatsapp.authenticated,
        auto: adminAuto && digits.length >= 10,
        phoneMasked: masked,
      },
    });
  });

  app.get('/api/push/vapid-public-key', (_req, res) => {
    if (!publicKey) {
      return sendError(
        res,
        503,
        'Push não configurado. Rode: npx tsx scripts/generate-vapid.ts e copie as chaves para o .env'
      );
    }
    res.json({ publicKey });
  });

  app.post('/api/push/subscribe', (req, res) => {
    const { userId, role, displayName, subscription } = req.body as {
      userId?: string;
      role?: string;
      displayName?: string;
      subscription?: webpush.PushSubscription;
    };
    if (!userId || !subscription) {
      return sendError(res, 400, 'userId e subscription obrigatórios');
    }
    const entry: StoredSubscription = {
      userId,
      role: role || 'commercial',
      displayName: displayName || userId,
      subscription,
      createdAt: new Date().toISOString(),
    };
    saveSubscription(entry);
    res.json({ ok: true });
  });

  app.post('/api/push/unsubscribe', (req, res) => {
    const { userId } = req.body as { userId?: string };
    if (userId) removeSubscription(userId);
    res.json({ ok: true });
  });

  app.post('/api/notifications/sync', async (req, res) => {
    try {
      const payload = req.body as SyncPayload;
      if (!payload?.userId || !Array.isArray(payload.events)) {
        return sendError(res, 400, 'Payload inválido');
      }
      const result = await processNotificationSync(payload);
      res.json({ ok: true, ...result });
    } catch (e) {
      console.error('[notifications/sync]', e);
      sendError(res, 500, 'Erro ao processar alertas');
    }
  });

  app.post('/api/whatsapp/test', async (req, res) => {
    const { phone, message } = req.body as { phone?: string; message?: string };
    if (!phone) return sendError(res, 400, 'phone obrigatório');
    const { sendWhatsAppText } = await import('./whatsappService');
    const result = await sendWhatsAppText(
      phone,
      message || 'Estofado Pro: teste de WhatsApp automático OK.'
    );
    res.json(result);
  });

  app.post('/api/whatsapp/test-admin', async (req, res) => {
    const adminPhone = process.env.ADMIN_NOTIFY_PHONE?.trim();
    if (!adminPhone) {
      return sendError(res, 400, 'ADMIN_NOTIFY_PHONE não configurado no .env.');
    }
    const { message } = req.body as { message?: string };
    const { sendWhatsAppText } = await import('./whatsappService');
    let digits = adminPhone.replace(/\D/g, '');
    if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
    const result = await sendWhatsAppText(
      digits,
      message || 'Estofado Pro: teste de alerta automático da rede.'
    );
    res.json(result);
  });
}
