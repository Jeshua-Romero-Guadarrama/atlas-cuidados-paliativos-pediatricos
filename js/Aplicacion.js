/* ============================================================
   Aplicación
   ------------------------------------------------------------
   Punto de composición: crea el repositorio, instancia cada
   sección con lo que necesita y las arranca. Es el único lugar
   donde las piezas se conocen entre sí; ninguna sección importa
   a otra directamente.
   ============================================================ */

import { Repositorio } from "./nucleo/Repositorio.js";
import { Modal } from "./nucleo/Modal.js";
import { el, anunciar } from "./nucleo/util.js";

import { SeccionSintomas } from "./secciones/SeccionSintomas.js";
import { SeccionFarmacos } from "./secciones/SeccionFarmacos.js";
import { SeccionEscalas } from "./secciones/SeccionEscalas.js";
import { SeccionCalculadoras } from "./secciones/SeccionCalculadoras.js";
import { SeccionComunicacion } from "./secciones/SeccionComunicacion.js";
import { SeccionGlosario } from "./secciones/SeccionGlosario.js";
import { SeccionTemas } from "./secciones/SeccionTemas.js";

import { Quiz } from "./estudio/Quiz.js";
import { Navegacion } from "./interfaz/Navegacion.js";
import { MenuLateral } from "./interfaz/MenuLateral.js";
import { Rutas } from "./interfaz/Rutas.js";

/** Qué colección da contenido a cada pestaña. */
const PESTANAS = {
  sintomas: "sintomas",
  farmacos: "farmacos",
  escalas: "escalas",
  calculadoras: "calculadoras",
  comunicacion: "comunicacion",
  temas: "temas",
  glosario: "glosario",
  estudio: "casos",
};

export class Aplicacion {
  constructor() {
    this.repositorio = new Repositorio();
    this.navegacion = new Navegacion();
    /** @type {Array<{montar: () => any}>} */
    this.secciones = [];
  }

  /** Carga los datos, construye las secciones y las arranca. */
  async iniciar() {
    // El fragmento se atiende antes de descargar nada: Con conexión lenta,
    // un enlace profundo como #/farmacos/morfina dejaría en pantalla la
    // pestaña de arranque durante toda la carga y parecería que el enlace
    // no funciona. Aquí solo se conmuta la pestaña; la ficha del fragmento,
    // el anuncio y el título llegan al final, cuando los datos ya están.
    const anticipo = this.#anticiparRuta();
    await this.repositorio.cargar();

    const repositorio = this.repositorio;

    // Se crean primero las que otras necesitan referenciar
    const temas = new SeccionTemas({ repositorio });
    const calculadoras = new SeccionCalculadoras({ repositorio });

    this.secciones = [
      new SeccionSintomas({ repositorio, alAbrirTema: (t) => temas.mostrar(t) }),
      new SeccionFarmacos({ repositorio }),
      new SeccionEscalas({ repositorio, alAbrirCalculadora: (c) => calculadoras.mostrar(c) }),
      calculadoras,
      new SeccionComunicacion({ repositorio }),
      new SeccionGlosario({ repositorio }),
      temas,
    ];

    this.quiz = new Quiz({ repositorio });

    Modal.registrarEscape();
    this.navegacion.montar();
    // Menú lateral: Retira la cabecera durante la lectura y ofrece las mismas pestañas en un panel.
    this.menuLateral = new MenuLateral().montar();
    this.secciones.forEach((s) => s.montar());
    this.quiz.montar();

    this.#conectarRutas();
    this.#pintarEstado();
    if (anticipo) this.#rematarAnticipo(anticipo);
    // Las rutas se montan al final, porque restaurar una dirección con
    // código necesita las secciones pintadas y las pestañas vacías ya
    // ocultas, para que una dirección hacia una sección vacía se ignore.
    this.rutas.montar();
    return this;
  }

