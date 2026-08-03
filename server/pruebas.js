/*
 * Pruebas del atlas, sin más dependencias que Node.
 * Se ejecutan con npm run probar desde esta carpeta, o con node server/pruebas.js desde la raíz.
 *
 * El servidor es CommonJS pero los módulos del navegador son ES, así que estos últimos se cargan con import dinámico a través de pathToFileURL.
 * Los valores esperados están escritos a mano razonando cada regla, nunca copiados de lo que imprime el propio motor.
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { Almacen } = require("./Almacen.js");

const RAIZ = path.join(__dirname, "..");

/* ---------- Contador de comprobaciones ---------- */

const suites = [];
let actual = null;

function suite(nombre) {
  actual = { nombre, total: 0, fallos: [] };
  suites.push(actual);
}

function comprobar(nombre, obtenido, esperado) {
  actual.total++;
  try {
    assert.deepStrictEqual(obtenido, esperado);
  } catch {
    actual.fallos.push({ nombre, obtenido, esperado });
  }
}

/*
 * Comparación con tolerancia para las posiciones de la escala visual, que salen de divisiones encadenadas.
 * Exigir igualdad exacta convertiría el ruido del último bit del punto flotante en un falso fallo.
 */
function casi(nombre, obtenido, esperado, tolerancia = 0.000001) {
  actual.total++;
  const bien = typeof obtenido === "number" && Math.abs(obtenido - esperado) <= tolerancia;
  if (!bien) actual.fallos.push({ nombre, obtenido, esperado });
}

function terminar() {
  let totales = 0;
  let fallidos = 0;
  console.log("");
  suites.forEach((s) => {
    totales += s.total;
    fallidos += s.fallos.length;
    console.log(`  ${s.fallos.length ? "FALLA" : "pasa"}  ${s.nombre}: ${s.total - s.fallos.length} de ${s.total}`);
    s.fallos.forEach((f) => {
      console.log(`         ${f.nombre}`);
      console.log(`           esperado: ${JSON.stringify(f.esperado)}`);
      console.log(`           obtenido: ${JSON.stringify(f.obtenido)}`);
    });
  });
  console.log(`\n  Total: ${totales - fallidos} de ${totales} comprobaciones\n`);
  return fallidos ? 1 : 0;
}

/* ---------- Carga y suites ---------- */

// Importa un módulo ES del cliente por su ruta relativa a la raíz del proyecto.
function importar(relativa) {
  return import(pathToFileURL(path.join(RAIZ, relativa)).href);
}

function leerDatos(nombre) {
  return JSON.parse(fs.readFileSync(path.join(RAIZ, "data", nombre), "utf8"));
}

