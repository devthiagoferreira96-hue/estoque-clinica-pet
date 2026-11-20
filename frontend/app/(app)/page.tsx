'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/Auth';
import { BadgeCategoria, BadgeLocal, BadgeTipo, Cabecalho, Carregando, FotoProduto, Stat, Vazio } from '@/components/ui';
import { api, type Categoria, type Local, type TipoMov } from '@/lib/api';
import { categoria, dataHora, dinheiro, qtd } from '@/lib/format';

interface Dashboard {
  saldos: { produtos: number; qtdEstoque: number; qtdClinica: number; valorEstoque: number; valorClinica: number };
  porCategoria: { categoria: Categoria; produtos: number; estoque: number; clinica: number; valorCusto: number }[];
  abaixoMinimo: {
    id: string;
    nome: string;
    marca: string | null;
    categoria: Categoria;
    unidade: string;
    imagemUrl: string | null;
    saldoEstoque: number;
    saldoClinica: number;
    estoqueMinimo: number;
  }[];
  hoje: { entradas: number; transferencias: number; usosClinica: number; perdas: number };
  ultimasMovimentacoes: {
    id: string;
    tipo: TipoMov;
    localOrigem: Local | null;
    localDestino: Local | null;
    quantidade: number;
    motivo: string;
    createdAt: string;
    produto: string;
    responsavel: string;
  }[];
}

export default function Inicio() {
  const { usuario, admin } = useAuth();
  const [d, setD] = useState<Dashboard | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api<Dashboard>('/relatorios/dashboard').then(setD).catch((e) => setErro(e.message));
  }, []);

  if (erro) return <p className="card p-4 text-rose-600">{erro}</p>;
  if (!d) return <Carregando />;

  return (
    <>
      <Cabecalho
        titulo={`Olá, ${usuario?.nome.split(' ')[0]}! 🐶`}
        subtitulo="Resumo do Estoque Geral e da Clínica"
        acoes={
          <>
            <Link href="/produtos" className="btn-secundario">📦 Movimentar</Link>
            <Link href="/produtos/novo" className="btn-primario">＋ Produto</Link>
          </>
        }
      />

      <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-marca-700">Hoje</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat titulo="Entradas" valor={String(d.hoje.entradas)} cor="text-emerald-600" />
        <Stat titulo="Transferências" valor={String(d.hoje.transferencias)} cor="text-sky-600" />
        <Stat titulo="Usos na clínica" valor={String(d.hoje.usosClinica)} cor="text-violet-600" />
        <Stat titulo="Perdas / faltas" valor={String(d.hoje.perdas)} cor="text-rose-600" />
      </div>

      <h2 className="mb-2 mt-6 text-sm font-extrabold uppercase tracking-wide text-marca-700">Onde está a mercadoria</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { l: 'ESTOQUE' as Local, nome: 'Estoque Geral', icone: '🏬', q: d.saldos.qtdEstoque, v: d.saldos.valorEstoque },
          { l: 'CLINICA' as Local, nome: 'Clínica', icone: '🩺', q: d.saldos.qtdClinica, v: d.saldos.valorClinica },
        ].map((x) => (
          <Link key={x.l} href={`/produtos?comSaldoEm=${x.l}`} className="card flex items-center gap-4 p-4 transition hover:border-marca-300">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-marca-50 text-3xl">{x.icone}</span>
            <div>
              <p className="text-sm font-bold text-slate-500">{x.nome}</p>
              <p className="text-2xl font-extrabold text-marca-800">{qtd(x.q)} <span className="text-sm font-bold text-slate-400">itens</span></p>
              {admin && <p className="text-xs text-slate-400">Valor (custo): {dinheiro(x.v)}</p>}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-extrabold text-marca-900">⚠️ Estoque baixo</h2>
            <Link href="/produtos?abaixoMinimo=true" className="text-xs font-bold text-marca-600 hover:underline">Ver todos</Link>
          </div>
          {d.abaixoMinimo.length === 0 ? (
            <Vazio texto="Nenhum produto abaixo do mínimo." icone="👍" />
          ) : (
            <ul className="divide-y divide-slate-50">
              {d.abaixoMinimo.map((p) => (
                <li key={p.id}>
                  <Link href={`/produtos/${p.id}`} className="flex items-center gap-3 py-2 hover:bg-marca-50/50">
                    <FotoProduto url={p.imagemUrl} nome={p.nome} tamanho="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{p.nome}</p>
                      <p className="text-xs text-slate-400">
                        Estoque {qtd(p.saldoEstoque)} · Clínica {qtd(p.saldoClinica)} — mínimo {qtd(p.estoqueMinimo)}
                      </p>
                    </div>
                    <BadgeCategoria c={p.categoria} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-extrabold text-marca-900">🔍 Últimas movimentações</h2>
            <Link href="/movimentacoes" className="text-xs font-bold text-marca-600 hover:underline">Ver tudo</Link>
          </div>
          {d.ultimasMovimentacoes.length === 0 ? (
            <Vazio texto="Nada registrado ainda." />
          ) : (
            <ul className="divide-y divide-slate-50">
              {d.ultimasMovimentacoes.map((m) => (
                <li key={m.id} className="py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <BadgeTipo t={m.tipo} />
                    <span className="font-bold">{qtd(m.quantidade)}× {m.produto}</span>
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                    <BadgeLocal l={m.localOrigem} /> → <BadgeLocal l={m.localDestino} /> · {m.responsavel} · {dataHora(m.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-6 overflow-x-auto p-4">
        <h2 className="mb-3 font-extrabold text-marca-900">Por categoria</h2>
        <table className="tabela">
          <thead>
            <tr>
              <th>Categoria</th>
              <th className="text-right">Produtos</th>
              <th className="text-right">Estoque Geral</th>
              <th className="text-right">Clínica</th>
              {admin && <th className="text-right">Valor (custo)</th>}
            </tr>
          </thead>
          <tbody>
            {d.porCategoria.map((c) => (
              <tr key={c.categoria}>
                <td>
                  <Link href={`/produtos?categoria=${c.categoria}`} className="font-bold hover:underline">
                    {categoria(c.categoria).icone} {categoria(c.categoria).nome}
                  </Link>
                </td>
                <td className="text-right">{c.produtos}</td>
                <td className="text-right">{qtd(c.estoque)}</td>
                <td className="text-right">{qtd(c.clinica)}</td>
                {admin && <td className="text-right">{dinheiro(c.valorCusto)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
