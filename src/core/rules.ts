/**
 * IDs de regra emitidos como diagnostics.
 * Mantido em sync com RULES.md (fonte normativa).
 * Apenas regras que geram diagnostic distinto entram aqui.
 */
export const RULES = {
  R2_1: 'R2.1',
  R2_2: 'R2.2',
  R2_6: 'R2.6',
  R2_7: 'R2.7',
  R3_1: 'R3.1',
  R3_2: 'R3.2',
  R3_3: 'R3.3',
  R3_4: 'R3.4',
  R3_5: 'R3.5',
  R3_6: 'R3.6',
  R3_7: 'R3.7',
  R4_2: 'R4.2',
  R4_5: 'R4.5',
  R4_6: 'R4.6',
  R4_7: 'R4.7',
  R4_8: 'R4.8',
  R5_2: 'R5.2',
  R5_5: 'R5.5',
} as const;

export type RuleId = (typeof RULES)[keyof typeof RULES];
