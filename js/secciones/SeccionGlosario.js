/* ============================================================
   Sección: Glosario
   ------------------------------------------------------------
   Única sección cuyas tarjetas no son interactivas: se lee como
   un diccionario, sin modal.
   ============================================================ */

import { Seccion } from "../nucleo/Seccion.js";
import { escapar, claseDominio } from "../nucleo/util.js";

export class SeccionGlosario extends Seccion {
  /**
   * @param {object} opciones
   * @param {import("../nucleo/Repositorio.js").Repositorio} opciones.repositorio
   */
  constructor({ repositorio }) {
    super({
      vista: "glosario",
      repositorio,
      singular: "término",
      plural: "términos",
      vacio: "No encontré ese término.",
      porPagina: 30,
      filtros: [{ campo: "categoria", todos: "Todas" }],
    });
  }

  get interactiva() {
    return false;
  }

  buscarEn(d) {
    return [d.termino, d.categoria, d.definicion].join(" ");
  }

  tarjeta(d) {
    // La clase de dominio da a cada término el color de su familia funcional,
    // con lo que el glosario deja de ser una columna monótona de lavanda y el
    // color pasa a decir algo: verde trata, azul mide, magenta dosifica,
    // naranja acompaña.
    return `
      <div class="termino ${claseDominio(d.categoria)}">
        ${d.categoria ? `<span class="insignia categoria">${escapar(d.categoria)}</span>` : ""}
        <h3>${escapar(d.termino)}</h3>
        <p>${escapar(d.definicion)}</p>
      </div>`;
  }
}
