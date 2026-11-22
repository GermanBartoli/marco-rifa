# Sorteo de Marco

Tablero del sorteo a beneficio de Marco con 200 números.

La dirección pública es https://marco-sorteo.bartoligerman497.workers.dev/. El Worker de esa dirección reenvía las solicitudes al servicio existente mediante el enlace privado SORTEO.

## Desarrollo

Node.js 24 y TypeScript. Ejecutar `npm ci`, `npm run build` y `npm test`. El Worker sirve la interfaz y consulta Cloudflare D1. Cada push a main ejecuta el flujo de publicación con el secreto de GitHub `CLOUDFLARE_API_TOKEN`.

## Administración

El panel `/admin` abre Bóveda Bartoli. Cloudflare Access verifica el correo y el panel comprueba el permiso de rifa antes de consultar las reservas mediante un enlace privado entre Workers. La inicialización autenticada aplica `db/inicial.sql` de forma idempotente en la D1 dedicada `marco-rifa`. Todas las tablas propias llevan el prefijo marco_rifa_.

Para actualizar una base anterior a la versión 1.12, aplicar una vez `db/actualizacion-estados.sql` antes de publicar. Las bases nuevas ya incorporan estas columnas.

La edición acepta reservas de 08:00 a 22:00 (Argentina). Cada WhatsApp puede tener hasta cinco números ocupados. Los apartados vencen en una hora. Al revisar un comprobante o confirmar una reserva, Marco conserva los números hasta liberarlos o marcarlos vendidos. El tablero público muestra únicamente los estados y las iniciales enmascaradas.

Germán puede editar los textos de portada y la apertura e instrucciones de la edición desde [Panel Bartoli](https://panel-bartoli.bartoligerman497.workers.dev/panel/edicion). Marco usa el módulo de reservas y pagos. Los campos de portada vacíos conservan la redacción original.
