/* ============================================================
   Modo estudio: casos clínicos
   ------------------------------------------------------------
   A diferencia de un atlas de imagen, aquí no hay nada que
   identificar visualmente. Se presenta una viñeta clínica y se
   pregunta qué haría quien estudia. Las opciones incorrectas
   también llevan explicación, porque el motivo por el que una
   respuesta es mala suele enseñar más que la correcta.
   ============================================================ */

import { el, ico, escapar, mezclar } from "../nucleo/util.js";

export class Quiz {
  /**
   * @param {object} opciones
   * @param {import("../nucleo/Repositorio.js").Repositorio} opciones.repositorio
   * @param {number} [opciones.totalPreguntas=8]
   */
  constructor({ repositorio, totalPreguntas = 8 }) {
    this.repositorio = repositorio;
    this.totalPreguntas = totalPreguntas;
    this.preguntas = [];
    this.indice = 0;
    this.aciertos = 0;
  }

  get casos() {
    return this.repositorio.obtener("casos");
  }

  /** Conecta los botones del panel. */
  montar() {
    el("boton-empezar")?.addEventListener("click", () => this.empezar());
    el("boton-siguiente")?.addEventListener("click", () => this.siguiente());
    el("boton-reiniciar")?.addEventListener("click", () => this.empezar());
    return this;
  }

  empezar() {
    this.preguntas = mezclar(this.casos).slice(0, Math.min(this.totalPreguntas, this.casos.length));
    this.indice = 0;
    this.aciertos = 0;

    el("quiz-inicio")?.classList.add("oculta");
    el("quiz-final")?.classList.add("oculta");
    el("quiz-pregunta")?.classList.remove("oculta");
    this.#mostrar();
  }

  #mostrar() {
    const caso = this.preguntas[this.indice];
    if (!caso) return;

    el("quiz-numero").textContent = `Caso ${this.indice + 1} de ${this.preguntas.length}`;
    el("quiz-puntos").textContent = String(this.aciertos);

    const barra = el("quiz-barra-relleno");
    if (barra) barra.style.width = `${(this.indice / this.preguntas.length) * 100}%`;

    el("quiz-vineta-texto").textContent = caso.vineta;
    const instruccion = el("quiz-instruccion");
    instruccion.textContent = caso.pregunta;
    // El botón que trajo hasta aquí acaba de ocultarse: el foco pasa a la
    // pregunta para que el teclado no quede en el limbo y el lector la lea.
    instruccion.setAttribute("tabindex", "-1");
    instruccion.focus();

    const contenedor = el("quiz-opciones");
    contenedor.innerHTML = "";
    mezclar(caso.opciones).forEach((opcion) => {
      const boton = document.createElement("button");
      boton.className = "quiz-opcion";
      boton.type = "button";
      boton.textContent = opcion.texto;
      boton.addEventListener("click", () => this.#responder(boton, opcion, caso));
      contenedor.appendChild(boton);
    });

    el("quiz-retro")?.classList.add("oculta");
    el("boton-siguiente")?.classList.add("oculta");
  }

  /**
   * @param {HTMLButtonElement} botonElegido
   * @param {object} opcion
   * @param {object} caso
   */
  #responder(botonElegido, opcion, caso) {
    const correcta = caso.opciones.find((o) => o.correcta);

    document.querySelectorAll(".quiz-opcion").forEach((b) => {
      b.disabled = true;
      if (b.textContent === correcta.texto) b.classList.add("correcta");
    });

    const retro = el("quiz-retro");
    if (opcion.correcta) {
      this.aciertos++;
      retro.className = "quiz-retro bien";
      retro.innerHTML = `${ico("check")} <span><strong>Correcto.</strong> ${escapar(
        opcion.explicacion || caso.aprendizaje || ""
      )}</span>`;
    } else {
      botonElegido.classList.add("incorrecta");
      retro.className = "quiz-retro mal";
      retro.innerHTML =
        `${ico("equis")} <span><strong>No.</strong> ${escapar(opcion.explicacion || "")} ` +
        `<br><strong>Lo indicado era:</strong> ${escapar(correcta.texto)}. ${escapar(
          correcta.explicacion || ""
        )}</span>`;
    }

    retro.classList.remove("oculta");
    el("quiz-puntos").textContent = String(this.aciertos);
    const siguiente = el("boton-siguiente");
    siguiente?.classList.remove("oculta");
    // Al deshabilitar las opciones el foco moría con ellas: se lleva al botón
    // de continuar, que es la única acción que queda disponible.
    siguiente?.focus();
  }

  siguiente() {
    this.indice++;
    if (this.indice < this.preguntas.length) {
      this.#mostrar();
      return;
    }
    this.#terminar();
  }

  #terminar() {
    const barra = el("quiz-barra-relleno");
    if (barra) barra.style.width = "100%";

    el("quiz-pregunta")?.classList.add("oculta");
    el("quiz-final")?.classList.remove("oculta");
    // Igual que al responder: el botón pulsado desaparece y el foco se
    // recoloca en la acción disponible del panel final.
    el("boton-reiniciar")?.focus();

    const total = this.preguntas.length;
    const mensaje =
      this.aciertos === total
        ? "Dominas el tema."
        : this.aciertos >= total * 0.6
        ? "Vas por buen camino."
        : "Vuelve a las fichas y repite: Estos casos se afinan con la práctica.";

    el("quiz-resultado-final").textContent = `Acertaste ${this.aciertos} de ${total}. ${mensaje}`;
  }
}
