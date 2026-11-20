'use client';
import { useState } from 'react';
import { useAuth } from '@/components/Auth';
import { Cabecalho, Campo, useAviso } from '@/components/ui';
import { api } from '@/lib/api';

export default function Conta() {
  const { usuario, sair } = useAuth();
  const avisar = useAviso();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [conf, setConf] = useState('');

  async function trocar(e: React.FormEvent) {
    e.preventDefault();
    if (nova !== conf) return avisar('As senhas não conferem', 'erro');
    try {
      await api('/usuarios/minha-senha', { body: { senhaAtual: atual, novaSenha: nova } });
      avisar('Senha alterada!');
      setAtual('');
      setNova('');
      setConf('');
    } catch (err: any) {
      avisar(err.message, 'erro');
    }
  }

  return (
    <>
      <Cabecalho titulo="Minha conta" subtitulo={`${usuario?.nome} · ${usuario?.email}`} />
      <form onSubmit={trocar} className="card max-w-md space-y-3 p-5">
        <h2 className="font-extrabold text-marca-900">Trocar senha</h2>
        <Campo label="Senha atual">
          <input className="input" type="password" value={atual} onChange={(e) => setAtual(e.target.value)} required />
        </Campo>
        <Campo label="Nova senha">
          <input className="input" type="password" value={nova} onChange={(e) => setNova(e.target.value)} minLength={6} required />
        </Campo>
        <Campo label="Confirmar nova senha">
          <input className="input" type="password" value={conf} onChange={(e) => setConf(e.target.value)} minLength={6} required />
        </Campo>
        <button className="btn-primario w-full">Salvar nova senha</button>
      </form>
      <button onClick={sair} className="btn-perigo mt-4">Sair do sistema</button>
    </>
  );
}
