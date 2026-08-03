/* ============================================================
   Sección: Fármacos
   ============================================================ */

import { Seccion } from "../nucleo/Seccion.js";
import { Modal } from "../nucleo/Modal.js";
import { insignia, claseVia, escapar, resumir } from "../nucleo/util.js";

export class SeccionFarmacos extends Seccion {
  /**
   * @param {object} opciones
   * @param {import("../nucleo/Repositorio.js").Repositorio} opciones.repositorio
   */
  constructor({ repositorio }) {
    super({
      vista: "farmacos",
      repositorio,
      singular: "fármaco",
      plural: "fármacos",
      vacio: "No encontré ese fármaco. Prueba con el nombre genérico.",
      filtros: [
        { campo: "grupo", todos: "Todos" },
        { campo: "vias", todos: "Todas" },
      ],
    });
    this.modal = new Modal("farmaco");
  }

  buscarEn(d) {
    return [
      d.nombre, d.grupo, d.descripcion, d.presentaciones, d.practico, d.inicioDuracion,
      (d.indicaciones || []).join(" "),
      (d.dosis || []).map((x) => `${x.via} ${x.pauta} ${x.indicacion || ""}`).join(" "),
      (d.adversos || []).join(" "),
      (d.precauciones || []).join(" "),
      (d.etiquetas || []).join(" "),
    ].join(" ");
  }

  tarjeta(d) {
    return Seccion.componerTarjeta({
      icono: "farmacos",
      insignias: [{ texto: d.grupo, clase: "dominio" }].concat(
        (d.vias || []).slice(0, 4).map((v) => ({ texto: v, clase: claseVia(v) }))
      ),
      titulo: d.nombre,
      resumen: resumir(d.descripcion, 125),
    });
  }

  abrir(d) {
    const m = this.modal;
    m.acento(d.grupo);

    m.html(
      "far-insignias",
      insignia(d.grupo, "dominio") +
        (d.vias || []).map((v) => insignia(v, claseVia(v))).join("") +
        (d.controlado ? insignia("Controlado", "urgencia", "urgencias") : "")
    );
    m.texto("far-nombre", d.nombre);
    m.texto("far-descripcion", d.descripcion);

    m.lista("far-indicaciones-seccion", "far-indicaciones", d.indicaciones);
    m.html("far-dosis", this.#filasDeDosis(d.dosis));
    m.seccion("far-dosis-seccion", (d.dosis || []).length > 0);
    m.textoOpcional("far-presentaciones-seccion", "far-presentaciones", d.presentaciones);
    m.textoOpcional("far-inicio-seccion", "far-inicio", d.inicioDuracion);
    m.lista("far-adversos-seccion", "far-adversos", d.adversos);
    m.lista("far-precauciones-seccion", "far-precauciones", d.precauciones);
    m.textoOpcional("far-practico-seccion", "far-practico", d.practico);

    m.abrir();
  }

  /**
   * Filas de dosis por vía, con la vía coloreada y el techo destacado.
   * @param {Array<{via: string, pauta: string, indicacion?: string, maximo?: string}>} dosis
   * @returns {string}
   */
  #filasDeDosis(dosis) {
    return (dosis || [])
      .map(
        (x) => `
        <div class="dosis-fila">
          <span class="dosis-via ${claseVia(x.via)}">${escapar(x.via)}</span>
          <div class="dosis-detalle">
            <strong>${escapar(x.pauta)}</strong>
            ${x.indicacion ? `<span>${escapar(x.indicacion)}</span>` : ""}
            ${x.maximo ? `<span class="dosis-techo">Máximo: ${escapar(x.maximo)}</span>` : ""}
          </div>
        </div>`
      )
      .join("");
  }
}
