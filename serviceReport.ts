import type { StoredSignature } from './inventory';

/** Quantidade de evidências obrigatórias por fase em cada item. */
export const PHOTOS_PER_PHASE = 1;
export const VIDEOS_PER_PHASE = 1;

export type ServiceItemPhotoEvidence = {
  itemKey: string;
  itemName: string;
  /** URL da foto antes. */
  beforeUrls: string[];
  /** URL da foto depois. */
  afterUrls: string[];
  /** URL do vídeo antes. */
  beforeVideoUrls?: string[];
  /** URL do vídeo depois. */
  afterVideoUrls?: string[];
};

/** Fotos e assinatura do serviço no local (checklist operacional). */
export type ServiceReportEvidence = {
  /** @deprecated — migrado para itemPhotos */
  photoBeforeUrl?: string;
  /** @deprecated — migrado para itemPhotos */
  photoAfterUrl?: string;
  itemPhotos?: ServiceItemPhotoEvidence[];
  /** Assinatura de vistoria antes de iniciar o serviço. */
  preServiceSignature?: StoredSignature;
  preServiceNotes?: string;
  preServiceRemoteSignatureToken?: string;
  preServiceRemoteSignatureRequestedAt?: string;
  clientSignature?: StoredSignature;
  /** Token do link público de assinatura remota do serviço */
  remoteSignatureToken?: string;
  remoteSignatureRequestedAt?: string;
  updatedAt?: string;
};
