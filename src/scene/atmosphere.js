import * as THREE from 'three';
import { skyEnvironment } from './sky.js';

/**
 * Atmósfera: hora, estación y tiempo real del CUC.
 *
 * - La posición del sol se calcula para las coordenadas del centro y la fecha
 *   del navegador, así que la luz y las sombras son las de ese momento.
 * - El tiempo se consulta a Open-Meteo (gratuita, sin clave y con CORS, así que
 *   funciona desde una web estática). Si falla, la escena sigue con cielo
 *   despejado: la web nunca depende de la API para renderizar.
 * - La estación tiñe la vegetación: el pinar es perenne, pero el césped y el
 *   matorral pasan del verde de invierno al dorado seco del verano mallorquín.
 *
 * Orientación: el edificio está girado en la escena de modo que su fachada
 * principal (+Z) mira al noroeste, como en la vista aérea. Por eso recibe sol
 * de tarde y queda en sombra por la mañana.
 */

export const SITE = {
  name: 'Calvià',
  lat: 39.5361,
  lon: 2.5686,
  timezone: 'Europe/Madrid',
  // Rumbo (grados desde el norte) al que mira el eje +Z, o sea la fachada
  // principal. Leído de la vista aérea: la entrada da al aparcamiento del
  // norte, así que el edificio recibe sol de tarde. Ajustar aquí si se
  // confirma la orientación exacta.
  facadeAzimuth: 315
};

/* ------------------------------------------------------------------ */
/* Hora de Calvià                                                      */
/* ------------------------------------------------------------------ */

/**
 * Desfase de Calvià respecto a UTC, en minutos, en una fecha dada.
 * Se calcula con Intl para que el horario de verano salga solo.
 */
export function siteOffsetMinutes(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: SITE.timezone,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  const asIfUTC = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour) % 24, Number(parts.minute), Number(parts.second)
  );
  return (asIfUTC - Math.floor(date.getTime() / 1000) * 1000) / 60000;
}

/**
 * Instante correspondiente a "hoy, a tal hora en Calvià".
 *
 * Los preajustes de luz tienen que ir en hora local del centro: quien abra la
 * web desde otro huso debe ver la tarde de Calvià, no la suya.
 */
export function siteDateAt(hour, reference = new Date()) {
  const offset = siteOffsetMinutes(reference);
  const local = new Date(reference.getTime() + offset * 60000);
  const h = Math.floor(hour);
  const m = Math.round((hour % 1) * 60);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), h, m) - offset * 60000
  );
}

/** Partes de la fecha (día, mes, hora…) en hora de Calvià. */
export function siteParts(date) {
  const local = new Date(date.getTime() + siteOffsetMinutes(date) * 60000);
  return {
    weekday: local.getUTCDay(),
    day: local.getUTCDate(),
    month: local.getUTCMonth(),
    hours: local.getUTCHours(),
    minutes: local.getUTCMinutes()
  };
}

/* ------------------------------------------------------------------ */
/* Sol                                                                 */
/* ------------------------------------------------------------------ */

const RAD = Math.PI / 180;

/** Elevación y acimut del sol (radianes) para una fecha y un punto. */
export function solarPosition(date, lat = SITE.lat, lon = SITE.lon) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;

  const meanLongitude = (280.46 + 0.9856474 * n) % 360;
  const meanAnomaly = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const lambda =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * RAD;
  const epsilon = (23.439 - 0.0000004 * n) * RAD;

  const rightAscension = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
  const declination = Math.asin(Math.sin(epsilon) * Math.sin(lambda));

  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  const localSidereal = (gmst * 15 + lon) * RAD;
  const hourAngle = localSidereal - rightAscension;

  const phi = lat * RAD;
  const elevation = Math.asin(
    Math.sin(phi) * Math.sin(declination) + Math.cos(phi) * Math.cos(declination) * Math.cos(hourAngle)
  );
  // Acimut medido desde el sur; se pasa a rumbo desde el norte
  const south = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(phi) - Math.tan(declination) * Math.cos(phi)
  );
  const azimuth = (south / RAD + 180 + 360) % 360;
  return { elevation, azimuth };
}

/** Pasa elevación y acimut a una dirección en los ejes de la escena. */
export function sunDirection(elevation, azimuth) {
  const bearing = (azimuth - SITE.facadeAzimuth) * RAD;
  return new THREE.Vector3(
    Math.cos(elevation) * Math.sin(bearing),
    Math.sin(elevation),
    Math.cos(elevation) * Math.cos(bearing)
  ).normalize();
}

/* ------------------------------------------------------------------ */
/* Estación y tiempo                                                   */
/* ------------------------------------------------------------------ */

