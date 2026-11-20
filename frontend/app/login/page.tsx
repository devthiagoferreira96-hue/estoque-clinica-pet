'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, sessao, type Usuario } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const r = await api<{ token: string; usuario: Usuario }>('/auth/login', { body: { email, senha } });
      sessao.salvar(r.token, r.usuario);
      router.replace('/');
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-marca-50 via-white to-marca-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="Logo Clínica Pet" width={150} height={150} priority className="drop-shadow-lg" />
          <h1 className="mt-3 text-3xl font-extrabold text-marca-800">Clínica Pet</h1>
          <p className="text-sm font-semibold text-marca-600">Controle de Estoque & Clínica</p>
        </div>
        <form onSubmit={entrar} className="card space-y-4 p-6">
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          </div>
          <div>
            <label className="label" htmlFor="senha">Senha</label>
            <input id="senha" type="password" className="input" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="current-password" />
          </div>
          {erro && <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{erro}</p>}
          <button className="btn-primario w-full py-3" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">Cada ação fica registrada com o seu nome.</p>
      </div>
    </main>
  );
}
