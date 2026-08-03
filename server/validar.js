/* ============================================================
   Validador del contenido
   ------------------------------------------------------------
   Comprueba, sin necesidad de base de datos ni de navegador, que
   los archivos de data/ están bien formados y son coherentes
   entre sí. Uso: npm run validar
   ============================================================ */

const fs = require("fs");
const path = require("path");
const { COLECCIONES } = require("./colecciones");

const RAIZ = path.join(__dirname, "..");
const errores = [];
const avisos = [];

/** @param {string} nombre @returns {object[]|null} */
function leer(nombre) {
  const ruta = path.join(RAIZ, "data", `${nombre}.json`);
  if (!fs.existsSync(ruta)) {
    avisos.push(`data/${nombre}.json todavía no existe`);
    return null;
  }
  try {
    const datos = JSON.parse(fs.readFileSync(ruta, "utf8"));
    if (!Array.isArray(datos)) {
      errores.push(`data/${nombre}.json no contiene un arreglo`);
      return null;
    }
    return datos;
  } catch (e) {
    errores.push(`data/${nombre}.json no es JSON válido: ${e.message}`);
    return null;
  }
}

/* ---------- Carga ---------- */
const datos = {};
for (const nombre of COLECCIONES) datos[nombre] = leer(nombre) || [];

/* ---------- Códigos únicos ---------- */
for (const nombre of COLECCIONES) {
  const vistos = new Set();
  datos[nombre].forEach((d, i) => {
    const codigo = d.codigo || d.termino;
    if (!codigo) {
      errores.push(`${nombre}[${i}] no tiene código`);
      return;
    }
    if (vistos.has(codigo)) errores.push(`${nombre}: código duplicado "${codigo}"`);
    vistos.add(codigo);
  });
}

/* ---------- Referencias cruzadas ---------- */
const codigosDe = (nombre) => new Set(datos[nombre].map((d) => d.codigo));
const temas = codigosDe("temas");
const calculadoras = codigosDe("calculadoras");

datos.sintomas.forEach((d) => {
  if (d.temaRelacionado && !temas.has(d.temaRelacionado)) {
    errores.push(`sintomas "${d.codigo}": temaRelacionado "${d.temaRelacionado}" no existe`);
  }
  if (d.esquema && !fs.existsSync(path.join(RAIZ, d.esquema))) {
    avisos.push(`sintomas "${d.codigo}": falta el archivo ${d.esquema}`);
  }
});

datos.escalas.forEach((d) => {
  if (d.calculadora && !calculadoras.has(d.calculadora)) {
    errores.push(`escalas "${d.codigo}": calculadora "${d.calculadora}" no existe`);
  }
});

/* ---------- Temas: Campos que la interfaz da por hechos ---------- */
// La tarjeta y la ficha de cada tema cuentan con estas dos listas para
// componerse, así que un tema sin ellas se detecta aquí y no en pantalla.
datos.temas.forEach((d) => {
  if (!Array.isArray(d.secciones) || !d.secciones.length) {
    errores.push(`temas "${d.codigo}": falta el campo "secciones" o está vacío`);
  }
  if (!Array.isArray(d.puntosClave) || !d.puntosClave.length) {
    errores.push(`temas "${d.codigo}": falta el campo "puntosClave" o está vacío`);
  }
});

/* ---------- Calculadoras: evaluar cada ejemplo ---------- */
function evaluar(expresion, variables) {
  try {
    const nombres = Object.keys(variables);
    return Function(...nombres, `"use strict"; return (${expresion});`)(
      ...nombres.map((n) => variables[n])
    );
  } catch (e) {
    return null;
  }
}

