/**
 * Tabelas do Simples Nacional (Anexos III e V) para provisão gerencial.
 * Alíquota efetiva = (RBT12 * alíquotaNominal - parcelaADeduzir) / RBT12
 */

export const SIMPLES_ANEXOS = {
  III: [
    { faixa: 1, max: 180_000, aliquota: 0.06, deduzir: 0 },
    { faixa: 2, max: 360_000, aliquota: 0.112, deduzir: 9_360 },
    { faixa: 3, max: 720_000, aliquota: 0.135, deduzir: 17_640 },
    { faixa: 4, max: 1_800_000, aliquota: 0.16, deduzir: 35_640 },
    { faixa: 5, max: 3_600_000, aliquota: 0.21, deduzir: 125_640 },
    { faixa: 6, max: 4_800_000, aliquota: 0.33, deduzir: 648_000 },
  ],
  V: [
    { faixa: 1, max: 180_000, aliquota: 0.155, deduzir: 0 },
    { faixa: 2, max: 360_000, aliquota: 0.18, deduzir: 4_500 },
    { faixa: 3, max: 720_000, aliquota: 0.195, deduzir: 9_900 },
    { faixa: 4, max: 1_800_000, aliquota: 0.205, deduzir: 17_100 },
    { faixa: 5, max: 3_600_000, aliquota: 0.23, deduzir: 62_100 },
    { faixa: 6, max: 4_800_000, aliquota: 0.305, deduzir: 540_000 },
  ],
};

export const FATOR_R_THRESHOLD = 0.28;

export function resolveFaixa(anexo, rbt12) {
  const rows = SIMPLES_ANEXOS[anexo];
  if (!rows) throw new Error(`Anexo Simples inválido: ${anexo}`);
  const value = Math.max(0, Number(rbt12) || 0);
  for (const row of rows) {
    if (value <= row.max) return row;
  }
  return rows[rows.length - 1];
}

export function effectiveAliquot(anexo, rbt12) {
  const value = Math.max(0, Number(rbt12) || 0);
  if (value <= 0) {
    const first = SIMPLES_ANEXOS[anexo]?.[0];
    return first ? first.aliquota : 0;
  }
  const faixa = resolveFaixa(anexo, value);
  const ae = (value * faixa.aliquota - faixa.deduzir) / value;
  return Math.max(0, Math.round(ae * 1e8) / 1e8);
}

export function resolveEffectiveAnexo(baseAnexo, fatorREligible, fatorR) {
  const anexo = String(baseAnexo || 'V').toUpperCase();
  if (fatorREligible && Number(fatorR) >= FATOR_R_THRESHOLD && (anexo === 'V' || anexo === 'III')) {
    return 'III';
  }
  return anexo;
}

export function computeFatorR(payroll12m, rbt12) {
  const revenue = Math.max(0, Number(rbt12) || 0);
  if (revenue <= 0) return 0;
  return Math.round((Math.max(0, Number(payroll12m) || 0) / revenue) * 1e6) / 1e6;
}

export function estimateTax({ base, anexo, rbt12, fatorREligible, fatorR }) {
  const effectiveAnexo = resolveEffectiveAnexo(anexo, fatorREligible, fatorR);
  const ae = effectiveAliquot(effectiveAnexo, rbt12);
  const amount = Math.round(Number(base || 0) * ae * 100) / 100;
  const faixa = resolveFaixa(effectiveAnexo, rbt12);
  return {
    effectiveAnexo,
    effectiveAliquot: ae,
    faixa: faixa.faixa,
    taxAmount: amount,
  };
}
