'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Categoria, Local, TipoMov } from '@/lib/api';
import { categoria, LOCAIS, TIPOS_MOV } from '@/lib/format';

// ---------------------------------------------------------------- Layout
export function Cabecalho({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: string; acoes?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-marca-900 sm:text-3xl">{titulo}</h1>
        {subtitulo && <p className="mt-0.5 text-sm text-slate-500">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export function Campo({ label, children, dica }: { label: string; children: React.ReactNode; dica?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-slate-400">{dica}</span>}
    </label>
  );
}

export function Vazio({ texto, icone = '🐾' }: { texto: string; icone?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-slate-400">
      <span className="text-4xl">{icone}</span>
      <p className="text-sm">{texto}</p>
    </div>
  );
}

export function Carregando() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-marca-100 border-t-marca-600" />
    </div>
  );
}

export function Stat({ titulo, valor, detalhe, cor = 'text-marca-800' }: { titulo: string; valor: string; detalhe?: string; cor?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className={`mt-1 text-2xl font-extrabold ${cor}`}>{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-slate-400">{detalhe}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Badges
export function BadgeCategoria({ c }: { c: Categoria }) {
  const x = categoria(c);
  return (
    <span className={`badge ${x.cor}`}>
      {x.icone} {x.nome}
    </span>
  );
}

export function BadgeLocal({ l }: { l: Local | null }) {
  if (!l) return <span className="text-slate-300">—</span>;
  const x = LOCAIS.find((y) => y.valor === l)!;
  return <span className={`badge ${x.cor}`}>{x.nome}</span>;
}

export function BadgeTipo({ t }: { t: TipoMov }) {
  const x = TIPOS_MOV[t];
  return <span className={`badge ${x.cor}`}>{x.nome}</span>;
}

export function FotoProduto({ url, nome, tamanho = 'h-12 w-12' }: { url: string | null; nome: string; tamanho?: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={nome} className={`${tamanho} shrink-0 rounded-xl border border-slate-100 bg-white object-cover`} />
  ) : (
    <div className={`${tamanho} flex shrink-0 items-center justify-center rounded-xl bg-marca-50 text-xl`}>🐾</div>
  );
}

// ---------------------------------------------------------------- Modal
export function Modal({
  aberto,
  titulo,
  onFechar,
  children,
  largura = 'max-w-lg',
}: {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: React.ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aberto, onFechar]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-marca-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onFechar}>
      <div
        className={`max-h-[92vh] w-full ${largura} overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-marca-900">{titulo}</h2>
          <button onClick={onFechar} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Fechar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Avisos (toast)
type Aviso = { id: number; texto: string; tipo: 'ok' | 'erro' };
const AvisoCtx = createContext<(texto: string, tipo?: 'ok' | 'erro') => void>(() => {});

export function AvisosProvider({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const avisar = useCallback((texto: string, tipo: 'ok' | 'erro' = 'ok') => {
    const id = Date.now() + Math.random();
    setAvisos((a) => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === 'erro' ? 6000 : 3500);
  }, []);
  return (
    <AvisoCtx.Provider value={avisar}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3">
        {avisos.map((a) => (
          <div
            key={a.id}
            className={`pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg ${
              a.tipo === 'ok' ? 'bg-marca-700 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            {a.tipo === 'ok' ? '✅ ' : '⚠️ '}
            {a.texto}
          </div>
        ))}
      </div>
    </AvisoCtx.Provider>
  );
}
export const useAviso = () => useContext(AvisoCtx);
