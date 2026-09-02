# OportuniTI

Radar interno y responsive de oportunidades y licitaciones de proyectos TI en Chile.

## Funciones

- Búsqueda por proyecto, entidad o ID.
- Filtros por región, categoría y fecha de cierre.
- Vista predeterminada desde Santiago hacia el sur.
- Ficha con requisitos, documentos, contacto y enlace de postulación oficial.
- Información oficial obtenida desde los datos abiertos OCDS de ChileCompra.
- Respaldo local verificado cuando ChileCompra no está disponible.

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
Ese flujo consulta ChileCompra, genera el archivo estático de oportunidades y publica el resultado sin necesitar una API propia.
