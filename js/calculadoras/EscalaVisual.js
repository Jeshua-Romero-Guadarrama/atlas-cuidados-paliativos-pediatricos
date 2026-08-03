/* ============================================================
   Escala visual de referencia
   ------------------------------------------------------------
   Traduce las reglas de interpretación de una calculadora en una
   barra con zonas de color y un marcador en el punto que ocupa el
   resultado.

   Solo se construye cuando todas las reglas menos la última son
   umbrales numéricos simples sobre una misma variable, del tipo
   "r0 > 10" o "total >= 7", y la última es "true". Si las reglas
   combinan varias variables la barra se omite y el resto de la
   calculadora sigue funcionando igual.
   ============================================================ */

import { el, escapar, atributo } from "../nucleo/util.js";

const RE_UMBRAL = /^([A-Za-z_][A-Za-z0-9_]*)\s*(>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)$/;
const NOMBRE_NIVEL = { normal: "normal", medio: "intermedia", alto: "de alerta" };

export class EscalaVisual {
  /**
   * @param {string} contenedorId
   */
  constructor(contenedorId) {
    this.contenedorId = contenedorId;
  }

  /** Cuántos decimales tiene un número escrito como texto. */
  static #decimalesDeTexto(texto) {
    const punto = texto.indexOf(".");
    return punto === -1 ? 0 : texto.length - punto - 1;
  }

  /** Rango posible de una escala de puntuación, sumando mínimo y máximo de cada pregunta. */
  static #rangoPuntuacion(calc) {
    let min = calc.base || 0;
    let max = calc.base || 0;
    (calc.preguntas || []).forEach((preg) => {
      const puntos = (preg.opciones || []).map((op) => Number(op.puntos));
      if (!puntos.length) return;
      min += Math.min(...puntos);
      max += Math.max(...puntos);
    });
    return [min, max];
  }

  /** Regla que gana en un punto concreto del eje, con el mismo orden que el motor. */
  static #reglaEnPunto(punto, condiciones, reglaFinal) {
    for (const c of condiciones) {
      if (c.op === ">" && punto > c.umbral) return c;
      if (c.op === ">=" && punto >= c.umbral) return c;
      if (c.op === "<" && punto < c.umbral) return c;
      if (c.op === "<=" && punto <= c.umbral) return c;
    }
    return reglaFinal;
  }

  /** Nombre legible de la variable sobre la que se aplican los umbrales. */
  static #etiquetaDeVariable(calc, variable) {
    if (variable === "total") return "Puntuación total";
    const res = /^r(\d+)$/.exec(variable);
    if (res && calc.resultados && calc.resultados[Number(res[1])]) {
      return calc.resultados[Number(res[1])].etiqueta || "";
    }
    const campo = (calc.campos || []).find((c) => c.id === variable);
    return campo ? campo.etiqueta : "";
  }

  /**
   * Convierte las reglas de interpretación en zonas de una barra.
   * @param {object} calc
   * @param {Record<string, number>} variables
   * @returns {object|null}
   */
  static calcular(calc, variables) {
    const reglas = calc.interpretacion || [];
    if (reglas.length < 2) return null;
    const ultima = reglas[reglas.length - 1];
    if (String(ultima.si).trim() !== "true") return null;

    const condiciones = [];
    const textoUmbral = {};
    let variable = null;
    let decimales = 0;

    for (let i = 0; i < reglas.length - 1; i++) {
      const m = RE_UMBRAL.exec(String(reglas[i].si).trim());
      if (!m) return null;
      if (variable === null) variable = m[1];
      else if (variable !== m[1]) return null;

      const umbral = parseFloat(m[3]);
      decimales = Math.max(decimales, EscalaVisual.#decimalesDeTexto(m[3]));
      if (textoUmbral[umbral] === undefined) textoUmbral[umbral] = m[3];
      condiciones.push({
        op: m[2],
        umbral,
        nivel: reglas[i].nivel || "normal",
        leyenda: reglas[i].texto || "",
      });
    }

    const reglaFinal = { nivel: ultima.nivel || "normal", leyenda: ultima.texto || "" };
    const valor = variables[variable];
    if (typeof valor !== "number" || !Number.isFinite(valor)) return null;

    const umbrales = Object.keys(textoUmbral).map(Number).sort((a, b) => a - b);
    const menor = umbrales[0];
    const mayor = umbrales[umbrales.length - 1];

    let min;
    let max;
    if (calc.tipo === "puntuacion") {
      [min, max] = EscalaVisual.#rangoPuntuacion(calc);
      decimales = 0;
    } else {
      const ancho = Math.max(mayor - menor, Math.abs(mayor) * 0.5, Math.abs(menor) * 0.5, 1);
      min = menor - ancho * 0.45;
      max = mayor + ancho * 0.45;
      if (menor >= 0 && min < 0) min = 0;
    }

    const holgura = (max - min) * 0.12;
    if (valor < min) min = valor - holgura;
    if (valor > max) max = valor + holgura;
    if (!(max > min)) return null;

    // Cada tramo entre umbrales toma el nivel de la regla que gana dentro de él
    const cortes = umbrales.filter((u) => u > min && u < max);
    const limites = [min].concat(cortes, [max]);
    const paso = (max - min) * 1e-6;
    const zonas = [];
    for (let i = 0; i < limites.length - 1; i++) {
      const regla = EscalaVisual.#reglaEnPunto(limites[i] + paso, condiciones, reglaFinal);
      const desde = ((limites[i] - min) / (max - min)) * 100;
      const hasta = ((limites[i + 1] - min) / (max - min)) * 100;
      const previa = zonas[zonas.length - 1];
      if (previa && previa.nivel === regla.nivel) previa.ancho = hasta - previa.desde;
      else zonas.push({ nivel: regla.nivel, leyenda: regla.leyenda, desde, ancho: hasta - desde });
    }

    const marcas = cortes.map((u) => ({
      texto: textoUmbral[u],
      posicion: ((u - min) / (max - min)) * 100,
    }));

    let decimalesValor = decimales;
    const res = /^r(\d+)$/.exec(variable);
    if (variable === "total") decimalesValor = 0;
    else if (res && calc.resultados && calc.resultados[Number(res[1])]) {
      const d = calc.resultados[Number(res[1])].decimales;
      decimalesValor = d !== undefined ? d : 2;
    }

    return {
      zonas,
      marcas,
      etiqueta: EscalaVisual.#etiquetaDeVariable(calc, variable),
      valorTexto: Number(valor).toFixed(decimalesValor),
      nivel: EscalaVisual.#reglaEnPunto(valor, condiciones, reglaFinal).nivel,
      posicion: Math.max(0, Math.min(100, ((valor - min) / (max - min)) * 100)),
    };
  }

  /** Oculta la barra y borra su contenido. */
  ocultar() {
    const caja = el(this.contenedorId);
    if (!caja) return;
    caja.innerHTML = "";
    caja.dataset.firma = "";
    caja.classList.add("oculta");
  }

  /**
   * Dibuja la barra para el resultado actual.
   * @param {object} calc
   * @param {Record<string, number>} variables
   */
  pintar(calc, variables) {
    const caja = el(this.contenedorId);
    if (!caja) return;

    const escala = EscalaVisual.calcular(calc, variables);
    if (!escala) {
      caja.innerHTML = "";
      caja.classList.add("oculta");
      return;
    }

    const zonas = escala.zonas
      .map(
        (z) =>
          `<span class="calc-escala-zona nivel-${z.nivel}" title="${atributo(z.leyenda)}"
                 style="left:${z.desde.toFixed(2)}%; width:${Math.max(z.ancho, 0).toFixed(2)}%"></span>`
      )
      .join("");

    // Se omite una cifra si queda demasiado cerca de la anterior, para no amontonarlas
    let anterior = -99;
    const marcas = escala.marcas
      .map((m) => {
        if (m.posicion - anterior < 9) return "";
        anterior = m.posicion;
        let estilo = `left:${m.posicion.toFixed(2)}%`;
        if (m.posicion < 6) estilo = "left:0; transform:none";
        else if (m.posicion > 94) estilo = "left:auto; right:0; transform:none";
        return `<span class="calc-escala-cifra" style="${estilo}">${escapar(m.texto)}</span>`;
      })
      .join("");

    const descripcion =
      `Escala de referencia. El valor ${escala.valorTexto} queda en la zona ` +
      `${NOMBRE_NIVEL[escala.nivel] || "normal"}.`;

    // Si las zonas no cambian basta mover el marcador, y así se desliza al escribir
    const firma = JSON.stringify([escala.zonas, escala.marcas, escala.etiqueta]);
    const barra = caja.querySelector(".calc-escala-barra");
    const marcador = barra && barra.querySelector(".calc-escala-marca");
    if (marcador && caja.dataset.firma === firma) {
      marcador.style.left = escala.posicion.toFixed(2) + "%";
      barra.setAttribute("aria-label", descripcion);
      caja.classList.remove("oculta");
      return;
    }
    caja.dataset.firma = firma;

    caja.innerHTML = `
      <span class="calc-escala-titulo">Escala de referencia${
        escala.etiqueta ? ` <small>${escapar(escala.etiqueta)}</small>` : ""
      }</span>
      <div class="calc-escala-barra" role="img" aria-label="${atributo(descripcion)}">
        <div class="calc-escala-pista">${zonas}</div>
        <span class="calc-escala-marca" style="left:${escala.posicion.toFixed(2)}%"></span>
        <div class="calc-escala-cifras">${marcas}</div>
      </div>`;
    caja.classList.remove("oculta");
  }
}
