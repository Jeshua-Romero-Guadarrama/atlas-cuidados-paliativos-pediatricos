/* ============================================================
   Service worker
   ------------------------------------------------------------
   Cumple la promesa del pie de página: la aplicación funciona
   completa sin conexión. Dos estrategias según lo que se pide:

     data/*.json   caché primero con revalidación en segundo
                   plano. La copia guardada responde al instante
                   y en paralelo la red refresca la caché para
                   la próxima visita. Una corrección puede tardar
                   así una visita en verse, y aquí es aceptable
                   porque el contenido es educativo y estable,
                   mientras que esperar la descarga en cada
                   visita se nota siempre.
     todo lo demás caché primero, porque el armazón está
                   versionado y no cambia entre publicaciones.

   El nombre de la caché lleva la versión: al publicar cambios se
   sube el número, el service worker nuevo instala su caché y el
   paso de activación borra las anteriores. El procedimiento está
   documentado en el README.

   Todas las rutas son relativas al propio archivo, porque el
   sitio vive en un subdirectorio de GitHub Pages y una ruta
   absoluta apuntaría fuera del ámbito.
   ============================================================ */

const CACHE = "atlas-cpp-v4";

/* El armazón completo: documento, hojas, módulos, datos e imágenes.
   Se precachea todo porque el atlas entero pesa menos de 1 MB y la
   consulta domiciliaria no puede depender de qué fichas se abrieron. */
const ARMAZON = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/base.css",
  "css/layout.css",
  "css/componentes.css",
  "css/secciones.css",
  "css/acentos.css",
  "css/responsivo.css",
  "css/impresion.css",
  "js/main.js",
  "js/Aplicacion.js",
  "js/nucleo/util.js",
  "js/nucleo/Repositorio.js",
  "js/nucleo/Seccion.js",
  "js/nucleo/Chips.js",
  "js/nucleo/Paginador.js",
  "js/nucleo/Modal.js",
  "js/interfaz/Navegacion.js",
  "js/interfaz/MenuLateral.js",
  "js/interfaz/Rutas.js",
  "js/secciones/SeccionSintomas.js",
  "js/secciones/SeccionFarmacos.js",
  "js/secciones/SeccionEscalas.js",
  "js/secciones/SeccionCalculadoras.js",
  "js/secciones/SeccionComunicacion.js",
  "js/secciones/SeccionGlosario.js",
  "js/secciones/SeccionTemas.js",
  "js/calculadoras/MotorCalculadora.js",
  "js/calculadoras/EscalaVisual.js",
  "js/estudio/Quiz.js",
  "data/sintomas.json",
  "data/farmacos.json",
  "data/escalas.json",
  "data/calculadoras.json",
  "data/comunicacion.json",
  "data/glosario.json",
  "data/temas.json",
  "data/casos.json",
  "img/icono-colibri.svg",
  "img/icono-colibri-recortable.svg",
  "img/esquema-algoritmo-disnea.svg",
  "img/esquema-dolor-no-verbal.svg",
  "img/esquema-escalera-analgesica.svg",
  "img/esquema-kit-urgencias.svg",
  "img/esquema-mecanismos-nausea.svg",
  "img/esquema-titulacion-rescate.svg",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ARMAZON)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  // Al activarse la versión nueva se borran las cachés de las anteriores,
  // que ya nadie va a leer y solo ocupan espacio.
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* Caché primero con revalidación en segundo plano: La copia guardada
   responde al instante y en paralelo se pide a la red y se guarda su
   respuesta para la próxima visita. Sin copia guardada se espera a la
   red y se guarda. */
function cacheConRevalidacion(evento, peticion) {
  const desdeRed = fetch(peticion).then((respuesta) => {
    const copia = respuesta.clone();
    caches.open(CACHE).then((cache) => cache.put(peticion, copia));
    return respuesta;
  });
  return caches.match(peticion).then((guardada) => {
    if (guardada) {
      // waitUntil deja terminar la revalidación aunque el service worker
      // se fuera a dormir tras responder; el catch evita que un corte de
      // red marque el evento como fallido cuando ya se respondió.
      evento.waitUntil(desdeRed.catch(() => {}));
      return guardada;
    }
    return desdeRed;
  });
}

/* Caché primero: el armazón instalado responde al instante y lo que no
   esté precacheado se pide a la red y se guarda para la próxima vez. */
function cachePrimero(peticion) {
  return caches.match(peticion).then((guardada) => {
    if (guardada) return guardada;
    return fetch(peticion).then((respuesta) => {
      const copia = respuesta.clone();
      caches.open(CACHE).then((cache) => cache.put(peticion, copia));
      return respuesta;
    });
  });
}

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;
  if (peticion.method !== "GET") return;

  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;

  // Los datos van con caché primero y revalidación en segundo plano: La
  // copia guardada evita esperar la descarga en cada visita y la red
  // refresca la caché, con lo que una corrección llega como mucho una
  // visita después, un retraso aceptable para contenido educativo estable.
  if (url.pathname.includes("/data/") && url.pathname.endsWith(".json")) {
    evento.respondWith(cacheConRevalidacion(evento, peticion));
    return;
  }

  // Una navegación sin red cae al documento precacheado, que es el que sabe
  // reconstruir cualquier vista a partir del fragmento de la dirección.
  if (peticion.mode === "navigate") {
    evento.respondWith(cachePrimero(peticion).catch(() => caches.match("index.html")));
    return;
  }

  evento.respondWith(cachePrimero(peticion));
});
