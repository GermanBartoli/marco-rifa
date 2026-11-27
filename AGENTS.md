# Guía de marco-rifa

El tablero de 200 números usa `src/servidor.ts`, `src/portada.html` y `src/panel.html`. Revisá `db` y `scripts/reservas.test.mjs` si cambia el manejo de reservas. Conservá los originales de los premios en `originales`.

Usá npm con `package-lock.json`. Corré `npm run build` y después `npm test`. El compilador genera `dist/worker.mjs`. Al verificar la publicación, abrí el dominio público de marco-sorteo indicado en el README, que reenvía al servicio mediante el enlace SORTEO.

Consultá los pasos de publicación en [el flujo de GitHub Actions](.github/workflows/publicar.yml).

## Permisos del panel de la rifa

Marco y Germán deben poder realizar las mismas operaciones sobre la rifa, incluida la venta de números reservados. Marco usa el rol `rifa`. La bóveda, los secretos y los demás proyectos son privados de Germán. Al cambiar el panel, probá la venta con ambos perfiles y verificá que Marco siga sin acceso a los recursos privados.
