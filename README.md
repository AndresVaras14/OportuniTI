# OportuniTI

Radar interno y responsive de oportunidades y licitaciones de proyectos TI en Chile.

## Funciones

- Búsqueda por proyecto, entidad, ID, descripción, ítems y habilidades (sin distinguir tildes).
- Filtros por región, categoría, fuente y fecha de cierre.
- Vista de todo Chile con acceso rápido a Santiago hacia el sur.
- Ficha con requisitos, documentos, contacto y enlace de postulación oficial.
- Consulta automática de Mercado Público/ChileCompra, UNGM, Banco Mundial, Codelco, Freelancer (filtro de país CL) y PNUD Chile. Cada fuente muestra por separado si respondió, no tuvo coincidencias o falló.
- BID, ENAP y Workana Chile son accesos manuales, no conectores automáticos. Workana bloquea la lectura automatizada. No se cuentan sus portales como oportunidades.
- 18 áreas: desarrollo a medida, web/e-commerce, aplicaciones móviles, integraciones/API, instalación/configuración, ERP/CRM, licencias, soporte, hardware, redes, cloud/DevOps, ciberseguridad, datos/BI, IA/automatización, UX/UI, consultoría, capacitación y servicios por precisar.
- La mera aparición de “software” o “Moodle” no implica desarrollo. La clasificación es heurística, prioriza la actividad pedida en el título y puede requerir revisión humana.
- Descripción sin recorte, todos los ítems recibidos, responsables del contrato/pago, fechas del calendario y condiciones que publica la fuente. Los datos ausentes se indican como no publicados; no se fabrican requisitos ni contactos.
- Proyectos freelance con estado abierto y sin cierre publicado: se muestran únicamente durante las 24 horas siguientes a la comprobación, sin inventar una fecha límite. Se excluyen los avisos permanentes marcados fulltime.
- Un fallo al descargar el archivo en el navegador usa el respaldo local; una respuesta válida vacía no se reemplaza por anuncios antiguos.
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

No es una cobertura exhaustiva de todo el mercado: algunas fuentes exigen acceso para anexos/contactos, y pueden limitar peticiones. El feed público no incluye contenido privado. Los plazos se muestran en hora de Chile continental, incluyendo cambios de horario. Los textos originales de proyectos en otros idiomas se preservan.

## Verificación

```bash
npm test
npm run sync:opportunities
npm run build:github
```

Las pruebas no consultan internet; verifican clasificación (incluidos falsos positivos), detalle sin truncar, filtro de país, cierres, horarios y enlaces seguros. El sincronizador consulta las fuentes en paralelo y limita las peticiones de detalle de Mercado Público con espera y reintentos. Ya no corta el listado TI en 80 candidatos.

Para mejorar la cobertura de Mercado Público se puede crear el secreto opcional
`CHILECOMPRA_TICKET` en GitHub. Si no existe, el sincronizador intenta el acceso público
y luego utiliza el conjunto OCDS de ChileCompra como respaldo.
