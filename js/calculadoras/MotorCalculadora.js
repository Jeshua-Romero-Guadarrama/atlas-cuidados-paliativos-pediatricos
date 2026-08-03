/* ============================================================
   Motor de calculadoras
   ------------------------------------------------------------
   Cada calculadora se describe por completo en datos: sus campos
   o sus preguntas, sus fórmulas y sus umbrales de interpretación.
   Esta clase construye el formulario, lo evalúa y compone la
   frase lista para copiar a la nota clínica.

   Para añadir una calculadora nueva basta editar
   data/calculadoras.json: aquí no hay que tocar nada.
   ============================================================ */

import { el, escapar } from "../nucleo/util.js";
import { EscalaVisual } from "./EscalaVisual.js";

export class MotorCalculadora {
  /**
   * @param {object} opciones
   * @param {string} opciones.formularioId
   * @param {string} opciones.salidaId
   * @param {string} opciones.resultadosId
   * @param {string} opciones.interpretacionId
   * @param {string} opciones.escalaId
   */
  constructor({ formularioId, salidaId, resultadosId, interpretacionId, escalaId }) {
    this.formularioId = formularioId;
    this.salidaId = salidaId;
    this.resultadosId = resultadosId;
    this.interpretacionId = interpretacionId;
    this.escala = new EscalaVisual(escalaId);

    /** @type {object|null} Calculadora abierta en este momento. */
    this.actual = null;
    /** @type {string} Frase del último cálculo, lista para copiar. */
    this.resumen = "";

    const form = el(this.formularioId);
    if (form) {
      const recalcular = () => this.actual && this.calcular();
      form.addEventListener("input", recalcular);
      form.addEventListener("change", recalcular);
    }
  }

  /**
   * Evalúa una expresión de la definición con las variables dadas.
   * Las expresiones vienen del archivo de datos del propio proyecto,
   * nunca de lo que escriba quien usa la aplicación.
   * @param {string} expresion
   * @param {Record<string, number>} variables
   * @returns {number|boolean|null}
   */
  static evaluar(expresion, variables) {
    try {
      const nombres = Object.keys(variables);
      const valores = nombres.map((n) => variables[n]);
      return Function(...nombres, `"use strict"; return (${expresion});`)(...valores);
    } catch {
      return null;
    }
  }

  /**
   * Construye el formulario de una calculadora y la deja lista para usar.
   * @param {object} calc
   */
  montar(calc) {
    this.actual = calc;
    const form = el(this.formularioId);
    if (!form) return;
    form.innerHTML = "";

    if (calc.tipo === "puntuacion") this.#montarPreguntas(form, calc);
    else this.#montarCampos(form, calc);

    el(this.salidaId)?.classList.add("oculta");
    this.escala.ocultar();

    // Las escalas de puntuación tienen todas sus opciones con valor por defecto,
    // así que pueden resolverse desde el primer momento.
    if (calc.tipo === "puntuacion") this.calcular();
  }

