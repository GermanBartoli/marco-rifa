CREATE TABLE IF NOT EXISTS marco_rifa_ediciones (
  id INTEGER PRIMARY KEY, titulo TEXT NOT NULL, abierta INTEGER NOT NULL DEFAULT 0,
  instrucciones TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS marco_rifa_numeros (
  edicion INTEGER NOT NULL REFERENCES marco_rifa_ediciones(id),
  numero INTEGER NOT NULL, estado TEXT NOT NULL DEFAULT 'disponible'
    CHECK (estado IN ('disponible','reservado','pagado')),
  referencia TEXT, nombre TEXT, contacto TEXT, origen TEXT, vence INTEGER,
  apellido TEXT, fase TEXT, version INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(edicion,numero)
);
CREATE TABLE IF NOT EXISTS marco_rifa_marcas (
  id INTEGER PRIMARY KEY, edicion INTEGER NOT NULL REFERENCES marco_rifa_ediciones(id),
  nombre TEXT NOT NULL, UNIQUE(edicion,nombre)
);
INSERT OR IGNORE INTO marco_rifa_ediciones(id,titulo) VALUES(1,'Marco Rifa');
WITH RECURSIVE serie(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM serie WHERE n<200)
INSERT OR IGNORE INTO marco_rifa_numeros(edicion,numero) SELECT 1,n FROM serie;

CREATE TABLE IF NOT EXISTS marco_rifa_portada (
  edicion INTEGER PRIMARY KEY REFERENCES marco_rifa_ediciones(id),
  encabezado TEXT NOT NULL,
  destacado TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  historia TEXT NOT NULL
);
