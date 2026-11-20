import type { MetadataRoute } from 'next';

// Transforma o site em um APP instalável (celular, tablet e computador)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Clínica Pet · Estoque & Clínica',
    short_name: 'MA Estoque',
    description: 'Controle de estoque e da clínica com auditoria',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#effafb',
    theme_color: '#1a7a8c',
    lang: 'pt-BR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Auditoria', url: '/movimentacoes', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Produtos', url: '/produtos', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
