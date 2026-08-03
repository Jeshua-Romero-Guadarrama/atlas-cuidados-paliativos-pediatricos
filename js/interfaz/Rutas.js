/* ============================================================
   Rutas
   ------------------------------------------------------------
   Sincroniza la dirección del navegador con lo que se está viendo,
   usando el fragmento de la URL:

     #/farmacos            abre la sección de fármacos
     #/farmacos/morfina    abre además la ficha de la morfina

   Sirve para tres cosas que sin esto no se pueden hacer:
   compartir el enlace de una ficha concreta con un compañero,
   guardarla en favoritos, y que el botón de atrás del navegador
   cierre la ficha en lugar de salir de la aplicación.

   La clase no conoce ninguna sección en concreto: recibe un mapa
   de nombre a objeto y solo espera de cada uno los métodos
   abrirPorCodigo() y cerrar().
   ============================================================ */

export class Rutas {
  /**
   * @param {object} opciones
   * @param {import("./Navegacion.js").Navegacion} opciones.navegacion
   * @param {Record<string, {abrirPorCodigo?: (codigo: string) => boolean, cerrar?: () => void}>} opciones.secciones
   */
  constructor({ navegacion, secciones }) {
    this.navegacion = navegacion;
    this.secciones = secciones;
    /** Evita que al escribir la dirección se vuelva a interpretar. */
    this.propia = false;
  }

  montar() {
    window.addEventListener("hashchange", () => {
      if (this.propia) {
        this.propia = false;
        return;
      }
      this.aplicar();
    });
    this.aplicar();
    return this;
  }

  /**
   * Descompone el fragmento actual.
   * @returns {{vista: string|null, codigo: string|null}}
   */
  static leer() {
    const bruto = decodeURIComponent(window.location.hash.replace(/^#\/?/, "")).trim();
    if (!bruto) return { vista: null, codigo: null };
    const [vista, codigo] = bruto.split("/");
    return { vista: vista || null, codigo: codigo || null };
  }

  /** Lleva la aplicación al estado que describe la dirección actual. */
  aplicar() {
    const { vista, codigo } = Rutas.leer();
    if (!vista) return;

    const pestana = document.querySelector(`.pestana[data-vista="${vista}"]`);
    // Una pestaña apagada por falta de contenido no debe restaurarse: La
    // dirección se ignora y la aplicación queda en su pestaña de arranque.
    if (!pestana || pestana.classList.contains("oculta")) return;
    if (!pestana.classList.contains("activa")) this.navegacion.ir(vista);

    if (!codigo) {
      // Sin código en la dirección no debe quedar ninguna ficha abierta,
      // que es lo que convierte el botón de atrás en un "cerrar" natural.
      this.secciones[vista]?.cerrar?.();
      return;
    }
    const seccion = this.secciones[vista];
    seccion?.abrirPorCodigo?.(codigo);
  }

  /**
   * Escribe la dirección sin provocar una nueva interpretación.
   * @param {string} vista
   * @param {string} [codigo]
   */
  escribir(vista, codigo) {
    const destino = "#/" + vista + (codigo ? "/" + encodeURIComponent(codigo) : "");
    if (window.location.hash === destino) return;
    this.propia = true;
    window.location.hash = destino;
  }
}
