import portada from "./portada.html";
import portadaSocial from "../originales/portada-social.jpg";
import miniaturaGris from "../originales/marco-fondo-gris-social.jpg";
import miniatura from "../originales/marco-rifa-social.jpg";
import icono from "./favicon.svg";
import panel from "./panel.html";
import estilos from "./estilos.css";
import colores from "./estados.css";
import esquema from "../db/inicial.sql";
import pose from "../originales/marco-fondo-gris.png";
import foto from "./marco.webp";

import solaz from "../originales/solaz.svg";
import logoTello from "../originales/tello-mercado.png";
import desayunoLola from "./desayuno-lola.webp";
import granja from "../originales/lagranjadetello.jpg";

import ueme from "../originales/ueme.webp";
import lola from "../originales/lodelola_bar.jpg";
import mag from "../originales/magsuplementos.oficial.jpg";

import pista from "./pista.css";
import logosPatrocinadores from "../originales/logos-patrocinadores.png";
import botellaSolaz from "../originales/botella-solaz.png";
import club from "../originales/club.webp";
import entrenamiento from "../originales/entrenamiento.jpg";
import remeraGris from "../originales/remera-gris.webp";
import mascaraRemera from "../originales/mascara-remera.png";
import prenda from "../originales/prenda.webp";
import deportistaCreatina from "../originales/deportista-creatina-mag.png";
import proteina from "../originales/proteina.png";
import creatina from "../originales/creatina.png";
import pista_grano from "../originales/pista-grano.png";
import barlow_condensed from "../originales/fuentes/barlow-condensed.woff2";
import dm_sans from "../originales/fuentes/dm-sans.woff2";

