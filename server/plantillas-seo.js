/* ============================================================
   Plantillas de las páginas estáticas de posicionamiento
   ------------------------------------------------------------
   Todo el HTML que emite generar-seo.js sale de aquí, de modo
   que el generador solo decide qué publicar y este módulo cómo
   se ve. Sin dependencias: cadenas de plantilla y nada más.
   ============================================================ */

/** Escapa texto para HTML, también dentro de atributos. */
function escapar(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Los datos marcan el énfasis con asteriscos, como *palabra*.
   En la página se convierte en <em> y en los metadatos se retira. */
function enfasis(texto) {
  return escapar(texto).replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
}

function textoPlano(texto) {
  return String(texto).replace(/\*([^*\n]+)\*/g, "$1");
}

/** Quita el punto final para poder concatenar sin generar un punto doble. */
function sinPuntoFinal(texto) {
  return String(texto).trim().replace(/\.$/, "");
}

/* Recorte para las descripciones de los metadatos: corta en el último
   espacio antes del límite y cierra con puntos suspensivos, de modo que
   nunca queda una palabra partida ni un punto doble. */
function recortar(texto, limite = 155) {
  const plano = textoPlano(texto).trim();
  if (plano.length <= limite) return plano;
  let corto = plano.slice(0, limite);
  corto = corto.slice(0, corto.lastIndexOf(" "));
  return sinPuntoFinal(corto) + "…";
}

/** Guion de arranque del tema: el mismo criterio que usa la aplicación. */
const ARRANQUE_TEMA = `<script>
    (function () {
      try {
        var t = localStorage.getItem("tema");
        if (t === "claro" || t === "oscuro") document.documentElement.dataset.tema = t;
      } catch (e) { /* sin almacenamiento se sigue el sistema */ }
    })();
  </script>`;

/**
 * Cabecera completa del documento HTML.
 * @param {object} o  titulo, descripcion, url, seo, jsonLd (arreglo de objetos)
 */
function cabecera(o) {
  const t = escapar(o.titulo);
  const d = escapar(recortar(o.descripcion || ""));
  const ld = o.jsonLd
    .map((x) => `  <script type="application/ld+json">${JSON.stringify(x)}</script>`)
    .join("\n");
  return `<!DOCTYPE html>
<html lang="${o.seo.idioma}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t}</title>
  <meta name="description" content="${d}">
  <meta name="author" content="${escapar(o.seo.autor)}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <link rel="canonical" href="${o.url}">
  <meta name="theme-color" content="${o.seo.color}">

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${escapar(o.seo.titulo)}">
  <meta property="og:locale" content="${o.seo.idioma.replace("-", "_")}">
  <meta property="og:title" content="${t}">
  <meta property="og:description" content="${d}">
  <meta property="og:url" content="${o.url}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${t}">
  <meta name="twitter:description" content="${d}">

  ${ARRANQUE_TEMA}
  <link rel="stylesheet" href="../css/seo.css">
${ld}
</head>`;
}

/** Datos estructurados del documento, con el mismo tipo que usa el atlas. */
function jsonLdDocumento(o) {
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: textoPlano(o.nombre),
    description: recortar(o.descripcion || ""),
    url: o.url,
    inLanguage: o.seo.idioma,
    learningResourceType: o.tipo,
    educationalLevel: o.seo.nivelEducativo,
    about: o.seo.materia,
    isPartOf: { "@type": "WebSite", name: o.seo.titulo, url: o.seo.url },
    author: { "@type": "Person", name: o.seo.autor },
    publisher: { "@type": "Person", name: o.seo.autor },
    license: o.seo.licencia,
  };
}

function jsonLdMigas(seo, coleccion, doc) {
  const pasos = [
    { nombre: seo.titulo, url: `${seo.url}/` },
    { nombre: coleccion.etiquetaPlural, url: `${seo.url}/${coleccion.ruta}/` },
  ];
  if (doc) pasos.push({ nombre: textoPlano(doc.nombre), url: doc.url });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: pasos.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.nombre,
      item: p.url,
    })),
  };
}

