# OportuniTI

Radar interno y responsive de oportunidades y licitaciones de proyectos TI en Chile.

## Funciones

- Búsqueda por proyecto, entidad o ID.
- Filtros por región, categoría, fuente y fecha de cierre.
- Vista de todo Chile con acceso rápido a Santiago hacia el sur.
- Ficha con requisitos, documentos, contacto y enlace de postulación oficial.
- Información obtenida desde Mercado Público/ChileCompra, UNGM, Banco Mundial y Codelco.
- Accesos oficiales monitoreados para BID y ENAP.
- Respaldo local verificado cuando ChileCompra no está disponible.
- Actualización automática cada 6 horas mediante GitHub Actions.

## Desarrollo local

```bash
npm install
npm run dev:github
```

La versión para GitHub Pages se construye con:

```bash
npm run build:github
```

## Actualizar y publicar

La publicación ocurre con GitHub Actions cuando se autoriza un cambio en `main`.
También puede actualizarse manualmente desde **Actions → Publicar OportuniTI en GitHub Pages → Run workflow**.
Ese flujo consulta las fuentes oficiales, filtra oportunidades TI vigentes, genera el archivo estático y publica el resultado sin necesitar una API propia.

Para mejorar la cobertura de Mercado Público se puede crear el secreto opcional
`CHILECOMPRA_TICKET` en GitHub. Si no existe, el sincronizador intenta el acceso público
y luego utiliza el conjunto OCDS de ChileCompra como respaldo.
