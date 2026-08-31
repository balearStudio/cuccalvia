import { fetchWeather, seasonOf, siteDateAt, siteParts } from '../scene/atmosphere.js';

/* Iconos del indicador de tiempo, dibujados en línea. */
const ICONS = {
  sol: '<svg viewBox="0 0 24 24" fill="none" stroke="#ffd27d" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4.2" fill="#ffd27d" stroke="none"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>',
  nubes: '<svg viewBox="0 0 24 24" fill="none" stroke="#dfe7ec" stroke-width="1.6" stroke-linecap="round"><path d="M7.5 18h9.2a3.6 3.6 0 0 0 .5-7.2 5.3 5.3 0 0 0-10.2-1A3.6 3.6 0 0 0 7.5 18Z" fill="rgba(223,231,236,0.28)"/></svg>',
  lluvia: '<svg viewBox="0 0 24 24" fill="none" stroke="#cfe0ea" stroke-width="1.6" stroke-linecap="round"><path d="M7.6 14.4h8.8a3.3 3.3 0 0 0 .4-6.6 4.9 4.9 0 0 0-9.4-.9 3.3 3.3 0 0 0 .2 7.5Z" fill="rgba(207,224,234,0.26)"/><path d="M9 17.4l-.9 2.4M13 17.4l-.9 2.4M17 17.4l-.9 2.4" stroke="#8fc4e6"/></svg>',
  luna: '<svg viewBox="0 0 24 24" fill="none" stroke="#d6ddf0" stroke-width="1.5" stroke-linecap="round"><path d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" fill="rgba(214,221,240,0.3)"/></svg>'
};

/** Ajustes de luz que se pueden forzar desde la interfaz. */
const PRESETS = [
  { id: 'real', nav: 'Ahora' },
  { id: 'manana', nav: 'Mañana', hour: 9.5, cloud: 0.12, rain: 0, label: 'Mañana despejada' },
  { id: 'tarde', nav: 'Tarde', hour: 18.75, cloud: 0.1, rain: 0, label: 'Sol de tarde' },
  { id: 'noche', nav: 'Noche', hour: 22.5, cloud: 0.15, rain: 0, label: 'Noche despejada' },
  { id: 'lluvia', nav: 'Lluvia', hour: 16.5, cloud: 0.97, rain: 0.85, label: 'Lluvia' }
];

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Siempre en hora de Calvià, se abra la web desde donde se abra. */
const formatDate = (d) => {
  const p = siteParts(d);
  return (
    `${DIAS[p.weekday]} ${p.day} ${MESES[p.month]} · ` +
    `${String(p.hours).padStart(2, '0')}:${String(p.minutes).padStart(2, '0')}`
  );
};

