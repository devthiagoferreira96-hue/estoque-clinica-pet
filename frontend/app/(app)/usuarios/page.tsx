'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/Auth';
import { Cabecalho, Campo, Carregando, Modal, useAviso } from '@/components/ui';
import { api, type Papel, type Usuario } from '@/lib/api';

export default function Equipe() {
  const { usuario: eu, admin } = useAuth();
  const avisar = useAviso();
  const [lista, setLista] = useState<Usuario[] | null>(null);
  const [form, setForm] = useState<{ id?: string; nome: string; email: string; senha: string; papel: Papel } | null>(null);

  const carregar = useCallback(() => {
    api<Usuario[]>('/usuarios').then(setLista);
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    try {
      if (form.id) {
        await api(`/usuarios/${form.id}`, { method: 'PATCH', body: { nome: form.nome, papel: form.papel, senha: form.senha || undefined } });
      } else {
        await api('/usuarios', { body: form });
      }
      avisar('Usuário salvo');
      setForm(null);
      carregar();
    } catch (err: any) {
      avisar(err.message, 'erro');
    }
  }

  async function alternar(u: Usuario) {
    try {
      await api(`/usuarios/${u.id}`, { method: 'PATCH', body: { ativo: !u.ativo } });
      carregar();
    } catch (err: any) {
      avisar(err.message, 'erro');
    }
  }

  if (!admin) return <p className="card p-4">Apenas administradores.</p>;

  return (
    <>
      <Cabecalho
        titulo="Equipe"
        subtitulo="Cada pessoa tem o seu login: assim o log mostra quem fez cada movimentação"
        acoes={<button className="btn-primario" onClick={() => setForm({ nome: '', email: '', senha: '', papel: 'FUNCIONARIO' })}>＋ Novo usuário</button>}
      />
      {!lista ? (
        <Carregando />
      ) : (
        <div className="card overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.id} className={u.ativo ? '' : 'opacity-50'}>
                  <td className="font-bold">{u.nome}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.papel === 'ADMIN' ? 'bg-marca-100 text-marca-800' : 'bg-slate-100 text-slate-600'}`}>
                      {u.papel === 'ADMIN' ? 'Administrador' : 'Funcionário'}
                    </span>
                  </td>
                  <td>{u.ativo ? 'Ativo' : 'Desativado'}</td>
                  <td className="whitespace-nowrap text-right">
                    <button className="btn-secundario py-1 text-xs" onClick={() => setForm({ id: u.id, nome: u.nome, email: u.email, senha: '', papel: u.papel })}>Editar</button>{' '}
                    {u.id !== eu?.id && (
                      <button className="btn-secundario py-1 text-xs" onClick={() => alternar(u)}>{u.ativo ? 'Desativar' : 'Reativar'}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card mt-4 p-4 text-sm text-slate-600">
        <p className="font-bold text-marca-800">O que cada papel pode fazer</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><b>Funcionário:</b> cadastra produtos, dá entrada, transfere entre Estoque e Clínica, registra uso/perda e faz contagem.</li>
          <li><b>Administrador:</b> tudo acima + vê valores de custo, edita produtos, vê relatórios e gerencia a equipe.</li>
        </ul>
      </div>

      <Modal aberto={!!form} titulo={form?.id ? 'Editar usuário' : 'Novo usuário'} onFechar={() => setForm(null)}>
        {form && (
          <form onSubmit={salvar} className="space-y-3">
            <Campo label="Nome">
              <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </Campo>
            <Campo label="E-mail (login)">
              <input className="input" type="email" value={form.email} disabled={!!form.id} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Campo>
            <Campo label={form.id ? 'Nova senha (deixe vazio para manter)' : 'Senha'}>
              <input className="input" type="password" value={form.senha} minLength={6} required={!form.id} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
            </Campo>
            <Campo label="Papel">
              <select className="input" value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value as Papel })}>
                <option value="FUNCIONARIO">Funcionário</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </Campo>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secundario" onClick={() => setForm(null)}>Cancelar</button>
              <button className="btn-primario">Salvar</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
