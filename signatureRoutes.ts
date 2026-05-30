import type { Express, Request, Response } from 'express';
import type { StoredSignature } from '../src/types/inventory';
import type { ContractTemplateData } from '../src/components/ContractTemplate';
import {
  createSignatureLink,
  getLatestSignatureByEventId,
  getSignatureByToken,
  saveClientSignatureByToken,
} from './signatureStore';

export function registerSignatureRoutes(app: Express): void {
  app.post('/api/signature-links', (req, res) => {
    const { eventId, unitId, clientName, contractData } = req.body as {
      eventId?: number;
      unitId?: string;
      clientName?: string;
      contractData?: ContractTemplateData;
    };
    const resolvedName = (clientName || contractData?.clientName || '').trim();
    if (!eventId || !unitId?.trim() || !resolvedName || !contractData) {
      return res.status(400).json({
        error:
          'Dados do contrato incompletos (cliente, unidade ou conteúdo do contrato). Revise o cadastro no CRM.',
      });
    }
    try {
      const record = createSignatureLink({
        eventId,
        unitId: unitId.trim(),
        clientName: resolvedName,
        contractData: { ...contractData, clientName: resolvedName },
      });
      res.json({ token: record.token, signed: Boolean(record.signedAt) });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Erro ao gravar o link de assinatura no servidor.';
      console.error('[signature-links] POST failed:', e);
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/signature-links/by-event/:eventId', (req, res) => {
    const eventId = parseInt(req.params.eventId, 10);
    if (!eventId) return res.status(400).json({ error: 'eventId inválido' });
    const record = getLatestSignatureByEventId(eventId);
    if (!record) return res.json({ link: null });
    res.json({
      link: {
        token: record.token,
        signed: Boolean(record.signedAt),
        clientSignature: record.clientSignature || null,
        signedAt: record.signedAt || null,
      },
    });
  });

  app.get('/api/signature-links/:token', (req, res) => {
    const record = getSignatureByToken(req.params.token);
    if (!record) return res.status(404).json({ error: 'Link inválido ou expirado.' });
    res.json({
      token: record.token,
      eventId: record.eventId,
      unitId: record.unitId,
      clientName: record.clientName,
      contractData: record.contractData,
      signed: Boolean(record.signedAt),
      clientSignature: record.clientSignature || null,
      signedAt: record.signedAt || null,
    });
  });

  app.post('/api/signature-links/:token/sign', (req, res) => {
    const signature = req.body?.signature as StoredSignature | undefined;
    if (!signature?.imageDataUrl || !signature?.signerName?.trim()) {
      return res.status(400).json({ error: 'Assinatura incompleta.' });
    }
    const saved = saveClientSignatureByToken(req.params.token, {
      imageDataUrl: signature.imageDataUrl,
      signedAt: signature.signedAt || new Date().toISOString(),
      signerName: signature.signerName.trim(),
      signerDocument: signature.signerDocument?.trim() || undefined,
    });
    if (!saved) return res.status(404).json({ error: 'Link inválido.' });
    res.json({ ok: true, signedAt: saved.signedAt });
  });
}
