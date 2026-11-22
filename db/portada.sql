CREATE TABLE IF NOT EXISTS marco_rifa_portada (
  edicion INTEGER PRIMARY KEY REFERENCES marco_rifa_ediciones(id),
  encabezado TEXT NOT NULL,
  destacado TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  historia TEXT NOT NULL
);
