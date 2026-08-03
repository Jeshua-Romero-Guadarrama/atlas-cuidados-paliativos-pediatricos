/* ============================================================
   Interfaz general
   ------------------------------------------------------------
   Pestañas, conmutador de tema, barra de progreso de lectura y
   botón de volver arriba. Todo lo que es del marco de la página
   y no de ninguna sección en concreto.
   ============================================================ */

import { el, ico, desplazar } from "../nucleo/util.js";

/** Ciclo del conmutador de tema: cada estado lleva al siguiente. */
const TEMA_SIGUIENTE = { claro: "oscuro", oscuro: "sistema", sistema: "claro" };

/** Cómo se le nombra cada estado a quien usa el botón. */
const TEMA_NOMBRE = { claro: "claro", oscuro: "oscuro", sistema: "el del sistema" };

/** Colores de la interfaz que se informan al navegador con theme-color. */
const COLOR_TEMA = { claro: "#6a4bab", oscuro: "#14111f" };

export class Navegacion {
  constructor() {
    this.barraScroll = el("barra-scroll");
    this.irArriba = el("ir-arriba");
    /** @type {((vista: string) => void)|null} Aviso de cambio de pestaña. */
    this.alCambiarVista = null;
  }

  montar() {
    this.#conectarPestanas();
    this.#conectarTema();
    this.#conectarDesplazamiento();
    this.#conectarSalto();
    return this;
  }

