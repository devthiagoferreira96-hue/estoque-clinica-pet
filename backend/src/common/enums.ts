export enum Categoria {
  FARMACIA = 'FARMACIA',
  RACOES = 'RACOES',
  ACESSORIOS = 'ACESSORIOS',
  LIMPEZA = 'LIMPEZA',
  IDEX = 'IDEX',
  INSUMOS = 'INSUMOS',
}

export enum Local {
  ESTOQUE = 'ESTOQUE',
  CLINICA = 'CLINICA',
}

export enum TipoMovimentacao {
  ENTRADA = 'ENTRADA',
  TRANSFERENCIA = 'TRANSFERENCIA',
  USO_CLINICA = 'USO_CLINICA',
  PERDA = 'PERDA',
  AJUSTE_INVENTARIO = 'AJUSTE_INVENTARIO',
}

export enum Papel {
  ADMIN = 'ADMIN',
  FUNCIONARIO = 'FUNCIONARIO',
}

/** Nome da coluna de saldo de cada local */
export const CAMPO_SALDO: Record<Local, 'saldoEstoque' | 'saldoClinica'> = {
  [Local.ESTOQUE]: 'saldoEstoque',
  [Local.CLINICA]: 'saldoClinica',
};

export const NOME_LOCAL: Record<Local, string> = {
  [Local.ESTOQUE]: 'Estoque Geral',
  [Local.CLINICA]: 'Clínica',
};

/** Data de hoje (AAAA-MM-DD) no fuso da clínica */
export function hojeNoFuso(tz = process.env.TZ_CLINICA || 'America/Sao_Paulo') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
}
