# Guía de marco-rifa

El tablero de 200 números usa `src/servidor.ts`, `src/portada.html` y `src/panel.html`. Revisá `db` y `scripts/reservas.test.mjs` si cambia el manejo de reservas. Conservá los originales de los premios en `originales`.

Usá npm con `package-lock.json`. Corré `npm run build` y después `npm test`. El compilador genera `dist/worker.mjs`. Al verificar la publicación, abrí el dominio público de marco-sorteo indicado en el README, que reenvía al servicio mediante el enlace SORTEO.

Consultá los pasos de publicación en [el flujo de GitHub Actions](.github/workflows/publicar.yml).
