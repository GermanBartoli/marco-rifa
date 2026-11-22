import portada from "./portada.html";
import portadaSocial from "../originales/portada-social.jpg";
import miniatura from "../originales/marco-rifa-social.jpg";
import icono from "./favicon.svg";
import panel from "./panel.html";
import estilos from "./estilos.css";
import esquema from "../db/inicial.sql";
import pose from "../originales/marco-posando.webp";
import foto from "./marco.webp";

import solaz from "../originales/solaz.svg";
import granja from "../originales/lagranjadetello.jpg";

import ueme from "../originales/ueme.webp";
import lola from "../originales/lodelola_bar.jpg";
import mag from "../originales/magsuplementos.oficial.jpg";

import pista from "./pista.css";
import club from "../originales/club.webp";
import entrenamiento from "../originales/entrenamiento.jpg";
import prenda from "../originales/prenda.webp";
import proteina from "../originales/proteina.png";
import creatina from "../originales/creatina.png";
import pista_grano from "../originales/pista-grano.png";
import barlow_condensed from "../originales/fuentes/barlow-condensed.woff2";
import dm_sans from "../originales/fuentes/dm-sans.woff2";

const imagenes = new Map<string, [Uint8Array, string]>([
  ["/marco-rifa-social.jpg", [miniatura, "image/jpeg"]],
  ["/portada-social.jpg", [portadaSocial, "image/jpeg"]],
  ["/club.webp", [club, "image/webp"]],
  ["/entrenamiento.jpg", [entrenamiento, "image/jpeg"]],
  ["/prenda.webp", [prenda, "image/webp"]],
  ["/proteina.png", [proteina, "image/png"]],
  ["/creatina.png", [creatina, "image/png"]],
  ["/pista-grano.png", [pista_grano, "image/png"]],
  ["/barlow-condensed.woff2", [barlow_condensed, "font/woff2"]],
  ["/dm-sans.woff2", [dm_sans, "font/woff2"]],
  ["/marco-posando.webp", [pose, "image/webp"]],
  ["/marco.webp", [foto, "image/webp"]],
  ["/lagranjadetello.jpg", [granja, "image/jpeg"]],
  ["/ueme.webp", [ueme, "image/webp"]],
  ["/lodelola_bar.jpg", [lola, "image/jpeg"]],
  ["/magsuplementos.oficial.jpg", [mag, "image/jpeg"]],
]);

interface Entorno {
  DB: D1Database;
  CLAVE_MARCO?: string;
}
const cabeceras = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
};
const json = (valor: unknown, status = 200) =>
  Response.json(valor, { status, headers: cabeceras });
const recurso = (texto: string, tipo: string) =>
  new Response(texto, {
    headers: { ...cabeceras, "Content-Type": tipo + "; charset=utf-8" },
  });
const activo =
  "CASE WHEN estado='reservado' AND vence<=unixepoch() THEN 'disponible' ELSE estado END";

async function huella(texto: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)),
  );
}
async function autorizado(peticion: Request, env: Entorno) {
  if (!env.CLAVE_MARCO) return false;
  const recibido = await huella(peticion.headers.get("Authorization") || "");
  const correcto = await huella("Basic " + btoa("marco:" + env.CLAVE_MARCO));
  let diferencia = 0;
  for (let i = 0; i < correcto.length; i++)
    diferencia |= correcto[i] ^ recibido[i];
  return diferencia === 0;
}

