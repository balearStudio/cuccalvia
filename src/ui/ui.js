/** Interfaz superpuesta: menú lateral, paneles de texto, puntos y HUD. */
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
    progress(value, message) {
      document.getElementById('loaderBar').style.width = `${Math.round(value * 100)}%`;
      if (message) document.getElementById('loaderHint').textContent = message;
    }
  };

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
