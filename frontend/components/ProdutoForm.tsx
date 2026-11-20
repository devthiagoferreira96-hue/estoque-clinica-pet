'use client';
import { useState } from 'react';
import { Campo } from '@/components/ui';
import type { Categoria, Local, Produto } from '@/lib/api';
import { CATEGORIAS, dinheiro, LOCAIS, UNIDADES } from '@/lib/format';

export interface DadosProduto {
  nome: string;
  marca: string;
  descricao: string;
  categoria: Categoria;
  unidade: string;
  codigoBarras: string;
  custoUnitario: string;
  estoqueMinimo: string;
  quantidadeInicial: string;
  localInicial: Local;
  motivoEntrada: string;
}

const num = (s: string) => Number(String(s).replace(',', '.')) || 0;

export function ProdutoForm({
  inicial,
  novo,
  onSalvar,
  salvando,
}: {
  inicial?: Produto;
  novo?: boolean;
  onSalvar: (dados: Record<string, unknown>, imagem: File | null) => void;
  salvando: boolean;
}) {
  const [d, setD] = useState<DadosProduto>({
    nome: inicial?.nome ?? '',
    marca: inicial?.marca ?? '',
    descricao: inicial?.descricao ?? '',
    categoria: inicial?.categoria ?? 'RACOES',
    unidade: inicial?.unidade ?? 'UN',
    codigoBarras: inicial?.codigoBarras ?? '',
    custoUnitario: inicial ? String(inicial.custoUnitario) : '',
    estoqueMinimo: inicial ? String(inicial.estoqueMinimo) : '0',
    quantidadeInicial: '',
    localInicial: 'ESTOQUE',
    motivoEntrada: '',
  });
  const [imagem, setImagem] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(inicial?.imagemUrl ?? null);
  const set = (k: keyof DadosProduto) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setD({ ...d, [k]: e.target.value });

  const custo = num(d.custoUnitario);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const dados: Record<string, unknown> = {
      nome: d.nome.trim(),
      marca: d.marca.trim(),
      descricao: d.descricao.trim(),
      categoria: d.categoria,
      unidade: d.unidade,
      codigoBarras: d.codigoBarras.trim(),
      custoUnitario: custo,
      estoqueMinimo: num(d.estoqueMinimo),
    };
    if (novo && num(d.quantidadeInicial) > 0) {
      dados.quantidadeInicial = num(d.quantidadeInicial);
      dados.localInicial = d.localInicial;
      dados.motivoEntrada = d.motivoEntrada.trim() || undefined;
    }
    onSalvar(dados, imagem);
  }

  return (
    <form onSubmit={enviar} className="grid gap-4 lg:grid-cols-3">
      <div className="card space-y-4 p-5 lg:col-span-2">
        <div>
          <span className="label">Categoria</span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {CATEGORIAS.map((c) => (
              <button
                type="button"
                key={c.valor}
                onClick={() => setD({ ...d, categoria: c.valor })}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-xs font-bold transition ${
                  d.categoria === c.valor ? 'border-marca-500 bg-marca-50 text-marca-800' : 'border-slate-100 text-slate-500 hover:border-marca-200'
                }`}
              >
                <span className="text-2xl">{c.icone}</span>
                {c.nome}
              </button>
            ))}
          </div>
        </div>
        <Campo label="Nome do produto">
          <input className="input" value={d.nome} onChange={set('nome')} required minLength={2} placeholder="Ex.: Ração Golden Adulto Frango 15kg" />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Marca">
            <input className="input" value={d.marca} onChange={set('marca')} placeholder="Ex.: PremieR" />
          </Campo>
          <Campo label="Unidade">
            <select className="input" value={d.unidade} onChange={set('unidade')}>
              {UNIDADES.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Código de barras">
            <input className="input" value={d.codigoBarras} onChange={set('codigoBarras')} inputMode="numeric" placeholder="Opcional" />
          </Campo>
        </div>
        <Campo label="Descrição">
          <textarea className="input min-h-[90px]" value={d.descricao} onChange={set('descricao')} placeholder="Detalhes: sabor, porte, dosagem, validade, lote…" />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Valor unitário PAGO (R$)" dica="Usado para calcular o valor do estoque, do consumo e das perdas">
            <input className="input" inputMode="decimal" value={d.custoUnitario} onChange={set('custoUnitario')} required />
          </Campo>
          <Campo label="Estoque mínimo" dica="Avisa quando o total ficar abaixo">
            <input className="input" inputMode="decimal" value={d.estoqueMinimo} onChange={set('estoqueMinimo')} />
          </Campo>
        </div>
        {num(d.quantidadeInicial) > 0 && novo && (
          <div className="rounded-xl bg-marca-50 p-3 text-sm font-bold text-marca-800">
            Valor desta entrada: {dinheiro(custo * num(d.quantidadeInicial))}
          </div>
        )}

        {novo && (
          <div className="rounded-2xl border-2 border-dashed border-marca-200 p-4">
            <p className="mb-3 text-sm font-extrabold text-marca-800">📥 Quantidade que está chegando agora</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo label={`Quantidade (${d.unidade})`}>
                <input className="input" inputMode="decimal" value={d.quantidadeInicial} onChange={set('quantidadeInicial')} placeholder="0" />
              </Campo>
              <Campo label="Guardar em">
                <select className="input" value={d.localInicial} onChange={set('localInicial')}>
                  {LOCAIS.map((l) => (
                    <option key={l.valor} value={l.valor}>{l.nome}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Nota fiscal / motivo">
                <input className="input" value={d.motivoEntrada} onChange={set('motivoEntrada')} placeholder="Ex.: NF 4521" />
              </Campo>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <span className="label">Foto do produto</span>
          <label className="mt-1 flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-marca-200 bg-marca-50/50 text-center text-sm text-marca-600 hover:bg-marca-50">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Prévia" className="h-full w-full object-contain" />
            ) : (
              <>
                <span className="text-4xl">📷</span>
                <span className="mt-2 font-bold">Toque para tirar foto ou escolher</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setImagem(f);
                if (f) setPreview(URL.createObjectURL(f));
              }}
            />
          </label>
        </div>
        <button className="btn-primario w-full py-3 text-base" disabled={salvando}>
          {salvando ? 'Salvando…' : novo ? 'Cadastrar produto' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  );
}