const SEASONS = {
  invierno: { grass: '#7f9457', shrub: '#55703e', pine: '#3f5c33', hills: '#7c8f75' },
  primavera: { grass: '#8fab58', shrub: '#658440', pine: '#456339', hills: '#83977a' },
  verano: { grass: '#b7a86a', shrub: '#77804c', pine: '#3e5931', hills: '#9a9c78' },
  otoño: { grass: '#9d9a5e', shrub: '#617543', pine: '#405c33', hills: '#8b937a' }
};

export function seasonOf(date) {
  const m = siteParts(date).month + 1;
  if (m === 12 || m <= 2) return 'invierno';
  if (m <= 5) return 'primavera';
  if (m <= 8) return 'verano';
  return 'otoño';
}

/** Interpretación de los códigos WMO que devuelve Open-Meteo. */
export function describeWeather(code) {
  if (code === 0) return { label: 'Despejado', cloud: 0.08, rain: 0 };
  if (code === 1) return { label: 'Poco nuboso', cloud: 0.25, rain: 0 };
  if (code === 2) return { label: 'Parcialmente nublado', cloud: 0.5, rain: 0 };
  if (code === 3) return { label: 'Cubierto', cloud: 0.9, rain: 0 };
  if (code === 45 || code === 48) return { label: 'Niebla', cloud: 0.95, rain: 0 };
  if (code >= 51 && code <= 57) return { label: 'Llovizna', cloud: 0.85, rain: 0.35 };
  if (code >= 61 && code <= 67) return { label: 'Lluvia', cloud: 0.95, rain: 0.7 };
  if (code >= 71 && code <= 77) return { label: 'Nieve', cloud: 0.95, rain: 0.4 };
  if (code >= 80 && code <= 82) return { label: 'Chubascos', cloud: 0.9, rain: 0.9 };
  if (code >= 95) return { label: 'Tormenta', cloud: 1, rain: 1 };
  return { label: 'Despejado', cloud: 0.15, rain: 0 };
}

