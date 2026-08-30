/**
 * Navegación por secciones a pantalla completa: rueda del ratón, gesto táctil,
 * teclado y clics en el menú. Bajar equivale a avanzar en el recorrido.
 */
export class ScrollController {
  constructor({ count, onChange, cooldown = 1250 }) {
    this.count = count;
    this.onChange = onChange;
    this.cooldown = cooldown;
    this.index = 0;
    this.locked = false;
    this._acc = 0;
    this._accTimer = null;
    this._touchY = null;
    this._bind();
  }

  _bind() {
    window.addEventListener(
      'wheel',
      (e) => {
        if (e.ctrlKey) return; // zoom del navegador
        e.preventDefault();
        if (this.locked) return;
        this._acc += e.deltaY;
        clearTimeout(this._accTimer);
        this._accTimer = setTimeout(() => (this._acc = 0), 180);
        const threshold = Math.abs(e.deltaY) > 60 ? 60 : 110; // rueda vs. trackpad
        if (Math.abs(this._acc) > threshold) {
          this.go(this.index + Math.sign(this._acc));
          this._acc = 0;
        }
      },
      { passive: false }
    );

    window.addEventListener('touchstart', (e) => {
      this._touchY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this._touchY === null || this.locked) return;
      const dy = this._touchY - e.touches[0].clientY;
      if (Math.abs(dy) > 55) {
        this.go(this.index + Math.sign(dy));
        this._touchY = null;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => (this._touchY = null));

    window.addEventListener('keydown', (e) => {
      const keys = {
        ArrowDown: 1, PageDown: 1, ' ': 1, Space: 1,
        ArrowUp: -1, PageUp: -1
      };
      if (e.key in keys) {
        e.preventDefault();
        this.go(this.index + keys[e.key]);
      } else if (e.key === 'Home') {
        this.go(0);
      } else if (e.key === 'End') {
        this.go(this.count - 1);
      }
    });
  }

  go(index, force = false) {
    const next = Math.max(0, Math.min(this.count - 1, index));
    if (!force && (this.locked || next === this.index)) return;
    this.index = next;
    this.locked = true;
    this.onChange(next);
    setTimeout(() => (this.locked = false), this.cooldown);
  }
}