async function principal() {
  const util = await importar("js/nucleo/util.js");
  const { EscalaVisual } = await importar("js/calculadoras/EscalaVisual.js");
  const { MotorCalculadora } = await importar("js/calculadoras/MotorCalculadora.js");
  const { Paginador } = await importar("js/nucleo/Paginador.js");
  const calculadoras = leerDatos("calculadoras.json");

  suite("Escala visual de las calculadoras");

  /*
   * Calculadora de fórmula con dos umbrales sobre r0.
   * Con umbrales 100 y 200 el ancho de referencia es 100, de modo que el eje va de 55 a 245 y su amplitud es 190.
   */
  const calcResiduo = {
    tipo: "formula",
    resultados: [{ etiqueta: "Residuo", unidad: "ml", decimales: 0 }],
    interpretacion: [
      { si: "r0 > 200", nivel: "alto", texto: "Cifra de alerta" },
      { si: "r0 > 100", nivel: "medio", texto: "Cifra intermedia" },
      { si: "true", nivel: "normal", texto: "Cifra normal" }
    ]
  };
  const escala = EscalaVisual.calcular(calcResiduo, { r0: 150 });
  comprobar("la escala de umbral simple se construye", Boolean(escala), true);
  comprobar("el valor 150 cae en la zona media", escala.nivel, "medio");
  comprobar("el valor se escribe con los decimales del resultado", escala.valorTexto, "150");
  // El valor 150 queda a 95 de 190 unidades del inicio, es decir, en el centro exacto del eje.
  casi("el marcador queda al 50 por ciento", escala.posicion, 50);
  comprobar("hay una zona por tramo entre umbrales", escala.zonas.map((z) => z.nivel), ["normal", "medio", "alto"]);
  // El corte 100 queda a 45 de 190 unidades del inicio y el corte 200 a 145 de 190.
  comprobar("las marcas conservan el texto del umbral", escala.marcas.map((m) => m.texto), ["100", "200"]);
  casi("la marca del 100 queda a 45 de 190", escala.marcas[0].posicion, (45 / 190) * 100);
  casi("la marca del 200 queda a 145 de 190", escala.marcas[1].posicion, (145 / 190) * 100);

  // Cuando las reglas mezclan dos variables no hay un eje único que dibujar, y el motor debe devolver null en lugar de inventarse una barra.
  const midazolam = calculadoras.find((c) => c.codigo === "midazolam-crisis");
  comprobar("existe la calculadora real con reglas mezcladas", Boolean(midazolam), true);
  comprobar("las reglas sobre dos variables no forman escala", EscalaVisual.calcular(midazolam, { peso: 20, r1: 2 }), null);

  /*
   * La escala FLACC real: cinco preguntas de 0 a 2 puntos dan un eje de 0 a 10.
   * Los tramos de 1 a 4 y de 4 a 7 comparten el nivel medio, así que el motor debe fundirlos en una sola zona.
   */
  const flacc = calculadoras.find((c) => c.codigo === "flacc");
  const zonasFlacc = EscalaVisual.calcular(flacc, { total: 5 });
  comprobar("las zonas de FLACC quedan fundidas por nivel", zonasFlacc.zonas.map((z) => z.nivel), ["normal", "medio", "alto"]);
  comprobar("los cortes de FLACC son 1, 4 y 7", zonasFlacc.marcas.map((m) => m.texto), ["1", "4", "7"]);
  casi("el corte 7 queda al 70 por ciento del eje", zonasFlacc.marcas[2].posicion, 70);
  comprobar("cinco puntos caen en dolor moderado", zonasFlacc.nivel, "medio");
  casi("cinco puntos quedan en el centro del eje", zonasFlacc.posicion, 50);

  suite("Evaluación de fórmulas con datos reales");

  const formulaDe = (codigo) => calculadoras.find((c) => c.codigo === codigo).resultados[0].formula;

  // Holliday y Segar con 22 kg: 1500 más 2 por 20 son 1540 mL en 24 h.
  comprobar("requerimiento basal de Holliday y Segar",
    MotorCalculadora.evaluar(formulaDe("holliday-segar"), { peso: 22 }), 1540);
  // Paracetamol con 16 kg: 15 por 16 son 240 mg, por debajo del techo de 1000.
  comprobar("dosis de paracetamol por toma",
    MotorCalculadora.evaluar(formulaDe("paracetamol-dosis"), { peso: 16 }), 240);
  // Superficie corporal de Mosteller con 20 kg y 45 cm: la raíz de 900 entre 3600 es 0.5.
  comprobar("superficie corporal de Mosteller",
    MotorCalculadora.evaluar(formulaDe("superficie-corporal"), { peso: 20, talla: 45 }), 0.5);
  // Una expresión rota no debe tumbar la aplicación, sino devolver null.
  comprobar("una fórmula malformada devuelve null", MotorCalculadora.evaluar("peso >", { peso: 1 }), null);

  suite("Números visibles de la paginación");

  // Hasta siete páginas se muestran todas, porque la elipsis solo estorba cuando caben.
  comprobar("con cinco páginas salen las cinco", Paginador.numerosVisibles(3, 5), [1, 2, 3, 4, 5]);
  comprobar("con siete páginas salen las siete", Paginador.numerosVisibles(1, 7), [1, 2, 3, 4, 5, 6, 7]);
  // A partir de ocho quedan la primera, la última y las vecinas de la actual, con elipsis en los huecos.
  comprobar("ocho páginas con la actual en el centro", Paginador.numerosVisibles(4, 8), [1, "…", 3, 4, 5, "…", 8]);
  comprobar("ocho páginas desde la primera", Paginador.numerosVisibles(1, 8), [1, 2, "…", 8]);
  comprobar("veinte páginas con la actual en el centro", Paginador.numerosVisibles(10, 20), [1, "…", 9, 10, 11, "…", 20]);
  comprobar("veinte páginas desde la última", Paginador.numerosVisibles(20, 20), [1, "…", 19, 20]);

  suite("Filtro del almacén del servidor");

  const docs = [
    { codigo: "a", dominio: "Dolor", vias: ["VO", "SC"], nombre: "Cuidados del año" },
    { codigo: "b", dominio: "Respiratorio", vias: ["IV"], nombre: "Aspiración de mano" },
    { codigo: "c", dominio: "Dolor", vias: ["VO"], nombre: "Vía oral con acento" }
  ];
  const codigos = (lista) => lista.map((d) => d.codigo);

  /*
   * La eñe se conserva al normalizar, corrección reciente que aquí queda vigilada: buscar año no puede igualar ano, ni al revés.
   * El documento b entra en la segunda búsqueda porque mano contiene la secuencia ano.
   */
  comprobar("buscar año encuentra solo el documento con eñe", codigos(Almacen.filtrar(docs, { q: "año" })), ["a"]);
  comprobar("buscar ano no arrastra los textos con eñe", codigos(Almacen.filtrar(docs, { q: "ano" })), ["b"]);
  // La búsqueda ignora las tildes en las dos direcciones.
  comprobar("buscar sin tilde encuentra el texto acentuado", codigos(Almacen.filtrar(docs, { q: "aspiracion" })), ["b"]);

  comprobar("filtro por campo escalar", codigos(Almacen.filtrar(docs, { dominio: "Dolor" })), ["a", "c"]);
  comprobar("filtro por pertenencia a un campo arreglo", codigos(Almacen.filtrar(docs, { vias: "SC" })), ["a"]);
  comprobar("filtro de campo y búsqueda a la vez", codigos(Almacen.filtrar(docs, { dominio: "Dolor", q: "oral" })), ["c"]);
  comprobar("un filtro vacío devuelve todo", codigos(Almacen.filtrar(docs, {})), ["a", "b", "c"]);

  suite("Utilidades del núcleo");

  comprobar("normalizar quita tildes y baja a minúsculas", util.normalizar("Convulsión"), "convulsion");
  comprobar("normalizar conserva la eñe", util.normalizar("AÑO"), "año");
  comprobar("normalizar quita la tilde sin tocar la eñe", util.normalizar("señaló"), "señalo");

  // Un texto que cabe en el límite se devuelve intacto, sin puntos suspensivos.
  comprobar("resumir deja intacto el texto corto", util.resumir("Dolor irruptivo", 40), "Dolor irruptivo");
  // El corte cae a mitad de palabra y retrocede hasta el espacio anterior para no partirla.
  comprobar("resumir corta por palabra entera",
    util.resumir("El dolor irruptivo aparece de forma brusca", 20), "El dolor irruptivo…");
  // Sin espacios donde retroceder, el corte se queda en el límite tal cual.
  comprobar("resumir sin espacios corta en el límite", util.resumir("Palabrainterminable sin remedio", 10), "Palabraint…");

  // Los valores salen de campos escalares y de campos arreglo por igual, ordenados alfabéticamente.
  comprobar("valoresDe mezcla arreglos y escalares",
    util.valoresDe([{ via: ["VO", "SC"] }, { via: "IV" }, {}], "via"), ["IV", "SC", "VO"]);

  // La clase de color es ASCII, así que aquí la eñe sí se aplana y los espacios se vuelven guiones.
  comprobar("claseDominio aplana la eñe", util.claseDominio("Niño"), "dom-nino");
  comprobar("claseDominio convierte el nombre en clase", util.claseDominio("Vía oral"), "dom-via-oral");
  comprobar("claseDominio respeta el caso con varias palabras", util.claseDominio("Últimos días"), "dom-ultimos-dias");

  process.exit(terminar());
}

principal().catch((error) => {
  console.error("Las pruebas no pudieron ejecutarse:", error);
  process.exit(1);
});
