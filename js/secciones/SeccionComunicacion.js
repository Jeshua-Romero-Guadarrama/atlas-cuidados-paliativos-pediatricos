/* ============================================================
   Sección: Comunicación
   ------------------------------------------------------------
   Es la sección con el modal más particular: dos columnas de
   frases que ayudan y frases que conviene evitar, y una lista de
   preguntas difíciles con su respuesta sugerida.
   ============================================================ */

import { Seccion } from "../nucleo/Seccion.js";
import { Modal } from "../nucleo/Modal.js";
import { insignia, escapar, resumir } from "../nucleo/util.js";

export class SeccionComunicacion extends Seccion {
  /**
   * @param {object} opciones
   * @param {import("../nucleo/Repositorio.js").Repositorio} opciones.repositorio
   */
  constructor({ repositorio }) {
    super({
      vista: "comunicacion",
      repositorio,
      singular: "guion",
      plural: "guiones",
      vacio: "No encontré esa situación. Prueba con otra palabra.",
      porPagina: 18,
      filtros: [
        { campo: "interlocutor", todos: "Todos" },
        // Los guiones ya traen dominio de cuidado en los datos: es el segundo
        // eje natural para cruzar con quién se habla y de qué se habla.
        { campo: "dominio", todos: "Todos" },
      ],
    });
    this.modal = new Modal("comunicacion");
  }

  buscarEn(d) {
    return [
      d.titulo, d.interlocutor, d.momento, d.cuando, d.objetivo, d.perla,
      (d.pasos || []).join(" "),
      (d.frasesUtiles || []).join(" "),
      (d.frasesQueEvitar || []).join(" "),
      (d.siPreguntan || []).map((p) => `${p.pregunta} ${p.respuesta}`).join(" "),
      (d.porEdad || []).map((e) => `${e.edad} ${e.como}`).join(" "),
      (d.errores || []).join(" "),
      (d.etiquetas || []).join(" "),
    ].join(" ");
  }

  tarjeta(d) {
    return Seccion.componerTarjeta({
      icono: "comunicacion",
      insignias: [
        { texto: d.interlocutor, clase: "dominio" },
        { texto: `${(d.frasesUtiles || []).length} frases`, clase: "categoria" },
      ],
      titulo: d.titulo,
      resumen: resumir(d.cuando, 145),
    });
  }

  valorAcento(d) {
    return d.dominio || "Emocional";
  }

  abrir(d) {
    const m = this.modal;
    m.acento(this.valorAcento(d));

    m.html("com-insignias", insignia(d.interlocutor, "dominio") + insignia(d.momento, "edad"));
    m.texto("com-titulo", d.titulo);
    m.texto("com-cuando", d.cuando);

    m.textoOpcional("com-objetivo-seccion", "com-objetivo", d.objetivo);
    m.lista("com-pasos-seccion", "com-pasos", d.pasos);

    this.#pintarFrases(d);
    this.#pintarPreguntas(d);

    m.tabla("com-edad-seccion", "com-edad", (d.porEdad || []).map((e) => [e.edad, e.como]));
    m.lista("com-errores-seccion", "com-errores", d.errores);
    m.textoOpcional("com-perla-seccion", "com-perla", d.perla);

    m.abrir();
  }

  /**
   * Las frases se muestran entrecomilladas porque son literales para decir en voz alta.
   * @param {object} d
   */
  #pintarFrases(d) {
    const si = d.frasesUtiles || [];
    const no = d.frasesQueEvitar || [];
    const comillas = (f) => `<li>«${escapar(f)}»</li>`;

    this.modal.html("com-frases-si", si.map(comillas).join(""));
    this.modal.html("com-frases-no", no.map(comillas).join(""));
    this.modal.seccion("com-frases-seccion", si.length > 0 || no.length > 0);
  }

  /** @param {object} d */
  #pintarPreguntas(d) {
    const preguntas = d.siPreguntan || [];
    this.modal.html(
      "com-preguntas",
      preguntas
        .map(
          (p) =>
            `<dl class="pregunta-par"><dt>${escapar(p.pregunta)}</dt><dd>${escapar(p.respuesta)}</dd></dl>`
        )
        .join("")
    );
    this.modal.seccion("com-preguntas-seccion", preguntas.length > 0);
  }
}
