/* ============================================================
   Grupo de chips de filtro
   ------------------------------------------------------------
   Botones redondeados de selección única. Los valores se calculan
   siempre a partir de los datos cargados, nunca se escriben a mano,
   de modo que añadir un dominio nuevo en un JSON hace aparecer su
   chip sin tocar código.
   ============================================================ */

import { el, valoresDe } from "./util.js";

export class GrupoChips {
  /**
   * @param {object} opciones
   * @param {string} opciones.contenedorId
   * @param {string} opciones.campo        Campo del documento por el que filtra
   * @param {string} opciones.todos        Etiqueta del chip que no filtra, por ejemplo "Todos"
   * @param {(valor: string) => void} opciones.alSeleccionar
   * @param {(valor: string) => string} [opciones.etiqueta]  Rótulo visible de un valor,
   *   para los campos cuyo dato es un identificador y no prosa
   */
  constructor({ contenedorId, campo, todos, alSeleccionar, etiqueta }) {
    this.contenedorId = contenedorId;
    this.campo = campo;
    this.todos = todos;
    this.alSeleccionar = alSeleccionar;
    this.etiqueta = etiqueta;
    this.valor = todos;
  }

  /**
   * Construye los chips a partir de los valores presentes en la lista.
   * Cada chip es un conmutador, así que lleva aria-pressed con su estado,
   * que es lo que permite al lector de pantalla decir cuál filtra.
   * @param {object[]} lista
   */
  montar(lista) {
    const contenedor = el(this.contenedorId);
    if (!contenedor) return;
    contenedor.innerHTML = "";

    [this.todos, ...valoresDe(lista, this.campo)].forEach((valor, indice) => {
      const chip = document.createElement("button");
      chip.className = "chip" + (indice === 0 ? " activo" : "");
      chip.type = "button";
      chip.textContent = indice > 0 && this.etiqueta ? this.etiqueta(valor) : valor;
      chip.setAttribute("aria-pressed", indice === 0 ? "true" : "false");
      chip.addEventListener("click", () => {
        contenedor.querySelectorAll(".chip").forEach((c) => {
          c.classList.remove("activo");
          c.setAttribute("aria-pressed", "false");
        });
        chip.classList.add("activo");
        chip.setAttribute("aria-pressed", "true");
        this.valor = valor;
        this.alSeleccionar(valor);
      });
      contenedor.appendChild(chip);
    });
  }

  /** Indica si el chip activo deja pasar todos los documentos. */
  get inactivo() {
    return !this.valor || this.valor === this.todos;
  }

  /**
   * Comprueba si un documento pasa este filtro.
   * Admite campos de texto y campos que contienen un arreglo.
   * @param {object} doc
   * @returns {boolean}
   */
  acepta(doc) {
    if (this.inactivo) return true;
    const v = doc[this.campo];
    return Array.isArray(v) ? v.includes(this.valor) : v === this.valor;
  }
}
