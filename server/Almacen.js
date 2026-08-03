/* ============================================================
   Almacén de datos del servidor
   ------------------------------------------------------------
   Encapsula el acceso a los datos: lee los JSON del repositorio
   al arrancar y, si hay MongoDB disponible, los siembra allí y
   sirve desde la base. Si MongoDB no está o falla, sigue
   sirviendo desde los archivos sin que las rutas se enteren.
   ============================================================ */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");
const { COLECCIONES, FILTROS } = require("./colecciones");

class Almacen {
  /**
   * @param {object} opciones
   * @param {string} opciones.raiz       Carpeta raíz del proyecto
   * @param {string} opciones.uriMongo
   * @param {string} opciones.nombreBd
   */
  constructor({ raiz, uriMongo, nombreBd }) {
    this.raiz = raiz;
    this.uriMongo = uriMongo;
    this.nombreBd = nombreBd;
    this.bd = null;
    /** @type {import("mongodb").MongoClient|null} */
    this.cliente = null;
    /** @type {Record<string, object[]>} Respaldo siempre disponible. */
    this.respaldo = {};

    for (const nombre of COLECCIONES) {
      this.respaldo[nombre] = this.#leerJson(`${nombre}.json`);
    }
  }

  static get COLECCIONES() {
    return COLECCIONES;
  }

  /**
   * Lee un JSON de data/. Devuelve lista vacía si no existe, para que el
   * servidor arranque igual mientras se va añadiendo contenido.
   * @param {string} nombre
   * @returns {object[]}
   */
  #leerJson(nombre) {
    try {
      const ruta = path.join(this.raiz, "data", nombre);
      return JSON.parse(fs.readFileSync(ruta, "utf8"));
    } catch {
      return [];
    }
  }

  /** Indica de dónde se están sirviendo los datos. */
  get origen() {
    return this.bd ? "mongodb" : "archivos";
  }

  /** Número de documentos de cada colección. */
  get totales() {
    return Object.fromEntries(COLECCIONES.map((c) => [c, this.respaldo[c].length]));
  }

  /**
   * Conecta con MongoDB y siembra las colecciones que hayan cambiado.
   * Se compara una huella del contenido, no solo el número de documentos:
   * así, si se edita el texto de una ficha sin cambiar cuántas hay, la base
   * también se actualiza.
   * @returns {Promise<void>}
   */
  async conectar() {
    this.cliente = new MongoClient(this.uriMongo, { serverSelectionTimeoutMS: 5000 });
    await this.cliente.connect();
    this.bd = this.cliente.db(this.nombreBd);

    for (const nombre of COLECCIONES) {
      if (!this.respaldo[nombre].length) continue;
      await this.#sembrarSiCambio(nombre);
    }
  }

  /**
   * Cierra la conexión con la base. Lo necesitan los scripts que terminan,
   * como la siembra, para salir sin dejar el cliente colgando.
   * @returns {Promise<void>}
   */
  async cerrar() {
    if (this.cliente) await this.cliente.close();
    this.cliente = null;
    this.bd = null;
  }

  /** @param {string} nombre */
  async #sembrarSiCambio(nombre) {
    const huella = crypto
      .createHash("sha1")
      .update(JSON.stringify(this.respaldo[nombre]))
      .digest("hex");

    const marca = await this.bd.collection("_huellas").findOne({ _id: nombre });
    if (marca && marca.huella === huella) return;

    const coleccion = this.bd.collection(nombre);
    await coleccion.deleteMany({});
    await coleccion.insertMany(this.respaldo[nombre]);
    await this.bd
      .collection("_huellas")
      .updateOne({ _id: nombre }, { $set: { huella, actualizado: new Date() } }, { upsert: true });

    console.log(`  ✔ Colección "${nombre}": ${this.respaldo[nombre].length} documentos cargados`);
  }

  /**
   * Devuelve los documentos de una colección, con filtros opcionales.
   * @param {string} nombre
   * @param {{q?: string, [campo: string]: any}} [filtros]
   * @returns {Promise<object[]>}
   */
  async obtener(nombre, filtros = {}) {
    let docs;
    try {
      docs = this.bd
        ? await this.bd.collection(nombre).find({}).project({ _id: 0 }).toArray()
        : this.respaldo[nombre];
    } catch {
      docs = this.respaldo[nombre];
    }
    if (!docs || !docs.length) docs = this.respaldo[nombre];

    return Almacen.filtrar(docs, filtros);
  }

  /**
   * Documentos del respaldo de una colección, sin tocar la base. Es la
   * respuesta de emergencia de las rutas cuando obtener() falla, para que
   * el detalle de dónde viven los datos no se salga de esta clase.
   * @param {string} nombre
   * @returns {object[]}
   */
  todo(nombre) {
    return this.respaldo[nombre] || [];
  }

  /**
   * Valores distintos de cada campo filtrable, por colección. Salen del
   * respaldo porque los filtros describen el contenido publicado, no lo
   * que haya llegado a la base.
   * @returns {Record<string, Record<string, string[]>>}
   */
  filtros() {
    const valoresDe = (lista, campo) => {
      const vistos = new Set();
      lista.forEach((d) => {
        const v = d && d[campo];
        if (Array.isArray(v)) v.forEach((x) => x && vistos.add(x));
        else if (v) vistos.add(v);
      });
      return [...vistos].sort((a, b) => a.localeCompare(b, "es"));
    };

    const salida = {};
    for (const [coleccion, campos] of Object.entries(FILTROS)) {
      salida[coleccion] = Object.fromEntries(
        campos.map((c) => [c, valoresDe(this.todo(coleccion), c)])
      );
    }
    return salida;
  }

  /**
   * Busca un documento por su código.
   * @param {string} nombre
   * @param {string} codigo
   * @returns {Promise<object|null>}
   */
  async porCodigo(nombre, codigo) {
    try {
      if (this.bd) {
        const doc = await this.bd.collection(nombre).findOne({ codigo }, { projection: { _id: 0 } });
        if (doc) return doc;
      }
    } catch {
      /* se cae al respaldo */
    }
    return this.respaldo[nombre].find((d) => d.codigo === codigo) || null;
  }

  /** Quita acentos y pasa a minúsculas, igual que hace el cliente. */
  static normalizar(texto) {
    // La eñe se aparta con un centinela antes de descomponer, porque NFD la
    // separa en ene y tilde y en este corpus «año» y «ano» colisionan.
    return (texto || "")
      .toLowerCase()
      .replace(/ñ/g, "\u0001")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\u0001/g, "ñ");
  }

  /**
   * Filtra en memoria por campos exactos y por búsqueda libre sin acentos.
   * Se hace en memoria a propósito, porque obtener() trae la colección
   * completa y son colecciones de cientos de documentos como mucho, así que
   * recorrerlas cuesta menos que mantener índices que nadie consultaría.
   * @param {object[]} docs
   * @param {{q?: string, [campo: string]: any}} filtros
   * @returns {object[]}
   */
  static filtrar(docs, filtros) {
    const { q, ...campos } = filtros;
    let salida = docs;

    for (const [campo, valor] of Object.entries(campos)) {
      if (!valor) continue;
      salida = salida.filter((d) => {
        const v = d[campo];
        return Array.isArray(v) ? v.includes(valor) : v === valor;
      });
    }

    if (q) {
      const palabras = Almacen.normalizar(q).split(/\s+/).filter(Boolean);
      salida = salida.filter((d) => {
        const texto = Almacen.normalizar(JSON.stringify(d));
        return palabras.every((p) => texto.includes(p));
      });
    }

    return salida;
  }
}

module.exports = { Almacen };
