import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import { RegistrarSW } from '@/components/RegistrarSW';
import './globals.css';

const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Clínica Pet · Estoque', template: '%s · Clínica Pet Estoque' },
  description: 'Controle de estoque e da clínica, com log de auditoria',
  applicationName: 'Clínica Pet Estoque',
  appleWebApp: { capable: true, title: 'MA Estoque', statusBarStyle: 'default' },
  icons: {
    icon: [{ url: '/icons/favicon-48.png', sizes: '48x48' }, { url: '/icons/icon-192.png', sizes: '192x192' }],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#1a7a8c',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={nunito.variable}>
      <body className="font-sans">
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
