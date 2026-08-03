/* ============================================================
   Paginador
   ------------------------------------------------------------
   Recorre una lista por páginas y dibuja los controles
   « ‹ 1 2 … n › ». Cada sección tiene su propia instancia, con
   su propio contenedor y su propio tamaño de página.
   ============================================================ */

import { ico, el, desplazar } from "./util.js";

export class Paginador {
  /**
   * @param {object} opciones
   * @param {string} opciones.contenedorId  Id del <nav> donde se dibujan los controles
   * @param {number} [opciones.porPagina=24]
   * @param {() => void} opciones.alCambiar  Se invoca tras cambiar de página
   * @param {string} [opciones.desplazarA]   Id del elemento al que se sube al paginar
   */
  constructor({ contenedorId, porPagina = 24, alCambiar, desplazarA }) {
    this.contenedorId = contenedorId;
    this.porPagina = porPagina;
    this.alCambiar = alCambiar;
    this.desplazarA = desplazarA;
    this.pagina = 1;
  }

  /** Vuelve a la primera página. Se llama al filtrar o al buscar. */
  reiniciar() {
    this.pagina = 1;
  }

  /**
   * Devuelve el trozo de la lista que corresponde a la página actual.
   * @template T
   * @param {T[]} lista
   * @returns {{items: T[], paginas: number, inicio: number, total: number}}
   */
  rebanar(lista) {
    const paginas = Math.max(1, Math.ceil(lista.length / this.porPagina));
    if (this.pagina > paginas) this.pagina = paginas;
    const inicio = (this.pagina - 1) * this.porPagina;
    return {
      items: lista.slice(inicio, inicio + this.porPagina),
      paginas,
      inicio,
      total: lista.length,
    };
  }

  /**
   * Calcula qué números mostrar, con puntos suspensivos si hay muchas páginas.
   * @param {number} actual
   * @param {number} total
   * @returns {(number|"…")[]}
   */
  static numerosVisibles(actual, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const nums = new Set([1, total, actual, actual - 1, actual + 1]);
    const orden = [...nums].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    const salida = [];
    orden.forEach((n, i) => {
      if (i > 0 && n - orden[i - 1] > 1) salida.push("…");
      salida.push(n);
    });
    return salida;
  }

  /**
   * Dibuja los controles de paginación para la rebanada dada.
   * @param {{items: any[], paginas: number, inicio: number, total: number}} info
   */
  pintar(info) {
    const nav = el(this.contenedorId);
    if (!nav) return;
    if (info.paginas <= 1) {
      nav.innerHTML = "";
      return;
    }

    const actual = this.pagina;
    const desde = info.inicio + 1;
    const hasta = info.inicio + info.items.length;

    let html = `<span class="pag-info">${desde} a ${hasta} de ${info.total}</span><div class="pag-botones">`;
    html += `<button class="pag-btn pag-flecha" data-ir="${actual - 1}" ${actual === 1 ? "disabled" : ""} aria-label="Anterior">${ico("anterior")}</button>`;
    Paginador.numerosVisibles(actual, info.paginas).forEach((n) => {
      if (n === "…") html += `<span class="pag-elipsis">…</span>`;
      else html += `<button class="pag-btn ${n === actual ? "activo" : ""}" data-ir="${n}">${n}</button>`;
    });
    html += `<button class="pag-btn pag-flecha" data-ir="${actual + 1}" ${actual === info.paginas ? "disabled" : ""} aria-label="Siguiente">${ico("siguiente")}</button>`;
    html += `</div>`;
    nav.innerHTML = html;

    nav.querySelectorAll("button[data-ir]").forEach((b) => {
      b.addEventListener("click", () => this.#irA(Number(b.dataset.ir), info.paginas));
    });
  }

  /**
   * Cambia de página, repinta la sección y sube la vista.
   * @param {number} destino
   * @param {number} totalPaginas
   */
  #irA(destino, totalPaginas) {
    if (destino < 1 || destino > totalPaginas) return;
    this.pagina = destino;
    this.alCambiar();
    if (!this.desplazarA) return;
    const vista = el(this.desplazarA);
    const arriba = vista ? vista.getBoundingClientRect().top + window.scrollY - 80 : 0;
    desplazar(Math.max(0, arriba));
  }
}
