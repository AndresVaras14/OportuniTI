import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'OportuniTI — Radar de proyectos TI en Chile',
  description:
    'Licitaciones y oportunidades de proyectos tecnológicos vigentes, con requisitos y acceso directo a la fuente oficial.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'OportuniTI — Radar de proyectos TI en Chile',
    description: 'Encuentra proyectos tecnológicos vigentes y llega directo al canal oficial de postulación.',
    images: [{ url: '/oportuniti-og-card-1200x630.png', width: 1200, height: 630, alt: 'OportuniTI' }],
    locale: 'es_CL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OportuniTI — Radar de proyectos TI en Chile',
    description: 'Proyectos TI vigentes, requisitos y postulación oficial en un solo lugar.',
    images: ['/oportuniti-og-card-1200x630.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
