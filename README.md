# Atlas de Cuidados Paliativos Pediátricos y Calidad de Vida

Atlas de estudio y de consulta rápida sobre el **control de síntomas**, el **acompañamiento a la familia** y las **decisiones difíciles** en el niño con una enfermedad que limita o amenaza su vida.

Está pensado para trabajar por situaciones: se busca el síntoma que se tiene delante, se comprueba cómo evaluarlo, qué hacer sin fármacos, qué fármaco corresponde y a qué dosis, cuándo escalar y cómo explicárselo a la familia.

Todo el contenido y los esquemas son propios y se almacenan localmente. La aplicación no depende de ningún servicio externo ni enlaza a webs de terceros: funciona completa sin conexión a internet.

---

## Aviso

Este atlas es **material de estudio y de consulta**. No sustituye los libros de texto, la formación supervisada, el juicio clínico ni la valoración directa de un profesional de la salud.

Las **dosis** son de referencia, se expresan siempre por kilogramo de peso y llevan su techo. Antes de prescribir hay que verificarlas en la ficha técnica del producto y ajustarlas al niño concreto, a su función renal y hepática y al resto de su tratamiento. Muchos de estos usos son **fuera de indicación autorizada** en pediatría, algo habitual y aceptado en cuidados paliativos, pero que conviene conocer y documentar.

En pediatría el error de dosis más frecuente es de un factor de diez. Ninguna calculadora sustituye la doble verificación.

---

## Contenido

| Sección | Registros | Qué contiene |
|---|--:|---|
| Síntomas | 38 | Situaciones clínicas con causas, evaluación, medidas no farmacológicas, tratamiento con dosis, cuándo escalar, qué evitar y qué explicarle a la familia |
| Fármacos | 40 | Vademécum con dosis por vía, presentaciones, inicio y duración, efectos adversos, precauciones y notas prácticas |
| Escalas | 21 | Instrumentos de valoración de dolor, síntomas, función, calidad de vida, sedación y sobrecarga del cuidador, con sus tramos e interpretación |
| Calculadoras | 31 | Dosis por peso, rescates, titulación, rotación de opioides, infusión subcutánea, antropometría y escalas puntuables |
| Comunicación | 16 | Guiones de conversación: pasos, frases que ayudan, frases que hacen daño, preguntas difíciles y adaptación por edad |
| Temas | 13 | Artículos de fondo sobre fundamentos, bioética, desarrollo, duelo y organización |
| Glosario | 133 | Terminología en nueve categorías |
| Casos | 21 | Viñetas clínicas con cuatro opciones y explicación de cada una |

**Dominios de cuidado:** dolor, respiratorio, digestivo, neurológico, piel y mucosas, general, emocional, familia y entorno, espiritual, últimos días y urgencias paliativas.

El buscador funciona con o sin acentos y recorre todo el texto de la ficha, no solo el título.

---

## Puesta en marcha

### Docker, con MongoDB

```bash
cd server && npm install && cd ..
docker compose up -d --build
```

Abrir **http://localhost:8082**

> El `npm install` previo en el equipo **no es opcional**. En redes que interceptan el tráfico TLS, `npm` falla dentro del contenedor con `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. El `Dockerfile` está preparado para reutilizar `server/node_modules` si ya existe, de modo que el build no necesita red.

Se levantan dos contenedores, `atlas-cpp-mongo` y `atlas-cpp-app`. La base se siembra automáticamente con el contenido de `data/` y se recarga sola cuando ese contenido cambia.

Los puertos son **8082** para la aplicación y **27018** para MongoDB, elegidos para poder convivir con otros proyectos que usen los puertos habituales.

Las carpetas `data/`, `img/`, `css/` y `js/`, más `index.html` y el manifiesto, se montan desde el equipo: al editar contenido, estilos o código basta recargar el navegador.

Para detenerlo, `docker compose down`, con `-v` si además se quiere borrar la base.

### Node sin Docker

```bash
cd server && npm install && npm start
```

Abrir **http://localhost:3000**. Si no hay un MongoDB corriendo, la aplicación lo detecta y lee directamente los archivos de `data/`, así que funciona igual.

### Cualquier servidor estático

```bash
npx serve .
```

Sirve para revisar el frontend sin Node ni base de datos.

> La aplicación usa **módulos de JavaScript**, que los navegadores no permiten cargar desde `file://`. Por eso **no funciona abriendo `index.html` con doble clic**: hay que servirla. Si ocurre, la propia aplicación lo detecta y lo explica en el pie de página.

