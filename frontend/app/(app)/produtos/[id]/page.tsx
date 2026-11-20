'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/Auth';
import { type Acao, MovimentarModal } from '@/components/MovimentarModal';
import { ProdutoForm } from '@/components/ProdutoForm';
import { BadgeCategoria, BadgeLocal, BadgeTipo, Carregando, FotoProduto, Modal, useAviso, Vazio } from '@/components/ui';
import { api, type Movimentacao, type Paginado, type Produto } from '@/lib/api';
import { dataHora, dinheiro, qtd } from '@/lib/format';

export default function DetalheProduto() {
  const { id } = useParams<{ id: string }>();
  const { admin } = useAuth();
  const avisar = useAviso();
  const [p, setP] = useState<Produto | null>(null);
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [acao, setAcao] = useState<Acao | null>(null);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    api<Produto>(`/produtos/${id}`).then(setP).catch((e) => avisar(e.message, 'erro'));
    api<Paginado<Movimentacao>>('/movimentacoes', { query: { produtoId: id, porPagina: 100 } }).then((r) => setMovs(r.itens));
  }, [id, avisar]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvar(dados: Record<string, unknown>, imagem: File | null) {
    setSalvando(true);
    try {
      await api(`/produtos/${id}`, { method: 'PATCH', body: dados });
      if (imagem) {
        const form = new FormData();
        form.append('imagem', imagem);
        await api(`/produtos/${id}/imagem`, { form });
      }
      avisar('Produto atualizado');
      setEditando(false);
      carregar();
    } catch (e: any) {
      avisar(e.message, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function desativar() {
    if (!confirm('Desativar este produto? Ele some das listas, mas o histórico continua guardado.')) return;
    try {
      await api(`/produtos/${id}`, { method: 'DELETE' });
      avisar('Produto desativado');
      carregar();
    } catch (e: any) {
      avisar(e.message, 'erro');
    }
  }

  if (!p) return <Carregando />;
  const total = p.saldoEstoque + p.saldoClinica;

  return (
    <>
      <Link href="/produtos" className="mb-3 inline-block text-sm font-bold text-marca-600 hover:underline">← Produtos</Link>

      <div className="card mb-4 flex flex-col gap-4 p-5 sm:flex-row">
        <FotoProduto url={p.imagemUrl} nome={p.nome} tamanho="h-36 w-36 sm:h-44 sm:w-44" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <BadgeCategoria c={p.categoria} />
            {!p.ativo && <span className="badge bg-slate-200 text-slate-600">Desativado</span>}
            {p.codigoBarras && <span className="badge bg-slate-100 text-slate-500">▥ {p.codigoBarras}</span>}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-marca-900">{p.nome}</h1>
          <p className="text-sm text-slate-500">{p.marca || 'Sem marca'} · unidade: {p.unidade}</p>
          {p.descricao && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{p.descricao}</p>}
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <span>Total: <b>{qtd(total)} {p.unidade}</b></span>
            {p.estoqueMinimo > 0 && (
              <span className={total <= p.estoqueMinimo ? 'font-bold text-rose-600' : ''}>Mínimo: {qtd(p.estoqueMinimo)}</span>
            )}
            {admin && (
              <>
                <span>Valor pago (un.): <b>{dinheiro(p.custoUnitario)}</b></span>
                <span>Valor em estoque: <b className="text-marca-700">{dinheiro(total * p.custoUnitario)}</b></span>
              </>
            )}
          </div>
          {admin && (
            <div className="mt-3 flex gap-2">
              <button className="btn-secundario py-1.5 text-xs" onClick={() => setEditando(true)}>✏️ Editar</button>
              {p.ativo && <button className="btn-secundario py-1.5 text-xs text-rose-600" onClick={desativar}>Desativar</button>}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        {[
          ['🏬 Estoque Geral', p.saldoEstoque],
          ['🩺 Clínica', p.saldoClinica],
        ].map(([n, v]) => (
          <div key={n as string} className="card p-4 text-center">
            <p className="text-xs font-bold text-slate-500 sm:text-sm">{n}</p>
            <p className="text-3xl font-extrabold text-marca-800">{qtd(v as number)}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button className="btn-primario" onClick={() => setAcao('ENTRADA')}>📥 Entrada</button>
        <button className="btn-secundario" onClick={() => setAcao('TRANSFERENCIA')}>🔁 Transferir</button>
        <button className="btn-secundario" onClick={() => setAcao('SAIDA')}>📤 Uso / Perda</button>
        <button className="btn-secundario" onClick={() => setAcao('AJUSTE')}>📋 Contagem</button>
      </div>

      <section className="card overflow-x-auto p-4">
        <h2 className="mb-3 font-extrabold text-marca-900">🔍 Histórico deste produto (auditoria)</h2>
        {movs.length === 0 ? (
          <Vazio texto="Sem movimentações." />
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>De → Para</th>
                <th className="text-right">Qtd</th>
                <th>Responsável</th>
                <th>Motivo</th>
                <th className="text-right">Saldos após (Estoque/Clínica)</th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap text-xs">{dataHora(m.createdAt)}</td>
                  <td><BadgeTipo t={m.tipo} /></td>
                  <td className="whitespace-nowrap"><BadgeLocal l={m.localOrigem} /> → <BadgeLocal l={m.localDestino} /></td>
                  <td className="text-right font-bold">{qtd(m.quantidade)}</td>
                  <td className="whitespace-nowrap font-semibold">{m.responsavel?.nome}</td>
                  <td className="min-w-[200px] text-xs text-slate-600">{m.motivo}</td>
                  <td className="whitespace-nowrap text-right text-xs text-slate-500">
                    {qtd(m.saldoEstoqueApos)} / {qtd(m.saldoClinicaApos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {acao && <MovimentarModal produto={p} acao={acao} onFechar={() => setAcao(null)} onFeito={carregar} />}
      <Modal aberto={editando} titulo="Editar produto" onFechar={() => setEditando(false)} largura="max-w-5xl">
        <ProdutoForm inicial={p} onSalvar={salvar} salvando={salvando} />
      </Modal>
    </>
  );
}
