'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/Auth';
import { type Acao, MovimentarModal } from '@/components/MovimentarModal';
import { BadgeCategoria, Cabecalho, Carregando, FotoProduto, Vazio } from '@/components/ui';
import { api, type Categoria, type Local, type Produto } from '@/lib/api';
import { CATEGORIAS, dinheiro, LOCAIS, qtd } from '@/lib/format';

function Lista() {
  const { admin } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [busca, setBusca] = useState(params.get('busca') ?? '');
  const cat = (params.get('categoria') as Categoria) || '';
  const comSaldoEm = (params.get('comSaldoEm') as Local) || '';
  const abaixoMinimo = params.get('abaixoMinimo') === 'true';
  const [produtos, setProdutos] = useState<Produto[] | null>(null);
  const [mov, setMov] = useState<{ p: Produto; a: Acao } | null>(null);

  const filtrar = (k: string, v: string) => {
    const q = new URLSearchParams(params.toString());
    if (v) q.set(k, v);
    else q.delete(k);
    router.replace(`/produtos?${q.toString()}`);
  };

  const carregar = useCallback(() => {
    api<Produto[]>('/produtos', { query: { categoria: cat, comSaldoEm, abaixoMinimo: abaixoMinimo || undefined, busca: params.get('busca') } })
      .then(setProdutos)
      .catch(() => setProdutos([]));
  }, [cat, comSaldoEm, abaixoMinimo, params]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // busca com pequeno atraso enquanto digita
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('busca') ?? '') !== busca) filtrar('busca', busca);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  return (
    <>
      <Cabecalho
        titulo="Produtos"
        subtitulo="Saldos separados: Estoque Geral e Clínica"
        acoes={<Link href="/produtos/novo" className="btn-primario">＋ Cadastrar produto</Link>}
      />

      <div className="card mb-4 space-y-3 p-3">
        <input className="input" placeholder="🔎 Buscar por nome, marca, descrição ou código de barras…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => filtrar('categoria', '')} className={`badge py-1.5 ${!cat ? 'bg-marca-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Todas</button>
          {CATEGORIAS.map((c) => (
            <button key={c.valor} onClick={() => filtrar('categoria', c.valor)} className={`badge py-1.5 ${cat === c.valor ? 'bg-marca-600 text-white' : c.cor}`}>
              {c.icone} {c.nome}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <select className="input w-auto py-1.5" value={comSaldoEm} onChange={(e) => filtrar('comSaldoEm', e.target.value)}>
            <option value="">Qualquer local</option>
            {LOCAIS.map((l) => (
              <option key={l.valor} value={l.valor}>Com saldo em: {l.nome}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 font-bold text-slate-600">
            <input type="checkbox" checked={abaixoMinimo} onChange={(e) => filtrar('abaixoMinimo', e.target.checked ? 'true' : '')} />
            Só abaixo do mínimo
          </label>
        </div>
      </div>

      {!produtos ? (
        <Carregando />
      ) : produtos.length === 0 ? (
        <div className="card"><Vazio texto="Nenhum produto encontrado." /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {produtos.map((p) => {
            const total = p.saldoEstoque + p.saldoClinica;
            const baixo = p.estoqueMinimo > 0 && total <= p.estoqueMinimo;
            return (
              <div key={p.id} className="card flex flex-col p-4">
                <Link href={`/produtos/${p.id}`} className="flex gap-3">
                  <FotoProduto url={p.imagemUrl} nome={p.nome} tamanho="h-16 w-16" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-extrabold leading-tight text-slate-800">{p.nome}</p>
                    <p className="truncate text-xs text-slate-400">{p.marca || 'Sem marca'} · {p.unidade}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <BadgeCategoria c={p.categoria} />
                      {baixo && <span className="badge bg-rose-100 text-rose-700">Estoque baixo</span>}
                    </div>
                  </div>
                </Link>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  {[
                    ['Estoque', p.saldoEstoque],
                    ['Clínica', p.saldoClinica],
                  ].map(([n, v]) => (
                    <div key={n as string} className="rounded-xl bg-marca-50 py-1.5">
                      <p className="text-[10px] font-bold uppercase text-slate-500">{n}</p>
                      <p className="text-lg font-extrabold text-marca-800">{qtd(v as number)}</p>
                    </div>
                  ))}
                </div>
                {admin && (
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>custo un. {dinheiro(p.custoUnitario)}</span>
                    <span>total {dinheiro(total * p.custoUnitario)}</span>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-4 gap-1.5 text-xs">
                  <button className="btn-secundario px-1 py-2" onClick={() => setMov({ p, a: 'ENTRADA' })} title="Entrada">📥<span className="hidden sm:inline">Entrada</span></button>
                  <button className="btn-secundario px-1 py-2" onClick={() => setMov({ p, a: 'TRANSFERENCIA' })} title="Mudar de lugar">🔁<span className="hidden sm:inline">Mover</span></button>
                  <button className="btn-secundario px-1 py-2" onClick={() => setMov({ p, a: 'SAIDA' })} title="Uso/perda">📤<span className="hidden sm:inline">Saída</span></button>
                  <button className="btn-secundario px-1 py-2" onClick={() => setMov({ p, a: 'AJUSTE' })} title="Contagem">📋<span className="hidden sm:inline">Contar</span></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mov && <MovimentarModal produto={mov.p} acao={mov.a} onFechar={() => setMov(null)} onFeito={carregar} />}
    </>
  );
}

export default function ProdutosPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <Lista />
    </Suspense>
  );
}
