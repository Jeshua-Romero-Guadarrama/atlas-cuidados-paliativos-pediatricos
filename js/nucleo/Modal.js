/* ============================================================
   Modal
   ------------------------------------------------------------
   Envuelve una ventana emergente del documento y ofrece los
   métodos de relleno que usan todas las secciones: texto, lista,
   tabla y acento de color. Cada método oculta su sección cuando
   el dato viene vacío, de modo que una ficha incompleta se ve
   bien sin necesidad de condicionales en quien la abre.
   ============================================================ */

import { el, escapar, claseDominio } from "./util.js";

/** Instancias registradas, para poder cerrarlas todas con la tecla de escape. */
const registradas = new Set();

export class Modal {
  /**
   * @param {string} nombre  Sufijo del id: "sintoma" apunta a "modal-sintoma"
   */
  constructor(nombre) {
    this.nombre = nombre;
    this.id = `modal-${nombre}`;
    this.elemento = el(this.id);
    /** @type {HTMLElement|null} Elemento que tenía el foco antes de abrir. */
    this.focoPrevio = null;
    /** @type {Element[]} Hermanos marcados inert mientras esta ventana está abierta. */
    this.fondoInerte = [];
    /** @type {(() => void)|null} Aviso al cerrar, que usan las rutas. */
    this.alCerrar = null;
    registradas.add(this);

    if (!this.elemento) return;

    // Semántica de ventana de diálogo, para lectores de pantalla
    this.elemento.setAttribute("role", "dialog");
    this.elemento.setAttribute("aria-modal", "true");
    const titulo = this.elemento.querySelector(".modal-cuerpo h2");
    if (titulo) {
      if (!titulo.id) titulo.id = `${this.id}-titulo`;
      this.elemento.setAttribute("aria-labelledby", titulo.id);
    }

    this.elemento.querySelectorAll(`[data-cierra="${nombre}"]`).forEach((b) => {
      b.addEventListener("click", () => this.cerrar());
    });

    // El foco no debe escaparse de la ventana mientras está abierta
    this.elemento.addEventListener("keydown", (e) => this.#atraparFoco(e));
  }

  /**
   * Mantiene el recorrido del tabulador dentro de la ventana abierta.
   * @param {KeyboardEvent} e
   */
  #atraparFoco(e) {
    if (e.key !== "Tab") return;
    const enfocables = this.elemento.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const visibles = [...enfocables].filter((n) => n.offsetParent !== null);
    if (!visibles.length) return;

    const primero = visibles[0];
    const ultimo = visibles[visibles.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  /** Registra el cierre con la tecla de escape. Se llama una sola vez al arrancar. */
  static registrarEscape() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") Modal.cerrarTodas();
    });
  }

  static cerrarTodas() {
    registradas.forEach((m) => {
      if (m.elemento && !m.elemento.classList.contains("oculta")) m.cerrar();
    });
    document.body.style.overflow = "";
  }

  abrir() {
    if (!this.elemento) return;
    this.focoPrevio = document.activeElement;
    this.elemento.classList.remove("oculta");
    this.#aislarFondo();
    document.body.style.overflow = "hidden";
    // El contenido empieza arriba aunque la ventana anterior estuviera desplazada
    const tarjeta = this.elemento.querySelector(".modal-tarjeta");
    if (tarjeta) tarjeta.scrollTop = 0;
    this.elemento.querySelector(".cerrar")?.focus();
  }

  cerrar() {
    if (!this.elemento) return;
    this.elemento.classList.add("oculta");
    this.#liberarFondo();
    if (!document.querySelector(".modal:not(.oculta)")) document.body.style.overflow = "";
    // Devolver el foco a la tarjeta desde la que se abrió
    if (this.focoPrevio && document.contains(this.focoPrevio)) this.focoPrevio.focus();
    this.focoPrevio = null;
    if (this.alCerrar) this.alCerrar();
  }

  /**
   * Marca inert todo lo que no es esta ventana. La trampa de foco retiene
   * el tabulador, pero solo inert saca el fondo del cursor virtual del
   * lector de pantalla y de los toques en el resto de la página.
   */
  #aislarFondo() {
    this.fondoInerte = [...document.body.children].filter(
      (n) => n !== this.elemento && !n.hasAttribute("inert") && !["SCRIPT", "STYLE", "LINK"].includes(n.tagName)
    );
    this.fondoInerte.forEach((n) => n.setAttribute("inert", ""));
  }

  /** Devuelve el fondo a la vida al cerrar, solo lo que esta ventana marcó. */
  #liberarFondo() {
    this.fondoInerte.forEach((n) => n.removeAttribute("inert"));
    this.fondoInerte = [];
  }

  /**
   * Tiñe la tarjeta con el color de acento del dominio del documento.
   * @param {string} valor
   */
  acento(valor) {
    const tarjeta = this.elemento && this.elemento.querySelector(".modal-tarjeta");
    if (tarjeta) tarjeta.className = "modal-tarjeta " + claseDominio(valor || "");
  }

  /**
   * Escribe texto plano en un elemento.
   * @param {string} id
   * @param {string} valor
   */
  texto(id, valor) {
    const campo = el(id);
    if (campo) campo.textContent = valor || "";
  }

  /**
   * Escribe marcado en un elemento.
   * @param {string} id
   * @param {string} html
   */
  html(id, html) {
    const campo = el(id);
    if (campo) campo.innerHTML = html || "";
  }

  /**
   * Escribe un texto y oculta su sección si viene vacío.
   * @param {string} idSeccion
   * @param {string} idCampo
   * @param {string} valor
   */
  textoOpcional(idSeccion, idCampo, valor) {
    this.texto(idCampo, valor);
    const seccion = el(idSeccion);
    if (seccion) seccion.classList.toggle("oculta", !valor);
  }

  /**
   * Escribe una lista y oculta su sección si viene vacía.
   * @param {string} idSeccion
   * @param {string} idCampo
   * @param {string[]} valores
   * @param {(v: string) => string} [formato]  Transforma cada elemento antes de escaparlo
   */
  lista(idSeccion, idCampo, valores, formato) {
    const items = valores || [];
    this.html(
      idCampo,
      items.map((p) => `<li>${escapar(formato ? formato(p) : p)}</li>`).join("")
    );
    const seccion = el(idSeccion);
    if (seccion) seccion.classList.toggle("oculta", !items.length);
  }

  /**
   * Escribe las filas de una tabla y oculta su sección si viene vacía.
   * La primera celda de cada fila se destaca como etiqueta.
   * @param {string} idSeccion
   * @param {string} idCampo
   * @param {string[][]} filas
   */
  tabla(idSeccion, idCampo, filas) {
    const items = filas || [];
    this.html(
      idCampo,
      items
        .map(
          (celdas) =>
            `<tr>${celdas
              .map((c, i) =>
                i === 0
                  ? `<td class="celda-dosis"><strong>${escapar(c)}</strong></td>`
                  : `<td>${escapar(c)}</td>`
              )
              .join("")}</tr>`
        )
        .join("")
    );
    const seccion = el(idSeccion);
    if (seccion) seccion.classList.toggle("oculta", !items.length);
  }

  /**
   * Muestra u oculta una sección completa.
   * @param {string} idSeccion
   * @param {boolean} visible
   */
  seccion(idSeccion, visible) {
    const s = el(idSeccion);
    if (s) s.classList.toggle("oculta", !visible);
  }
}