  /** @param {HTMLElement} form @param {object} calc */
  #montarPreguntas(form, calc) {
    (calc.preguntas || []).forEach((preg) => {
      const grupo = document.createElement("div");
      grupo.className = "calc-grupo";
      grupo.innerHTML = `<label class="calc-etiqueta" for="campo-${escapar(preg.id)}">${escapar(preg.etiqueta)}</label>`;

      const select = document.createElement("select");
      select.className = "calc-select";
      // El identificador enlaza la etiqueta con el selector, que sin él no
      // tiene nombre accesible.
      select.id = `campo-${preg.id}`;
      select.dataset.id = preg.id;
      (preg.opciones || []).forEach((op, i) => {
        const o = document.createElement("option");
        o.value = op.puntos;
        o.textContent = `${op.texto} (${op.puntos > 0 ? "+" : ""}${op.puntos})`;
        if (i === 0) o.selected = true;
        select.appendChild(o);
      });

      grupo.appendChild(select);
      form.appendChild(grupo);
    });
  }

  /** @param {HTMLElement} form @param {object} calc */
  #montarCampos(form, calc) {
    (calc.campos || []).forEach((campo) => {
      const grupo = document.createElement("div");
      grupo.className = "calc-grupo";
      // El mensaje de error nace vacío junto al campo y aria-describedby ya
      // apunta a él, de modo que al llenarse el lector lo asocia sin más.
      // Los límites min y max salen solo de los datos: aquí no se inventa
      // ningún tope clínico.
      grupo.innerHTML = `
        <label class="calc-etiqueta" for="campo-${campo.id}">${escapar(campo.etiqueta)}</label>
        <input class="calc-input" type="number" id="campo-${campo.id}" data-id="${campo.id}"
               inputmode="decimal" step="${campo.paso || 0.1}"
               ${campo.min !== undefined ? `min="${campo.min}"` : ""}
               ${campo.max !== undefined ? `max="${campo.max}"` : ""}
               placeholder="0" aria-describedby="aviso-campo-${campo.id}">
        <span class="calc-aviso" id="aviso-campo-${campo.id}" hidden></span>
        ${campo.referencia ? `<span class="calc-referencia">${escapar(campo.referencia)}</span>` : ""}`;
      form.appendChild(grupo);
    });
  }

  /** Rellena el formulario con los valores de muestra y lo resuelve. */
  aplicarEjemplo() {
    const calc = this.actual;
    if (!calc || !calc.ejemplo) return;
    const form = el(this.formularioId);
    if (!form) return;

    if (calc.tipo === "puntuacion") {
      form.querySelectorAll("select").forEach((select) => {
        const indice = calc.ejemplo[select.dataset.id];
        if (Number.isInteger(indice) && indice >= 0 && indice < select.options.length) {
          select.selectedIndex = indice;
        }
      });
    } else {
      form.querySelectorAll("input").forEach((input) => {
        const valor = calc.ejemplo[input.dataset.id];
        if (typeof valor === "number" && Number.isFinite(valor)) input.value = String(valor);
      });
    }
    this.calcular();
  }

  /** Lee el formulario, evalúa las fórmulas y pinta resultados, escala e interpretación. */
  calcular() {
    const calc = this.actual;
    if (!calc) return;
    const form = el(this.formularioId);
    const salida = el(this.salidaId);
    if (!form || !salida) return;

    const variables = {};
    const partes = [];

    if (calc.tipo === "puntuacion") {
      let total = calc.base || 0;
      form.querySelectorAll("select").forEach((s) => {
        total += Number(s.value);
      });
      variables.total = total;
      el(this.resultadosId).innerHTML = `
        <div class="calc-resultado">
          <span class="calc-resultado-etiqueta">Puntuación total</span>
          <span class="calc-resultado-valor">${total}</span>
        </div>`;
      partes.push("Puntuación total " + total);
    } else {
      const entradas = [...form.querySelectorAll("input")];
      // Los campos vacíos solo se señalan cuando ya se empezó a escribir,
      // para no recibir con un formulario en rojo a quien apenas lo abre.
      const empezado = entradas.some((i) => i.value.trim() !== "" || i.validity.badInput);
      let listo = true;
      entradas.forEach((i) => {
        const v = parseFloat(i.value);
        variables[i.dataset.id] = v;
        const problema = MotorCalculadora.#problemaDe(i, empezado);
        MotorCalculadora.#marcar(i, problema);
        if (problema || Number.isNaN(v)) listo = false;
      });
      if (!listo) {
        salida.classList.add("oculta");
        this.escala.ocultar();
        return;
      }

      const filas = (calc.resultados || []).map((res, i) => {
        const valor = MotorCalculadora.evaluar(res.formula, variables);
        variables["r" + i] = valor;
        const decimales = res.decimales !== undefined ? res.decimales : 2;
        const texto =
          valor === null || Number.isNaN(valor) ? "n/d" : Number(valor).toFixed(decimales);
        partes.push(res.etiqueta + " " + texto + (res.unidad ? " " + res.unidad : ""));
        return `
          <div class="calc-resultado">
            <span class="calc-resultado-etiqueta">${escapar(res.etiqueta)}</span>
            <span class="calc-resultado-valor">${texto} <small>${escapar(res.unidad || "")}</small></span>
          </div>`;
      });
      el(this.resultadosId).innerHTML = filas.join("");
    }

    // Gana la primera condición verdadera
    const interp = el(this.interpretacionId);
    const regla = (calc.interpretacion || []).find(
      (r) => MotorCalculadora.evaluar(r.si, variables) === true
    );
    if (regla) {
      interp.textContent = regla.texto;
      interp.className = "calc-interpretacion nivel-" + (regla.nivel || "normal");
      interp.classList.remove("oculta");
    } else {
      interp.classList.add("oculta");
    }

    this.escala.pintar(calc, variables);
    this.resumen = calc.nombre + ". " + partes.join(", ") + "." + (regla ? " " + regla.texto : "");
    salida.classList.remove("oculta");
  }

  /**
   * Describe qué le pasa a un campo, o devuelve cadena vacía si está bien.
   * Solo se avisa de lo comprobable sin juicio clínico: vacío, no numérico
   * o fuera de los límites que traigan los propios datos.
   * @param {HTMLInputElement} entrada
   * @param {boolean} empezado  Si ya se escribió algo en el formulario
   * @returns {string}
   */
  static #problemaDe(entrada, empezado) {
    if (entrada.validity.badInput) return "Escribe solo números.";
    if (entrada.value.trim() === "") return empezado ? "Falta este dato." : "";
    const v = parseFloat(entrada.value);
    if (entrada.min !== "" && v < parseFloat(entrada.min)) {
      return `El valor mínimo es ${entrada.min}.`;
    }
    if (entrada.max !== "" && v > parseFloat(entrada.max)) {
      return `El valor máximo es ${entrada.max}.`;
    }
    return "";
  }

  /**
   * Pinta o retira el estado de error de un campo: borde de peligro,
   * aria-invalid y el mensaje bajo el campo.
   * @param {HTMLInputElement} entrada
   * @param {string} problema
   */
  static #marcar(entrada, problema) {
    const aviso = el(`aviso-${entrada.id}`);
    if (aviso) {
      aviso.textContent = problema;
      aviso.hidden = !problema;
    }
    entrada.classList.toggle("invalido", Boolean(problema));
    if (problema) entrada.setAttribute("aria-invalid", "true");
    else entrada.removeAttribute("aria-invalid");
  }

  /**
   * Copia la frase del último cálculo al portapapeles.
   * @returns {Promise<boolean>}
   */
  async copiar() {
    if (!this.resumen) return false;
    try {
      await navigator.clipboard.writeText(this.resumen);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = this.resumen;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* sin portapapeles disponible */
      }
      document.body.removeChild(ta);
    }
    return true;
  }
}
