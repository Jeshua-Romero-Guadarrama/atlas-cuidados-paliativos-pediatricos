/* ============================================================
   Colecciones de la aplicación
   ------------------------------------------------------------
   Módulo sin dependencias, para que el validador pueda usarlo
   sin necesidad de tener instalado el controlador de MongoDB.
   ============================================================ */

/** Nombres de las colecciones, en el orden en que se muestran. */
const COLECCIONES = [
  "sintomas",
  "farmacos",
  "escalas",
  "calculadoras",
  "comunicacion",
  "temas",
  "glosario",
  "casos",
];

/** Campos por los que se puede filtrar cada colección desde la API. */
const FILTROS = {
  sintomas: ["dominio", "nivel"],
  farmacos: ["grupo"],
  escalas: ["dominio"],
  calculadoras: ["categoria"],
  comunicacion: ["interlocutor"],
  temas: ["area"],
  glosario: ["categoria"],
  casos: ["dominio"],
};

module.exports = { COLECCIONES, FILTROS };
