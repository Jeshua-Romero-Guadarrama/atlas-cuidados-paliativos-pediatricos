/* ============================================================
   Generador de las páginas estáticas de posicionamiento
   ------------------------------------------------------------
   Lee seo.json y data/*.json y escribe una página HTML por
   documento, el índice de cada colección, el sitemap y el
   robots.txt. Uso: npm run seo

   Cada campo publicable debe tener su encabezado en el mapa
   "etiquetas" de su colección, o figurar en "ocultos". Un campo
   fuera de ambos no se publica y deja un aviso, porque derivar
   prosa de un identificador produce encabezados sin tildes.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const p = require("./plantillas-seo");

const RAIZ = path.join(__dirname, "..");
const SEO = JSON.parse(fs.readFileSync(path.join(RAIZ, "seo.json"), "utf8"));
const avisos = new Set();

/* ---------- Azar reproducible ---------- */
/* Las opciones de los casos se publican mezcladas para no delatar la
   respuesta por su orden. La semilla sale del código del documento, de
   modo que regenerar no cambia las páginas sin motivo. */
function semilla(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return h >>> 0;
}

function barajar(lista, clave) {
  const copia = lista.slice();
  let s = semilla(clave) || 1;
  for (let i = copia.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    // Se usan los bits altos del generador: los bajos de un congruencial
    // lineal repiten ciclos cortos y sesgarían la posición de la correcta.
    const j = Math.floor((s / 4294967296) * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/* ---------- Presentación de cada campo según su forma ---------- */

const ES_IMAGEN = /\.(svg|png|jpe?g|webp)$/i;

function listaSimple(titulo, valores) {
  const filas = valores.map((v) => `<li>${p.enfasis(v)}</li>`).join("");
  return `      <h2>${p.escapar(titulo)}</h2><ul>${filas}</ul>`;
}

/* Un arreglo de objetos se publica como lista de definiciones: el primer
   valor hace de término y el resto se concatena sin puntos dobles. */
function definiciones(titulo, valores) {
  const filas = valores
    .map((objeto) => {
      const partes = Object.values(objeto).map((v) =>
        Array.isArray(v) ? v.map(p.enfasis).join(" · ") : p.enfasis(p.sinPuntoFinal(v))
      );
      const termino = partes.shift();
      return `<dt>${termino}</dt><dd>${partes.filter(Boolean).join(". ")}.</dd>`;
    })
    .join("");
  return `      <h2>${p.escapar(titulo)}</h2><dl>${filas}</dl>`;
}

/* Objeto plano de texto a texto, como "porModalidad". */
function definicionesDeObjeto(titulo, objeto) {
  const filas = Object.entries(objeto)
    .map(([clave, valor]) => `<dt>${p.escapar(clave)}</dt><dd>${p.enfasis(valor)}</dd>`)
    .join("");
  return `      <h2>${p.escapar(titulo)}</h2><dl>${filas}</dl>`;
}

/* Campos de las calculadoras: se publica la parte legible (etiqueta,
   unidad, referencia o texto) y nunca los identificadores ni las fórmulas. */
function listaLegible(titulo, valores) {
  const filas = valores
    .map((v) => {
      if (v.texto) return `<li>${p.enfasis(p.sinPuntoFinal(v.texto))}.</li>`;
      // La unidad solo se añade si la etiqueta no la trae ya escrita.
      const unidad = v.unidad && !v.etiqueta.includes(v.unidad) ? ` (${v.unidad})` : "";
      const referencia = v.referencia ? `. ${p.sinPuntoFinal(v.referencia)}` : "";
      return `<li>${p.enfasis(v.etiqueta + unidad + referencia)}</li>`;
    })
    .join("");
  return `      <h2>${p.escapar(titulo)}</h2><ul>${filas}</ul>`;
}

/* Opciones de un caso: mezcladas y sin la marca de la correcta ni su
   explicación, para que la página no regale la respuesta del quiz. */
function opcionesDeQuiz(titulo, valores, codigo) {
  const filas = barajar(valores, codigo)
    .map((o) => `<li>${p.enfasis(o.texto)}</li>`)
    .join("");
  return `      <h2>${p.escapar(titulo)}</h2><ul>${filas}</ul>`;
}

/* Secciones de un tema: cada encabezado es un h2 propio con sus párrafos. */
function seccionesDeTema(valores) {
  return valores
    .map((s) => {
      const parrafos = s.parrafos.map((t) => `<p>${p.enfasis(t)}</p>`).join("");
      return `      <h2>${p.enfasis(s.encabezado)}</h2>${parrafos}`;
    })
    .join("\n");
}

function figura(doc, campo, titulo) {
  // El texto alternativo describe la imagen; el crédito, que no la describe, solo va en el pie.
  const pie = doc[campo + "Pie"] || "";
  const alt = pie || titulo;
  const textoPie = pie || (campo === "imagen" ? doc.credito : "") || "";
  const leyenda = textoPie ? `<figcaption>${p.enfasis(textoPie)}</figcaption>` : "";
  return `      <figure class="seo-figura"><img src="../${doc[campo]}" alt="${p.escapar(p.textoPlano(alt))}" loading="lazy">${leyenda}</figure>`;
}

function chips(valores) {
  const filas = valores.map((v) => `<span>${p.escapar(v)}</span>`).join(" ");
  return `      <p class="seo-etiquetas">${filas}</p>`;
}

const LEGIBLES = new Set(["campos", "resultados", "preguntas", "interpretacion"]);

/** Decide la presentación de un campo ya autorizado por "etiquetas". */
function campo(doc, coleccion, nombre, titulo) {
  const valor = doc[nombre];
  if (nombre === "etiquetas") return chips(valor);
  if (typeof valor === "string" && ES_IMAGEN.test(valor)) return figura(doc, nombre, doc[coleccion.titulo]);
  if (typeof valor === "string" || typeof valor === "number") {
    return `      <h2>${p.escapar(titulo)}</h2><p>${p.enfasis(valor)}</p>`;
  }
  if (Array.isArray(valor)) {
    if (!valor.length) return "";
    if (typeof valor[0] !== "object") return listaSimple(titulo, valor);
    if ("correcta" in valor[0]) return opcionesDeQuiz(titulo, valor, doc.codigo);
    if ("parrafos" in valor[0]) return seccionesDeTema(valor);
    if (LEGIBLES.has(nombre)) return listaLegible(titulo, valor);
    return definiciones(titulo, valor);
  }
  if (valor && typeof valor === "object") return definicionesDeObjeto(titulo, valor);
  avisos.add(`${coleccion.archivo}.${nombre}: tipo no publicable (${typeof valor})`);
  return "";
}

/** Cuerpo del artículo: datos breves, entrada y campos en su orden. */
function cuerpo(doc, coleccion) {
  const datos = coleccion.datos || [];
  const ocultos = new Set([...(coleccion.ocultos || []), ...datos]);
  const bloques = [];

  const filasDatos = datos
    .filter((n) => doc[n] !== undefined && doc[n] !== "")
    .map((n) => {
      const valor = Array.isArray(doc[n]) ? doc[n].join(", ") : doc[n];
      return `<dt>${p.escapar(coleccion.etiquetas[n])}</dt><dd>${p.enfasis(valor)}</dd>`;
    })
    .join("");
  if (filasDatos) bloques.push(`      <dl class="seo-datos">${filasDatos}</dl>`);

  const entrada = doc[coleccion.descripcion];
  if (entrada) bloques.push(`      <p class="seo-entrada">${p.enfasis(entrada)}</p>`);

  for (const nombre of Object.keys(doc)) {
    if (ocultos.has(nombre)) continue;
    const titulo = coleccion.etiquetas[nombre];
    if (!titulo) {
      // Sin encabezado escrito no se publica: un identificador no es prosa.
      avisos.add(`${coleccion.archivo}.${nombre}: sin entrada en "etiquetas" ni en "ocultos", no se publica`);
      continue;
    }
    const html = campo(doc, coleccion, nombre, titulo);
    if (html) bloques.push(html);
  }
  return bloques.join("\n");
}

/* ---------- Emisión ---------- */

function generarColeccion(coleccion) {
  const documentos = JSON.parse(
    fs.readFileSync(path.join(RAIZ, "data", `${coleccion.archivo}.json`), "utf8")
  );
  const carpeta = path.join(RAIZ, coleccion.ruta);
  fs.mkdirSync(carpeta, { recursive: true });
  const seccionMenu = coleccion.rutaApp || coleccion.ruta;

  for (const doc of documentos) {
    const titulo = doc[coleccion.titulo];
    // Sin título no hay página válida: mejor detener que publicar "undefined".
    if (typeof titulo !== "string" || !titulo) {
      throw new Error(`${coleccion.archivo} "${doc.codigo}": falta el campo de título "${coleccion.titulo}"`);
    }
    const url = `${SEO.url}/${coleccion.ruta}/${doc.codigo}.html`;
    const html = p.paginaDocumento({
      seo: SEO,
      coleccion,
      seccionMenu,
      titulo,
      cabecera: p.cabecera({
        titulo: `${p.textoPlano(titulo)} · ${coleccion.etiqueta} · ${SEO.titulo}`,
        descripcion: doc[coleccion.descripcion] || "",
        url,
        seo: SEO,
        jsonLd: [
          p.jsonLdDocumento({
            nombre: titulo,
            descripcion: doc[coleccion.descripcion] || "",
            url,
            tipo: coleccion.etiqueta,
            seo: SEO,
          }),
          p.jsonLdMigas(SEO, coleccion, { nombre: titulo, url }),
        ],
      }),
      cuerpo: cuerpo(doc, coleccion),
      enlaceProfundo: `../index.html#/${seccionMenu}/${encodeURIComponent(doc.codigo)}`,
    });
    fs.writeFileSync(path.join(carpeta, `${doc.codigo}.html`), html);
  }

  const urlIndice = `${SEO.url}/${coleccion.ruta}/`;
  fs.writeFileSync(
    path.join(carpeta, "index.html"),
    p.paginaIndice({
      seo: SEO,
      coleccion,
      seccionMenu,
      documentos,
      cabecera: p.cabecera({
        titulo: `${coleccion.etiquetaPlural} · ${SEO.titulo}`,
        descripcion: coleccion.descripcionSeccion,
        url: urlIndice,
        seo: SEO,
        jsonLd: [p.jsonLdIndice(SEO, coleccion, documentos)],
      }),
      enlaceProfundo: `../index.html#/${seccionMenu}`,
    })
  );
  return documentos;
}

function generar() {
  const urls = [{ loc: `${SEO.url}/`, frecuencia: "weekly", prioridad: "1.0" }];
  let total = 0;

  for (const coleccion of SEO.colecciones) {
    const documentos = generarColeccion(coleccion);
    urls.push({ loc: `${SEO.url}/${coleccion.ruta}/`, frecuencia: "monthly", prioridad: "0.8" });
    for (const doc of documentos) {
      urls.push({
        loc: `${SEO.url}/${coleccion.ruta}/${doc.codigo}.html`,
        frecuencia: "monthly",
        prioridad: "0.6",
      });
    }
    total += documentos.length;
    console.log(`  ${coleccion.ruta.padEnd(16)} ${String(documentos.length).padStart(4)} páginas + índice`);
  }

  fs.writeFileSync(path.join(RAIZ, "sitemap.xml"), p.sitemap(urls));
  console.log(`  sitemap.xml      ${String(urls.length).padStart(4)} direcciones`);

  // El robots solo se reescribe si el proyecto ya lo tenía publicado.
  if (fs.existsSync(path.join(RAIZ, "robots.txt"))) {
    fs.writeFileSync(path.join(RAIZ, "robots.txt"), p.robots(SEO));
    console.log("  robots.txt       reescrito");
  }

  if (avisos.size) {
    console.log("\nAvisos");
    for (const a of avisos) console.log(`  · ${a}`);
  }
  console.log(`\n${total} documentos publicados\n`);
}

generar();
