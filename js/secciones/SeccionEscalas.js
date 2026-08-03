/* ============================================================
   Sección: Escalas de valoración
   ============================================================ */

import { Seccion } from "../nucleo/Seccion.js";
import { Modal } from "../nucleo/Modal.js";
import { el, insignia, resumir } from "../nucleo/util.js";

export class SeccionEscalas extends Seccion {
  /**
   * @param {object} opciones
   * @param {import("../nucleo/Repositorio.js").Repositorio} opciones.repositorio
   * @param {(calc: object) => void} opciones.alAbrirCalculadora
   */
  constructor({ repositorio, alAbrirCalculadora }) {
    super({
      vista: "escalas",
      repositorio,
      singular: "escala",
      plural: "escalas",
      vacio: "No encontré esa escala. Prueba con sus siglas o con lo que mide.",
      filtros: [{ campo: "dominio", todos: "Todas" }],
    });
    this.alAbrirCalculadora = alAbrirCalculadora;
    this.modal = new Modal("escala");
  }

  buscarEn(d) {
    return [
      d.nombre, d.dominio, d.paraQue, d.comoUsarla, d.limitaciones, d.edadDeUso, d.rango,
      (d.items || []).join(" "),
      (d.tramos || []).map((t) => `${t.puntuacion} ${t.significa} ${t.queHacer || ""}`).join(" "),
      (d.etiquetas || []).join(" "),
    ].join(" ");
  }

  tarjeta(d) {
    return Seccion.componerTarjeta({
      icono: "escalas",
      insignias: [
        { texto: d.dominio, clase: "dominio" },
        d.edadDeUso ? { texto: d.edadDeUso, clase: "edad" } : null,
      ],
      titulo: d.nombre,
      resumen: resumir(d.paraQue, 130),
    });
  }

  abrir(d) {
    const m = this.modal;
    m.acento(d.dominio);

    m.html(
      "esc-insignias",
      insignia(d.dominio, "dominio") + insignia(d.edadDeUso, "edad") + insignia(d.rango, "categoria")
    );
    m.texto("esc-nombre", d.nombre);
    m.texto("esc-paraque", d.paraQue);
    m.texto("esc-comousarla", d.comoUsarla);

    m.lista("esc-items-seccion", "esc-items", d.items);
    m.tabla(
      "esc-tramos-seccion",
      "esc-tramos",
      (d.tramos || []).map((t) => [t.puntuacion, t.significa, t.queHacer || ""])
    );
    m.textoOpcional("esc-lim-seccion", "esc-limitaciones", d.limitaciones);

    this.#pintarEnlaceACalculadora(d);
    m.abrir();
  }

  /**
   * Si existe una calculadora que resuelve esta escala, se enlaza.
   * @param {object} d
   */
  #pintarEnlaceACalculadora(d) {
    const calc = this.repositorio.buscarPorCodigo("calculadoras", d.calculadora);
    if (!calc) {
      this.modal.seccion("esc-calc-seccion", false);
      return;
    }
    const boton = el("esc-calc-boton");
    if (boton) {
      boton.textContent = `Abrir la calculadora de ${calc.nombre}`;
      boton.onclick = () => {
        this.modal.cerrar();
        this.alAbrirCalculadora(calc);
      };
    }
    this.modal.seccion("esc-calc-seccion", true);
  }
}
