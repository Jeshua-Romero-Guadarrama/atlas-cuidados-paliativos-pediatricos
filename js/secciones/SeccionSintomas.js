/* ============================================================
   Sección: Síntomas y situaciones clínicas
   ============================================================ */

import { Seccion } from "../nucleo/Seccion.js";
import { Modal } from "../nucleo/Modal.js";
import { el, insignia, iconoDominio, resumir, claseDominio } from "../nucleo/util.js";

export class SeccionSintomas extends Seccion {
  /**
   * @param {object} opciones
   * @param {import("../nucleo/Repositorio.js").Repositorio} opciones.repositorio
   * @param {(tema: object) => void} opciones.alAbrirTema
   */
  constructor({ repositorio, alAbrirTema }) {
    super({
      vista: "sintomas",
      repositorio,
      singular: "situación encontrada",
      plural: "situaciones encontradas",
      vacio: "No encontré esa situación. Prueba con otra palabra o quita los filtros.",
      filtros: [
        { campo: "dominio", todos: "Todos" },
        { campo: "nivel", todos: "Todos" },
      ],
    });
    this.alAbrirTema = alAbrirTema;
    this.modal = new Modal("sintoma");
  }

  buscarEn(d) {
    return [
      d.titulo, d.dominio, d.nivel, d.edades, d.descripcion, d.porQueOcurre,
      d.escalar, d.perla, d.queDecirALaFamilia,
      (d.causas || []).join(" "),
      (d.evaluar || []).join(" "),
      (d.noFarmacologico || []).join(" "),
      (d.evitar || []).join(" "),
      (d.farmacologico || []).map((f) => `${f.farmaco} ${f.dosis} ${f.cuando || ""}`).join(" "),
      (d.etiquetas || []).join(" "),
    ].join(" ");
  }

  tarjeta(d) {
    return Seccion.componerTarjeta({
      icono: iconoDominio(d.dominio, "sintomas"),
      insignias: [
        { texto: d.dominio, clase: "dominio" },
        d.urgencia ? { texto: "Urgencia", clase: "urgencia", icono: "urgencias" } : null,
        { texto: d.nivel, clase: "nivel " + claseDominio(d.nivel) },
      ],
      titulo: d.titulo,
      resumen: resumir(d.descripcion, 130),
    });
  }

  abrir(d) {
    const m = this.modal;
    m.acento(d.dominio);

    m.html(
      "sin-insignias",
      insignia(d.dominio, "dominio") +
        (d.urgencia ? insignia("Urgencia", "urgencia", "urgencias") : "") +
        insignia(d.edades, "edad") +
        insignia(d.nivel, "nivel " + claseDominio(d.nivel))
    );
    m.texto("sin-titulo", d.titulo);
    m.texto("sin-descripcion", d.descripcion);

    this.#pintarEsquema(d);

    m.textoOpcional("sin-porque-seccion", "sin-porque", d.porQueOcurre);
    m.lista("sin-causas-seccion", "sin-causas", d.causas);
    m.lista("sin-evaluar-seccion", "sin-evaluar", d.evaluar);
    m.lista("sin-nofarma-seccion", "sin-nofarma", d.noFarmacologico);
    m.tabla(
      "sin-farma-seccion",
      "sin-farma",
      (d.farmacologico || []).map((f) => [f.farmaco, f.dosis, f.cuando || ""])
    );
    m.textoOpcional("sin-escalar-seccion", "sin-escalar", d.escalar);
    m.textoOpcional("sin-familia-seccion", "sin-familia", d.queDecirALaFamilia);
    m.lista("sin-evitar-seccion", "sin-evitar", d.evitar);
    m.textoOpcional("sin-perla-seccion", "sin-perla", d.perla);

    this.#pintarTemaRelacionado(d);
    m.abrir();
  }

  /** @param {object} d */
  #pintarEsquema(d) {
    if (!d.esquema) {
      this.modal.seccion("sin-esquema-seccion", false);
      return;
    }
    const img = el("sin-esquema");
    if (img) {
      img.src = d.esquema;
      img.alt = d.esquemaPie || d.titulo;
      img.onerror = () => this.modal.seccion("sin-esquema-seccion", false);
    }
    this.modal.texto("sin-esquema-pie", d.esquemaPie || "");
    this.modal.seccion("sin-esquema-seccion", true);
  }

  /** @param {object} d */
  #pintarTemaRelacionado(d) {
    const tema = this.repositorio.buscarPorCodigo("temas", d.temaRelacionado);
    if (!tema) {
      this.modal.seccion("sin-tema-seccion", false);
      return;
    }
    const boton = el("sin-tema-boton");
    if (boton) {
      boton.textContent = `Leer: ${tema.titulo}`;
      boton.onclick = () => {
        this.modal.cerrar();
        this.alAbrirTema(tema);
      };
    }
    this.modal.seccion("sin-tema-seccion", true);
  }
}
