/** Links sociais por unidade — espelha padrão do cadastro de licenciados. */
export function unitSocialForPublic(unitId: string) {
  const map: Record<string, { unitName: string; instagram: string; googleBusinessUrl: string }> = {
    'sp-centro': {
      unitName: 'SP Centro',
      instagram: '@estofadopro_spcentro',
      googleBusinessUrl: 'https://g.page/estofadopro-sp-centro',
    },
    'sp-zona-sul': {
      unitName: 'SP Zona Sul',
      instagram: '@estofadopro_spzona',
      googleBusinessUrl: 'https://g.page/estofadopro-sp-zona-sul',
    },
  };
  const row = map[unitId] || map['sp-centro'];
  const ig = row.instagram.trim();
  const google = row.googleBusinessUrl.trim();
  return {
    unitName: row.unitName,
    instagramUrl: ig.startsWith('http') ? ig : `https://instagram.com/${ig.replace(/^@/, '')}`,
    googleReviewUrl: google.startsWith('http') ? google : `https://${google}`,
  };
}