async function atender(req: Request, env: Entorno): Promise<Response> {
  const url = new URL(req.url);
  const ruta = url.pathname;
  const leer = req.method === "GET";
  const ejecutar = req.method === "POST";
  if (ejecutar && req.headers.get("Origin") !== url.origin)
    return json("Origen inválido.", 403);
  if (ruta === "/admin" || ruta.startsWith("/admin/")) {
    if (!(await autorizado(req, env)))
      return new Response("Ingresá con la cuenta de Marco.", {
        status: 401,
        headers: {
          ...cabeceras,
          "WWW-Authenticate": 'Basic realm="Marco Rifa", charset="UTF-8"',
        },
      });
    if (leer && ruta === "/admin") return recurso(panel, "text/html");
    if (ejecutar && ruta === "/admin/inicializar") {
      const consultas = esquema
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      await env.DB.batch(consultas.map((s) => env.DB.prepare(s)));
      return json("Edición preparada.");
    }
    if (leer && ruta === "/admin/reservas") {
      return json(
        (
          await env.DB.prepare(
            `SELECT numero,nombre,contacto,referencia,estado,vence FROM marco_rifa_numeros WHERE edicion=1 AND (${activo})!='disponible' ORDER BY numero`,
          ).all()
        ).results,
      );
    }
    if (ejecutar && ruta === "/admin/actualizar") {
      const { numero, referencia, accion } = await req.json<{
        numero: number;
        referencia: string;
        accion: string;
      }>();
      if (!["pagar", "liberar"].includes(accion))
        return json("Acción inválida.", 400);
      const cambio =
        accion === "pagar"
          ? "estado='pagado', vence=NULL"
          : "estado='disponible', referencia=NULL, nombre=NULL, contacto=NULL, origen=NULL, vence=NULL";
      const resultado = await env.DB.prepare(
        `UPDATE marco_rifa_numeros SET ${cambio} WHERE edicion=1 AND numero=? AND referencia=? AND estado='reservado' AND vence>unixepoch()`,
      )
        .bind(numero, referencia)
        .run();
      return resultado.meta.changes
        ? json("Actualizado.")
        : json("La reserva ya cambió.", 409);
    }
  }
  if (
    req.method === "HEAD" &&
    [
      "/",
      "/marco-rifa-social.jpg",
      "/portada-social.jpg",
      "/favicon.svg",
    ].includes(ruta)
  ) {
    const respuesta = await atender(new Request(url, { method: "GET" }), env);
    return new Response(null, {
      status: respuesta.status,
      headers: respuesta.headers,
    });
  }
  if (leer && ruta === "/favicon.svg") return recurso(icono, "image/svg+xml");
  if (leer && ruta === "/") return recurso(portada, "text/html");
  if (leer && ruta === "/pista.css") return recurso(pista, "text/css");
  if (leer && ruta === "/estilos.css") return recurso(estilos, "text/css");
  if (leer && ruta === "/solaz.svg") return recurso(solaz, "image/svg+xml");
  const imagen = imagenes.get(ruta);
  if (leer && imagen) {
    const [contenido, tipo] = imagen;
    return new Response(new Uint8Array(contenido), {
      headers: {
        "Content-Type": tipo,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
  if (leer && ruta === "/api/tablero") {
    const [edicion, numeros] = await env.DB.batch([
      env.DB.prepare(
        "SELECT abierta,instrucciones FROM marco_rifa_ediciones WHERE id=1",
      ),
      env.DB.prepare(
        `SELECT numero,${activo} AS estado FROM marco_rifa_numeros WHERE edicion=1 ORDER BY numero`,
      ),
    ]);
    return json({ edicion: edicion.results[0], numeros: numeros.results });
  }
  if (ejecutar && ruta === "/api/reservas") {
    const edicion = await env.DB.prepare(
      "SELECT abierta,instrucciones FROM marco_rifa_ediciones WHERE id=1",
    ).first();
    if (!edicion?.abierta || !edicion.instrucciones)
      return json("Las reservas todavía están cerradas.", 403);
    const {
      numero,
      numeros = numero === undefined ? [] : [numero],
      nombre,
      contacto,
    } = await req.json<{
      numero?: number;
      numeros?: number[];
      nombre: string;
      contacto: string;
    }>();
    if (
      !Array.isArray(numeros) ||
      numeros.length < 1 ||
      numeros.length > 3 ||
      !numeros.every((n) => Number.isInteger(n) && n > 0) ||
      new Set(numeros).size !== numeros.length ||
      typeof nombre !== "string" ||
      nombre.trim().length < 2 ||
      nombre.length > 80 ||
      typeof contacto !== "string" ||
      !/^\+?[\d ()-]{7,24}$/.test(contacto) ||
      contacto.replace(/\D/g, "").length < 7
    )
      return json("Revisá el nombre y el teléfono.", 400);
    const origen = Array.from(
      await huella(
        env.CLAVE_MARCO +
          "|" +
          (req.headers.get("CF-Connecting-IP") || "local"),
      ),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    const referencia = crypto.randomUUID();
    const marcas = numeros.map(() => "?").join(",");
    const resultado = await env.DB.prepare(
      `WITH elegibles AS MATERIALIZED (
        SELECT numero FROM marco_rifa_numeros WHERE edicion=1 AND numero IN (${marcas}) AND (${activo})='disponible'
      )
      UPDATE marco_rifa_numeros SET estado='reservado',nombre=?,contacto=?,origen=?,referencia=?,vence=unixepoch()+86400
      WHERE edicion=1 AND numero IN (SELECT numero FROM elegibles)
      AND (SELECT count(*) FROM elegibles)=?
      AND EXISTS (SELECT 1 FROM marco_rifa_ediciones WHERE id=1 AND abierta=1 AND instrucciones!='')
      AND (SELECT count(*) FROM marco_rifa_numeros WHERE edicion=1 AND origen=? AND estado='reservado' AND vence>unixepoch()) + ? <= 3`,
    )
      .bind(
        ...numeros,
        nombre.trim(),
        contacto.trim(),
        origen,
        referencia,
        numeros.length,
        origen,
        numeros.length,
      )
      .run();
    return resultado.meta.changes
      ? json({ referencia }, 201)
      : json(
          "Algún número ya está ocupado o la selección supera el límite de tres reservas activas.",
          409,
        );
  }
  return json("Página inexistente.", 404);
}
export default {
  async fetch(req: Request, env: Entorno) {
    try {
      return await atender(req, env);
    } catch (error) {
      if (error instanceof SyntaxError) return json("Datos inválidos.", 400);
      console.error("Falló la operación de la rifa.");
      return json("No pudimos completar la operación.", 500);
    }
  },
};
