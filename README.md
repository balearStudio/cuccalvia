# CUC Calvià · web interactiva en 3D

Recorrido interactivo por el **Centre Universitari de Calvià (CUC)** construido con
[Three.js](https://threejs.org). La página de inicio muestra el edificio por fuera y, al
hacer scroll, la cámara se acerca, cruza el pórtico y entra: biblioteca, salas de estudio,
contacto y créditos.

Todo el edificio, el entorno y el mobiliario están **modelados por código**: no hay ningún
modelo 3D importado. Los acabados exteriores salen de las propias fotografías del centro
(ver *Texturas*) y el resto se genera en un `<canvas>` al arrancar.

La escena sigue además **la hora, la estación y el tiempo real de Calvià**: el sol está donde
toca según el reloj, el cielo se cubre o llueve según el parte, la vegetación cambia de color
con la estación y de noche se encienden las farolas y las luces del edificio.

## Cómo se navega

| Acción | Resultado |
| --- | --- |
| Rueda del ratón / gesto táctil | Avanza o retrocede una sección |
| Menú lateral o puntos de la derecha | Salta directamente a una sección |
| `↑` `↓` `PgUp` `PgDn` `Inicio` `Fin` | Navegación por teclado |
| Arrastrar con el ratón | Orbita suavemente alrededor del encuadre |
| Botón **Foto real** | Superpone la fotografía de referencia de esa vista |
| Botón **Órbita** | Movimiento automático de cámara |
| Indicador de tiempo (arriba a la derecha) | Fija la luz: *Ahora*, *Mañana*, *Tarde*, *Noche* o *Lluvia* |

## Desarrollo

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run build      # genera dist/
npm run preview    # sirve dist/
npm run standalone # dist/cuc-standalone.html : un único archivo autocontenido
npm run textures   # vuelve a extraer public/textures/ de las fotografías
```

`vite.config.js` usa `base: './'`, así que el contenido de `dist/` se puede publicar tal cual
en cualquier hosting estático (GitHub Pages incluido).

## Estructura

```
src/
  main.js                  arranque, render, luces y bucle de animación
  config/site.js           secciones, textos y fotogramas de cámara  ← empieza a editar aquí
  core/
    cameraRig.js           interpolación entre encuadres + órbita del usuario
    scrollController.js    scroll por secciones (rueda, táctil, teclado)
  scene/
    building.js            volumen, muros, muro cortina, cubierta, pórtico, escalinata
    interior.js            vestíbulo, biblioteca y salas de estudio
    environment.js         terreno, pinar, setos, muretes, mobiliario urbano, sierra
    character.js           personaje a escala (1,93 m) del autor
    signage.js             identidad gráfica del CUC: tiras de puerta, rótulos
    atmosphere.js          sol real por hora, tiempo de Open-Meteo y estación
    sky.js                 cúpula de cielo por shader + mapa de entorno (PMREM)
    rain.js                lluvia
    textures.js            texturas: campo de color de las fotos + detalle en canvas
  ui/ui.js                 menú lateral, paneles, puntos y HUD
  styles/main.css          interfaz superpuesta
public/images/             fotografías ligeras para el botón «Foto real»
reference/photos/          fotografías a resolución completa (no se sirven:
                           solo alimentan la extracción de texturas)
```

### Topografía del solar

El edificio tiene dos plantas —biblioteca abajo, salas de estudio arriba— y una **tercera que
solo ocupa la torre del ascensor y el almacén**, que asoma por encima de la cubierta con el
rótulo CUC en la cara que mira al aparcamiento (`roofTower` en `scene/building.js`).

El solar está en ladera. El edificio y su explanada de acceso están abajo, a `y = -0.9`; el
**aparcamiento queda detrás y a la cota de la cubierta** (`PARK_Y = 7.6`), de modo que desde
allí la torre se lee como un volumen suelto. Entre ambos hay un talud, y por el **flanco este** sube
la escalera que salva los 8,5 m de desnivel en cuatro tramos con rellanos, encajada entre
parapetos macizos de hormigón. La piscina y la pista quedan al este, a la cota baja.

Como hay dos cotas, el arbolado se planta con `groundAt(z)`: los pinos de detrás del talud
arrancan ya en la cota del aparcamiento.

### Planta, según el catastro

`OUTLINE` en `scene/building.js` es el perímetro tomado del croquis catastral: un rectángulo
de unos 23 × 22 m con la **esquina noreste recortada en dos escalones**. El recuadro que queda
entre ambos escalones es el que el catastro marca con **III plantas** — la caja del ascensor y
la escalera (`CORE`), que por arriba sale a la cubierta como la torre rotulada CUC.

Los muros perimetrales se levantan recorriendo ese polígono (`perimeterWall`), y la cubierta
se extruye del mismo perímetro retranqueado hacia fuera, con cinco metros de vuelo sobre el
pórtico.

En la planta primera, según el croquis de distribución, **toda la mitad este es «abierto»**:
la doble altura sobre la sala de lectura. Las salas se agrupan al oeste y al norte alrededor
de ese vacío — salas de estudio 1, 2 y 3, la sala de trabajo en grupo y la oficina—, cada una
con su puerta y su tira de señalética en el paramento que da a la circulación (`ROOMS` en
`scene/interior.js`).

### Geometría del edificio

El edificio está centrado en el origen: la fachada principal mira hacia **+Z** (de `x = -12`
a `x = +12`, de `z = -15` a `z = 0`), el jardín está a `y = -0.9` y la planta baja a `y = 0`.
La cubierta es un único plano inclinado que sube hacia la derecha y hacia el frente y vuela
5 m sobre el pórtico:

```
y = 8.99 + 0.075·x + 0.055·z      (cara inferior de la cubierta)
```

Esa función (`roofSoffitY` en `scene/building.js`) la usan las columnas, el remate de los
muros, el muro cortina, la celosía y el techo interior, así que **cambiando la pendiente ahí
se ajusta todo el conjunto a la vez**.

### Texturas a partir de las fotografías

`npm run textures` ejecuta `scripts/extract-textures.mjs`, que recorta de las fotografías de
`reference/photos/` el revoco de la fachada, la losa de piedra del acceso, los peldaños y el
hormigón impreso del aparcamiento, **les quita la iluminación** (resta un desenfoque fuerte y
devuelve la media del parche, así no quedan pegadas las sombras del arbolado ni el degradado
del sol), los espeja para que sean continuos y los guarda en `public/textures/`. También mide
los colores reales del revoco, la columna, el vidrio, la piedra y los pavimentos en
`palette.json`.

Las fotos de partida son de 2048 px, así que el recorte del revoco ya trae **las juntas
horizontales del paño y el grano del mortero de verdad**: la textura va casi pura, con solo
algo de grano añadido para que aguante de cerca. En los pavimentos, donde el espejado
generaría un patrón de caleidoscopio, la foto se desenfoca y queda como campo de color, y el
despiece se dibuja encima en canvas (`scene/textures.js`). Para cambiar de recorte basta con
tocar las coordenadas de `PATCHES` en el script y volver a ejecutarlo.

### Identidad gráfica

El centro señaliza cada puerta con una tira vertical: banda de color con el nombre de la sala
y su pictograma, y debajo, sobre blanco, los poliedros facetados de dos tonos que son la marca
del CUC. `scene/signage.js` los dibuja en canvas, con un color por estancia
(`ROOM_COLORS`), y de ahí salen también el rótulo BIBLIOTECA, la pizarra del pasillo y el
panel de anuncios.

### Hora, estación y tiempo real

`scene/atmosphere.js` calcula la posición del sol para las coordenadas del CUC y la fecha del
navegador, y consulta el tiempo a [Open-Meteo](https://open-meteo.com) (gratuita, sin clave y
con CORS, así que funciona desde una web estática). Si la API no responde, la escena sigue
con cielo despejado: **el render nunca depende de la red**.

La orientación está en `SITE.facadeAzimuth`: la fachada principal (eje +Z) **mira al sur**
(178°), medido sobre la vista de satélite, donde el edificio aparece casi alineado con los
ejes cardinales. Lo confirman la sombra del gran vuelo, que en la aérea cae hacia el norte, y
las fotografías de fachada, iluminadas de lleno a mediodía. El pórtico queda al sur y el
aparcamiento al norte, detrás y por encima.

### Ajustar un encuadre

Con la web abierta, coloca la cámara arrastrando y ejecuta en la consola del navegador:

```js
__cuc.dump()   // { position: [...], target: [...] }  → pégalo en config/site.js
__cuc.jump(4)  // salta a una sección sin transición
```

## Pendiente

- Afinar el amueblado dentro de la nueva planta: las salas y la sala de lectura han crecido
  bastante y el mobiliario está repartido de forma genérica.
- Sala infantil y zona de novedades de la biblioteca, que aparecen en el vídeo del recorrido.
- Confirmar la posición exacta de las puertas y la circulación de la planta primera.
- Confirmar la orientación real del edificio (`SITE.facadeAzimuth`) y las dimensiones de la
  planta con la vista aérea a escala.

## Créditos

Diseño y desarrollo: **Daniel Ramos** — balearStudio.
Centre Universitari de Calvià · C/ de sa Ginesta, 7 · 07181 Bendinat (Calvià) ·
[cuc@calvia.com](mailto:cuc@calvia.com) · 971 40 20 68 · [cucalvia.com](https://www.cucalvia.com)
