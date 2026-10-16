import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import './globals.css';

const manrope = localFont({ src: './fonts/manrope-variable.ttf', variable: '--font-manrope', display: 'swap' });

export const metadata: Metadata = {
  description: 'Explora el catálogo de Home Furniture. Busca productos y encuentra tu próxima elección.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
