'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/Auth';
import { AvisosProvider } from '@/components/ui';

const MENU = [
  { href: '/', nome: 'Início', icone: '🏠', mobile: true },
  { href: '/produtos', nome: 'Produtos', icone: '📦', mobile: true },
  { href: '/movimentacoes', nome: 'Auditoria', icone: '🔍', mobile: true },
  { href: '/relatorios', nome: 'Relatórios', icone: '📊', admin: true, mobile: true },
  { href: '/usuarios', nome: 'Equipe', icone: '👥', admin: true },
  { href: '/conta', nome: 'Minha conta', icone: '🔑' },
];

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { usuario, sair, admin } = useAuth();
  const ativo = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const itens = MENU.filter((m) => !m.admin || admin);

  return (
    <div className="min-h-screen lg:flex">
      {/* Menu lateral (computador) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-marca-100 bg-white lg:flex">
        <div className="flex items-center gap-3 p-5">
          <Image src="/logo.png" alt="Clínica Pet" width={52} height={52} />
          <div className="leading-tight">
            <p className="text-lg font-extrabold text-marca-800">Clínica Pet</p>
            <p className="text-[11px] font-semibold text-marca-500">Estoque & Clínica</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {itens.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                ativo(m.href) ? 'bg-marca-600 text-white shadow' : 'text-slate-600 hover:bg-marca-50'
              }`}
            >
              <span className="text-lg">{m.icone}</span> {m.nome}
            </Link>
          ))}
        </nav>
        <div className="m-3 rounded-2xl bg-marca-50 p-3">
          <p className="truncate text-sm font-bold text-marca-900">{usuario?.nome}</p>
          <p className="text-xs text-marca-600">{usuario?.papel === 'ADMIN' ? 'Administrador' : 'Funcionário'}</p>
          <button onClick={sair} className="mt-2 text-xs font-bold text-rose-600 hover:underline">
            Sair
          </button>
        </div>
      </aside>

      {/* Topo (celular) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-marca-100 bg-white/90 px-4 py-2 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Clínica Pet" width={36} height={36} />
          <span className="font-extrabold text-marca-800">Clínica Pet</span>
        </Link>
        <div className="flex items-center gap-1">
          {admin && <Link href="/usuarios" className="rounded-lg p-2 text-lg" aria-label="Equipe">👥</Link>}
          <Link href="/conta" className="rounded-lg p-2 text-lg" aria-label="Minha conta">🔑</Link>
        </div>
      </header>

      <main className="pb-safe mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">{children}</main>

      {/* Barra inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid auto-cols-fr grid-flow-col border-t border-marca-100 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {itens
          .filter((m) => m.mobile)
          .map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${ativo(m.href) ? 'text-marca-700' : 'text-slate-400'}`}
            >
              <span className={`text-xl ${ativo(m.href) ? '' : 'opacity-60 grayscale'}`}>{m.icone}</span>
              {m.nome}
            </Link>
          ))}
      </nav>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AvisosProvider>
        <Shell>{children}</Shell>
      </AvisosProvider>
    </AuthProvider>
  );
}
