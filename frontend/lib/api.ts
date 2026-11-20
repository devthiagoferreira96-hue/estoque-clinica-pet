// ---------------------------------------------------------------- Tipos
export type Categoria = 'FARMACIA' | 'RACOES' | 'ACESSORIOS' | 'LIMPEZA' | 'IDEX' | 'INSUMOS';
export type Local = 'ESTOQUE' | 'CLINICA';
export type TipoMov = 'ENTRADA' | 'TRANSFERENCIA' | 'USO_CLINICA' | 'PERDA' | 'AJUSTE_INVENTARIO';
export type Papel = 'ADMIN' | 'FUNCIONARIO';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo?: boolean;
}

export interface Produto {
  id: string;
  nome: string;
  marca: string | null;
  descricao: string | null;
  categoria: Categoria;
  unidade: string;
  codigoBarras: string | null;
  imagemUrl: string | null;
  custoUnitario: number;
  saldoEstoque: number;
  saldoClinica: number;
  estoqueMinimo: number;
  ativo: boolean;
}

export interface Movimentacao {
  id: string;
  tipo: TipoMov;
  localOrigem: Local | null;
  localDestino: Local | null;
  quantidade: number;
  custoUnitario: number;
  motivo: string;
  saldoEstoqueApos: number;
  saldoClinicaApos: number;
  createdAt: string;
  produto?: Pick<Produto, 'id' | 'nome' | 'marca' | 'categoria' | 'unidade' | 'imagemUrl'>;
  responsavel?: { id: string; nome: string };
}

export interface Paginado<T> {
  itens: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

// ---------------------------------------------------------------- Cliente HTTP
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3334/api';
const TOKEN_KEY = 'mae_token';
const USER_KEY = 'mae_usuario';

export const sessao = {
  token: () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)),
  usuario: (): Usuario | null => {
    if (typeof window === 'undefined') return null;
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  salvar: (token: string, u: Usuario) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  },
  sair: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = any>(
  caminho: string,
  opts: { method?: string; body?: unknown; form?: FormData; query?: Record<string, unknown> } = {},
): Promise<T> {
  const url = new URL(API_URL + caminho);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  const headers: Record<string, string> = {};
  const token = sessao.token();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method || (opts.body !== undefined || opts.form ? 'POST' : 'GET'),
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique se a API está ligada.');
  }

  if (res.status === 401 && !caminho.startsWith('/auth/login')) {
    sessao.sair();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new ApiError(401, 'Sessão expirada. Entre novamente.');
  }
  const texto = await res.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!res.ok) {
    const msg = Array.isArray(dados?.message) ? dados.message.join(' • ') : dados?.message;
    throw new ApiError(res.status, msg || 'Erro inesperado');
  }
  return dados as T;
}
