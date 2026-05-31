/** Operações de campo — inspirado em FSM, adaptado Estofado Pro */

export type OperationalColumnId =
  | 'scheduled'
  | 'en_route'
  | 'on_site'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export const OPERATIONAL_COLUMNS: {
  id: OperationalColumnId;
  label: string;
  color: string;
}[] = [
  { id: 'scheduled', label: 'Agendado', color: 'slate' },
  { id: 'en_route', label: 'A caminho', color: 'sky' },
  { id: 'on_site', label: 'No local', color: 'amber' },
  { id: 'in_progress', label: 'Em execução', color: 'emerald' },
  { id: 'completed', label: 'Concluído', color: 'green' },
  { id: 'cancelled', label: 'Cancelado', color: 'red' },
];

export type ChecklistItemId =
  | 'address_confirmed'
  | 'fabric_confirmed'
  | 'photo_before'
  | 'photo_after'
  | 'treatment_applied'
  | 'impermeabilizacao_ok'
  | 'client_signature'
  | 'stock_deducted';

export type ChecklistItem = {
  id: ChecklistItemId;
  label: string;
  required: boolean;
  done: boolean;
  doneAt?: string;
  note?: string;
};

export type ServiceChecklistState = {
  items: ChecklistItem[];
  completedAt?: string;
};

export type TechnicianLocation = {
  unitId: string;
  lat: number;
  lng: number;
  updatedAt: string;
  accuracyM?: number;
};

export type ServiceRecurrence = {
  id: string;
  unitId: string;
  clientName: string;
  phone: string;
  address: string;
  intervalMonths: number;
  nextDate: string;
  proposalItemsJson?: string;
  totalValue?: number;
  active: boolean;
  createdAt: string;
  lastGeneratedEventId?: number;
};

export type ClientAssetPiece = {
  id: string;
  label: string;
  room?: string;
  lastServiceAt?: string;
  nextSuggestedAt?: string;
  notes?: string;
};

export type ClientAssetRecord = {
  id: string;
  unitId: string;
  clientKey: string;
  clientName: string;
  phone: string;
  address: string;
  pieces: ClientAssetPiece[];
  updatedAt: string;
};

export type PublicServiceRequest = {
  id: string;
  unitId: string;
  clientName: string;
  phone: string;
  address: string;
  pieceDescription: string;
  notes?: string;
  status: 'new' | 'converted' | 'dismissed';
  createdAt: string;
  convertedEventId?: number;
};

export type OfflineQueueItem = {
  id: string;
  type: 'checklist' | 'location' | 'complete';
  eventId: number;
  payload: string;
  createdAt: string;
  syncedAt?: string;
};
