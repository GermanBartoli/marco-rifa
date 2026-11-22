CREATE TABLE IF NOT EXISTS sitios (
  id_sitio TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id_sitio)) > 0),
  nombre TEXT NOT NULL,
  url_base TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS archivos (
  id_archivo INTEGER PRIMARY KEY,
  id_sitio TEXT NOT NULL REFERENCES sitios(id_sitio),
  nombre TEXT NOT NULL,
  tipo_mime TEXT NOT NULL,
  almacenamiento TEXT NOT NULL,
  contenedor TEXT NOT NULL,
  ruta TEXT NOT NULL,
  bytes INTEGER NOT NULL CHECK (bytes >= 0),
  sha256 TEXT CHECK (length(sha256) = 64),
  ancho_px INTEGER CHECK (ancho_px > 0),
  alto_px INTEGER CHECK (alto_px > 0),
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id_sitio, ruta)
);
