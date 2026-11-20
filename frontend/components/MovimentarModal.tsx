'use client';
import { useEffect, useState } from 'react';
import { Campo, FotoProduto, Modal, useAviso } from '@/components/ui';
import { api, type Local, type Produto } from '@/lib/api';
import { LOCAIS, nomeLocal, qtd } from '@/lib/format';

export type Acao = 'ENTRADA' | 'TRANSFERENCIA' | 'SAIDA' | 'AJUSTE';

const TITULOS: Record<Acao, string> = {
  ENTRADA: '📥 Entrada de mercadoria',
  TRANSFERENCIA: '🔁 Transferir (Estoque ⇄ Clínica)',
  SAIDA: '📤 Uso na clínica / Perda',
  AJUSTE: '📋 Contagem (inventário)',
};

const saldoDe = (p: Produto, l: Local) => (l === 'ESTOQUE' ? p.saldoEstoque : p.saldoClinica);

export function MovimentarModal({
  produto,
  acao,
  onFechar,
  onFeito,
}: {
  produto: Produto | null;
  acao: Acao;
  onFechar: () => void;
  onFeito: () => void;
}) {
  const avisar = useAviso();
  const [origem, setOrigem] = useState<Local>('ESTOQUE');
  const [destino, setDestino] = useState<Local>('CLINICA');
  const [local, setLocal] = useState<Local>('ESTOQUE');
  const [tipoSaida, setTipoSaida] = useState<'USO_CLINICA' | 'PERDA'>('USO_CLINICA');
  const [quantidade, setQuantidade] = useState('');
  const [custo, setCusto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!produto) return;
    setQuantidade('');
    setMotivo('');
    setCusto(String(produto.custoUnitario));
    setOrigem('ESTOQUE');
    setDestino('CLINICA');
    setLocal(acao === 'SAIDA' ? 'CLINICA' : 'ESTOQUE');
    setTipoSaida('USO_CLINICA');
  }, [produto, acao]);

  if (!produto) return null;
  const n = Number(quantidade.replace(',', '.'));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!produto) return;
    setEnviando(true);
    try {
      if (acao === 'ENTRADA') {
        await api('/movimentacoes/entrada', {
          body: { produtoId: produto.id, quantidade: n, local, custoUnitario: Number(custo.replace(',', '.')), motivo },
        });
      } else if (acao === 'TRANSFERENCIA') {
        await api('/movimentacoes/transferencia', { body: { produtoId: produto.id, origem, destino, quantidade: n, motivo } });
      } else if (acao === 'SAIDA') {
        await api('/movimentacoes/saida', { body: { produtoId: produto.id, local, tipo: tipoSaida, quantidade: n, motivo } });
      } else {
        await api('/movimentacoes/ajuste', { body: { produtoId: produto.id, local, saldoContado: n, motivo } });
      }
      avisar('Movimentação registrada no log de auditoria');
      onFeito();
      onFechar();
    } catch (err: any) {
      avisar(err.message, 'erro');
    } finally {
      setEnviando(false);
    }
  }

  const placeholder: Record<Acao, string> = {
    ENTRADA: 'Ex.: NF 12345 - Distribuidora X',
    TRANSFERENCIA: 'Ex.: Reposição do armário da clínica',
    SAIDA: tipoSaida === 'USO_CLINICA' ? 'Ex.: Consulta do Thor (prontuário 551)' : 'Ex.: Embalagem rasgada / vencido',
    AJUSTE: 'Ex.: Contagem mensal de outubro',
  };

  return (
    <Modal aberto titulo={TITULOS[acao]} onFechar={onFechar}>
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-marca-50 p-3">
        <FotoProduto url={produto.imagemUrl} nome={produto.nome} />
        <div className="min-w-0 text-sm">
          <p className="truncate font-extrabold">{produto.nome}</p>
          <p className="text-xs text-slate-500">
            Estoque {qtd(produto.saldoEstoque)} · Clínica {qtd(produto.saldoClinica)} ({produto.unidade})
          </p>
        </div>
      </div>

      <form onSubmit={salvar} className="space-y-3">
        {acao === 'TRANSFERENCIA' && (
          <div className="grid grid-cols-2 gap-3">
            <Campo label="De">
              <select
                className="input"
                value={origem}
                onChange={(e) => {
                  const o = e.target.value as Local;
                  setOrigem(o);
                  setDestino(o === 'ESTOQUE' ? 'CLINICA' : 'ESTOQUE');
                }}
              >
                {LOCAIS.map((l) => (
                  <option key={l.valor} value={l.valor}>{l.nome} ({qtd(saldoDe(produto, l.valor))})</option>
                ))}
              </select>
            </Campo>
            <Campo label="Para">
              <select className="input" value={destino} onChange={(e) => setDestino(e.target.value as Local)}>
                {LOCAIS.filter((l) => l.valor !== origem).map((l) => (
                  <option key={l.valor} value={l.valor}>{l.nome}</option>
                ))}
              </select>
            </Campo>
          </div>
        )}

        {acao === 'SAIDA' && (
          <div className="grid grid-cols-2 gap-2">
            {(['USO_CLINICA', 'PERDA'] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setTipoSaida(t)}
                className={`rounded-xl border-2 p-3 text-sm font-bold ${tipoSaida === t ? 'border-marca-500 bg-marca-50 text-marca-800' : 'border-slate-100 text-slate-500'}`}
              >
                {t === 'USO_CLINICA' ? '🩺 Uso em atendimento' : '🗑️ Perda / vencido'}
              </button>
            ))}
          </div>
        )}

        {acao !== 'TRANSFERENCIA' && (
          <Campo label={acao === 'ENTRADA' ? 'Entrar em' : 'Local'}>
            <select className="input" value={local} onChange={(e) => setLocal(e.target.value as Local)}>
              {LOCAIS.map((l) => (
                <option key={l.valor} value={l.valor}>
                  {l.nome} (atual: {qtd(saldoDe(produto, l.valor))})
                </option>
              ))}
            </select>
          </Campo>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Campo label={acao === 'AJUSTE' ? `Quantidade contada (${produto.unidade})` : `Quantidade (${produto.unidade})`}>
            <input className="input" inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required autoFocus />
          </Campo>
          {acao === 'ENTRADA' && (
            <Campo label="Valor pago (unit.)">
              <input className="input" inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} />
            </Campo>
          )}
        </div>

        {acao === 'AJUSTE' && quantidade !== '' && !isNaN(n) && (
          <p className={`rounded-xl p-3 text-sm font-bold ${n < saldoDe(produto, local) ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
            Sistema: {qtd(saldoDe(produto, local))} · Contado: {qtd(n)} · Diferença: {qtd(n - saldoDe(produto, local))}
            {n < saldoDe(produto, local) && ' — será registrado como FALTA em ' + nomeLocal(local)}
          </p>
        )}

        <Campo label="Motivo (obrigatório)" dica="Fica gravado no log de auditoria com o seu nome, data e hora.">
          <input className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={placeholder[acao]} required minLength={3} />
        </Campo>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secundario" onClick={onFechar}>Cancelar</button>
          <button className="btn-primario" disabled={enviando}>{enviando ? 'Salvando…' : 'Confirmar'}</button>
        </div>
      </form>
    </Modal>
  );
}
