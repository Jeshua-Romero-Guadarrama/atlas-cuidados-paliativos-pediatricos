/* ============================================================
   Sección: Temas de estudio
   ------------------------------------------------------------
   Hereda de Seccion como el resto de las pestañas, de modo que
   los temas se buscan, se filtran por área y se cuentan igual
   que los fármacos o las escalas. La búsqueda entra también en
   el cuerpo de los artículos, porque un tema se recuerda por lo
   que dice y no solo por su título.
   ============================================================ */

import { Seccion } from "../nucleo/Seccion.js";
import { Modal } from "../nucleo/Modal.js";
import { escapar, resumir } from "../nucleo/util.js";

export class SeccionTemas extends Seccion {
  /**
   * @param {object} opciones
   * @param {import("../nucleo/Repositorio.js").Repositorio} opciones.repositorio
   */
  constructor({ repositorio }) {
    super({
      vista: "temas",
      repositorio,
      singular: "tema",
      plural: "temas",
      vacio: "No encontré ese tema. Prueba con otra palabra o quita el filtro.",
      filtros: [{ campo: "area", todos: "Todas" }],
    });
    this.modal = new Modal("tema");
  }

  buscarEn(d) {
    return [
      d.titulo,
      d.area,
      d.resumen,
      (d.secciones || []).map((s) => `${s.encabezado} ${(s.parrafos || []).join(" ")}`).join(" "),
      (d.puntosClave || []).join(" "),
    ].join(" ");
  }

  valorAcento(d) {
    return d.area || "";
  }

  tarjeta(d) {
    return (
      Seccion.componerTarjeta({
        icono: "temas",
        insignias: [{ texto: d.area, clase: "dominio" }],
        titulo: d.titulo,
        resumen: resumir(d.resumen, 150),
      }) +
      `<p class="tema-meta">${(d.secciones || []).length} secciones · ${(d.puntosClave || []).length} puntos clave</p>`
    );
  }

  /**
   * @param {object} tema
   */
  abrir(tema) {
    const m = this.modal;
    m.acento(tema.area);
    m.texto("tema-area", tema.area);
    m.texto("tema-titulo", tema.titulo);
    m.texto("tema-resumen", tema.resumen);

    m.html(
      "tema-secciones",
      (tema.secciones || [])
        .map(
          (s) => `
        <section class="tema-seccion">
          <h3>${escapar(s.encabezado)}</h3>
          ${(s.parrafos || []).map((p) => `<p>${escapar(p)}</p>`).join("")}
        </section>`
        )
        .join("")
    );

    m.html("tema-puntos", (tema.puntosClave || []).map((p) => `<li>${escapar(p)}</li>`).join(""));
    m.abrir();
  }
}
