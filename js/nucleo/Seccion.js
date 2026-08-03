/* ============================================================
   Sección de listado (clase base)
   ------------------------------------------------------------
   Reúne todo lo que comparten las secciones que muestran una
   rejilla de tarjetas: búsqueda sin acentos, chips de filtro,
   contador, paginación y estado vacío.

   Una sección concreta hereda de aquí y solo tiene que decir:
     · de dónde salen sus datos            -> get datos
     · en qué texto busca                  -> buscarEn(doc)
     · cómo se dibuja su tarjeta           -> tarjeta(doc)
     · qué pasa al pulsarla                -> abrir(doc)

   Los identificadores del documento siguen siempre el mismo
   patrón, derivado del nombre de la vista:
     lista-<vista>, busqueda-<vista>, contador-<vista>, pag-<vista>
   ============================================================ */

import { el, ico, escapar, normalizar, claseDominio } from "./util.js";
import { Paginador } from "./Paginador.js";
import { GrupoChips } from "./Chips.js";

export class Seccion {
  /**
   * @param {object} opciones
   * @param {string} opciones.vista        Nombre corto: "sintomas", "farmacos"…
   * @param {import("./Repositorio.js").Repositorio} opciones.repositorio
   * @param {string} opciones.singular     Texto del contador en singular
   * @param {string} opciones.plural       Texto del contador en plural
   * @param {string} opciones.vacio        Mensaje cuando no hay resultados
   * @param {number} [opciones.porPagina=24]
   * @param {Array<{campo: string, todos: string, etiqueta?: (v: string) => string}>} [opciones.filtros]
   */
  constructor({ vista, repositorio, singular, plural, vacio, porPagina = 24, filtros = [] }) {
    this.vista = vista;
    this.repositorio = repositorio;
    this.singular = singular;
    this.plural = plural;
    this.vacio = vacio;

    this.paginador = new Paginador({
      contenedorId: `pag-${vista}`,
      porPagina,
      desplazarA: `vista-${vista}`,
      alCambiar: () => this.pintar(),
    });

    /** @type {((doc: object) => void)|null} Aviso al abrir, que usan las rutas. */
    this.alAbrir = null;

    this.filtros = filtros.map(
      (f) =>
        new GrupoChips({
          contenedorId: `filtros-${vista}-${f.campo}`,
          campo: f.campo,
          todos: f.todos,
          etiqueta: f.etiqueta,
          alSeleccionar: () => {
            this.paginador.reiniciar();
            this.pintar();
          },
        })
    );
  }

  /* ---------- Puntos de extensión que definen las subclases ---------- */

  /** @returns {object[]} Documentos de la sección. */
  get datos() {
    return this.repositorio.obtener(this.vista);
  }

  /**
   * Texto sobre el que actúa la búsqueda libre.
   * @param {object} doc
   * @returns {string}
   */
  buscarEn(doc) {
    return JSON.stringify(doc);
  }

  /**
   * Marcado interior de la tarjeta.
   * @param {object} doc
   * @returns {string}
   */
  tarjeta(doc) {
    return `<h3>${escapar(doc.titulo || doc.nombre || "")}</h3>`;
  }

  /**
   * Acción al pulsar una tarjeta. Devolver null si la sección no abre nada.
   * @param {object} _doc
   */
  abrir(_doc) {
    /* las subclases lo definen */
  }

  /** Indica si las tarjetas son interactivas. El glosario, por ejemplo, no lo es. */
  get interactiva() {
    return true;
  }

  /**
   * Abre el documento cuyo código se indica. Lo usan las rutas para
   * restaurar el estado descrito en la dirección del navegador.
   * @param {string} codigo
   * @returns {boolean} Si se encontró y se abrió
   */
  abrirPorCodigo(codigo) {
    if (!this.interactiva) return false;
    const doc = this.datos.find((d) => d.codigo === codigo);
    if (!doc) return false;
    this.abrir(doc);
    return true;
  }

  /**
   * Abre un documento por interacción del usuario y avisa a quien escuche.
   * Se separa de abrir() para que restaurar una dirección no vuelva a
   * escribirla y se produzca un ciclo.
   * @param {object} doc
   */
  mostrar(doc) {
    this.abrir(doc);
    if (this.alAbrir) this.alAbrir(doc);
  }

  /**
   * Cierra la ficha abierta, si la hay. Lo usan las rutas cuando la
   * dirección deja de traer código, para que el botón de atrás del
   * navegador cierre la ficha en lugar de dejarla huérfana en pantalla.
   */
  cerrar() {
    const m = this.modal;
    if (m && m.elemento && !m.elemento.classList.contains("oculta")) m.cerrar();
  }

