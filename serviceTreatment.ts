/** Por item: só higienização ou higienização + impermeabilização */

export type ServiceTreatment = 'higienizacao' | 'completo';

export const SERVICE_TREATMENT_LABELS: Record<ServiceTreatment, string> = {
  higienizacao: 'Só higienização',
  completo: 'Higienização + impermeabilização',
};

export const SERVICE_TREATMENT_SHORT: Record<ServiceTreatment, string> = {
  higienizacao: 'Higienização',
  completo: 'Higien. + imper.',
};

export function normalizeServiceTreatment(value?: string | null): ServiceTreatment {
  return value === 'completo' ? 'completo' : 'higienizacao';
}
