# CUC Calvià · web interactiva en 3D

Recorrido interactivo por el **Centre Universitari de Calvià (CUC)** construido con
[Three.js](https://threejs.org). La página de inicio muestra el edificio por fuera y, al
hacer scroll, la cámara se acerca, cruza el pórtico y entra: biblioteca, salas de estudio,
contacto y créditos.

Todo el edificio, el entorno y el mobiliario están **modelados por código** — no hay
modelos 3D ni texturas externas: las texturas (revoco, piedra, césped, gravilla, madera) se
generan en un `<canvas>` al arrancar.

## Cómo se navega

| Acción | Resultado |
| --- | --- |
| Rueda del ratón / gesto táctil | Avanza o retrocede una sección |
| Menú lateral o puntos de la derecha | Salta directamente a una sección |
| `↑` `↓` `PgUp` `PgDn` `Inicio` `Fin` | Navegación por teclado |
| Arrastrar con el ratón | Orbita suavemente alrededor del encuadre |
| Botón **Foto real** | Superpone la fotografía de referencia de esa vista |
| Botón **Órbita** | Movimiento automático de cámara |

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo en http://localhost:5173
npm run build    # genera dist/
npm run preview  # sirve dist/
npm run standalone   # dist/cuc-standalone.html : un único archivo autocontenido
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
    sky.js                 cúpula de cielo por shader + mapa de entorno (PMREM)
    textures.js            texturas procedurales en canvas
  ui/ui.js                 menú lateral, paneles, puntos y HUD
  styles/main.css          interfaz superpuesta
public/images/             fotografías de referencia del edificio
```

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

### Ajustar un encuadre

Con la web abierta, coloca la cámara arrastrando y ejecuta en la consola del navegador:

```js
__cuc.dump()   // { position: [...], target: [...] }  → pégalo en config/site.js
__cuc.jump(4)  // salta a una sección sin transición
```

## Pendiente

- Sustituir la volumetría provisional del interior (biblioteca y salas de estudio) por el
  reparto real cuando haya fotografías de dentro.
- Afinar el entorno con la vista aérea (aparcamiento, accesos rodados, edificios vecinos).

## Créditos

Diseño y desarrollo: **Daniel Ramos** — balearStudio.
Centre Universitari de Calvià · C/ de sa Ginesta, 7 · 07181 Bendinat (Calvià) ·
[cuc@calvia.com](mailto:cuc@calvia.com) · 971 40 20 68 · [cucalvia.com](https://www.cucalvia.com)
