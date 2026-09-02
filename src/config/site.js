/**
 * Definición de las secciones del recorrido.
 *
 * Cada sección tiene un fotograma de cámara (posición + punto de mira) y el
 * contenido que se superpone sobre la escena. El scroll avanza de una sección
 * a la siguiente, de modo que bajar equivale a acercarse y entrar al edificio.
 *
 * Sistema de coordenadas: el edificio está centrado en el origen, la fachada
 * principal mira hacia +Z, el jardín está a y = -0.9 y la planta baja a y = 0.
 */

export const SECTIONS = [
  {
    id: 'inicio',
    nav: 'Inicio',
    kicker: 'Calvià · Mallorca',
    title: 'Centre Universitari de Calvià',
    text: 'Un edificio abierto al pinar: pórtico de columnas blancas, una gran cubierta volada y una fachada de vidrio que deja entrar la luz del Mediterráneo. Desplázate para recorrerlo.',
    facts: [
      { k: 'Desde', v: '1995' },
      { k: 'Plantas', v: '2' },
      { k: 'Municipio', v: 'Calvià' }
    ],
    camera: { position: [-30, 15, 35], target: [0, 3.5, -4] },
    interior: false,
    photo: { src: 'images/cuc-fachada.jpg', cap: 'Fachada principal del CUC Calvià' }
  },
  {
    id: 'edificio',
    nav: 'El edificio',
    kicker: '01 · Arquitectura',
    title: 'Volumen y luz',
    text: 'Un prisma revestido en tonos arena se abre en su mitad derecha con un muro cortina de vidrio de doble altura. A la izquierda, el paño macizo se perfora con ventanas cuadradas que iluminan las aulas de la planta superior.',
    facts: [
      { k: 'Fachada', v: '24 m' },
      { k: 'Altura', v: '8,6 m' },
      { k: 'Vidrio', v: '16 m' }
    ],
    camera: { position: [1, 6, 36], target: [1, 5, -2] },
    interior: false,
    photo: { src: 'images/cuc-lateral.jpg', cap: 'Vista lateral desde el acceso rodado' }
  },
  {
    id: 'portico',
    nav: 'El pórtico',
    kicker: '02 · Exterior',
    title: 'La cubierta que vuela',
    text: 'Seis columnas cilíndricas sostienen un plano de cubierta inclinado que vuela cinco metros sobre la entrada. Sobre su borde alto, una celosía metálica triangular recorre toda la fachada y protege del sol de mediodía.',
    facts: [
      { k: 'Columnas', v: '6' },
      { k: 'Vuelo', v: '5 m' },
      { k: 'Celosía', v: '27 m' }
    ],
    camera: { position: [13, 2.2, 15], target: [-1, 7.4, -1] },
    interior: false,
    photo: { src: 'images/cuc-porticos.jpg', cap: 'Pórtico de columnas y celosía superior' }
  },
  {
    id: 'acceso',
    nav: 'El acceso',
    kicker: '03 · Umbral',
    title: 'Entrar',
    text: 'La escalinata de piedra conduce al vestíbulo. Desde aquí el vidrio deja de ser fachada y se convierte en umbral: un paso más y estamos dentro del centro.',
    facts: [
      { k: 'Horario', v: 'L–V · 9–14 / 16–20 h' },
      { k: 'Sábados', v: '9–14 h' },
      { k: 'Acceso', v: 'Adaptado' }
    ],
    camera: { position: [8.2, 2.7, 17.5], target: [3.4, 2.3, 1.5] },
    interior: false
  },
  {
    id: 'biblioteca',
    nav: 'Biblioteca',
    kicker: '04 · Interior',
    title: 'Biblioteca',
    text: 'El vestíbulo se prolonga en la sala de lectura de doble altura: la Biblioteca de Cas Català–Illetes–Bendinat. Estanterías azules sobre carcasa de haya, lámparas de campana colgando de la cubierta, las columnas redondas contra el vidrio y el rótulo BIBLIOTECA al fondo.',
    facts: [
      { k: 'Biblioteca', v: 'Cas Català–Illetes–Bendinat' },
      { k: 'Teléfono', v: '971 70 12 18' }
    ],
    camera: { position: [8.8, 2.5, -2.1], target: [-5.6, 1.9, -10.4] },
    via: [9.2, 2.3, 4],
    interior: true
  },
  {
    id: 'salas',
    nav: 'Salas de estudio',
    kicker: '05 · Interior',
    title: 'Salas de estudio',
    text: 'La planta primera es un pasillo con salas a un lado: tres salas de estudio —una de ellas de informática—, la sala de trabajo en grupo y la oficina. Cada puerta lleva su tira de señalética con el color de la sala y los poliedros de la marca del centro. Dentro, terrazo pulido, falso techo registrable, mesas de laminado con sillas azules y puestos individuales con faldón.',
    facts: [
      { k: 'Salas de estudio', v: '1 · 2 · 3' },
      { k: 'También', v: 'Treball en grup' },
      { k: 'Reserva', v: 'cuc.reservio.com' }
    ],
    camera: { position: [-5.4, 5.95, -8.7], target: [-11.2, 5.25, -14.2] },
    via: [-5, 5.4, -1.0],
    interior: true
  },
  {
    id: 'contacto',
    nav: 'Contacto',
    kicker: '06 · Visítanos',
    title: 'Centre Universitari de Calvià',
    text: 'C/ de sa Ginesta, 7 · 07181 Bendinat (Calvià, Illes Balears). De lunes a viernes de 9 a 14 h y de 16 a 20 h; sábados de 9 a 14 h. Escríbenos a cuc@calvia.com o llámanos al 971 40 20 68.',
    facts: [
      { k: 'Email', v: 'cuc@calvia.com' },
      { k: 'Teléfono', v: '971 40 20 68' },
      { k: 'Web', v: 'cucalvia.com' },
      { k: 'Reservas', v: 'cuc.reservio.com' }
    ],
    camera: { position: [-24, 28, 34], target: [0, 0, -4] },
    interior: false,
    photo: { src: 'images/cuc-fachada.jpg', cap: 'CUC Calvià · cuc@calvia.com · 971 40 20 68' }
  },
  {
    id: 'creditos',
    nav: 'Créditos',
    kicker: '07 · Quién ha hecho esto',
    title: 'balearStudio',
    text: 'Diseño y desarrollo: <b>Daniel Ramos</b> — balearStudio. Todo el edificio está modelado a mano con Three.js a partir de las fotografías del centro, sin ningún modelo importado. Ahí al lado, a escala real, la referencia de 1,93 m que hemos usado para comprobar las proporciones.',
    facts: [
      { k: 'Autor', v: 'Daniel Ramos' },
      { k: 'Estudio', v: 'balearStudio' },
      { k: 'Tecnología', v: 'Three.js + Vite' },
      { k: 'A escala', v: '1,93 m' }
    ],
    camera: { position: [8.4, 1.8, 22.4], target: [1.2, 1.15, 14.4] },
    interior: false,
    character: true
  }
];

