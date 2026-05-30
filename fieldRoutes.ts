import type { Express, Request, Response } from 'express';
import type { AppEvent } from '../src/context/EventsContext';
import { buildClubePlayView } from '../src/utils/clubePlay';
import { unitSocialForPublic } from './unitSocialDefaults';
import { evaluationToken } from '../src/services/evaluationStorage';
import { loadServerLoyaltyRecords } from './loyaltyStore';
import { sendError } from './apiResponse';
import type { StoredSignature } from '../src/types/inventory';
import type { ServiceReportEvidence } from '../src/types/serviceReport';
import type { ServiceChecklistState } from '../src/types/fieldOperations';
import {
  getFieldEventById,
  getFieldEventByTrackingToken,
  loadFieldEvents,
  patchFieldEvent,
  replaceFieldEvents,
  type StoredFieldEvent,
} from './fieldStore';
import {
  createOrGetServiceSignatureLink,
  getServiceSignatureByToken,
  markServiceSignatureSigned,
} from './serviceSignatureStore';
import { syncChecklistWithReport } from '../src/utils/serviceReport';
import { normalizeChecklist } from '../src/utils/serviceChecklist';
import { allItemAfterMediaComplete, allItemBeforeMediaComplete } from '../src/utils/serviceItemPhotos';
import { getOperationalColumnDetailed } from '../src/utils/operationalStatus';
import { isPublicLinkValid } from '../src/utils/workOrder';

function parseEventDate(e: StoredFieldEvent): StoredFieldEvent {
  if (e.date && typeof e.date === 'string') {
    return e;
  }
  return e;
}

function requestOrigin(req: Request): string {
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
  const host = (req.get('x-forwarded-host') || req.get('host') || 'localhost:3000').split(',')[0].trim();
  return `${proto}://${host}`;
}

function publicStatusPayload(event: StoredFieldEvent, req?: Request) {
  const e = parseEventDate(event);
  const col = getOperationalColumnDetailed(e as unknown as Parameters<typeof getOperationalColumnDetailed>[0]);
  const labels: Record<string, string> = {
    scheduled: 'Agendado',
    en_route: 'Equipe a caminho',
    on_site: 'No local',
    in_progress: 'Serviço em andamento',
    completed: 'Serviço concluído',
    cancelled: 'Cancelado',
  };

  const base = {
    eventId: e.id,
    workOrderNumber: e.workOrderNumber,
    client: e.client,
    address: e.address,
    time: e.time,
    phone: e.phone,
    unitId: e.unitId,
    status: col,
    statusLabel: labels[col] || labels.scheduled,
    etaMinutes: e.etaMinutes ?? null,
    technicianLat: e.technicianLat ?? null,
    technicianLng: e.technicianLng ?? null,
    technicianGeoUpdatedAt: e.technicianGeoUpdatedAt ?? null,
    hasPhotoBefore: Boolean(
      e.serviceReport?.photoBeforeUrl ||
        allItemBeforeMediaComplete(e as StoredFieldEvent, e.serviceReport)
    ),
    hasPhotoAfter: Boolean(
      e.serviceReport?.photoAfterUrl ||
        allItemAfterMediaComplete(e as StoredFieldEvent, e.serviceReport)
    ),
    clientSigned: Boolean(e.serviceReport?.clientSignature?.imageDataUrl),
    clubePlay: null as null | {
      tokensOpen: number;
      tokensToNextCoin: number;
      playCoins: number;
      playCoinsEarned: number;
      playCoinsRedeemed: number;
    },
    evaluationUrl: null as string | null,
    social: null as null | {
      unitName: string;
      instagramUrl: string;
      googleReviewUrl: string;
    },
  };

  if (col !== 'completed') return base;

  const phone = String(e.phone || '');
  const clientName = String(e.client || '');
  const unitId = String(e.unitId || 'sp-centro');
  const allEvents = loadFieldEvents().map((row) => ({
    ...row,
    date: row.date ? new Date(String(row.date)) : new Date(),
  })) as AppEvent[];
  const clube = buildClubePlayView(phone, clientName, unitId, allEvents, loadServerLoyaltyRecords());
  base.clubePlay = {
    tokensOpen: clube.tokensOpen,
    tokensToNextCoin: clube.tokensToNextCoin,
    playCoins: clube.playCoins,
    playCoinsEarned: clube.playCoinsEarned,
    playCoinsRedeemed: clube.playCoinsRedeemed,
  };

  if (req && e.id) {
    const token = evaluationToken(e.id, unitId);
    base.evaluationUrl = `${requestOrigin(req)}/avaliacao/${token}`;
  }

  base.social = unitSocialForPublic(unitId);

  return base;
}

