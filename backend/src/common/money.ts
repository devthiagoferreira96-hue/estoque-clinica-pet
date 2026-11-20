import { ValueTransformer } from 'typeorm';

/** O Postgres devolve NUMERIC como texto; este transformer converte para number. */
export const numeric: ValueTransformer = {
  to: (v?: number | null) => v,
  from: (v?: string | null) => (v === null || v === undefined ? (v as any) : Number(v)),
};

/** Arredonda para 2 casas (dinheiro) sem erro de ponto flutuante. */
export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
/** Arredonda para 3 casas (quantidade, ex.: 1,250 kg de ração a granel). */
export const r3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;
