/* ============================================================
   Atlas de Cuidados Paliativos Pediátricos · Servidor
   ------------------------------------------------------------
   Sirve la aplicación web y expone la API. El acceso a los datos
   está encapsulado en Almacen, de modo que estas rutas funcionan
   igual con MongoDB que sin él.
   ============================================================ */

const express = require("express");
const path = require("path");
const { Almacen } = require("./Almacen");
const { COLECCIONES, FILTROS } = require("./colecciones");

const PUERTO = process.env.PORT || 3000;
const URI_MONGO = process.env.MONGO_URI || "mongodb://localhost:27017";
const NOMBRE_BD = process.env.MONGO_DB || "atlas_cuidados_paliativos_pediatricos";
const RAIZ = path.join(__dirname, "..");

const almacen = new Almacen({ raiz: RAIZ, uriMongo: URI_MONGO, nombreBd: NOMBRE_BD });
const app = express();
app.use(express.json());

/* ---------- Diagnóstico ---------- */
app.get("/api/estado", (req, res) => {
  res.json({
    ok: true,
    origen: almacen.origen,
    baseDeDatos: almacen.bd ? NOMBRE_BD : null,
    totales: almacen.totales,
  });
});

/* ---------- Una ruta por colección ----------
   Todas aceptan ?q= para búsqueda libre y los filtros propios
   de cada colección como parámetros con el nombre del campo. */
for (const nombre of COLECCIONES) {
  app.get(`/api/${nombre}`, async (req, res) => {
    try {
      const filtros = { q: req.query.q };
      for (const campo of FILTROS[nombre] || []) {
        const valor = req.query[campo];
        if (valor && !/^(Todos|Todas)$/i.test(valor)) filtros[campo] = valor;
      }
      res.json(await almacen.obtener(nombre, filtros));
    } catch (err) {
      console.error(`Error en /api/${nombre}:`, err.message);
      res.json(almacen.todo(nombre));
    }
  });

  app.get(`/api/${nombre}/:codigo`, async (req, res) => {
    try {
      const doc = await almacen.porCodigo(nombre, req.params.codigo);
      if (!doc) return res.status(404).json({ error: "No encontrado" });
      res.json(doc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

/* ---------- Listas de filtros disponibles ---------- */
app.get("/api/filtros", (req, res) => {
  res.json(almacen.filtros());
});

/* ---------- Archivos estáticos ----------
   El HTML, el CSS, el JS y los JSON no se cachean: así, al editar
   el contenido, el navegador nunca muestra una versión antigua.
   Las imágenes sí, porque son fijas. */
app.use(
  express.static(RAIZ, {
    index: "index.html",
    setHeaders(res, ruta) {
      if (/\.(html|css|js|json)$/i.test(ruta)) {
        res.setHeader("Cache-Control", "no-store, must-revalidate");
      }
    },
  })
);

/* ---------- Arranque ---------- */
(async () => {
  try {
    await almacen.conectar();
    console.log(`✅ MongoDB conectado (base de datos "${NOMBRE_BD}")`);
  } catch (err) {
    console.warn(`⚠️  MongoDB no disponible (${err.message}).`);
    console.warn("   La aplicación funcionará leyendo los archivos de data/.");
  }

  app.listen(PUERTO, () => {
    const t = almacen.totales;
    console.log(`\n🕊️  Atlas de Cuidados Paliativos Pediátricos en http://localhost:${PUERTO}`);
    console.log(
      `   Síntomas: ${t.sintomas} · Fármacos: ${t.farmacos} · Escalas: ${t.escalas} · ` +
        `Calculadoras: ${t.calculadoras} · Guiones: ${t.comunicacion} · Temas: ${t.temas} · ` +
        `Glosario: ${t.glosario} · Casos: ${t.casos}\n`
    );
  });
})();
