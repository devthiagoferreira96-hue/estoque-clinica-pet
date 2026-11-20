'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ProdutoForm } from '@/components/ProdutoForm';
import { Cabecalho, useAviso } from '@/components/ui';
import { api, type Produto } from '@/lib/api';

export default function NovoProduto() {
  const router = useRouter();
  const avisar = useAviso();
  const [salvando, setSalvando] = useState(false);

  async function salvar(dados: Record<string, unknown>, imagem: File | null) {
    setSalvando(true);
    try {
      const p = await api<Produto>('/produtos', { body: dados });
      if (imagem) {
        const form = new FormData();
        form.append('imagem', imagem);
        try {
          await api(`/produtos/${p.id}/imagem`, { form });
        } catch (e: any) {
          avisar('Produto salvo, mas a foto falhou: ' + e.message, 'erro');
        }
      }
      avisar('Produto cadastrado!');
      router.push(`/produtos/${p.id}`);
    } catch (e: any) {
      avisar(e.message, 'erro');
      setSalvando(false);
    }
  }

  return (
    <>
      <Cabecalho titulo="Cadastrar produto" subtitulo="A quantidade inicial já entra registrada no log de auditoria" />
      <ProdutoForm novo onSalvar={salvar} salvando={salvando} />
    </>
  );
}