const imagenes = new Map<string, [Uint8Array, string]>([
  ["/marco-fondo-gris-social.jpg", [miniaturaGris, "image/jpeg"]],
  ["/marco-rifa-social.jpg", [miniatura, "image/jpeg"]],
  ["/portada-social.jpg", [portadaSocial, "image/jpeg"]],
  ["/logos-patrocinadores.png", [logosPatrocinadores, "image/png"]],
  ["/botella-solaz.png", [botellaSolaz, "image/png"]],
  ["/club.webp", [club, "image/webp"]],
  ["/entrenamiento.jpg", [entrenamiento, "image/jpeg"]],
  ["/remera-gris.webp", [remeraGris, "image/webp"]],
  ["/mascara-remera.png", [mascaraRemera, "image/png"]],
  ["/prenda.webp", [prenda, "image/webp"]],
  ["/deportista-creatina-mag.png", [deportistaCreatina, "image/png"]],
  ["/proteina.png", [proteina, "image/png"]],
  ["/creatina.png", [creatina, "image/png"]],
  ["/pista-grano.png", [pista_grano, "image/png"]],
  ["/barlow-condensed.woff2", [barlow_condensed, "font/woff2"]],
  ["/dm-sans.woff2", [dm_sans, "font/woff2"]],
  ["/marco-fondo-gris.png", [pose, "image/png"]],
  ["/marco.webp", [foto, "image/webp"]],
  ["/tello-mercado.png", [logoTello, "image/png"]],
  ["/desayuno-lola.webp", [desayunoLola, "image/webp"]],
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
const estados = {
  disponible: "Disponible", apartado: "Apartado por una hora", reservado: "Reservado por Marco",
  revision: "Comprobante en revisión", pagado: "Vendido",
};
const precio = 7000;
const activo = `CASE WHEN estado='reservado' AND vence<=unixepoch() THEN 'disponible'
  WHEN estado='reservado' THEN coalesce(fase,'apartado') ELSE estado END`;
const horaArgentina = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", hourCycle: "h23",
});
function enHorario() {
  const hora = Number(horaArgentina.format(Date.now()));
  return hora >= 8 && hora < 22;
}
function telefono(valor: unknown) {
  if (typeof valor !== "string" || !/^\+?[\d ()-]{7,24}$/.test(valor)) return "";
  let digitos = valor.replace(/\D/g, "");
  if (digitos.startsWith("00")) digitos = digitos.slice(2);
  if (/^0?\d{10}$/.test(digitos)) digitos = "549" + digitos.slice(-10);
  if (/^54\d{10}$/.test(digitos)) digitos = "549" + digitos.slice(2);
  return /^\d{7,15}$/.test(digitos) ? digitos : "";
}
function datosComprador(nombre: unknown, apellido: unknown, contacto: unknown) {
  if (typeof nombre !== "string" || !nombre.trim() || nombre.length > 80 ||
      typeof apellido !== "string" || apellido.length > 80 || !telefono(contacto)) return null;
  return { nombre: nombre.trim(), apellido: apellido.trim(), contacto: telefono(contacto) };
}
const enmascarar = (nombre: string) => nombre.trim().split(/\s+/u).filter(Boolean)
  .map(parte => Array.from(parte)[0] + "****").join(" ");

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
  if (url.hostname === "marco-rifa.bartoligerman497.workers.dev" && url.pathname === "/" &&
      (req.method === "GET" || req.method === "HEAD")) {
    url.hostname = "marco-sorteo.bartoligerman497.workers.dev";
    return Response.redirect(url.href, 302);
  }
  const ruta = url.pathname;
  const leer = req.method === "GET";
  const ejecutar = req.method === "POST";
  if (ejecutar && req.headers.get("Origin") !== url.origin)
    return json("Origen inválido.", 403);
  if (ruta === "/admin" || ruta.startsWith("/admin/")) {
    if (url.hostname !== "rifa.interna")
      return Response.redirect("https://panel-rifa-marco.bartoligerman497.workers.dev/panel/rifa", 303);
    if (!(await autorizado(req, env)))
      return new Response("Ingresá con la cuenta de Marco.", {
        status: 401,
        headers: {
          ...cabeceras,
          "WWW-Authenticate": 'Basic realm="Marco Rifa", charset="UTF-8"',
        },
      });
    if (leer && ruta === "/admin") return recurso(panel.replace("/*ESTADOS*/null", JSON.stringify(estados)), "text/html");
    if (ejecutar && ruta === "/admin/inicializar") {
      const consultas = esquema
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      await env.DB.batch(consultas.map((s) => env.DB.prepare(s)));
      return json("Edición preparada.");
    }
    if (leer && ruta === "/admin/reservas") {
      const filas = await env.DB.prepare(
        `SELECT numero,nombre,apellido,contacto,referencia,${activo} AS estado,vence,version
         FROM marco_rifa_numeros WHERE edicion=1 ORDER BY numero`,
      ).all();
      return json(filas.results.map(fila => fila.estado === "disponible"
        ? { numero: fila.numero, estado: fila.estado, version: fila.version } : fila));
    }
    if (ejecutar && ruta === "/admin/actualizar") {
      const datos = await req.json<{ numero: number; referencia?: string; accion: string;
        seleccion?: { numero: number; version: number }[]; version?: number; nombre?: string; apellido?: string; contacto?: string }>();
      const { numero, referencia, accion } = datos;
      if (!["reservar", "revisar", "pagar", "liberar", "guardar"].includes(accion))
        return json("Acción inválida.", 400);
      const editar = datos.nombre !== undefined || datos.apellido !== undefined || datos.contacto !== undefined;
      const comprador = editar ? datosComprador(datos.nombre, datos.apellido ?? "", datos.contacto) : null;
      if (editar && !comprador) return json("Revisá los datos del comprador.", 400);
      const cambios: Record<string,string> = {
        reservar: "estado='reservado', fase='reservado', vence=NULL",
        revisar: "estado='reservado', fase='revision', vence=NULL",
        pagar: "estado='pagado', fase=NULL, vence=NULL",
        liberar: "estado='disponible', fase=NULL, referencia=NULL, nombre=NULL, apellido=NULL, contacto=NULL, origen=NULL, vence=NULL",
        guardar: "estado=estado",
      };
      if (datos.seleccion !== undefined) {
        const seleccion = datos.seleccion;
        if (!comprador || !["reservar", "revisar", "pagar"].includes(accion) ||
            !Array.isArray(seleccion) || seleccion.length < 1 || seleccion.length > 20 ||
            !seleccion.every(f => f && Number.isInteger(f.numero) && f.numero > 0 && Number.isInteger(f.version)) ||
            new Set(seleccion.map(f => f.numero)).size !== seleccion.length)
          return json("Elegí entre uno y veinte números disponibles y revisá los datos.", 400);
        const pares = seleccion.map(() => "(?,?)").join(",");
        const resultado = await env.DB.prepare(
          `WITH elegibles AS MATERIALIZED (
             SELECT numero FROM marco_rifa_numeros WHERE edicion=1 AND (numero,version) IN (VALUES ${pares})
             AND (${activo})='disponible'
           )
           UPDATE marco_rifa_numeros SET ${cambios[accion]}, nombre=?, apellido=?, contacto=?,
             referencia=?, origen=NULL, version=version+1
           WHERE edicion=1 AND numero IN (SELECT numero FROM elegibles)
             AND (SELECT count(*) FROM elegibles)=?
             AND (SELECT count(*) FROM marco_rifa_numeros WHERE edicion=1 AND contacto=? AND (${activo})!='disponible') + ? <= 20`,
        ).bind(...seleccion.flatMap(f => [f.numero, f.version]), comprador.nombre, comprador.apellido,
          comprador.contacto, crypto.randomUUID(), seleccion.length, comprador.contacto, seleccion.length).run();
        return resultado.meta.changes ? json("Actualizado.") :
          json("Algún número cambió o el comprador supera el límite de veinte números por WhatsApp.", 409);
      }
      const campos = [cambios[accion], "version=version+1"];
      const valores: (string | number)[] = [];
      if (comprador && accion !== "liberar") {
        campos.push("nombre=?", "apellido=?", "contacto=?");
        valores.push(comprador.nombre, comprador.apellido, comprador.contacto);
      }
      let condiciones = "edicion=1 AND numero=?";
      if (referencia === undefined) {
        if (!comprador || !Number.isInteger(datos.version) || !["reservar", "revisar", "pagar"].includes(accion))
          return json("Elegí un estado y completá los datos del comprador.", 400);
        campos.push("referencia=?", "origen=NULL");
        valores.push(crypto.randomUUID(), numero);
        condiciones += ` AND (${activo})='disponible'`;
      } else {
        condiciones += ` AND referencia=? AND (${activo})!='disponible'`;
        valores.push(numero, referencia);
      }
      if (datos.version === undefined) condiciones += " AND fase='apartado'";
      else { condiciones += " AND version=?"; valores.push(datos.version); }
      if (comprador && accion !== "liberar") {
        condiciones += ` AND (SELECT count(*) FROM marco_rifa_numeros WHERE edicion=1 AND numero!=?
          AND contacto=? AND (${activo})!='disponible') < 20`;
        valores.push(numero, comprador.contacto);
      }
      const resultado = await env.DB.prepare(
        `UPDATE marco_rifa_numeros SET ${campos.join(",")} WHERE ${condiciones}`,
      ).bind(...valores).run();
      return resultado.meta.changes
        ? json("Actualizado.")
        : json("La reserva ya cambió.", 409);
    }
  }
  if (
    req.method === "HEAD" &&
    [
      "/",
      "/marco-fondo-gris-social.jpg",
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
  if ((leer || req.method === "HEAD") && ruta === "/videos/entrenar.mp4") {
    const rango = req.headers.get("Range");
    const archivo = await fetch(
      "https://raw.githubusercontent.com/GermanBartoli/marco-rifa/v1.12.6/public/videos/entrenar.mp4",
      { method: req.method, headers: rango ? { Range: rango } : {} },
    );
    const respuesta = new Response(archivo.body, archivo);
    if (archivo.ok) respuesta.headers.set("Content-Type", "video/mp4");
    return respuesta;
  }
  if (leer && ruta === "/favicon.svg") return recurso(icono, "image/svg+xml");
  if (leer && ruta === "/") {
    const original = recurso(portada.replace("/*ESTADOS*/null", JSON.stringify(estados)), "text/html");
    const cambios = await env.DB.prepare(
      "SELECT encabezado,destacado,descripcion,historia FROM marco_rifa_portada WHERE edicion=1",
    ).first<Record<string,string>>().catch(() => null);
    if (!cambios) return original;
    const selectores: Record<string,string> = {
      encabezado: "#portada h1 span", destacado: "#portada h1 strong",
      descripcion: "#portada .mensaje > p", historia: ".historia > div > p",
    };
    const html = new HTMLRewriter();
    for (const [campo, selector] of Object.entries(selectores)) {
      if (cambios[campo]) html.on(selector, {element(elemento) { elemento.setInnerContent(cambios[campo]); }});
    }
    return html.transform(original);
  }
  if (leer && ruta === "/pista.css") return recurso(pista + colores, "text/css");
  if (leer && ruta === "/estilos.css") return recurso(estilos + colores, "text/css");
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
    const [edicion, numeros] = await env.DB.batch<Record<string, unknown>>([
      env.DB.prepare(
        "SELECT abierta,instrucciones FROM marco_rifa_ediciones WHERE id=1",
      ),
      env.DB.prepare(
        `SELECT numero,${activo} AS estado,nombre,apellido FROM marco_rifa_numeros WHERE edicion=1 ORDER BY numero`,
      ),
    ]);
    return json({ edicion: { ...edicion.results[0], enHorario: enHorario(), precio },
      numeros: numeros.results.map(({numero, estado, nombre, apellido}) => ({
        numero, estado, titular: estado === "disponible" ? "" : enmascarar([nombre, apellido].filter(Boolean).join(" ")),
      })),
    });
  }
  if (ejecutar && ruta === "/api/reservas") {
    const edicion = await env.DB.prepare(
      "SELECT abierta,instrucciones FROM marco_rifa_ediciones WHERE id=1",
    ).first();
    if (!edicion?.abierta || !edicion.instrucciones)
      return json("Las reservas todavía están cerradas.", 403);
    if (!enHorario()) return json("Podés reservar de 08:00 a 22:00, hora argentina.", 403);
    const {
      numero,
      numeros = numero === undefined ? [] : [numero],
      nombre, apellido = "",
      contacto,
    } = await req.json<{
      numero?: number;
      numeros?: number[];
      nombre: string; apellido?: string;
      contacto: string;
    }>();
    const comprador = datosComprador(nombre, apellido, contacto);
    if (
      !Array.isArray(numeros) ||
      numeros.length < 1 ||
      numeros.length > 20 ||
      !numeros.every((n) => Number.isInteger(n) && n > 0) ||
      new Set(numeros).size !== numeros.length ||
      !comprador
    ) return json("Elegí entre uno y veinte números y revisá tus datos.", 400);
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
      UPDATE marco_rifa_numeros SET estado='reservado',fase='apartado',nombre=?,apellido=?,contacto=?,origen=?,referencia=?,vence=unixepoch()+3600,version=version+1
      WHERE edicion=1 AND numero IN (SELECT numero FROM elegibles)
      AND (SELECT count(*) FROM elegibles)=?
      AND EXISTS (SELECT 1 FROM marco_rifa_ediciones WHERE id=1 AND abierta=1 AND instrucciones!='')
      AND (SELECT count(*) FROM marco_rifa_numeros WHERE edicion=1 AND contacto=? AND (${activo})!='disponible') + ? <= 20`,
    )
      .bind(
        ...numeros,
        comprador.nombre, comprador.apellido, comprador.contacto,
        origen,
        referencia,
        numeros.length,
        comprador.contacto,
        numeros.length,
      )
      .run();
    return resultado.meta.changes
      ? json({ referencia, total: numeros.length * precio,
          alias: /\bAlias\s*:\s*([\w.-]+)/i.exec(String(edicion.instrucciones))?.[1].replace(/\.$/, "") || "",
        }, 201)
      : json(
          "Algún número ya está ocupado o la selección supera el límite de veinte números por WhatsApp.",
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
