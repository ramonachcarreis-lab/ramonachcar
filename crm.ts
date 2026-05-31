import type { ContractTemplateData } from '../components/ContractTemplate';

export type CrmFlowStep =
  | 'lead'
  | 'proposal_sent'
  | 'proposal_approved'
  | 'contract_sent'
  | 'closed'
  | 'paid';

export type ContactLogEntry = {
  id: string;
  text: string;
  clientResponded: boolean;
  createdAt: string;
};

export type DocVersion = {
  id: string;
  type: 'proposal' | 'contract';
  label: string;
  createdAt: string;
  data: ContractTemplateData;
  valid: boolean;
};

export const CRM_FLOW_LABELS: Record<CrmFlowStep, string> = {
  lead: 'Cliente cadastrado',
  proposal_sent: 'Proposta enviada',
  proposal_approved: 'Proposta aprovada',
  contract_sent: 'Contrato preenchido',
  closed: 'Contrato fechado',
  paid: 'Pago · Agenda',
};
