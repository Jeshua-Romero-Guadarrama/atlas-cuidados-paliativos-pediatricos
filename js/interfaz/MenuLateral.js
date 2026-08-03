/* ============================================================
   Menú lateral de navegación
   ------------------------------------------------------------
   La cabecera pegajosa ayuda al llegar, pero durante la lectura
   tapa contenido. Pasado un umbral de desplazamiento se retira
   con una animación y queda un botón flotante en el borde
   izquierdo que despliega un panel con las mismas pestañas del
   documento. El panel no duplica la lógica de navegación: Cada
   opción reenvía el clic a su pestaña real, de modo que la
   acción, las rutas y el estado activo son siempre los que
   gobierna Navegacion.
   ============================================================ */

import { el } from "../nucleo/util.js";

export class MenuLateral {
  constructor() {
    this.cabecera = document.querySelector(".cabecera");
    this.boton = el("boton-menu-lateral");
    this.panel = el("menu-lateral");
    this.lista = el("menu-lateral-lista");
    this.fondo = el("menu-lateral-fondo");
    this.botonCerrar = el("cerrar-menu-lateral");
    this.retirada = false;
    this.abierto = false;
  }

  montar() {
    if (!this.cabecera || !this.boton || !this.panel || !this.lista) return this;
    this.#medir();
    // Un solo escuchador pasivo de scroll: El navegador desplaza sin esperar al manejador.
    window.addEventListener("scroll", () => this.#alDesplazar(), { passive: true });
    window.addEventListener("resize", () => this.#medir());
    this.boton.addEventListener("click", () => (this.abierto ? this.cerrar(true) : this.abrir()));
    this.botonCerrar?.addEventListener("click", () => this.cerrar(true));
    // El clic fuera del panel lo cierra sin mover el foco, porque vino del puntero.
    this.fondo?.addEventListener("click", () => this.cerrar(false));
    // La tecla de escape cierra el panel y devuelve el foco al botón que lo abrió.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.abierto) this.cerrar(true);
    });
    this.#alDesplazar();
    return this;
  }

  /* La altura se mide una vez y se rehace al cambiar el tamaño de la ventana,
     para no provocar un recálculo de geometría en cada paso del desplazamiento. */
  #medir() {
    this.altoCabecera = this.cabecera.offsetHeight || 120;
  }

  /* Umbral con histéresis: La cabecera se retira pasada su altura más un margen
     y solo regresa cerca del principio. La separación entre ambos valores evita
     que el cambio parpadee cuando el lector se detiene justo en el corte. */
  #alDesplazar() {
    const y = window.scrollY;
    if (!this.retirada && y > this.altoCabecera + 140) this.#retirar();
    else if (this.retirada && y < this.altoCabecera * 0.5) this.#restaurar();
  }

  #retirar() {
    this.retirada = true;
    this.cabecera.classList.add("retirada");
    this.boton.classList.add("visible");
  }

  #restaurar() {
    this.retirada = false;
    this.cabecera.classList.remove("retirada");
    this.boton.classList.remove("visible");
    // Con la cabecera de vuelta el panel sobra, y el botón oculto ya no puede recibir foco.
    if (this.abierto) this.cerrar(false);
  }

  /* El panel se reconstruye en cada apertura leyendo las pestañas reales del
     documento. Así respeta las que el arranque ocultó por falta de contenido
     y refleja la activa, sin mantener ninguna lista escrita a mano. */
  #construir() {
    this.lista.innerHTML = "";
    document.querySelectorAll("#pestanas .pestana").forEach((pestana) => {
      if (pestana.classList.contains("oculta")) return;
      const opcion = document.createElement("button");
      opcion.type = "button";
      opcion.className = "menu-lateral-item";
      opcion.innerHTML = pestana.innerHTML;
      if (pestana.classList.contains("activa")) {
        opcion.classList.add("activa");
        opcion.setAttribute("aria-current", "true");
      }
      opcion.addEventListener("click", () => {
        this.cerrar(false);
        pestana.click();
      });
      this.lista.appendChild(opcion);
    });
  }

  abrir() {
    this.#construir();
    this.abierto = true;
    this.panel.classList.add("abierto");
    this.fondo?.classList.add("abierto");
    this.boton.setAttribute("aria-expanded", "true");
    // El foco entra al panel por la opción activa, que es donde el lector retoma el hilo.
    const destino = this.lista.querySelector(".activa") || this.lista.firstElementChild;
    if (destino) destino.focus();
  }

  /** @param {boolean} devolverFoco  Verdadero cuando el cierre vino del teclado */
  cerrar(devolverFoco) {
    this.abierto = false;
    this.panel.classList.remove("abierto");
    this.fondo?.classList.remove("abierto");
    this.boton.setAttribute("aria-expanded", "false");
    if (devolverFoco) this.boton.focus();
  }
}
