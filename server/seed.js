/* ============================================================
   Carga de la base de datos
   ------------------------------------------------------------
   Vuelca el contenido de data/*.json en MongoDB, borrando antes
   lo que hubiera. Uso: npm run seed
   ============================================================ */

const path = require("path");
const { Almacen } = require("./Almacen");

const URI_MONGO = process.env.MONGO_URI || "mongodb://localhost:27017";
const NOMBRE_BD = process.env.MONGO_DB || "atlas_cuidados_paliativos_pediatricos";
const RAIZ = path.join(__dirname, "..");

(async () => {
  const almacen = new Almacen({ raiz: RAIZ, uriMongo: URI_MONGO, nombreBd: NOMBRE_BD });

  // Se borran las huellas para forzar la resiembra completa de todas las colecciones
  try {
    const { MongoClient } = require("mongodb");
    const cliente = new MongoClient(URI_MONGO, { serverSelectionTimeoutMS: 10000 });
    await cliente.connect();
    await cliente.db(NOMBRE_BD).collection("_huellas").deleteMany({});
    await cliente.close();
  } catch (err) {
    console.error("No se pudo conectar a MongoDB:", err.message);
    process.exit(1);
  }

  await almacen.conectar();
  console.log(`Conectado a MongoDB · base de datos "${NOMBRE_BD}"`);
  console.log("Listo.");
  // Se cierra la conexión antes de salir para no cortar al cliente a mitad
  // de nada y que el proceso termine limpio.
  await almacen.cerrar();
  process.exit(0);
})();
