/* ============================================================
   Menú lateral de las páginas estáticas
   ------------------------------------------------------------
   Las páginas de posicionamiento no cargan la aplicación, pero
   el lector que llega desde un buscador merece la misma puerta
   de entrada: un botón flotante en el borde izquierdo que abre
   un panel con las secciones del atlas. Es autónomo a propósito,
   sin módulos ni dependencias, porque estas páginas deben seguir
   funcionando aunque la aplicación cambie.
   ============================================================ */
(function () {
  "use strict";

  // Secciones reales de la aplicación, con la ruta que abre cada pestaña.
  var SECCIONES = [
    { ruta: "sintomas", nombre: "Síntomas" },
    { ruta: "farmacos", nombre: "Fármacos" },
    { ruta: "escalas", nombre: "Escalas" },
    { ruta: "calculadoras", nombre: "Calculadoras" },
    { ruta: "comunicacion", nombre: "Comunicación" },
    { ruta: "temas", nombre: "Temas" },
    { ruta: "glosario", nombre: "Glosario" },
    { ruta: "estudio", nombre: "Casos" },
  ];

  var actual = document.body.getAttribute("data-seccion") || "";
  var abierto = false;

  function crear(etiqueta, clase, html) {
    var nodo = document.createElement(etiqueta);
    nodo.className = clase;
    if (html) nodo.innerHTML = html;
    return nodo;
  }

  var boton = crear("button", "seo-menu-boton");
  boton.type = "button";
  boton.setAttribute("aria-label", "Abrir el menú de secciones");
  boton.setAttribute("aria-expanded", "false");
  boton.setAttribute("aria-controls", "seo-menu");
  boton.innerHTML =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';

  var fondo = crear("div", "seo-menu-fondo");

  var panel = crear("nav", "seo-menu-panel");
  panel.id = "seo-menu";
  panel.setAttribute("aria-label", "Secciones del atlas");

  var cabecera = crear("div", "seo-menu-cabecera", '<p class="seo-menu-titulo">Secciones</p>');
  var cerrar = crear("button", "seo-menu-cerrar", "✕");
  cerrar.type = "button";
  cerrar.setAttribute("aria-label", "Cerrar el menú");
  cabecera.appendChild(cerrar);
  panel.appendChild(cabecera);

  var lista = crear("div", "seo-menu-lista");
  SECCIONES.forEach(function (s) {
    var enlace = crear("a", "seo-menu-item", s.nombre);
    enlace.href = "../index.html#/" + s.ruta;
    if (s.ruta === actual) {
      // La sección de la página abierta queda marcada para orientar al lector.
      enlace.classList.add("activa");
      enlace.setAttribute("aria-current", "page");
    }
    lista.appendChild(enlace);
  });
  panel.appendChild(lista);

  document.body.appendChild(boton);
  document.body.appendChild(fondo);
  document.body.appendChild(panel);

  /* El botón aparece al empezar a deslizar; en una página corta, donde casi
     no hay desplazamiento posible, se muestra desde el principio. */
  function actualizar() {
    var corta = document.documentElement.scrollHeight <= window.innerHeight + 160;
    boton.classList.toggle("visible", corta || window.scrollY > 160);
  }

  function abrir() {
    abierto = true;
    panel.classList.add("abierto");
    fondo.classList.add("abierto");
    boton.setAttribute("aria-expanded", "true");
    // El foco entra por la sección activa, que es donde el lector retoma el hilo.
    var destino = lista.querySelector(".activa") || lista.firstElementChild;
    if (destino) destino.focus();
  }

  /* @param devolverFoco  Verdadero cuando el cierre vino del teclado. */
  function cerrarPanel(devolverFoco) {
    abierto = false;
    panel.classList.remove("abierto");
    fondo.classList.remove("abierto");
    boton.setAttribute("aria-expanded", "false");
    if (devolverFoco) boton.focus();
  }

  boton.addEventListener("click", function () {
    if (abierto) cerrarPanel(true);
    else abrir();
  });
  cerrar.addEventListener("click", function () {
    cerrarPanel(true);
  });
  // El clic fuera del panel lo cierra sin mover el foco, porque vino del puntero.
  fondo.addEventListener("click", function () {
    cerrarPanel(false);
  });
  // La tecla de escape cierra el panel y devuelve el foco al botón que lo abrió.
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && abierto) cerrarPanel(true);
  });
  window.addEventListener("scroll", actualizar, { passive: true });
  window.addEventListener("resize", actualizar);
  actualizar();
})();