datos.calculadoras.forEach((c) => {
  const v = {};

  if (c.tipo === "puntuacion") {
    let total = c.base || 0;
    (c.preguntas || []).forEach((p) => {
      const i = c.ejemplo ? c.ejemplo[p.id] : 0;
      if (i === undefined) {
        errores.push(`calculadoras "${c.codigo}": el ejemplo no incluye "${p.id}"`);
        return;
      }
      if (i < 0 || i >= (p.opciones || []).length) {
        errores.push(`calculadoras "${c.codigo}": índice fuera de rango en "${p.id}"`);
        return;
      }
      total += Number(p.opciones[i].puntos);
    });
    v.total = total;
  } else {
    (c.campos || []).forEach((campo) => {
      if (!c.ejemplo || c.ejemplo[campo.id] === undefined) {
        errores.push(`calculadoras "${c.codigo}": el ejemplo no incluye "${campo.id}"`);
      }
      v[campo.id] = c.ejemplo ? c.ejemplo[campo.id] : 1;
    });
    (c.resultados || []).forEach((r, i) => {
      const valor = evaluar(r.formula, v);
      v["r" + i] = valor;
      if (valor === null || Number.isNaN(valor) || !Number.isFinite(valor)) {
        errores.push(`calculadoras "${c.codigo}": el resultado ${i} da "${valor}"`);
      }
    });
  }

  const regla = (c.interpretacion || []).find((r) => evaluar(r.si, v) === true);
  if (!regla) {
    errores.push(`calculadoras "${c.codigo}": ninguna regla de interpretación coincide`);
  }
});

/* ---------- Casos del quiz ---------- */
datos.casos.forEach((c) => {
  const correctas = (c.opciones || []).filter((o) => o.correcta).length;
  if (correctas !== 1) {
    errores.push(`casos "${c.codigo}": tiene ${correctas} opciones correctas, debe tener 1`);
  }
  (c.opciones || []).forEach((o, i) => {
    if (!o.explicacion) avisos.push(`casos "${c.codigo}": la opción ${i} no tiene explicación`);
  });
});

/* ---------- Páginas estáticas: una por documento y con el título correcto ---------- */
// Compara cada colección publicada con su carpeta de páginas. Solo se lee el
// <h1>, que es barato y suficiente para detectar una página vieja o ajena.
const seoConf = JSON.parse(fs.readFileSync(path.join(RAIZ, "seo.json"), "utf8"));
const escaparHtml = (t) =>
  String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
for (const col of seoConf.colecciones) {
  const docs = datos[col.archivo] || [];
  for (const doc of docs) {
    if (typeof doc[col.titulo] !== "string" || !doc[col.titulo]) {
      errores.push(`${col.archivo} "${doc.codigo}": falta el campo de título "${col.titulo}" que declara seo.json`);
      continue;
    }
    const ruta = path.join(RAIZ, col.ruta, `${doc.codigo}.html`);
    if (!fs.existsSync(ruta)) {
      errores.push(`${col.ruta}/${doc.codigo}.html no existe: falta regenerar con npm run seo`);
      continue;
    }
    const h1 = /<h1>(.*?)<\/h1>/.exec(fs.readFileSync(ruta, "utf8"));
    const esperado = escaparHtml(doc[col.titulo]).replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
    if (!h1 || h1[1] !== esperado) {
      errores.push(`${col.ruta}/${doc.codigo}.html: el <h1> no coincide con el título del dato`);
    }
  }
  if (!fs.existsSync(path.join(RAIZ, col.ruta, "index.html"))) {
    errores.push(`${col.ruta}/index.html no existe: falta regenerar con npm run seo`);
  }
}

/* ---------- Convención de redacción: sin guiones largos ---------- */
for (const nombre of COLECCIONES) {
  const ruta = path.join(RAIZ, "data", `${nombre}.json`);
  if (!fs.existsSync(ruta)) continue;
  const texto = fs.readFileSync(ruta, "utf8");
  if (/[—–]/.test(texto)) {
    errores.push(`data/${nombre}.json contiene guiones largos o cortos, que no se usan en este proyecto`);
  }
}

/* ---------- Informe ---------- */
console.log("\nContenido");
for (const nombre of COLECCIONES) {
  console.log(`  ${nombre.padEnd(14)} ${String(datos[nombre].length).padStart(4)} registros`);
}

if (avisos.length) {
  console.log("\nAvisos");
  avisos.forEach((a) => console.log(`  · ${a}`));
}

if (errores.length) {
  console.log("\nErrores");
  errores.forEach((e) => console.log(`  ✖ ${e}`));
  console.log(`\n${errores.length} errores\n`);
  process.exit(1);
}

console.log("\nSin errores\n");