/** Interfaz superpuesta: menú lateral, paneles de texto, puntos, HUD y tiempo. */
export function createUI(sections, { onSelect }) {
  const navList = document.getElementById('navList');
  const stage = document.getElementById('stage');
  const dotsBox = document.getElementById('dots');
  const sidenav = document.getElementById('sidenav');
  const navToggle = document.getElementById('navToggle');
  const scrollHint = document.getElementById('scrollHint');
  const photoBox = document.getElementById('photo');
  const photoImg = document.getElementById('photoImg');
  const photoCap = document.getElementById('photoCap');
  const photoBtn = document.getElementById('photoBtn');
  const autoBtn = document.getElementById('autoBtn');

  const items = [];
  const panels = [];
  const dots = [];
  let photoOpen = false;

  sections.forEach((section, i) => {
    // --- Menú ---
    const li = document.createElement('li');
    li.className = 'sidenav__item';
    const btn = document.createElement('button');
    btn.className = 'sidenav__btn';
    btn.type = 'button';
    btn.innerHTML = `<span>${section.nav}</span>`;
    btn.addEventListener('click', () => {
      onSelect(i);
      closeNav();
    });
    li.appendChild(btn);
    navList.appendChild(li);
    items.push(li);

    // --- Panel de contenido ---
    const panel = document.createElement('article');
    panel.className = 'panel';
    panel.id = `panel-${section.id}`;
    const facts = (section.facts || [])
      .map((f) => `<li><b>${f.v}</b>${f.k}</li>`)
      .join('');
    panel.innerHTML = `
      <span class="panel__kicker">${section.kicker}</span>
      <h1 class="panel__title">${section.title}</h1>
      <p class="panel__text">${section.text}</p>
      ${facts ? `<ul class="panel__facts">${facts}</ul>` : ''}
    `;
    stage.appendChild(panel);
    panels.push(panel);

    // --- Punto de progreso ---
    const dot = document.createElement('button');
    dot.className = 'dot';
    dot.type = 'button';
    dot.title = section.nav;
    dot.addEventListener('click', () => onSelect(i));
    dotsBox.appendChild(dot);
    dots.push(dot);
  });

  function closeNav() {
    sidenav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  navToggle.addEventListener('click', () => {
    const open = sidenav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  function showPhoto(section) {
    if (!photoOpen) return;
    if (!section.photo) {
      photoBox.hidden = true;
      return;
    }
    photoImg.src = section.photo.src;
    photoCap.textContent = section.photo.cap;
    photoBox.hidden = false;
  }

  const api = {
    index: 0,
    setActive(i) {
      api.index = i;
      items.forEach((li, k) => li.classList.toggle('is-active', k === i));
      panels.forEach((p, k) => p.classList.toggle('is-active', k === i));
      dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
      scrollHint.classList.toggle('is-hidden', i > 0);
      photoBtn.disabled = !sections[i].photo;
      photoBtn.style.opacity = sections[i].photo ? '1' : '0.4';
      showPhoto(sections[i]);
    },
    onAuto: null,
    finishLoading() {
      const loader = document.getElementById('loader');
      loader.classList.add('is-done');
      setTimeout(() => loader.remove(), 1000);
    },
    /** Conecta la atmósfera cuando la escena ya está montada. */
    bindAtmosphere(instance) {
      atmosphere = instance;
      applySky();
      paintSky();
    },
    /** Pide el tiempo actual; si no llega, la escena se queda como está. */
    async refreshWeather() {
      const weather = await fetchWeather();
      if (!weather) {
        paintSky();
        return;
      }
      observed = weather;
      if (preset === 'real') applySky();
      paintSky();
    },
    progress(value, message) {
      document.getElementById('loaderBar').style.width = `${Math.round(value * 100)}%`;
      if (message) document.getElementById('loaderHint').textContent = message;
    }
  };

  /* ---------------- Tiempo real ---------------- */
  const skyNow = document.getElementById('skyNow');
  const skyOpts = document.getElementById('skyOpts');
  const skyIcon = document.getElementById('skyIcon');
  const skyLabel = document.getElementById('skyLabel');
  const skyMeta = document.getElementById('skyMeta');

  let atmosphere = null;
  let preset = 'real';
  let observed = null; // último parte de Open-Meteo

  const optButtons = PRESETS.map((p) => {
    const b = document.createElement('button');
    b.className = 'sky__opt';
    b.type = 'button';
    b.textContent = p.nav;
    b.addEventListener('click', () => {
      preset = p.id;
      applySky();
      paintSky();
    });
    skyOpts.appendChild(b);
    return b;
  });

  /** Fecha del preajuste: hoy a esa hora en Calvià, o ahora mismo. */
  const presetDate = (p) => (p.hour ? siteDateAt(p.hour) : new Date());

  function applySky() {
    if (!atmosphere) return;
    const p = PRESETS.find((x) => x.id === preset) ?? PRESETS[0];
    if (p.id === 'real') {
      atmosphere.set({
        date: new Date(),
        cloud: observed?.cloud ?? 0.15,
        rain: observed?.rain ?? 0,
        temperature: observed?.temperature ?? null,
        label: observed?.label ?? 'Despejado',
        source: observed ? 'Open-Meteo' : 'sin datos del tiempo'
      });
    } else {
      atmosphere.set({
        date: presetDate(p),
        cloud: p.cloud,
        rain: p.rain,
        temperature: observed?.temperature ?? null,
        label: p.label,
        source: 'ajuste manual'
      });
    }
  }

  function paintSky() {
    optButtons.forEach((b, i) => b.classList.toggle('is-on', PRESETS[i].id === preset));
    if (!atmosphere) return;
    const s = atmosphere.state;
    const icon = s.isNight ? 'luna' : s.rain > 0.15 ? 'lluvia' : s.cloud > 0.55 ? 'nubes' : 'sol';
    skyIcon.innerHTML = ICONS[icon];
    const temp = s.temperature != null ? ` · ${s.temperature}°` : '';
    skyLabel.textContent = `Calvià${temp} · ${s.label}`;
    skyMeta.textContent = `${formatDate(s.date)} · ${seasonOf(s.date)}`;
    skyNow.title = `Datos: ${s.source}. Pulsa para cambiar la luz.`;
  }

  skyNow.addEventListener('click', () => {
    const open = skyOpts.hidden;
    skyOpts.hidden = !open;
    skyNow.setAttribute('aria-expanded', String(open));
  });

  // El reloj de la interfaz va aparte del estado de la escena
  setInterval(() => paintSky(), 30000);
  // En modo "Ahora" la luz sigue a la hora real
  setInterval(() => {
    if (preset === 'real') {
      applySky();
      paintSky();
    }
  }, 5 * 60 * 1000);

  photoBtn.addEventListener('click', () => {
    photoOpen = !photoOpen;
    photoBtn.classList.toggle('is-on', photoOpen);
    if (photoOpen) showPhoto(sections[api.index]);
    else photoBox.hidden = true;
  });

  autoBtn.addEventListener('click', () => {
    const on = autoBtn.classList.toggle('is-on');
    api.onAuto?.(on);
  });

  return api;
}
