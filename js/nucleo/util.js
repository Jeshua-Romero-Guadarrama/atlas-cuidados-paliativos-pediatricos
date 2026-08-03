/* ============================================================
   Utilidades transversales
   ------------------------------------------------------------
   Funciones puras, sin estado y sin dependencias del DOM salvo
   las de escapado. Todo lo que use más de un módulo vive aquí.
   ============================================================ */

/**
 * Quita acentos y pasa a minúsculas para que la búsqueda
 * encuentre "disnea" aunque esté escrito "Disnea" y
 * "convulsion" aunque el texto diga "convulsión".
 * @param {string} texto
 * @returns {string}
 */
export function normalizar(texto) {
  // La eñe se aparta con un centinela antes de descomponer, porque NFD la
  // separa en ene y tilde y en este corpus «año» y «ano» colisionan.
  return (texto || "")
    .toLowerCase()
    .replace(/ñ/g, "\u0001")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0001/g, "ñ");
}

/**
 * Devuelve una copia barajada de la lista, sin mutar la original.
 * @template T
 * @param {T[]} lista
 * @returns {T[]}
 */
export function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Escapa un texto para insertarlo como HTML.
 * @param {*} texto
 * @returns {string}
 */
export function escapar(texto) {
  const d = document.createElement("div");
  d.textContent = texto == null ? "" : String(texto);
  return d.innerHTML;
}

/**
 * Escapa un texto para insertarlo dentro de un atributo entre comillas dobles.
 * @param {*} texto
 * @returns {string}
 */
export function atributo(texto) {
  return escapar(texto).replace(/"/g, "&quot;");
}

/**
 * Devuelve el marcado de un ícono del sprite SVG del documento.
 * @param {string} nombre  Sufijo del identificador, sin el prefijo "ico-"
 * @returns {string}
 */
export function ico(nombre) {
  return `<svg class="ico"><use href="#ico-${nombre}"/></svg>`;
}

/**
 * Convierte un nombre de dominio, grupo o categoría en una clase de color.
 * "Últimos días" da "dom-ultimos-dias".
 * @param {string} valor
 * @returns {string}
 */
export function claseDominio(valor) {
  // Aquí la eñe sí se aplana a ene, porque los nombres de clase de la
  // paleta son ASCII: "Niño" tiene que seguir dando "dom-nino".
  return "dom-" + normalizar(valor).replace(/ñ/g, "n").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Recorta un texto por palabras, sin cortar a mitad de una.
 * @param {string} texto
 * @param {number} limite
 * @returns {string}
 */
export function resumir(texto, limite) {
  const t = (texto || "").trim();
  if (t.length <= limite) return t;
  const corte = t.slice(0, limite);
  const espacio = corte.lastIndexOf(" ");
  return (espacio > limite * 0.6 ? corte.slice(0, espacio) : corte) + "…";
}

/**
 * Valores distintos de un campo dentro de una lista, ordenados alfabéticamente.
 * Admite campos de texto y campos que contienen un arreglo.
 * Nunca se escriben a mano: salen siempre de los datos cargados.
 * @param {object[]} lista
 * @param {string} campo
 * @returns {string[]}
 */
export function valoresDe(lista, campo) {
  const vistos = new Set();
  lista.forEach((d) => {
    const v = d && d[campo];
    if (Array.isArray(v)) v.forEach((x) => x && vistos.add(x));
    else if (v) vistos.add(v);
  });
  return [...vistos].sort((a, b) => a.localeCompare(b, "es"));
}

/**
 * Clase de color de una vía de administración.
 * @param {string} via
 * @returns {"via-vo"|"via-sc"|"via-iv"|"via-otra"}
 */
export function claseVia(via) {
  const v = normalizar(via);
  if (v === "vo" || v === "oral" || v === "sl") return "via-vo";
  if (v === "sc") return "via-sc";
  if (v === "iv") return "via-iv";
  return "via-otra";
}

/** Ícono que corresponde a cada dominio de cuidado. */
const ICONO_DOMINIO = {
  "Dolor": "dolor",
  "Respiratorio": "respiratorio",
  "Digestivo": "digestivo",
  "Neurológico": "neurologico",
  "Piel y mucosas": "piel",
  "General": "general",
  "Emocional": "emocional",
  "Familia y entorno": "familia",
  "Espiritual": "espiritual",
  "Últimos días": "ultimos-dias",
  "Urgencias": "urgencias",
};

/**
 * Ícono de un dominio, con reserva para dominios que no son de cuidado.
 * @param {string} dominio
 * @param {string} porDefecto
 * @returns {string}
 */
export function iconoDominio(dominio, porDefecto) {
  return ICONO_DOMINIO[dominio] || porDefecto;
}

/**
 * Marcado de una insignia. Devuelve cadena vacía si no hay texto,
 * para poder concatenar sin comprobar.
 * @param {string} texto
 * @param {string} [clase]
 * @param {string} [iconoNombre]
 * @returns {string}
 */
export function insignia(texto, clase, iconoNombre) {
  if (!texto) return "";
  return `<span class="insignia ${clase || ""}">${iconoNombre ? ico(iconoNombre) : ""}${escapar(texto)}</span>`;
}

/** Atajo de document.getElementById. */
export const el = (id) => document.getElementById(id);

/**
 * Desplaza la página o un elemento a la vista respetando la preferencia
 * de menos movimiento: quien la activa recibe un salto directo en lugar
 * de una animación que puede marear.
 * @param {Element|number} destino  Elemento al que subir, o posición vertical
 */
export function desplazar(destino) {
  const comportamiento = matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
  if (destino instanceof Element) {
    destino.scrollIntoView({ behavior: comportamiento, block: "start" });
    return;
  }
  window.scrollTo({ top: destino, behavior: comportamiento });
}

/**
 * Escribe un mensaje en la región de estado permanente, que es la única
 * región viva que existe desde el primer pintado y por eso no pierde
 * ningún anuncio. La usan el cambio de vista y los avisos generales.
 * @param {string} mensaje
 */
export function anunciar(mensaje) {
  const region = el("region-estado");
  if (!region) return;
  // Se vacía antes de escribir para que repetir el mismo texto también se anuncie.
  region.textContent = "";
  region.textContent = mensaje;
}