/** Posición del personaje (exterior, junto al camino de acceso). */
export const CHARACTER = { position: [4.6, -0.9, 15.0], rotation: 0.42 };

/** Geometría maestra del edificio (metros). Cambiar aquí afecta a toda la escena. */
export const B = {
  width: 24, // fachada (eje X): de -12 a +12
  depth: 15, // fondo (eje Z): de -15 a 0
  height: 8.6, // altura del cuerpo principal
  floorH: 4.6, // altura de la planta baja
  glassFrom: -4, // el muro cortina ocupa de x = -4 a x = +12
  terrace: { front: 5.5, back: -16.5, side: 13.6, drop: 0.9 },
  roof: {
    front: 5.0, // vuelo de la cubierta más allá de la fachada (z)
    back: -16.2,
    side: 13.6,
    thickness: 0.35,
    backY: 7.4, // altura del intradós en la parte trasera
    frontY: 9.7 // altura del intradós en el borde volado
  },
  columns: { z: 3.1, radius: 0.26, xs: [-3.5, -0.5, 2.5, 5.5, 8.5, 11.5] },
  door: { x: 4, width: 3.2, height: 2.6 }
};

/** Altura del intradós de la cubierta en una coordenada z dada. */
export function roofSoffitY(z) {
  const { back, front, backY, frontY } = B.roof;
  const t = (z - back) / (front - back);
  return backY + (frontY - backY) * t;
}
