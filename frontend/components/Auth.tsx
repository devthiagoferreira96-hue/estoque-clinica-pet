'use client';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { api, sessao, type Usuario } from '@/lib/api';

const AuthCtx = createContext<{ usuario: Usuario | null; sair: () => void; admin: boolean }>({
  usuario: null,
  sair: () => {},
  admin: false,
});

/** Protege as telas internas: sem login, volta para /login */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!sessao.token()) {
      router.replace('/login');
      return;
    }
    setUsuario(sessao.usuario());
    setPronto(true);
    // confirma com a API se o login ainda vale
    api<Usuario>('/auth/me')
      .then((u) => setUsuario(u))
      .catch(() => {});
  }, [router]);

  const sair = () => {
    sessao.sair();
    router.replace('/login');
  };

  if (!pronto) return null;
  return <AuthCtx.Provider value={{ usuario, sair, admin: usuario?.papel === 'ADMIN' }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
