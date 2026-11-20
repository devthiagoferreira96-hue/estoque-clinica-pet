'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BadgeLocal, BadgeTipo, Cabecalho, Carregando, FotoProduto, Vazio } from '@/components/ui';
import { api, type Local, type Movimentacao, type Paginado, type TipoMov, type Usuario } from '@/lib/api';
import { dataHora, LOCAIS, qtd, TIPOS_MOV } from '@/lib/format';

export default function Auditoria() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [f, setF] = useState({ tipo: '' as TipoMov | '', local: '' as Local | '', responsavelId: '', inicio: '', fim: '' });
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<Paginado<Movimentacao> | null>(null);

  useEffect(() => {
    api<Usuario[]>('/usuarios').then(setUsuarios).catch(() => {});
  }, []);

  useEffect(() => {
    setDados(null);
    api<Paginado<Movimentacao>>('/movimentacoes', { query: { ...f, pagina, porPagina: 50 } }).then(setDados);
  }, [f, pagina]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPagina(1);
    setF({ ...f, [k]: e.target.value });
  };
  const paginas = dados ? Math.max(1, Math.ceil(dados.total / dados.porPagina)) : 1;

  return (
    <>
      <Cabecalho
        titulo="Log de auditoria"
        subtitulo="Tudo que entrou, mudou de lugar, foi usado na clínica ou saiu — com responsável, motivo, data e hora. Este registro não pode ser apagado."
      />

      <div className="card mb-4 grid grid-cols-2 gap-2 p-3 md:grid-cols-5">
        <select className="input" value={f.tipo} onChange={set('tipo')}>
          <option value="">Todos os tipos</option>
          {Object.entries(TIPOS_MOV).map(([k, v]) => (
            <option key={k} value={k}>{v.nome}</option>
          ))}
        </select>
        <select className="input" value={f.local} onChange={set('local')}>
          <option value="">Todos os locais</option>
          {LOCAIS.map((l) => (
            <option key={l.valor} value={l.valor}>{l.nome}</option>
          ))}
        </select>
        <select className="input" value={f.responsavelId} onChange={set('responsavelId')}>
          <option value="">Todos os responsáveis</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>{u.nome}</option>
          ))}
        </select>
        <input type="date" className="input" value={f.inicio} onChange={set('inicio')} title="De" />
        <input type="date" className="input" value={f.fim} onChange={set('fim')} title="Até" />
      </div>

      {!dados ? (
        <Carregando />
      ) : dados.itens.length === 0 ? (
        <div className="card"><Vazio texto="Nenhuma movimentação com estes filtros." icone="🔍" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Data / hora</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>De → Para</th>
                <th className="text-right">Qtd</th>
                <th>Responsável</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {dados.itens.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap text-xs">{dataHora(m.createdAt)}</td>
                  <td>
                    <Link href={`/produtos/${m.produto?.id}`} className="flex items-center gap-2 hover:underline">
                      <FotoProduto url={m.produto?.imagemUrl ?? null} nome={m.produto?.nome ?? ''} tamanho="h-8 w-8" />
                      <span className="max-w-[220px] truncate font-bold">{m.produto?.nome}</span>
                    </Link>
                  </td>
                  <td><BadgeTipo t={m.tipo} /></td>
                  <td className="whitespace-nowrap"><BadgeLocal l={m.localOrigem} /> → <BadgeLocal l={m.localDestino} /></td>
                  <td className="text-right font-extrabold">{qtd(m.quantidade)} <span className="text-xs font-normal text-slate-400">{m.produto?.unidade}</span></td>
                  <td className="whitespace-nowrap font-semibold">{m.responsavel?.nome}</td>
                  <td className="min-w-[220px] text-xs text-slate-600">
                    {m.motivo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between p-3 text-sm">
            <span className="text-slate-500">{dados.total} registro(s)</span>
            <div className="flex items-center gap-2">
              <button className="btn-secundario py-1.5" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>‹</button>
              <span className="font-bold">{pagina} / {paginas}</span>
              <button className="btn-secundario py-1.5" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>›</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