export function registerFieldRoutes(app: Express): void {
  app.get('/api/field/health', (_req, res) => {
    res.json({ ok: true, service: 'field-ops' });
  });

  app.get('/api/field/events', (req, res) => {
    const all = loadFieldEvents();
    const limitRaw = req.query.limit;
    if (!limitRaw) {
      return res.json(all);
    }
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(limitRaw), 10) || 20));
    const start = (page - 1) * limit;
    const data = all.slice(start, start + limit);
    res.json({
      ok: true,
      data,
      meta: {
        page,
        limit,
        total: all.length,
        totalPages: Math.ceil(all.length / limit) || 1,
        hasMore: start + limit < all.length,
      },
    });
  });

  app.put('/api/field/events', (req, res) => {
    const events = req.body?.events;
    if (!Array.isArray(events)) {
      return sendError(res, 400, 'Corpo inválido: events[]');
    }
    replaceFieldEvents(events as StoredFieldEvent[]);
    res.json({ ok: true, count: events.length });
  });

  app.get('/api/field/events/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const event = getFieldEventById(id);
    if (!event) return sendError(res, 404, 'Evento não encontrado');
    res.json(event);
  });

  app.patch('/api/field/events/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const patch = req.body as Partial<StoredFieldEvent>;
    if (!id) return sendError(res, 400, 'id inválido');
    const updated = patchFieldEvent(id, patch);
    if (!updated) return sendError(res, 404, 'Evento não encontrado');
    res.json(updated);
  });

  app.patch('/api/field/events/:id/service-report', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const report = req.body?.serviceReport as ServiceReportEvidence | undefined;
    if (!id || !report) return sendError(res, 400, 'Dados inválidos');
    const event = getFieldEventById(id);
    if (!event) return sendError(res, 404, 'Evento não encontrado');
    const merged: ServiceReportEvidence = {
      ...(event.serviceReport || {}),
      ...report,
      updatedAt: new Date().toISOString(),
    };
    const checklist = syncChecklistWithReport(
      normalizeChecklist(event.serviceChecklist),
      merged,
      event as StoredFieldEvent
    );
    const updated = patchFieldEvent(id, { serviceReport: merged, serviceChecklist: checklist });
    res.json(updated);
  });

  app.patch('/api/field/events/:id/checklist', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const checklist = req.body?.serviceChecklist as ServiceChecklistState | undefined;
    if (!id || !checklist) return sendError(res, 400, 'Checklist inválido');
    const updated = patchFieldEvent(id, { serviceChecklist: checklist });
    if (!updated) return sendError(res, 404, 'Evento não encontrado');
    res.json(updated);
  });

  app.post('/api/field/events/:id/service-signature-link', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return sendError(res, 400, 'id inválido');
    const event = getFieldEventById(id);
    if (!event) return sendError(res, 404, 'Evento não encontrado');
    const stage = req.body?.stage === 'pre' ? 'pre' : 'post';
    const link = createOrGetServiceSignatureLink({
      eventId: id,
      clientName: event.client || 'Cliente',
      workOrderNumber: event.workOrderNumber,
      existingToken:
        stage === 'pre'
          ? event.serviceReport?.preServiceRemoteSignatureToken
          : event.serviceReport?.remoteSignatureToken,
      stage,
    });
    const serviceReport: ServiceReportEvidence = {
      ...(event.serviceReport || {}),
      ...(stage === 'pre'
        ? {
            preServiceRemoteSignatureToken: link.token,
            preServiceRemoteSignatureRequestedAt: new Date().toISOString(),
          }
        : {
            remoteSignatureToken: link.token,
            remoteSignatureRequestedAt: new Date().toISOString(),
          }),
      updatedAt: new Date().toISOString(),
    };
    const updated = patchFieldEvent(id, { serviceReport });
    res.json({ token: link.token, signed: Boolean(link.signedAt), event: updated, stage });
  });

  app.get('/api/field/public/service-sign/:token', (req, res) => {
    const link = getServiceSignatureByToken(req.params.token);
    if (!link) return sendError(res, 404, 'Link inválido ou expirado.');
    const event = getFieldEventById(link.eventId);
    if (!event) return sendError(res, 404, 'Serviço não encontrado.');
    const stage = link.stage === 'pre' ? 'pre' : 'post';
    res.json({
      token: link.token,
      eventId: link.eventId,
      clientName: link.clientName,
      workOrderNumber: link.workOrderNumber || event.workOrderNumber,
      address: event.address,
      signed: Boolean(
        link.signedAt ||
          (stage === 'pre'
            ? event.serviceReport?.preServiceSignature?.imageDataUrl
            : event.serviceReport?.clientSignature?.imageDataUrl)
      ),
      clientSignature:
        (stage === 'pre' ? event.serviceReport?.preServiceSignature : event.serviceReport?.clientSignature) || null,
      stage,
    });
  });

  app.post('/api/field/public/service-sign/:token/sign', (req, res) => {
    const signature = req.body?.signature as StoredSignature | undefined;
    if (!signature?.imageDataUrl || !signature.signerName?.trim()) {
      return sendError(res, 400, 'Assinatura incompleta.');
    }
    const link = getServiceSignatureByToken(req.params.token);
    if (!link) return sendError(res, 404, 'Link inválido.');
    const stage = link.stage === 'pre' ? 'pre' : 'post';
    const event = getFieldEventById(link.eventId);
    if (!event) return sendError(res, 404, 'Serviço não encontrado.');
    if (
      link.signedAt ||
      (stage === 'pre'
        ? event.serviceReport?.preServiceSignature?.imageDataUrl
        : event.serviceReport?.clientSignature?.imageDataUrl)
    ) {
      return res.json({ ok: true, alreadySigned: true });
    }
    const serviceReport: ServiceReportEvidence = {
      ...(event.serviceReport || {}),
      ...(stage === 'pre'
        ? {
            preServiceSignature: {
              imageDataUrl: signature.imageDataUrl,
              signedAt: signature.signedAt || new Date().toISOString(),
              signerName: signature.signerName.trim(),
              signerDocument: signature.signerDocument?.trim(),
            },
          }
        : {
            clientSignature: {
              imageDataUrl: signature.imageDataUrl,
              signedAt: signature.signedAt || new Date().toISOString(),
              signerName: signature.signerName.trim(),
              signerDocument: signature.signerDocument?.trim(),
            },
          }),
      updatedAt: new Date().toISOString(),
    };
    const checklist = syncChecklistWithReport(
      normalizeChecklist(event.serviceChecklist),
      serviceReport,
      event as StoredFieldEvent
    );
    markServiceSignatureSigned(link.token, signature);
    const updated = patchFieldEvent(link.eventId, { serviceReport, serviceChecklist: checklist });
    res.json({ ok: true, event: updated });
  });

  app.post('/api/field/events/:id/service-signature', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const signature = req.body?.signature as StoredSignature | undefined;
    if (!id || !signature?.imageDataUrl || !signature.signerName?.trim()) {
      return sendError(res, 400, 'Assinatura incompleta');
    }
    const event = getFieldEventById(id);
    if (!event) return sendError(res, 404, 'Evento não encontrado');
    const serviceReport: ServiceReportEvidence = {
      ...(event.serviceReport || {}),
      clientSignature: {
        imageDataUrl: signature.imageDataUrl,
        signedAt: signature.signedAt || new Date().toISOString(),
        signerName: signature.signerName.trim(),
        signerDocument: signature.signerDocument?.trim(),
      },
      updatedAt: new Date().toISOString(),
    };
    const checklist = syncChecklistWithReport(
      normalizeChecklist(event.serviceChecklist),
      serviceReport,
      event as StoredFieldEvent
    );
    const updated = patchFieldEvent(id, { serviceReport, serviceChecklist: checklist });
    res.json(updated);
  });

  app.get('/api/field/public/track/:token', (req, res) => {
    const event = getFieldEventByTrackingToken(req.params.token);
    if (!event || !isPublicLinkValid(event as unknown as Parameters<typeof isPublicLinkValid>[0])) {
      return sendError(res, 404, 'Link inválido ou expirado');
    }
    res.json(publicStatusPayload(event, req));
  });

  app.get('/api/field/public/event/:token', (req, res) => {
    const event = getFieldEventByTrackingToken(req.params.token);
    if (!event || !isPublicLinkValid(event as unknown as Parameters<typeof isPublicLinkValid>[0])) {
      return sendError(res, 404, 'Link inválido ou expirado');
    }
    const safe = { ...event };
    delete (safe as { paymentBalanceEntries?: unknown }).paymentBalanceEntries;
    res.json(safe);
  });

}
