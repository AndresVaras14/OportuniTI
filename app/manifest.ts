import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OportuniTI — Radar de proyectos TI',
    short_name: 'OportuniTI',
    description: 'Oportunidades de proyectos y licitaciones TI vigentes en Chile.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f0e4',
    theme_color: '#123d2b',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
