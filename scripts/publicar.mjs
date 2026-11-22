import { readFile } from "node:fs/promises";
const base =
  "https://api.cloudflare.com/client/v4/accounts/" +
  process.env.CLOUDFLARE_ACCOUNT_ID +
  "/workers/scripts/";
const metadata = {
  keep_assets: true,
  main_module: "worker.mjs",
  compatibility_date: "2026-11-21",
  keep_bindings: ["secret_text"],
  bindings: [
    { type: "d1", name: "DB", id: "601dd03e-4773-43ad-a57d-039bb588d789" },
  ],
  observability: { enabled: true, traces: { enabled: true } },
};
const formulario = new FormData();
formulario.set("metadata", JSON.stringify(metadata));
formulario.set(
  "worker.mjs",
  new Blob([await readFile("dist/worker.mjs")], {
    type: "application/javascript+module",
  }),
  "worker.mjs",
);
async function enviar(ruta, opciones) {
  const respuesta = await fetch(base + ruta, {
    ...opciones,
    headers: {
      Authorization: "Bearer " + process.env.CLOUDFLARE_API_TOKEN,
      ...opciones.headers,
    },
  });
  const datos = await respuesta.json();
  if (!datos.success) throw new Error(JSON.stringify(datos.errors));
}
const direccion = new FormData();
direccion.set("metadata", JSON.stringify({
  main_module: "direccion-sorteo.mjs",
  compatibility_date: metadata.compatibility_date,
  bindings: [{ type: "service", name: "SORTEO", service: "marco-rifa" }],
}));
direccion.set("direccion-sorteo.mjs", new Blob(
  [await readFile("src/direccion-sorteo.mjs")], { type: "application/javascript+module" },
), "direccion-sorteo.mjs");
await enviar("marco-sorteo", { method: "PUT", body: direccion });
const habilitarDireccion = {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ enabled: true, previews_enabled: false }),
};
await enviar("marco-sorteo/subdomain", habilitarDireccion);
await enviar("marco-rifa", { method: "PUT", body: formulario });
await enviar("marco-rifa/subdomain", habilitarDireccion);