---

## Arquitectura

### Frontend

JavaScript moderno con módulos y clases, sin ningún framework ni dependencia externa. Cada archivo tiene una responsabilidad y ninguno pasa de unas 250 líneas.

```
js/
├── main.js                     Punto de entrada
├── Aplicacion.js               Composición: crea el repositorio, las secciones y las rutas
├── nucleo/
│   ├── util.js                 Funciones puras compartidas
│   ├── Repositorio.js          Acceso a datos: API primero, archivos después
│   ├── Paginador.js            Rebanado por páginas y controles de paginación
│   ├── Chips.js                Filtros de selección única
│   ├── Modal.js                Ventanas de diálogo, relleno de campos y foco
│   └── Seccion.js              Clase base de las secciones de listado
├── calculadoras/
│   ├── MotorCalculadora.js     Construye, evalúa e interpreta una calculadora
│   └── EscalaVisual.js         Barra de zonas de color del resultado
├── secciones/
│   ├── SeccionSintomas.js      Todas heredan de Seccion
│   ├── SeccionFarmacos.js
│   ├── SeccionEscalas.js
│   ├── SeccionCalculadoras.js
│   ├── SeccionComunicacion.js
│   ├── SeccionGlosario.js
│   └── SeccionTemas.js
├── estudio/Quiz.js             Casos clínicos
└── interfaz/
    ├── Navegacion.js           Pestañas, tema, desplazamiento, salto al contenido
    └── Rutas.js                Sincronía entre la URL y lo que se está viendo
```

`Seccion` concentra todo lo que comparten las secciones de listado: búsqueda sin acentos, filtros por chips, contador, paginación, estado vacío y pintado de tarjetas. Una sección concreta solo declara de dónde salen sus datos, en qué texto busca, cómo dibuja su tarjeta y qué ocurre al pulsarla.

`Aplicacion` es el único lugar donde las piezas se conocen entre sí. Ninguna sección importa a otra: las relaciones, como el enlace de una ficha a su tema o de una escala a su calculadora, se inyectan como funciones desde ahí.

### Estilos

Seis hojas por responsabilidad, más una de impresión. El orden de carga importa: los tokens primero, los ajustes responsivos al final.

| Archivo | Contenido |
|---|---|
| `css/base.css` | Tokens de color, tema oscuro, reajuste inicial, foco visible, fondo |
| `css/layout.css` | Cabecera, pestañas, contenedor de vista, portada, pie, paginación |
| `css/componentes.css` | Buscador, chips, rejilla, tarjeta, insignias, modales, tablas |
| `css/secciones.css` | Filas de dosis, guiones, temas, glosario, casos, calculadoras |
| `css/acentos.css` | Familias funcionales de color para dominios, grupos, categorías e interlocutores |
| `css/responsivo.css` | Ajustes por tamaño de pantalla |
| `css/impresion.css` | Hoja de impresión, cargada solo con `media="print"` |

### Servidor

```
server/
├── colecciones.js   Nombres de colección y campos filtrables. Sin dependencias
├── Almacen.js       Clase Almacen: lectura, siembra, filtrado y búsqueda
├── index.js         Rutas de la API y archivos estáticos
├── seed.js          Recarga completa de la base
└── validar.js       Validación del contenido, sin necesidad de base de datos
```

`Almacen` encapsula por completo el origen de los datos. Lee los JSON al arrancar, siembra MongoDB si está disponible y sirve desde la base; si MongoDB falla en cualquier momento, cae a los archivos sin que las rutas se enteren. `colecciones.js` no tiene dependencias precisamente para que el validador funcione sin tener instalado el controlador de MongoDB.

Las rutas de la API se generan en bucle a partir de `COLECCIONES`, de modo que añadir una colección nueva no obliga a escribir rutas a mano.

### Base de datos

MongoDB, base `atlas_cuidados_paliativos_pediatricos`, con una colección por archivo de `data/`.

La siembra compara una **huella SHA1 del contenido**, no solo el número de documentos: editar el texto de una ficha sin cambiar cuántas hay también actualiza la base.

```bash
cd server && npm run seed                                        # recarga completa
docker exec -it atlas-cpp-mongo mongosh atlas_cuidados_paliativos_pediatricos
```

### API

