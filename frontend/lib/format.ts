import type { Categoria, Local, TipoMov } from './api';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const dinheiro = (n: number | null | undefined) => brl.format(Number(n || 0));
export const qtd = (n: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(Number(n || 0));
export const pct = (n: number) => `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(n)}%`;

export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
export const dataCurta = (d: string) => {
  const [a, m, dia] = d.slice(0, 10).split('-');
  return `${dia}/${m}/${a}`;
};

/** Data de hoje no formato AAAA-MM-DD (fuso local do aparelho) */
export const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const inicioMes = () => hoje().slice(0, 8) + '01';

export const CATEGORIAS: { valor: Categoria; nome: string; icone: string; cor: string }[] = [
  { valor: 'FARMACIA', nome: 'Farmácia', icone: '💊', cor: 'bg-rose-100 text-rose-700' },
  { valor: 'RACOES', nome: 'Rações', icone: '🦴', cor: 'bg-amber-100 text-amber-800' },
  { valor: 'ACESSORIOS', nome: 'Acessórios', icone: '🎾', cor: 'bg-violet-100 text-violet-700' },
  { valor: 'LIMPEZA', nome: 'Limpeza', icone: '🧴', cor: 'bg-sky-100 text-sky-700' },
  { valor: 'IDEX', nome: 'Idex', icone: '🧪', cor: 'bg-emerald-100 text-emerald-700' },
  { valor: 'INSUMOS', nome: 'Insumos', icone: '🩹', cor: 'bg-slate-200 text-slate-700' },
];
export const categoria = (c: Categoria) => CATEGORIAS.find((x) => x.valor === c)!;

export const LOCAIS: { valor: Local; nome: string; cor: string }[] = [
  { valor: 'ESTOQUE', nome: 'Estoque Geral', cor: 'bg-slate-100 text-slate-700' },
  { valor: 'CLINICA', nome: 'Clínica', cor: 'bg-marca-100 text-marca-800' },
];
export const nomeLocal = (l: Local | null) => (l ? LOCAIS.find((x) => x.valor === l)!.nome : '—');

export const TIPOS_MOV: Record<TipoMov, { nome: string; cor: string }> = {
  ENTRADA: { nome: 'Entrada', cor: 'bg-emerald-100 text-emerald-700' },
  TRANSFERENCIA: { nome: 'Transferência', cor: 'bg-sky-100 text-sky-700' },
  USO_CLINICA: { nome: 'Uso na clínica', cor: 'bg-violet-100 text-violet-700' },
  PERDA: { nome: 'Perda', cor: 'bg-rose-100 text-rose-700' },
  AJUSTE_INVENTARIO: { nome: 'Ajuste de inventário', cor: 'bg-amber-100 text-amber-800' },
};

export const UNIDADES = ['UN', 'KG', 'G', 'L', 'ML', 'CX', 'FR', 'PCT', 'AMP', 'DOSE'];