/** Consulta el tiempo actual en Calvià. Nunca lanza: si falla, devuelve null. */
export async function fetchWeather(signal) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${SITE.lat}&longitude=${SITE.lon}` +
    '&current=temperature_2m,weather_code,cloud_cover,precipitation&timezone=auto';
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const data = await response.json();
    const current = data.current;
    if (!current) return null;
    const described = describeWeather(current.weather_code);
    return {
      temperature: Math.round(current.temperature_2m),
      code: current.weather_code,
      label: described.label,
      // La cobertura medida manda sobre la estimada por el código
      cloud: current.cloud_cover != null ? current.cloud_cover / 100 : described.cloud,
      rain: current.precipitation > 0 ? Math.max(described.rain, 0.4) : described.rain,
      source: 'open-meteo'
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Paletas                                                             */
/* ------------------------------------------------------------------ */

const c = (hex) => new THREE.Color(hex);

/** Paleta de cielo y luz según la altura del sol. */
function lightStops(elevationDeg) {
  const stops = [
    { at: -18, top: '#04060c', mid: '#070b14', bottom: '#0b111c', sun: '#b9c6dc', power: 0.0 },
    { at: -6, top: '#111a33', mid: '#27314f', bottom: '#4a4560', sun: '#7d86a8', power: 0.12 },
    { at: 0, top: '#274069', mid: '#8a6f86', bottom: '#d99a74', sun: '#ff9d54', power: 0.55 },
    { at: 8, top: '#2c5f92', mid: '#c79470', bottom: '#f0c894', sun: '#ffc178', power: 1.8 },
    { at: 22, top: '#236ea6', mid: '#9dc0d8', bottom: '#e6dfcf', sun: '#ffeccb', power: 2.7 },
    { at: 60, top: '#1f6fae', mid: '#8ec4e2', bottom: '#dfe9e4', sun: '#fff3d8', power: 3.2 }
  ];
  const e = THREE.MathUtils.clamp(elevationDeg, -18, 60);
  let a = stops[0];
  let b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (e >= stops[i].at && e <= stops[i + 1].at) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  const k = a === b ? 0 : (e - a.at) / (b.at - a.at);
  return {
    top: c(a.top).lerp(c(b.top), k),
    mid: c(a.mid).lerp(c(b.mid), k),
    bottom: c(a.bottom).lerp(c(b.bottom), k),
    sun: c(a.sun).lerp(c(b.sun), k),
    power: THREE.MathUtils.lerp(a.power, b.power, k)
  };
}

/* ------------------------------------------------------------------ */
/* Atmósfera                                                           */
/* ------------------------------------------------------------------ */

export function createAtmosphere({ renderer, scene, sun, hemisphere, skyUniforms, rain, lamps, vegetation, surfaces }) {
  let environment = null;
  let time = 0;

  const state = {
    date: new Date(),
    cloud: 0.15,
    rain: 0,
    temperature: null,
    label: 'Despejado',
    source: 'reloj del navegador',
    isNight: false,
    season: seasonOf(new Date())
  };

  function apply() {
    const { elevation, azimuth } = solarPosition(state.date);
    const elevationDeg = elevation / RAD;
    const night = elevationDeg < -6;
    state.isNight = night;
    state.season = seasonOf(state.date);

    // De noche se ilumina con la luna: misma trayectoria, en el lado opuesto
    const dir = night
      ? sunDirection(Math.max(0.22, -elevation * 0.7), (azimuth + 180) % 360)
      : sunDirection(Math.max(elevation, 0.015), azimuth);

    const palette = lightStops(elevationDeg);
    const overcast = THREE.MathUtils.clamp(state.cloud, 0, 1);

    // Cielo
    const grey = c('#9aa3ab');
    skyUniforms.uTop.value.copy(palette.top).lerp(grey, overcast * 0.55);
    skyUniforms.uMid.value.copy(palette.mid).lerp(grey, overcast * 0.6);
    skyUniforms.uBottom.value.copy(palette.bottom).lerp(c('#b9c0c4'), overcast * 0.6);
    skyUniforms.uSunColor.value.copy(night ? c('#dfe7f5') : palette.sun);
    skyUniforms.uSun.value.copy(dir);
    skyUniforms.uCloud.value = overcast;
    skyUniforms.uNight.value = night ? 1 : 0;
    skyUniforms.uSunDisc.value = night ? 0.55 : 1 - overcast * 0.85;
    skyUniforms.uCloudDark.value.copy(c(state.rain > 0.3 ? '#6b7278' : '#8d949c'));

    // Sol / luna
    sun.position.copy(dir).multiplyScalar(120);
    sun.color.copy(night ? c('#9fb4d8') : palette.sun);
    sun.intensity = night ? 0.22 : palette.power * (1 - overcast * 0.72);
    sun.castShadow = !night && sun.intensity > 0.25;

    // Luz de relleno
    hemisphere.intensity = night ? 0.14 : THREE.MathUtils.lerp(0.95, 1.5, overcast);
    hemisphere.color.copy(night ? c('#33405c') : c('#bfd9e8').lerp(c('#c9ced2'), overcast));
    hemisphere.groundColor.copy(night ? c('#12161d') : c('#6c6a55'));

    // Niebla atmosférica
    if (scene.fog) {
      scene.fog.color.copy(skyUniforms.uBottom.value);
      scene.fog.near = state.rain > 0.3 ? 60 : 130;
      scene.fog.far = state.rain > 0.3 ? 190 : 380;
    }

    // Exposición: de noche se abre para que se lean las luces del edificio
    renderer.toneMappingExposure = night ? 1.18 : 1.05 - overcast * 0.1;

    // Lluvia
    rain?.setIntensity(state.rain);

    // Pavimentos mojados: más oscuros y mucho más reflectantes
    const wet = THREE.MathUtils.clamp(state.rain, 0, 1);
    for (const material of surfaces ?? []) {
      if (material.userData.dryRoughness == null) {
        material.userData.dryRoughness = material.roughness;
        material.userData.dryColor = material.color.clone();
        material.userData.dryEnv = material.envMapIntensity;
      }
      material.roughness = THREE.MathUtils.lerp(material.userData.dryRoughness, 0.24, wet);
      material.envMapIntensity = THREE.MathUtils.lerp(material.userData.dryEnv, 1.1, wet);
      material.color.copy(material.userData.dryColor).lerp(c('#6f7276'), wet * 0.45);
    }

    // Vegetación por estación, algo más apagada con el cielo cubierto
    const season = SEASONS[state.season];
    const dull = overcast * 0.25 + (night ? 0.45 : 0);
    vegetation?.grass?.color.copy(c(season.grass)).lerp(c('#59606a'), dull);
    vegetation?.shrub?.color.copy(c(season.shrub)).lerp(c('#454b55'), dull);
    vegetation?.pine?.color.copy(c(season.pine)).lerp(c('#39404b'), dull);
    vegetation?.hills?.color.copy(c(season.hills)).lerp(c('#4d5560'), dull);

    // Farolas y luz encendida
    for (const lamp of lamps ?? []) {
      lamp.light.visible = night;
      lamp.light.intensity = night ? 26 : 0;
      lamp.bulb.material.emissiveIntensity = night ? 1.6 : 0.15;
    }

    // El mapa de entorno se rehace con el cielo nuevo
    environment = skyEnvironment(renderer, skyUniforms, environment);
    scene.environment = environment;
  }

  apply();

  return {
    state,
    /** Fusiona cambios y vuelve a aplicar todo. */
    set(patch) {
      Object.assign(state, patch);
      apply();
    },
    update(dt, camera) {
      time += dt;
      skyUniforms.uTime.value = time;
      rain?.update(dt, camera);
    }
  };
}