| Ruta | Filtros aceptados |
|---|---|
| `GET /api/sintomas` | `?q=`, `?dominio=`, `?nivel=` |
| `GET /api/farmacos` | `?q=`, `?grupo=` |
| `GET /api/escalas` | `?q=`, `?dominio=` |
| `GET /api/calculadoras` | `?q=`, `?categoria=` |
| `GET /api/comunicacion` | `?q=`, `?interlocutor=` |
| `GET /api/temas` | `?q=`, `?area=` |
| `GET /api/glosario` | `?q=`, `?categoria=` |
| `GET /api/casos` | `?q=`, `?dominio=` |
| `GET /api/<coleccion>/:codigo` | Un documento concreto |
| `GET /api/filtros` | Valores disponibles de cada filtro |
| `GET /api/estado` | Diagnóstico: indica si los datos vienen de MongoDB o de archivos |

---

## Sistema de diseño

La paleta parte del **lavanda**, color internacional de los cuidados paliativos, y la acompaña un **verde azulado** que recoge la iridiscencia del colibrí de la marca. El **ámbar cálido** queda reservado a lo que acompaña más que trata: la familia, las conversaciones y el cuidado.

Tres reglas gobiernan la paleta:

1. Los colores de texto cumplen el contraste **AA** sobre su fondo, en tema claro y en oscuro. Las tintas de estado del tema oscuro tienen su propio paso claro medido en `css/base.css`, porque las calculadas para fondo blanco caen por debajo de 2.8 a 1 sobre los fondos suaves oscurecidos.
2. Los acentos codifican la **familia funcional** y no la categoría: verde azulado para lo que se trata, granate para lo que se dosifica, azul para lo que se mide y ámbar para lo que acompaña. Con cuatro tonos todos los pares quedan separados también con daltonismo, cosa imposible con los treinta acentos anteriores. Las insignias llevan siempre el nombre escrito, de modo que el color agrupa pero nunca identifica por sí solo. Las mediciones viven en la cabecera de `css/acentos.css` y los umbrales en `paleta.config.json`, que verifica la revisión `paleta` del arnés.
3. El **rojo lleno se reserva a la insignia de urgencia**. Es el único aviso que exige actuar de inmediato, y si otros elementos compartieran ese tono dejaría de avisar de nada.

El tema tiene tres estados: claro, oscuro y **seguir el sistema**. El estado sistema se representa quitando `data-tema`, y los tokens responden entonces a `prefers-color-scheme` mediante el patrón `:root:where(:not([data-tema="claro"]))`, con la elección manual guardada en `localStorage` y el par de `theme-color` con `media` para que el primer pintado lleve el color correcto.

Decisiones de interfaz que conviene conocer antes de modificarla:

- **Las tarjetas no llevan miniatura.** Manda el texto, con un medallón de icono y una franja de color del dominio. En este campo no hay imágenes que identificar, y fotografías de niños enfermos serían éticamente problemáticas además de didácticamente inútiles.
- **Los esquemas son ilustraciones propias en SVG**, con un bloque `<style>` interno y `prefers-color-scheme` para adaptarse al tema oscuro aunque se carguen dentro de un `<img>`.
- **El modo estudio usa viñetas clínicas en texto**, no identificación visual.
- Los títulos y las citas usan una **serif**, porque buena parte del contenido son frases para decir en voz alta.

### Accesibilidad

- Las tarjetas son enfocables y se abren con Enter o con la barra espaciadora.
- Foco visible con `:focus-visible`, solo al navegar con teclado.
- Enlace de salto al contenido como primer elemento enfocable.
- Los modales declaran `role="dialog"` y `aria-modal`, atrapan el tabulador mientras están abiertos, marcan `inert` el resto del documento, llevan el foco al botón de cierre y lo devuelven al cerrarse.
- Un solo `main` expuesto: las vistas inactivas llevan el atributo `hidden` además de la clase, porque solo `hidden` las saca del árbol de accesibilidad.
- Una región `role="status"` permanente anuncia el cambio de vista con su recuento y `document.title` se sincroniza con la pestaña activa; los contadores de resultados llevan `aria-live`.
- Los buscadores tienen `role="search"` y nombre accesible, y los grupos de chips son `role="group"` con `aria-pressed` en cada chip.
- Las calculadoras validan a la vista: mensaje bajo el campo, `aria-invalid` y borde de peligro, sin inventar máximos clínicos que los datos no traigan.
- Las pestañas mantienen `aria-selected`.
- Con `prefers-reduced-motion` los desplazamientos animados pasan a salto directo mediante la utilidad `desplazar()`.
- Con puntero grueso los chips y los botones de paginación suben al blanco táctil mínimo de 44 px.

### Direcciones compartibles

