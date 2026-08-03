/* ============================================================
   Repositorio de datos
   ------------------------------------------------------------
   Única puerta de entrada a los datos de la aplicación. Intenta
   primero la API del servidor y, si no responde, cae al archivo
   JSON equivalente de la carpeta data/. De ese modo la
   aplicación funciona con servidor, sin servidor y sin MongoDB
   sin que ninguna otra clase tenga que saberlo.
   ============================================================ */

/** Colecciones que maneja la aplicación, en el orden en que se cargan. */
export const COLECCIONES = [
  "sintomas",
  "farmacos",
  "escalas",
  "calculadoras",
  "comunicacion",
  "temas",
  "glosario",
  "casos",
];

export class Repositorio {
  constructor() {
    /** @type {Record<string, object[]>} */
    this.datos = Object.fromEntries(COLECCIONES.map((c) => [c, []]));
    /** @type {string} */
    this.origen = "archivos locales";
  }

  /**
   * Pide un recurso a la API y, si falla, al archivo de respaldo.
   * Nunca lanza: ante un fallo total devuelve una lista vacía, para
   * que una colección ausente no impida arrancar la aplicación.
   * @param {string} url
   * @param {string} respaldo
   * @returns {Promise<object[]>}
   */
  static async pedir(url, respaldo) {
    for (const destino of [url, respaldo]) {
      if (!destino) continue;
      try {
        const r = await fetch(destino);
        if (!r.ok) continue;
        return await r.json();
      } catch {
        /* se intenta el siguiente destino */
      }
    }
    return [];
  }

  /**
   * Carga todas las colecciones en paralelo y averigua de dónde vienen.
   * @returns {Promise<this>}
   */
  async cargar() {
    const peticiones = COLECCIONES.map((c) =>
      Repositorio.pedir(`/api/${c}`, `data/${c}.json`)
    );
    const resultados = await Promise.all(peticiones);
    COLECCIONES.forEach((c, i) => {
      this.datos[c] = resultados[i];
    });

    const info = await fetch("/api/estado")
      .then((r) => r.json())
      .catch(() => null);
    this.origen = info && info.origen === "mongodb" ? "MongoDB" : "archivos locales";

    return this;
  }

  /**
   * Devuelve una colección por su nombre.
   * @param {string} nombre
   * @returns {object[]}
   */
  obtener(nombre) {
    return this.datos[nombre] || [];
  }

  /**
   * Busca un documento por su código dentro de una colección.
   * @param {string} coleccion
   * @param {string} codigo
   * @returns {object|undefined}
   */
  buscarPorCodigo(coleccion, codigo) {
    if (!codigo) return undefined;
    return this.obtener(coleccion).find((d) => d.codigo === codigo);
  }

  /** Número de documentos de cada colección. */
  get totales() {
    return Object.fromEntries(COLECCIONES.map((c) => [c, this.obtener(c).length]));
  }

  /**
   * Línea de estado que se muestra en el pie de la página.
   * @returns {string}
   */
  resumen() {
    const t = this.totales;
    return (
      `${t.sintomas} situaciones · ${t.farmacos} fármacos · ${t.escalas} escalas · ` +
      `${t.calculadoras} calculadoras · ${t.comunicacion} guiones · ${t.temas} temas · ` +
      `${t.glosario} términos · ${t.casos} casos · datos desde ${this.origen}`
    );
  }
}