  /**
   * Valor del que se deriva la clase de color de la tarjeta.
   * @param {object} doc
   * @returns {string}
   */
  valorAcento(doc) {
    return doc.dominio || doc.grupo || doc.categoria || doc.interlocutor || "";
  }

  /* ---------- Comportamiento común ---------- */

  /** Construye chips, conecta el buscador y hace el primer pintado. */
  montar() {
    this.filtros.forEach((f) => f.montar(this.datos));
    const campo = el(`busqueda-${this.vista}`);
    if (campo) {
      campo.addEventListener("input", () => {
        this.paginador.reiniciar();
        this.pintar();
      });
    }
    this.pintar();
    return this;
  }

  /**
   * Aplica los chips activos y la búsqueda libre.
   * @returns {object[]}
   */
  filtrar() {
    const campo = el(`busqueda-${this.vista}`);
    const palabras = normalizar(campo ? campo.value : "")
      .split(/\s+/)
      .filter(Boolean);

    return this.datos.filter((doc) => {
      if (!this.filtros.every((f) => f.acepta(doc))) return false;
      if (!palabras.length) return true;
      const texto = normalizar(this.buscarEn(doc));
      return palabras.every((p) => texto.includes(p));
    });
  }

  /** Dibuja la rejilla completa: contador, tarjetas y paginación. */
  pintar() {
    const contenedor = el(`lista-${this.vista}`);
    if (!contenedor) return;

    const lista = this.filtrar();
    this.#pintarContador(lista.length);

    contenedor.innerHTML = "";
    if (!lista.length) {
      contenedor.innerHTML = `
        <div class="sin-resultados">
          <p class="icono-vacio">${ico("buscar")}</p>
          <p>${escapar(this.vacio)}</p>
        </div>`;
      this.paginador.pintar({ paginas: 1, items: [], inicio: 0, total: 0 });
      return;
    }

    const pagina = this.paginador.rebanar(lista);
    pagina.items.forEach((doc) => this.#añadirTarjeta(contenedor, doc));
    this.paginador.pintar(pagina);
  }

  /**
   * @param {number} n
   */
  #pintarContador(n) {
    const contador = el(`contador-${this.vista}`);
    if (!contador) return;
    contador.textContent = n === 1 ? `1 ${this.singular}` : `${n} ${this.plural}`;
  }

  /**
   * Crea una tarjeta interactiva. Se marca como botón y se hace enfocable
   * para que quien navegue con teclado pueda recorrer los resultados y
   * abrirlos con Enter o con la barra espaciadora, igual que con el ratón.
   * @param {HTMLElement} contenedor
   * @param {object} doc
   */
  #añadirTarjeta(contenedor, doc) {
    const marcado = this.tarjeta(doc);

    if (!this.interactiva) {
      contenedor.insertAdjacentHTML("beforeend", marcado);
      return;
    }

    const art = document.createElement("article");
    art.className = "tarjeta " + claseDominio(this.valorAcento(doc));
    art.innerHTML = marcado;
    art.tabIndex = 0;
    art.setAttribute("role", "button");

    const abrir = () => this.mostrar(doc);
    art.addEventListener("click", abrir);
    art.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault(); // la barra espaciadora no debe desplazar la página
      abrir();
    });

    contenedor.appendChild(art);
  }

  /* ---------- Ayuda de composición ---------- */

  /**
   * Marcado común de una tarjeta con medallón, insignias, título y resumen.
   * @param {object} opciones
   * @param {string} opciones.icono
   * @param {Array<{texto: string, clase?: string, icono?: string}|null>} opciones.insignias
   * @param {string} opciones.titulo
   * @param {string} opciones.resumen
   * @returns {string}
   */
  static componerTarjeta({ icono, insignias, titulo, resumen }) {
    const chips = (insignias || [])
      .filter(Boolean)
      .map(
        (i) =>
          `<span class="insignia ${i.clase || ""}">${i.icono ? ico(i.icono) : ""}${escapar(i.texto)}</span>`
      )
      .join("");

    return `
      <div class="tarjeta-cabeza">
        <span class="medallon">${ico(icono)}</span>
        <div class="tarjeta-cabeza-texto">
          <div class="insignias">${chips}</div>
          <h3>${escapar(titulo)}</h3>
        </div>
      </div>
      <p class="tarjeta-resumen">${escapar(resumen)}</p>`;
  }
}