`Rutas` sincroniza el fragmento de la URL con lo que se está viendo:

```
#/farmacos            abre la sección de fármacos
#/farmacos/morfina    abre además la ficha de la morfina
```

Sirve para compartir el enlace de una ficha concreta, guardarla en favoritos y que el botón de atrás del navegador cierre la ficha en lugar de salir de la aplicación.

### Impresión

Con una ficha abierta, imprimir produce **solo esa ficha**, en tinta negra sobre blanco, sin navegación y con el aviso legal al pie. En atención domiciliaria el papel sigue siendo el soporte más fiable: no se queda sin batería y lo puede leer cualquiera que entre en la casa.

### Sin conexión

El service worker `sw.js` precachea el armazón completo (documento, hojas, módulos, datos e imágenes) en una caché con nombre versionado, `atlas-cpp-v4`. Los archivos de `data/*.json` se sirven con **caché primero y revalidación en segundo plano**: La copia guardada responde al instante y en paralelo la red actualiza la caché para la próxima visita, así que una corrección puede tardar una visita en verse, algo aceptable en contenido educativo estable; el resto va con **caché primero**, porque el armazón no cambia entre publicaciones. El registro ocurre solo bajo HTTPS o en localhost, con ruta relativa para respetar el subdirectorio de GitHub Pages.

Para publicar una versión nueva hay que **subir el número de la constante `CACHE` en `sw.js`** (por ejemplo de `atlas-cpp-v4` a `atlas-cpp-v5`). El service worker nuevo instala su caché con ese nombre y, al activarse, borra las cachés con nombres anteriores. Publicar cambios sin cambiar el nombre deja a los visitantes recurrentes con el armazón viejo hasta que el navegador decida revalidar.

---

## Cómo agregar contenido

Todo el contenido está en `data/`, en archivos JSON editables con cualquier editor de texto. Para agregar una ficha basta copiar una existente, pegarla y cambiar el texto.

### Ficha de síntoma

```json
{
  "codigo": "identificador-unico-sin-espacios",
  "titulo": "Nombre del síntoma o situación",
  "dominio": "Dolor",
  "nivel": "Básico",
  "urgencia": false,
  "edades": "Cualquier edad",
  "descripcion": "Qué es y por qué importa...",
  "porQueOcurre": "Fisiopatología en lenguaje llano...",
  "causas": ["Causa que hay que buscar"],
  "evaluar": ["Qué preguntar y qué escala usar"],
  "noFarmacologico": ["Medida sin fármacos"],
  "farmacologico": [
    { "farmaco": "Morfina", "dosis": "0.2 mg/kg VO cada 4 h", "cuando": "Primera línea" }
  ],
  "escalar": "Cuándo reconsultar o derivar...",
  "queDecirALaFamilia": "Frase textual, se muestra entrecomillada",
  "evitar": ["Error frecuente"],
  "perla": "El dato que no hay que olvidar",
  "esquema": "img/esquema-xxx.svg",
  "esquemaPie": "Pie del esquema",
  "temaRelacionado": "codigo-de-un-tema",
  "etiquetas": ["palabra1", "palabra2"]
}
```

`dominio` admite `Dolor`, `Respiratorio`, `Digestivo`, `Neurológico`, `Piel y mucosas`, `General`, `Emocional`, `Familia y entorno`, `Espiritual`, `Últimos días` y `Urgencias`. `nivel` admite `Básico`, `Intermedio` y `Avanzado`.

### Calculadora

Las calculadoras se describen **enteras en datos**: sus campos, sus fórmulas y sus umbrales de interpretación. Añadir una nueva no requiere tocar ni una línea de código.

Dos condiciones que conviene respetar:

- Las expresiones de `formula` y de `interpretacion` se evalúan con `Function()`. Provienen exclusivamente de los archivos del proyecto, nunca de lo que escriba quien usa la aplicación. Dentro se pueden usar `Math`, operadores ternarios y sumas de comparaciones como `(a>=4)+(b>=4)`.
- La **barra visual de referencia** solo se dibuja si todas las reglas de `interpretacion` menos la última son umbrales simples del tipo `variable OP numero` sobre **la misma** variable, y la última es `"true"`. Si las reglas combinan varias variables, la barra se omite y el resto de la calculadora sigue funcionando igual.

### Caso clínico

Cuatro opciones, **una sola** con `"correcta": true`, y **todas** con `explicacion`, porque el motivo por el que una respuesta es mala suele enseñar más que la correcta. El quiz las baraja.

### Esquema SVG

