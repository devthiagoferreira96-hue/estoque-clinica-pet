'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/Auth';
import { BadgeCategoria, Cabecalho, Carregando, Stat, Vazio } from '@/components/ui';
import { api, type Categoria } from '@/lib/api';
import { categoria, dinheiro, hoje, inicioMes, qtd } from '@/lib/format';

interface Periodo {
  totais: { entradas: number; enviadoClinica: number; usoClinica: number; perda: number; sumico: number; sobra: number };
  porProduto: {
    produtoId: string;
    nome: string;
    marca: string | null;
    categoria: Categoria;
    unidade: string;
    entradas: number;
    enviadoClinica: number;
    usoClinica: number;
    perda: number;
    sumico: number;
    valorUso: number;
    prejuizo: number;
  }[];
  porCategoria: { categoria: Categoria; entradas: number; usoClinica: number; perda: number; sumico: number }[];
  porResponsavel: {
    usuarioId: string;
    nome: string;
    entradas: number;
    transferencias: number;
    usosClinica: number;
    perdas: number;
    ajustesNegativos: number;
    prejuizo: number;
  }[];
}

export default function Relatorios() {
  const { admin } = useAuth();
  const [inicio, setInicio] = useState(inicioMes());
  const [fim, setFim] = useState(hoje());
  const [r, setR] = useState<Periodo | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setR(null);
    api<Periodo>('/relatorios/periodo', { query: { inicio, fim } })
      .then(setR)
      .catch((e) => setErro(e.message));
  }, [inicio, fim]);

  if (!admin) return <p className="card p-4">Apenas administradores.</p>;
  if (erro) return <p className="card p-4 text-rose-600">{erro}</p>;

  return (
    <>
      <Cabecalho
        titulo="Relatórios"
        subtitulo="O que entrou, o que a clínica usou, o que se perdeu e o que sumiu (valores de custo)"
        acoes={
          <>
            <input type="date" className="input w-auto" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            <input type="date" className="input w-auto" value={fim} onChange={(e) => setFim(e.target.value)} />
            <button className="btn-secundario no-print" onClick={() => window.print()}>🖨️</button>
          </>
        }
      />

      {!r ? (
        <Carregando />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat titulo="Entradas (compras)" valor={dinheiro(r.totais.entradas)} cor="text-emerald-600" />
            <Stat titulo="Enviado à clínica" valor={dinheiro(r.totais.enviadoClinica)} cor="text-sky-600" />
            <Stat titulo="Usado na clínica" valor={dinheiro(r.totais.usoClinica)} cor="text-violet-600" />
            <Stat titulo="Perdas (vencido/avaria)" valor={dinheiro(r.totais.perda)} cor="text-orange-600" />
            <Stat titulo="Sumiço (falta na contagem)" valor={dinheiro(r.totais.sumico)} cor="text-rose-600" detalhe={r.totais.sobra ? `sobras: ${dinheiro(r.totais.sobra)}` : undefined} />
          </div>
          <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
            💡 Faça a <b>contagem</b> (botão 📋 em Produtos) toda semana no Estoque Geral e na Clínica. Toda diferença vira um registro de
            &quot;sumiço&quot;, com data e responsável, e aparece aqui. Compare também &quot;enviado à clínica&quot; com &quot;usado na
            clínica&quot;: se muita coisa vai para a clínica e pouco uso é registrado, algo está saindo sem controle.
          </p>

          <section className="card mt-4 overflow-x-auto p-4">
            <h2 className="mb-3 font-extrabold text-marca-900">Por produto</h2>
            {r.porProduto.length === 0 ? (
              <Vazio texto="Nenhuma movimentação no período." />
            ) : (
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th className="text-right">Entrou</th>
                    <th className="text-right">→ Clínica</th>
                    <th className="text-right">Usado</th>
                    <th className="text-right">Perda</th>
                    <th className="text-right">Sumiu</th>
                    <th className="text-right">Valor usado</th>
                    <th className="text-right">Prejuízo</th>
                  </tr>
                </thead>
                <tbody>
                  {r.porProduto.map((p) => (
                    <tr key={p.produtoId}>
                      <td>
                        <Link href={`/produtos/${p.produtoId}`} className="font-bold hover:underline">{p.nome}</Link>{' '}
                        <BadgeCategoria c={p.categoria} />
                      </td>
                      <td className="text-right">{qtd(p.entradas)}</td>
                      <td className="text-right">{qtd(p.enviadoClinica)}</td>
                      <td className="text-right">{qtd(p.usoClinica)}</td>
                      <td className="text-right">{qtd(p.perda)}</td>
                      <td className={`text-right ${p.sumico ? 'font-extrabold text-rose-600' : ''}`}>{qtd(p.sumico)}</td>
                      <td className="text-right">{dinheiro(p.valorUso)}</td>
                      <td className={`text-right font-bold ${p.prejuizo ? 'text-rose-600' : 'text-slate-300'}`}>{dinheiro(p.prejuizo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card mt-4 overflow-x-auto p-4">
            <h2 className="mb-3 font-extrabold text-marca-900">Por categoria (valores de custo)</h2>
            {r.porCategoria.length === 0 ? (
              <Vazio texto="Sem dados." />
            ) : (
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th className="text-right">Entradas</th>
                    <th className="text-right">Uso na clínica</th>
                    <th className="text-right">Perdas</th>
                    <th className="text-right">Sumiço</th>
                  </tr>
                </thead>
                <tbody>
                  {r.porCategoria.map((c) => (
                    <tr key={c.categoria}>
                      <td className="font-bold">{categoria(c.categoria).icone} {categoria(c.categoria).nome}</td>
                      <td className="text-right">{dinheiro(c.entradas)}</td>
                      <td className="text-right">{dinheiro(c.usoClinica)}</td>
                      <td className="text-right">{dinheiro(c.perda)}</td>
                      <td className={`text-right ${c.sumico ? 'font-bold text-rose-600' : ''}`}>{dinheiro(c.sumico)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card mt-4 overflow-x-auto p-4">
            <h2 className="mb-3 font-extrabold text-marca-900">Por responsável</h2>
            {r.porResponsavel.length === 0 ? (
              <Vazio texto="Sem registros." />
            ) : (
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Funcionário</th>
                    <th className="text-right">Entradas</th>
                    <th className="text-right">Transferências</th>
                    <th className="text-right">Usos na clínica</th>
                    <th className="text-right">Perdas</th>
                    <th className="text-right">Faltas na contagem</th>
                    <th className="text-right">Prejuízo</th>
                  </tr>
                </thead>
                <tbody>
                  {r.porResponsavel.map((u) => (
                    <tr key={u.usuarioId}>
                      <td className="font-bold">{u.nome}</td>
                      <td className="text-right">{u.entradas}</td>
                      <td className="text-right">{u.transferencias}</td>
                      <td className="text-right">{u.usosClinica}</td>
                      <td className="text-right">{u.perdas}</td>
                      <td className="text-right">{u.ajustesNegativos}</td>
                      <td className="text-right font-bold text-rose-600">{dinheiro(u.prejuizo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </>
  );
}
