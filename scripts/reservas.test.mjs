import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import worker from "../dist/worker.mjs";

test("Edición, disponibilidad, vencimiento y confirmación de pago", async () => {
  const sqlite = new DatabaseSync(":memory:");
  const DB = {
    prepare(sql) {
      const parametros = [];
      return {
        bind(...valores) {
          parametros.push(...valores);
          return this;
        },
        first() {
          return sqlite.prepare(sql).get(...parametros);
        },
        all() {
          return { results: sqlite.prepare(sql).all(...parametros) };
        },
        run() {
          return { meta: sqlite.prepare(sql).run(...parametros) };
        },
        ejecutar() {
          return this.all();
        },
      };
    },
    batch(consultas) {
      return consultas.map((c) => c.ejecutar());
    },
  };
  const env = { DB, CLAVE_MARCO: "prueba-local" };
  const origen = "https://prueba.local";
  async function pedir(ruta, datos, admin = false) {
    const headers = { Origin: origen };
    if (admin)
      headers.Authorization = "Basic " + btoa("marco:" + env.CLAVE_MARCO);
    return worker.fetch(
      new Request(origen + ruta, {
        method: datos ? "POST" : "GET",
        headers,
        body: datos ? JSON.stringify(datos) : undefined,
      }),
      env,
    );
  }
  assert.equal((await pedir("/admin/reservas")).status, 401);
  await pedir("/admin/inicializar", {}, true);
  await pedir("/admin/inicializar", {}, true);
  const tablero = async () => (await pedir("/api/tablero")).json();
  assert.equal((await tablero()).numeros.length, 200);
  const reserva = { numero: 1, nombre: "Prueba", contacto: "3510000000" };
  assert.equal((await pedir("/api/reservas", reserva)).status, 403);
  sqlite.exec(
    "UPDATE marco_rifa_ediciones SET abierta=1,instrucciones='Prueba local'",
  );
  const res = await pedir("/api/reservas", reserva);
  assert.equal(res.status, 201);
  const { referencia } = await res.json();
  assert.equal((await pedir("/api/reservas", reserva)).status, 409);
  sqlite.exec("UPDATE marco_rifa_numeros SET vence=0 WHERE numero=1");
  assert.equal((await tablero()).numeros[0].estado, "disponible");
  const nueva = await (await pedir("/api/reservas", reserva)).json();
  assert.equal(
    (
      await pedir(
        "/admin/actualizar",
        { numero: 1, accion: "pagar", referencia },
        true,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await pedir(
        "/admin/actualizar",
        { numero: 1, accion: "pagar", ...nueva },
        true,
      )
    ).status,
    200,
  );
  assert.deepEqual((await tablero()).numeros[0], {
    numero: 1,
    estado: "pagado",
  });
  assert.equal((await pedir("/api/reservas", reserva)).status, 409);
  const grupo = (numeros) =>
    pedir("/api/reservas", {
      nombre: reserva.nombre,
      contacto: reserva.contacto,
      numeros,
    });
  assert.equal((await grupo([1, 2])).status, 409);
  assert.equal((await tablero()).numeros[1].estado, "disponible");
  assert.equal((await grupo([2, 2])).status, 400);
  assert.equal((await grupo([2, 3, 4])).status, 201);
  assert.equal((await grupo([5])).status, 409);
  const filas = sqlite
    .prepare(
      "SELECT referencia FROM marco_rifa_numeros WHERE numero BETWEEN 2 AND 4 AND estado='reservado'",
    )
    .all();
  assert.equal(filas.length, 3);
  assert.equal(new Set(filas.map((fila) => fila.referencia)).size, 1);
  sqlite.close();
});