function jsonLdIndice(seo, coleccion, documentos) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${coleccion.etiquetaPlural} · ${seo.titulo}`,
    url: `${seo.url}/${coleccion.ruta}/`,
    inLanguage: seo.idioma,
    isPartOf: { "@type": "WebSite", name: seo.titulo, url: seo.url },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: documentos.length,
      itemListElement: documentos.map((d, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: textoPlano(d[coleccion.titulo]),
        url: `${seo.url}/${coleccion.ruta}/${d.codigo}.html`,
      })),
    },
  };
}

/** Migas visibles de la parte alta de la página. */
function migas(seo, coleccion, conEnlacePropio) {
  const tramoColeccion = conEnlacePropio
    ? `\n      <span aria-hidden="true">·</span>\n      <a href="index.html">${escapar(coleccion.etiquetaPlural)}</a>`
    : "";
  return `    <nav class="seo-migas" aria-label="Ruta">
      <a href="../index.html">${escapar(seo.titulo)}</a>${tramoColeccion}
    </nav>`;
}

/**
 * Página completa de un documento.
 * @param {object} o  seo, coleccion, titulo, cuerpo (HTML del artículo),
 *                    enlaceProfundo, relacionadas (HTML opcional)
 */
function paginaDocumento(o) {
  return `${o.cabecera}
<body class="seo-pagina" data-seccion="${o.seccionMenu}">
  <main>
${migas(o.seo, o.coleccion, true)}

    <article class="seo-ficha">
      <p class="seo-tipo">${escapar(o.coleccion.etiqueta)}</p>
      <h1>${enfasis(o.titulo)}</h1>
${o.cuerpo}
    </article>

    <p class="seo-llamada">
      <a class="seo-boton" href="${o.enlaceProfundo}">Consultar en el atlas completo</a>
    </p>
${o.relacionadas || ""}  </main>
  <footer class="seo-pie">
    <p>${escapar(o.seo.titulo)} · Material de estudio de ${escapar(o.seo.autor)}.</p>
    <p><a href="../index.html">Volver al atlas</a></p>
  </footer>
  <script src="../js/menu-estatico.js" defer></script>
</body>
</html>
`;
}

/** Página índice de una colección, con el listado completo de sus fichas. */
function paginaIndice(o) {
  const filas = o.documentos
    .map((d) => {
      const nombre = enfasis(d[o.coleccion.titulo]);
      const resumen = escapar(recortar(d[o.coleccion.descripcion] || ""));
      return `<li><a href="${d.codigo}.html"><strong>${nombre}</strong><span>${resumen}</span></a></li>`;
    })
    .join("");
  return `${o.cabecera}
<body class="seo-pagina" data-seccion="${o.seccionMenu}">
  <main>
${migas(o.seo, o.coleccion, false)}

    <h1>${escapar(o.coleccion.etiquetaPlural)}</h1>
    <p class="seo-entrada">${escapar(o.coleccion.descripcionSeccion)}</p>

    <ul class="seo-listado">${filas}
    </ul>

    <p class="seo-llamada">
      <a class="seo-boton" href="${o.enlaceProfundo}">Consultar en el atlas completo</a>
    </p>
  </main>
  <footer class="seo-pie">
    <p>${escapar(o.seo.titulo)} · Material de estudio de ${escapar(o.seo.autor)}.</p>
    <p><a href="../index.html">Volver al atlas</a></p>
  </footer>
  <script src="../js/menu-estatico.js" defer></script>
</body>
</html>
`;
}

/** Mapa del sitio con la portada, los índices y todas las fichas. */
function sitemap(urls) {
  const hoy = new Date().toISOString().slice(0, 10);
  const entradas = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${hoy}</lastmod>
    <changefreq>${u.frecuencia}</changefreq>
    <priority>${u.prioridad}</priority>
  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entradas}
</urlset>
`;
}

function robots(seo) {
  return `User-agent: *
Allow: /

Sitemap: ${seo.url}/sitemap.xml
`;
}

module.exports = {
  escapar,
  enfasis,
  textoPlano,
  sinPuntoFinal,
  recortar,
  cabecera,
  jsonLdDocumento,
  jsonLdMigas,
  jsonLdIndice,
  paginaDocumento,
  paginaIndice,
  sitemap,
  robots,
};
