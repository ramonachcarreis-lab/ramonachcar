/** Parâmetros de orçamento — limpeza e impermeabilização de estofados */

export type NivelSujidade = 'baixa' | 'media' | 'alta';
export type TipoTecido = 'couro' | 'suede' | 'linho' | 'sintetico' | 'tecido_comum' | 'outros';

export type UpholsteryQuoteLine = {
  equipmentId: string;
  itemName: string;
  quantity: number;
  nivelSujidade: NivelSujidade;
  tipoTecido: TipoTecido;
  /** Tapete: metros quadrados; demais itens: unidades */
  sizeNote?: string;
  unitPrice: number;
  lineTotal: number;
  estimatedHours: number;
  /** Uso interno — abate de estoque; não exibir ao cliente */
  productMl?: number;
};

export const SUJIDADE_LABELS: Record<NivelSujidade, string> = {
  baixa: 'Baixa sujidade',
  media: 'Média sujidade',
  alta: 'Alta sujidade',
};

export const TECIDO_LABELS: Record<TipoTecido, string> = {
  couro: 'Couro',
  suede: 'Suede',
  linho: 'Linho',
  sintetico: 'Sintético',
  tecido_comum: 'Tecido comum',
  outros: 'Outros',
};

/** Legado — só usado se o item não tiver faixas no cadastro */
export const MULTIPLICADOR_SUJIDADE: Record<string, number> = {
  baixa: 1,
  media: 1.23,
  alta: 1.53,
  sujo: 1,
  muito_sujo: 1.3,
  encardido: 1.6,
};

export const MULTIPLICADOR_TECIDO: Record<TipoTecido, number> = {
  couro: 1.15,
  suede: 1.08,
  linho: 1.1,
  sintetico: 1,
  tecido_comum: 1,
  outros: 1.05,
};

/** Legado — abate de estoque quando proposalItems não traz productMl */
export const ML_BASE_POR_ITEM: Record<string, number> = {
  sofa: 400,
  'sofa-3l': 400,
  'sofa-4l': 500,
  poltrona: 200,
  colchao: 450,
  'colchao-casal': 450,
  'colchao-king': 550,
  'tapete-m2': 80,
  rede: 280,
  puff: 130,
  cadeira: 120,
  cabeceira: 220,
};

export function normalizeSujidade(value?: string | null): NivelSujidade {
  if (value === 'baixa' || value === 'media' || value === 'alta') return value;
  if (value === 'sujo') return 'baixa';
  if (value === 'muito_sujo') return 'media';
  if (value === 'encardido') return 'alta';
  return 'media';
}

/** @deprecated use calcLineFromEquipment em catalogPricing */
export function calcUpholsteryLine(input: {
  equipmentId: string;
  basePrice: number;
  quantity: number;
  nivelSujidade: NivelSujidade;
  tipoTecido: TipoTecido;
  isTapeteM2?: boolean;
}): Pick<UpholsteryQuoteLine, 'unitPrice' | 'lineTotal' | 'estimatedHours' | 'productMl'> {
  const nivel = normalizeSujidade(input.nivelSujidade);
  const mult =
    (MULTIPLICADOR_SUJIDADE[nivel] ?? 1) * MULTIPLICADOR_TECIDO[input.tipoTecido];
  const unitPrice = Math.round(input.basePrice * mult * 100) / 100;
  const lineTotal = Math.round(unitPrice * input.quantity * 100) / 100;
  const hoursPerUnit = input.isTapeteM2 ? 0.5 : 0.75;
  const estimatedHours =
    Math.round(hoursPerUnit * (MULTIPLICADOR_SUJIDADE[nivel] ?? 1) * input.quantity * 10) / 10;
  const productMl = Math.round(300 * (MULTIPLICADOR_SUJIDADE[nivel] ?? 1) * input.quantity);
  return { unitPrice, lineTotal, estimatedHours, productMl };
}
