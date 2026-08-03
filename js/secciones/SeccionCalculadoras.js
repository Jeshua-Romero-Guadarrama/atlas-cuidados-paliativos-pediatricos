/* ============================================================
   Sección: Calculadoras
   ------------------------------------------------------------
   La sección se ocupa del listado y del modal; toda la lógica de
   cálculo vive en MotorCalculadora, que no sabe nada del listado.
   ============================================================ */

import { Seccion } from "../nucleo/Seccion.js";
import { Modal } from "../nucleo/Modal.js";
import { el, insignia, resumir } from "../nucleo/util.js";
import { MotorCalculadora } from "../calculadoras/MotorCalculadora.js";

export class SeccionCalculadoras extends Seccion {
  /**
   * @param {object} opciones
   * @param {import("../nucleo/Repositorio.js").Repositorio} opciones.repositorio
   */
  constructor({ repositorio }) {
    super({
      vista: "calculadoras",
      repositorio,
      singular: "calculadora",
      plural: "calculadoras",
      vacio: "No encontré esa calculadora. Prueba con otra palabra.",
      filtros: [
        { campo: "categoria", todos: "Todas" },
        // El tipo viene como identificador en los datos, así que el chip lleva
        // el mismo rótulo que ya usan las tarjetas.
        {
          campo: "tipo",
          todos: "Todos",
          etiqueta: (v) => (v === "puntuacion" ? "Puntuación" : "Fórmula"),
        },
      ],
    });

    this.modal = new Modal("calculadora");
    this.motor = new MotorCalculadora({
      formularioId: "calc-formulario",
      salidaId: "calc-salida",
      resultadosId: "calc-resultados",
      interpretacionId: "calc-interpretacion",
      escalaId: "calc-escala",
    });

    this.#conectarBotones();
  }

  buscarEn(d) {
    return [
      d.nombre, d.categoria, d.descripcion, d.formulaTexto, d.notas,
      (d.campos || []).map((c) => c.etiqueta).join(" "),
      (d.preguntas || []).map((p) => p.etiqueta).join(" "),
    ].join(" ");
  }

  tarjeta(d) {
    return Seccion.componerTarjeta({
      icono: "calculadoras",
      insignias: [
        { texto: d.categoria, clase: "dominio" },
        { texto: d.tipo === "puntuacion" ? "Puntuación" : "Fórmula", clase: "categoria" },
      ],
      titulo: d.nombre,
      resumen: resumir(d.descripcion, 125),
    });
  }

  abrir(d) {
    const m = this.modal;
    m.acento(d.categoria);

    m.html(
      "calc-insignias",
      insignia(d.categoria, "dominio") +
        insignia(d.tipo === "puntuacion" ? "Puntuación" : "Fórmula", "categoria")
    );
    m.texto("calc-nombre", d.nombre);
    m.texto("calc-descripcion", d.descripcion);
    m.textoOpcional("calc-formula-seccion", "calc-formula", d.formulaTexto);
    m.textoOpcional("calc-notas-seccion", "calc-notas", d.notas);

    this.motor.montar(d);
    el("calc-ejemplo")?.classList.toggle("oculta", !d.ejemplo);

    m.abrir();
  }

  /** Conecta los botones de ejemplo y de copiar, con su reacción visual. */
  #conectarBotones() {
    const ejemplo = el("calc-ejemplo");
    if (ejemplo) {
      ejemplo.addEventListener("click", () => {
        this.motor.aplicarEjemplo();
        SeccionCalculadoras.#destello(ejemplo, "Ejemplo cargado", "cargado");
      });
    }

    const copiar = el("calc-copiar");
    if (copiar) {
      copiar.addEventListener("click", async () => {
        if (await this.motor.copiar()) {
          SeccionCalculadoras.#destello(copiar, "Copiado", "copiado");
        }
      });
    }
  }

  /**
   * Cambia el texto de un botón durante un instante, para confirmar la acción.
   * @param {HTMLElement} boton
   * @param {string} mensaje
   * @param {string} clase
   */
  static #destello(boton, mensaje, clase) {
    const span = boton.querySelector("span");
    if (!span) return;
    const original = span.textContent;
    span.textContent = mensaje;
    boton.classList.add(clase);
    setTimeout(() => {
      span.textContent = original;
      boton.classList.remove(clase);
    }, 1600);
  }
}
