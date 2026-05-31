export type EventAddress = {
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  referencia: string;
};

export const emptyEventAddress = (): EventAddress => ({
  cep: '',
  logradouro: '',
  numero: '',
  bairro: '',
  cidade: '',
  uf: '',
  referencia: '',
});

export function consolidateEventAddress(a: EventAddress): string {
  const first = [a.logradouro?.trim(), a.numero?.trim()].filter(Boolean).join(', ');
  const second = [a.bairro?.trim(), a.cidade?.trim()].filter(Boolean).join(' - ');
  const third = [a.uf?.trim(), a.cep?.trim()].filter(Boolean).join(', ');
  const ref = a.referencia?.trim();
  const base = [first, second, third].filter(Boolean).join(' | ');
  return ref ? `${base} · Ref: ${ref}` : base;
}

export function parseEventAddressFromString(address: string): EventAddress {
  const empty = emptyEventAddress();
  if (!address || address === 'A definir na proposta') return empty;
  const refMatch = address.match(/Ref:\s*(.+)$/i);
  if (refMatch) empty.referencia = refMatch[1].trim();
  const parts = address.split(' | ').map((p) => p.trim());
  if (parts[0]) {
    const streetParts = parts[0].split(',');
    empty.logradouro = streetParts[0]?.trim() || '';
    empty.numero = streetParts[1]?.trim() || '';
  }
  if (parts[1]) {
    const cityParts = parts[1].split(' - ');
    empty.bairro = cityParts[0]?.trim() || '';
    empty.cidade = cityParts[1]?.trim() || '';
  }
  if (parts[2]) {
    const ufCep = parts[2].split(',');
    empty.uf = ufCep[0]?.trim() || '';
    empty.cep = ufCep[1]?.trim() || '';
  }
  return empty;
}

export function isEventAddressComplete(a: EventAddress): boolean {
  return Boolean(
    a.cep.replace(/\D/g, '').length >= 8 &&
      a.logradouro.trim() &&
      a.bairro.trim() &&
      a.cidade.trim() &&
      a.uf.trim().length === 2
  );
}