Patrón establecido, conviene respetarlo: `viewBox` de 640 de ancho, `<title>` y `<desc>` con la autoría, y un bloque `<style>` interno con clases (`.fondo`, `.txt`, `.txt2`, `.txt3`, `.caja`) más un `@media (prefers-color-scheme: dark)` que las redefine.

Si un esquema referenciado no existe, la ficha oculta el bloque y el validador lo señala como aviso.

---

## Convenciones de redacción

Se aplican a todo el contenido de `data/` y el validador comprueba las que puede:

1. **Punto decimal**, no coma: `0.5 mg/kg`.
2. **Sin guiones largos ni cortos** en ningún texto.
3. **Mayúscula tras dos puntos** en prosa.
4. Sin emojis dentro de los JSON.
5. Dosis siempre por kilogramo y con techo explícito.
6. Frases completas y tono explicativo, no telegráfico.

---

## Validación

```bash
cd server && npm run validar
```

Comprueba que los JSON sean válidos, que no haya códigos duplicados, que las referencias cruzadas existan (`temaRelacionado` hacia `temas`, `calculadora` hacia `calculadoras`, `esquema` hacia un archivo real), que **cada calculadora evalúe su ejemplo** sin producir `NaN` y con alguna regla de interpretación que coincida, que cada caso clínico tenga una sola opción correcta y que se respeten las convenciones de redacción.

Conviene ejecutarlo tras cualquier cambio en `data/`.

## Pruebas

```bash
cd server && npm run probar
```

Ejecuta `server/pruebas.js`, que prueba sin dependencias la escala visual, la evaluación de fórmulas con los datos reales, la paginación, el filtro del almacén y las utilidades del núcleo. Son 42 comprobaciones cuyos valores esperados están escritos a mano, nunca copiados de lo que imprime el motor, y conviene pasarlas antes de tocar `js/` o `server/`.

---

## Cómo extender la aplicación

### Añadir una sección de listado

1. Crear `js/secciones/SeccionX.js` heredando de `Seccion`.
2. En la llamada a `super({...})` declarar `vista`, `singular`, `plural`, `vacio`, `porPagina` y `filtros`.
3. Sobrescribir `buscarEn(doc)`, `tarjeta(doc)` y `abrir(doc)`.
4. Añadir en `index.html` los identificadores, que siguen siempre el mismo patrón derivado del nombre de la vista: `vista-<v>`, `lista-<v>`, `busqueda-<v>`, `contador-<v>`, `pag-<v>` y un `filtros-<v>-<campo>` por cada filtro.
5. Registrar la sección en el arreglo `this.secciones` de `Aplicacion.js`.
6. Añadir la colección en `server/colecciones.js`, que da de alta la ruta de la API automáticamente.

### Contratos que no conviene romper

- Los modales se cierran con `data-cierra="<nombre>"` y su contenedor es `modal-<nombre>`.
- `claseDominio(valor)` genera `dom-<slug>` y de ahí sale la variable CSS `--acento`. Un valor sin clase definida cae al color de marca por el respaldo de `var(--acento, ...)`, así que no rompe nada, pero conviene darle su color en `css/acentos.css`.
- `Seccion.abrir()` solo abre. `Seccion.mostrar()` abre **y avisa a las rutas**. Los manejadores de interacción llaman a `mostrar()`; la restauración de una dirección llama a `abrir()`, para no reescribir la URL que se acaba de leer y entrar en un ciclo.

---

## Posibles ampliaciones

- Dos esquemas más que encajarían en los temas: la vía subcutánea con sus puntos de punción y las cuatro trayectorias de los grupos ACT. Requeriría admitir el campo `esquema` también en `temas.json`.
- Más casos clínicos. El quiz toma ocho al azar por partida, de modo que ampliar el corpus reduce la repetición.
- Fichas de síntomas menos frecuentes: hipo persistente, sudoración, linfedema, ascitis, tenesmo, síndrome de vena cava superior.
- Calculadoras de conversión de metadona, aclaramiento de creatinina y dosis de bifosfonatos.
- Enlazar desde una ficha de síntoma a las fichas de los fármacos que menciona, igual que ya se enlaza a los temas.
- Trabajador de servicio para funcionamiento sin conexión completo, más allá del manifiesto actual.
- Pruebas automatizadas del motor de calculadoras sobre un corpus de casos.

---

## Autoría

Proyecto creado y desarrollado íntegramente por **Jeshua Romero Guadarrama**. Todo el contenido clínico, los esquemas, el diseño y el código son originales.
