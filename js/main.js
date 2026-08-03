/* ============================================================
   Punto de entrada
   ------------------------------------------------------------
   Se carga con <script type="module">, de modo que se ejecuta
   una vez analizado el documento y no hace falta esperar a
   ningún evento adicional.
   ============================================================ */

import { Aplicacion } from "./Aplicacion.js";

// El service worker da la promesa del pie: la aplicación completa sin
// conexión. Solo se registra donde el navegador lo admite, es decir, bajo
// HTTPS o en localhost, y con ruta relativa porque el sitio vive en un
// subdirectorio de GitHub Pages y el ámbito debe quedar dentro de él.
const origenSeguro =
  location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname);
if ("serviceWorker" in navigator && origenSeguro) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // Sin registro la aplicación funciona igual, solo que exige conexión.
    });
  });
}

new Aplicacion().iniciar().catch((err) => {
  console.error("No se pudo iniciar la aplicación:", err);
  const estado = document.getElementById("estado-origen");
  if (estado) {
    estado.textContent =
      "No se pudieron cargar los datos. Si abriste el archivo con doble clic, " +
      "el navegador bloquea la lectura de archivos locales: Levanta el servidor con " +
      "npm start o con docker compose up.";
  }
});
