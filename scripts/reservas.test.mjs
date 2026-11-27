import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import worker from "../dist/worker.mjs";

test("Edición, disponibilidad, vencimiento y confirmación de pago", async t => {
  const instante = "2026-11-23T00:00:00-03:00";
  t.mock.method(Date, "now", () => Date.parse(instante));
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
  const origen = "https://rifa.interna";
  const accesoPublico = await worker.fetch(new Request("https://prueba.local/admin"), env);
  assert.equal(accesoPublico.status, 303);
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
    "UPDATE marco_rifa_ediciones SET abierta=1,instrucciones='Alias: PRUEBA.LOCAL · Transferencia'",
  );
  assert.equal((await tablero()).edicion.enHorario, true);
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
    estado: "pagado", titular: "P****",
  });
  assert.equal((await pedir("/api/reservas", reserva)).status, 409);
  const rango = (inicio, cantidad) => Array.from({ length: cantidad }, (_, i) => inicio + i);
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
  assert.equal((await grupo([5, 31, 32, 33, 34, 35])).status, 201);
  assert.equal((await grupo(rango(61, 10))).status, 201);
  assert.equal((await grupo([6])).status, 409);
  assert.equal((await grupo(rango(100, 21))).status, 400);
  const otro = await pedir("/api/reservas", {numeros:[6,7,8,9,10,21,22,23,24,25,...rango(71, 10)], nombre:"Ana", apellido:"Ríos", contacto:"3511234567"});
  assert.equal(otro.status, 201);
  const datos = await otro.json();
  assert.equal(datos.total, 140000);
  assert.equal(datos.alias, "PRUEBA.LOCAL");
  assert.equal((await pedir("/api/reservas", {numero:11,nombre:"Ana",contacto:"+54 9 3511234567"})).status, 409);
  const inicial = (await (await pedir("/admin/reservas", undefined, true)).json()).find(n => n.numero === 6);
  const ahora = sqlite.prepare("SELECT unixepoch() AS ahora").get().ahora;
  assert.ok(inicial.vence - ahora <= 86400 && inicial.vence - ahora >= 86398);
  assert.equal(inicial.estado, "apartado");
  for (const [indice, [accion, esperado]] of [["reservar","reservado"],["revisar","revision"],["pagar","pagado"]].entries()) {
    const cambio = {numero:6,referencia:datos.referencia,accion,version:inicial.version+indice,nombre:"María",apellido:"Paz",contacto:inicial.contacto};
    assert.equal((await pedir("/admin/actualizar",cambio,true)).status,200);
    assert.equal((await pedir("/admin/actualizar",cambio,true)).status,409);
    assert.deepEqual((await tablero()).numeros[5],{numero:6, estado:esperado,titular:"M**** P****"});
  }
  const filas = sqlite
    .prepare(
      "SELECT referencia FROM marco_rifa_numeros WHERE numero BETWEEN 2 AND 4 AND estado='reservado'",
    )
    .all();
  assert.equal(filas.length, 3);
  assert.equal(new Set(filas.map((fila) => fila.referencia)).size, 1);
  const reservasAdmin = async () => (await pedir("/admin/reservas", undefined, true)).json();
  const libre = (await reservasAdmin()).find(fila => fila.numero === 11);
  assert.deepEqual(libre, { numero: 11, estado: "disponible", version: 0 });
  const manual = { numero: 11, accion: "reservar", version: libre.version, nombre: "Luz", contacto: "3511111111" };
  const actualizar = datos => pedir("/admin/actualizar", datos, true);
  assert.equal((await actualizar(manual)).status, 200);
  assert.equal((await actualizar(manual)).status, 409);
  const asignado = (await reservasAdmin()).find(fila => fila.numero === 11);
  assert.ok(asignado.referencia);
  assert.equal(asignado.estado, "reservado");
  assert.equal((await actualizar({ ...asignado, accion: "liberar" })).status, 200);
  assert.equal((await actualizar(manual)).status, 409);
  sqlite.exec("UPDATE marco_rifa_numeros SET vence=0 WHERE numero=7");
  const vencido = (await reservasAdmin()).find(fila => fila.numero === 7);
  assert.equal((await actualizar({ ...manual, numero: 7, accion: "pagar", version: vencido.version })).status, 200);
  const vendido = (await reservasAdmin()).find(fila => fila.numero === 7);
  assert.notEqual(vendido.referencia, datos.referencia);
  assert.equal(vendido.estado, "pagado");
  const asignar = (numeros, version = 0) => actualizar({
    ...manual, seleccion: numeros.map(numero => ({numero, version})), accion: "pagar",
  });
  assert.equal((await asignar([12, 13, 13])).status, 400);
  assert.equal((await asignar([12, 13], 1)).status, 409);
  assert.equal((await asignar([12, 13, 7])).status, 409);
  assert.equal((await asignar(rango(81, 10))).status, 200);
  assert.equal((await asignar([12, 13, 14, 15, 16, 17, 18, 19, 20, 26])).status, 409);
  assert.equal((await asignar([12, 13, 14, 15, 16, 17, 18, 19, 20])).status, 200);
  assert.equal((await asignar([12, 13, 14, 15, 16, 17, 18, 19, 20])).status, 409);
  const lote = (await reservasAdmin()).filter(fila => fila.numero >= 12 && fila.numero <= 15);
  assert.equal(new Set(lote.map(fila => fila.referencia)).size, 1);
  assert.ok(lote.every(fila => fila.nombre === "Luz" && fila.estado === "pagado" && fila.version === 1));
  assert.equal((await actualizar({ ...manual, numero: 26 })).status, 409);
  assert.equal((await asignar(rango(100, 21))).status, 400);
  sqlite.close();
});
