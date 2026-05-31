import type { NivelSujidade, TipoTecido } from './upholsteryQuote';
import type { ServiceTreatment } from './serviceTreatment';

export type ServiceProductLine = { name: string; ml: number };
export type DirtTierLevel = 'baixa' | 'media' | 'alta';
export type MattressSize = 'casal' | 'queen' | 'king' | 'solteiro';
export type SofaSize = '2' | '3' | '4';

export type ServiceDirtTierPricing = {
  level: DirtTierLevel;
  price: number;
  minutes: number;
  /** Produtos do serviço “só higienização” */
  products: ServiceProductLine[];
  /** Produtos extras no pacote “higienização + impermeabilização” */
  impermeabilizacaoProducts?: ServiceProductLine[];
};

export type CarpetM2Pricing = {
  pricePerM2: number;
  minutesPerM2: number;
  /** Produtos por m² — só higienização */
  products: ServiceProductLine[];
  impermeabilizacaoProducts?: ServiceProductLine[];
};

/** Peça do catálogo da unidade (sofá, rede, estofado automotivo, etc.). */
export type Equipment = {
  id: string;
  name: string;
  /** Legado — preço único; itens com faixas usam dirtTiers / carpetPricing */
  price: string;
  type?: 'equipment' | 'service';
  /** Sofá, poltrona, colchão: preço/tempo/produtos por sujidade */
  dirtTiers?: ServiceDirtTierPricing[];
  /** Tapete: cobrança e tempo por m² */
  carpetPricing?: CarpetM2Pricing;
  /** IDs em armazenamento separado (preferido). */
  photoIds?: string[];
  /** Legado — migrado para photoIds; não persistir no settings. */
  photos?: string[];
  /** Quantidade física disponível na unidade (ex.: 2 trailers iguais). */
  stockQuantity?: number;
};

export type ProposalLineItem = {
  equipmentId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  type: 'equipment' | 'service';
  photoUrl?: string;
  /** Orçamento estofados */
  nivelSujidade?: NivelSujidade;
  tipoTecido?: TipoTecido;
  /** Colchão: casal, queen, king, solteiro */
  mattressSize?: MattressSize;
  /** Sofá: 2, 3 ou 4 lugares */
  sofaSize?: SofaSize;
  /** Só higienização ou higienização + impermeabilização */
  serviceTreatment?: ServiceTreatment;
  /** Tempo estimado (uso interno / agenda) */
  estimatedHours?: number;
  /** Consumo de produto — só uso interno (estoque) */
  productMl?: number;
  /** Detalhe por produto químico — abate de estoque ao concluir */
  productUsage?: ServiceProductLine[];
};

export type StoredSignature = {
  imageDataUrl: string;
  signedAt: string;
  signerName: string;
  signerDocument?: string;
};

export type ContractSignatures = {
  client?: StoredSignature;
  licensee?: StoredSignature;
  contractSignedAt?: string;
};