  /**
   * El enlace de salto lleva el foco al contenido de la vista visible en
   * ese momento, no a un ancla fija, porque la vista cambia con la pestaña.
   */
  #conectarSalto() {
    const salto = el("saltar-al-contenido");
    if (!salto) return;
    salto.addEventListener("click", (e) => {
      e.preventDefault();
      const vista = document.querySelector(".vista:not(.oculta)");
      if (!vista) return;
      vista.setAttribute("tabindex", "-1");
      vista.focus();
      desplazar(vista);
    });
  }

  /**
   * Muestra una vista por su nombre, como si se hubiera pulsado su pestaña.
   * @param {string} vista
   */
  ir(vista) {
    const boton = document.querySelector(`.pestana[data-vista="${vista}"]`);
    if (boton) boton.click();
  }

  /**
   * Conmuta pestaña y vista sin desplazar ni avisar a nadie. El arranque con
   * enlace profundo la usa antes de montar las pestañas: En ese punto no hay
   * escuchas de clic ni gancho alCambiarVista, así que el cambio no puede
   * escribir la dirección ni anunciar antes de tener datos. Devuelve si pudo
   * activar, porque una pestaña apagada por falta de contenido no debe
   * encenderse.
   * @param {string} vista
   * @returns {boolean}
   */
  preactivar(vista) {
    const boton = document.querySelector(`.pestana[data-vista="${vista}"]`);
    if (!boton || boton.classList.contains("oculta")) return false;
    document.querySelectorAll(".pestana").forEach((b) => {
      b.classList.remove("activa");
      b.setAttribute("aria-selected", "false");
    });
    boton.classList.add("activa");
    boton.setAttribute("aria-selected", "true");
    // Además de la clase se sincroniza el atributo hidden, porque es lo
    // único que saca a las vistas inactivas del árbol de accesibilidad:
    // sin él un lector de pantalla anuncia ocho regiones principales.
    document.querySelectorAll(".vista").forEach((v) => {
      v.classList.add("oculta");
      v.hidden = true;
    });
    const destino = el("vista-" + vista);
    if (destino) {
      destino.classList.remove("oculta");
      destino.hidden = false;
    }
    return true;
  }

  /**
   * Oculta las pestañas cuya colección haya llegado vacía, para que la
   * aplicación se vea coherente mientras se añade contenido.
   * @param {Record<string, number>} totales
   * @param {Record<string, string>} mapa  Nombre de vista a nombre de colección
   */
  ocultarPestanasVacias(totales, mapa) {
    Object.entries(mapa).forEach(([vista, coleccion]) => {
      const boton = document.querySelector(`.pestana[data-vista="${vista}"]`);
      if (boton) boton.classList.toggle("oculta", !totales[coleccion]);
    });
  }

  #conectarPestanas() {
    // aria-selected solo tiene sentido dentro del patrón de pestañas, así que
    // se completa aquí la semántica, y contenedor, botones y vistas quedan
    // enlazados para que un lector de pantalla anuncie qué controla cada una.
    el("pestanas")?.setAttribute("role", "tablist");
    document.querySelectorAll(".pestana").forEach((boton) => {
      const vista = el("vista-" + boton.dataset.vista);
      boton.id = "pestana-" + boton.dataset.vista;
      boton.setAttribute("role", "tab");
      if (vista) {
        boton.setAttribute("aria-controls", vista.id);
        vista.setAttribute("role", "tabpanel");
        vista.setAttribute("aria-labelledby", boton.id);
      }
      boton.setAttribute("aria-selected", boton.classList.contains("activa") ? "true" : "false");
      // El clic reutiliza la misma conmutación que la preactivación de
      // arranque y añade lo que sí es propio de la interacción: El
      // desplazamiento al inicio y el aviso a rutas y anuncio.
      boton.addEventListener("click", () => {
        if (!this.preactivar(boton.dataset.vista)) return;
        desplazar(0);
        if (this.alCambiarVista) this.alCambiarVista(boton.dataset.vista);
      });
    });
  }

  /**
   * Conmutador de tema en tres estados: claro, oscuro y sistema. El estado
   * sistema se representa quitando data-tema y borrando lo guardado, de modo
   * que los tokens vuelven a obedecer a prefers-color-scheme y quien cambió
   * de opinión puede regresar a seguir a su dispositivo.
   */
  #conectarTema() {
    const boton = el("conmutar-tema");
    if (!boton) return;
    boton.addEventListener("click", () => {
      const actual = document.documentElement.dataset.tema || "sistema";
      Navegacion.#aplicarTema(Navegacion.#temaSiguiente(actual));
      Navegacion.#rotularBotonTema(boton);
    });
    // El rótulo inicial refleja lo que haya dejado el guion de arranque.
    Navegacion.#rotularBotonTema(boton);
  }

  /**
   * El aspecto con el que se ve un estado: Para "sistema" decide la
   * preferencia del dispositivo, porque es la única forma de comparar
   * ese estado con los dos fijos.
   * @param {"claro"|"oscuro"|"sistema"} estado
   * @returns {"claro"|"oscuro"}
   */
  static #temaEfectivo(estado) {
    if (estado !== "sistema") return estado;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
  }

  /**
   * El paso siguiente del ciclo con una salvedad: Si ese paso se viera
   * igual que el estado actual (por ejemplo, de oscuro manual a sistema
   * con el dispositivo en oscuro), el toque no cambiaría nada en pantalla
   * y el botón parecería muerto, así que se salta un paso más para que
   * cada toque produzca siempre un cambio visible.
   * @param {string} actual
   * @returns {"claro"|"oscuro"|"sistema"}
   */
  static #temaSiguiente(actual) {
    let siguiente = TEMA_SIGUIENTE[actual] || "claro";
    if (Navegacion.#temaEfectivo(siguiente) === Navegacion.#temaEfectivo(actual)) {
      siguiente = TEMA_SIGUIENTE[siguiente];
    }
    return siguiente;
  }

  /** @param {"claro"|"oscuro"|"sistema"} estado */
  static #aplicarTema(estado) {
    if (estado === "sistema") {
      delete document.documentElement.dataset.tema;
    } else {
      document.documentElement.dataset.tema = estado;
    }
    try {
      // Guardar "sistema" equivale a no guardar nada: se borra la clave.
      if (estado === "sistema") localStorage.removeItem("tema");
      else localStorage.setItem("tema", estado);
    } catch {
      /* almacenamiento no disponible */
    }
    // Con tema fijado, los dos theme-color llevan el mismo color; en sistema
    // cada uno recupera el suyo y el navegador elige por su media.
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      const media = meta.getAttribute("media") || "";
      const sistema = media.includes("dark") ? COLOR_TEMA.oscuro : COLOR_TEMA.claro;
      meta.setAttribute("content", estado === "sistema" ? sistema : COLOR_TEMA[estado]);
    });
  }

  /**
   * El nombre accesible del botón dice el estado actual y el siguiente,
   * porque un botón que cicla entre tres estados no se explica con un ícono.
   * El siguiente se calcula con el mismo salto que el clic, para que el
   * rótulo anuncie el estado al que de verdad se va a llegar.
   * @param {HTMLElement} boton
   */
  static #rotularBotonTema(boton) {
    const actual = document.documentElement.dataset.tema || "sistema";
    const texto =
      `Tema: ${TEMA_NOMBRE[actual]}. Cambiar a ${TEMA_NOMBRE[Navegacion.#temaSiguiente(actual)]}`;
    boton.setAttribute("aria-label", texto);
    boton.setAttribute("title", texto);
  }

  #conectarDesplazamiento() {
    const alDesplazar = () => {
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      const pct = alto > 0 ? (window.scrollY / alto) * 100 : 0;
      if (this.barraScroll) this.barraScroll.style.width = pct + "%";
      if (this.irArriba) this.irArriba.classList.toggle("visible", window.scrollY > 500);
    };

    window.addEventListener("scroll", alDesplazar, { passive: true });
    this.irArriba?.addEventListener("click", () => desplazar(0));
    alDesplazar();
  }

  /**
   * Pinta las tarjetas resumen de la portada.
   * @param {Record<string, number>} totales
   */
  static pintarMetricas(totales) {
    const cont = el("metricas");
    if (!cont) return;
    const filas = [
      ["sintomas", totales.sintomas, "situaciones"],
      ["farmacos", totales.farmacos, "fármacos"],
      ["escalas", totales.escalas, "escalas"],
      ["calculadoras", totales.calculadoras, "calculadoras"],
      ["comunicacion", totales.comunicacion, "guiones"],
      ["glosario", totales.glosario, "términos"],
    ];
    cont.innerHTML = filas
      .filter(([, n]) => n > 0)
      .map(([nombre, n, t]) => `<span class="metrica">${ico(nombre)} <strong>${n}</strong> ${t}</span>`)
      .join("");
  }
}
