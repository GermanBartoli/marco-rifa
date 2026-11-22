# Marco Rifa

Tablero de la primera edición solidaria para Marco. La vista previa permite explorar los 200 números. Reservas y cobros permanecen cerrados hasta definir las condiciones.

## Desarrollo

Node.js 24 y TypeScript. Ejecutar `npm ci`, `npm run build` y `npm test`. El Worker sirve la interfaz y consulta Cloudflare D1. Cada push a main ejecuta el flujo de publicación con el secreto de GitHub `CLOUDFLARE_API_TOKEN`.

## Administración

El panel `/admin` usa el usuario marco y la contraseña del secreto del Worker `CLAVE_MARCO`. La inicialización autenticada aplica `db/inicial.sql` de forma idempotente en bd-general. Todas las tablas propias llevan el prefijo marco_rifa_.

La edición empieza en vista previa. Para abrir reservas, definir primero el precio, las instrucciones de pago y las condiciones aplicables. La edición requiere instrucciones y apertura explícita en la base. Cada reserva activa dura 24 horas. Marco verifica la acreditación y confirma el pago desde el panel. El tablero público muestra solo números y estados. Los números pagados permanecen ocupados.
