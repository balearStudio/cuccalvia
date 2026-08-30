import * as THREE from 'three';

/**
 * Cámara cinemática: interpola entre los fotogramas de cada sección y añade
 * una órbita suave controlada por el ratón / el dedo.
 */

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class CameraRig {
  constructor(camera, domElement) {
    this.camera = camera;
    this.dom = domElement;

    this.from = { position: new THREE.Vector3(), target: new THREE.Vector3() };
    this.to = { position: new THREE.Vector3(), target: new THREE.Vector3() };
    this.base = { position: new THREE.Vector3(), target: new THREE.Vector3() };
    this.via = null;

    this.duration = 1.9;
    this.elapsed = 1e9;

    // Órbita del usuario (arrastre) y paralaje del puntero
    this.orbit = { yaw: 0, pitch: 0 };
    this.orbitTarget = { yaw: 0, pitch: 0 };
    this.pointer = new THREE.Vector2();
    this.pointerSmooth = new THREE.Vector2();

    this.auto = false;
    this.autoAngle = 0;

    this._dragging = false;
    this._last = { x: 0, y: 0 };
    this._bind();
  }

  _bind() {
    const el = this.dom;
    const down = (e) => {
      this._dragging = true;
      this._last.x = e.clientX ?? e.touches[0].clientX;
      this._last.y = e.clientY ?? e.touches[0].clientY;
      el.style.cursor = 'grabbing';
    };
    const move = (e) => {
      const x = e.clientX ?? (e.touches && e.touches[0].clientX);
      const y = e.clientY ?? (e.touches && e.touches[0].clientY);
      if (x === undefined) return;
      this.pointer.set((x / window.innerWidth) * 2 - 1, (y / window.innerHeight) * 2 - 1);
      if (!this._dragging) return;
      this.orbitTarget.yaw -= (x - this._last.x) * 0.0042;
      this.orbitTarget.pitch -= (y - this._last.y) * 0.0026;
      this.orbitTarget.pitch = THREE.MathUtils.clamp(this.orbitTarget.pitch, -0.42, 0.5);
      this.orbitTarget.yaw = THREE.MathUtils.clamp(this.orbitTarget.yaw, -0.85, 0.85);
      this._last.x = x;
      this._last.y = y;
      this.auto = false;
    };
    const up = () => {
      this._dragging = false;
      el.style.cursor = 'grab';
    };

    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
    el.style.cursor = 'grab';
  }

  /** Coloca la cámara en un fotograma de sección. */
  goTo(frame, immediate = false) {
    const nextPos = new THREE.Vector3().fromArray(frame.position);
    const nextTarget = new THREE.Vector3().fromArray(frame.target);
    this.via = frame.via ? new THREE.Vector3().fromArray(frame.via) : null;

    if (immediate) {
      this.base.position.copy(nextPos);
      this.base.target.copy(nextTarget);
      this.from.position.copy(nextPos);
      this.from.target.copy(nextTarget);
      this.to.position.copy(nextPos);
      this.to.target.copy(nextTarget);
      this.elapsed = this.duration;
    } else {
      this.from.position.copy(this.base.position);
      this.from.target.copy(this.base.target);
      this.to.position.copy(nextPos);
      this.to.target.copy(nextTarget);
      this.elapsed = 0;
    }
    // Al cambiar de sección la órbita manual vuelve poco a poco a su sitio
    this.orbitTarget.yaw = 0;
    this.orbitTarget.pitch = 0;
  }

  get isMoving() {
    return this.elapsed < this.duration;
  }

  update(dt) {
    // Interpolación entre fotogramas
    if (this.elapsed < this.duration) {
      this.elapsed = Math.min(this.duration, this.elapsed + dt);
      const t = easeInOutCubic(this.elapsed / this.duration);
      if (this.via) {
        const a = new THREE.Vector3().lerpVectors(this.from.position, this.via, t);
        const b = new THREE.Vector3().lerpVectors(this.via, this.to.position, t);
        this.base.position.lerpVectors(a, b, t);
      } else {
        this.base.position.lerpVectors(this.from.position, this.to.position, t);
      }
      this.base.target.lerpVectors(this.from.target, this.to.target, t);
    }

    // Suavizados
    const k = 1 - Math.exp(-6 * dt);
    this.orbit.yaw += (this.orbitTarget.yaw - this.orbit.yaw) * k;
    this.orbit.pitch += (this.orbitTarget.pitch - this.orbit.pitch) * k;
    this.pointerSmooth.lerp(this.pointer, 1 - Math.exp(-3 * dt));

    if (this.auto) {
      this.autoAngle += dt * 0.055;
      this.orbitTarget.yaw = Math.sin(this.autoAngle) * 0.55;
      this.orbitTarget.pitch = Math.sin(this.autoAngle * 0.6) * 0.12;
    }

    // Órbita alrededor del punto de mira
    const offset = new THREE.Vector3().subVectors(this.base.position, this.base.target);
    const yaw = this.orbit.yaw + this.pointerSmooth.x * 0.045;
    const pitch = this.orbit.pitch - this.pointerSmooth.y * 0.03;

    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += yaw;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi - pitch, 0.12, Math.PI - 0.12);
    offset.setFromSpherical(spherical);

    this.camera.position.copy(this.base.target).add(offset);
    this.camera.lookAt(this.base.target);
  }
}
