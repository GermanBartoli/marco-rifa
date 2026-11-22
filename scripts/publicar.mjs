import { readFile } from "node:fs/promises";
const base =
  "https://api.cloudflare.com/client/v4/accounts/" +
  process.env.CLOUDFLARE_ACCOUNT_ID +
  "/workers/scripts/marco-rifa";
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
// D1 conserva los números existentes. Reanudar una publicación parcialmente aplicada es seguro.
const consultaD1 = async (sql, params = []) => {
  const url = base.replace("/workers/scripts/marco-rifa", "/d1/database/" + metadata.bindings[0].id + "/query");
  const respuesta = await fetch(url, { method: "POST", headers: {
    Authorization: "Bearer " + process.env.CLOUDFLARE_API_TOKEN, "Content-Type": "application/json",
  }, body: JSON.stringify({ sql, params }) });
  const datos = await respuesta.json();
  if (!datos.success) throw Error("No se pudo preparar D1: " + JSON.stringify(datos.errors));
  return datos.result[0].results;
};
const columnas = await consultaD1("PRAGMA table_info(marco_rifa_numeros)");
for (const [nombre, tipo] of [["apellido", "TEXT"], ["fase", "TEXT"], ["version", "INTEGER NOT NULL DEFAULT 0"]]) {
  if (!columnas.some(c => c.name === nombre))
    await consultaD1("ALTER TABLE marco_rifa_numeros ADD COLUMN " + nombre + " " + tipo);
}
await enviar("", { method: "PUT", body: formulario });
await enviar("/subdomain", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ enabled: true, previews_enabled: false }),
});