  /**
   * Activa de inmediato la pestaña que nombra el fragmento, sin esperar a
   * los datos. En este punto las pestañas aún no están montadas y el gancho
   * alCambiarVista no existe (se conecta en #conectarRutas), así que el
   * cambio no puede escribir la dirección ni crear historial. Se guarda la
   * pestaña de arranque para poder volver a ella si la sección pedida llega
   * vacía.
   */
  #anticiparRuta() {
    const { vista } = Rutas.leer();
    if (!vista) return null;
    const activa = document.querySelector(".pestana.activa");
    const arranque = activa ? activa.dataset.vista : null;
    if (vista === arranque) return null;
    if (!this.navegacion.preactivar(vista)) return null;
    return { vista, arranque };
  }

  /**
   * Cierra la preactivación cuando los datos ya están. Si la sección pedida
   * llegó vacía, su pestaña acaba de apagarse y el aplicar() final va a
   * ignorar la dirección: Se devuelve la vista a la pestaña de arranque, en
   * silencio, igual que en un arranque sin fragmento. Si sigue encendida se
   * emite aquí, una sola vez, el anuncio y el título que la preactivación
   * calló, ya con el recuento real de la sección.
   */
  #rematarAnticipo({ vista, arranque }) {
    const pestana = document.querySelector(`.pestana[data-vista="${vista}"]`);
    if (!pestana) return;
    if (pestana.classList.contains("oculta")) {
      if (arranque) this.navegacion.preactivar(arranque);
      return;
    }
    if (pestana.classList.contains("activa")) this.#anunciarVista(vista, this.rutas.secciones[vista]);
  }

  /**
   * Enlaza cada sección con la dirección del navegador, de modo que abrir
   * una ficha cambie la URL y pegar una URL abra esa ficha.
   */
  #conectarRutas() {
    const porVista = Object.fromEntries(this.secciones.map((s) => [s.vista, s]));
    this.rutas = new Rutas({ navegacion: this.navegacion, secciones: porVista });

    this.navegacion.alCambiarVista = (vista) => {
      this.rutas.escribir(vista);
      this.#anunciarVista(vista, porVista[vista]);
    };

    this.secciones.forEach((seccion) => {
      const vista = seccion.vista;
      seccion.alAbrir = (doc) => this.rutas.escribir(vista, doc.codigo);
      if (seccion.modal) seccion.modal.alCerrar = () => this.rutas.escribir(vista);
    });
    // El montaje de las rutas no ocurre aquí sino al final de iniciar(),
    // cuando las pestañas vacías ya se han ocultado: Aplicar la dirección
    // antes de eso restauraría secciones que van a apagarse.
  }

  /**
   * Anuncia el cambio de pestaña en la región de estado y sincroniza el
   * título del documento, que es lo que se lee en la pestaña del navegador
   * y lo primero que dice un lector de pantalla al volver a ella.
   * @param {string} vista
   * @param {import("./nucleo/Seccion.js").Seccion} [seccion]
   */
  #anunciarVista(vista, seccion) {
    const boton = el("pestana-" + vista);
    const nombre = boton ? boton.textContent.trim() : vista;
    let mensaje = nombre;
    if (seccion && typeof seccion.filtrar === "function") {
      const n = seccion.filtrar().length;
      mensaje += ", " + (n === 1 ? `1 ${seccion.singular}` : `${n} ${seccion.plural}`);
    }
    anunciar(mensaje);
    document.title = `${nombre} · Atlas de Cuidados Paliativos Pediátricos`;
  }

  /** Métricas de la portada, pestañas vacías y línea de estado del pie. */
  #pintarEstado() {
    const totales = this.repositorio.totales;
    Navegacion.pintarMetricas(totales);
    this.navegacion.ocultarPestanasVacias(totales, PESTANAS);

    const estado = el("estado-origen");
    if (estado) estado.textContent = this.repositorio.resumen();
  }
}
