// InputManager.js — Singleton de input estilo AAA
// El game loop JALA el estado — no escucha eventos
// Se inicializa una sola vez y persiste entre fases

class InputManager {
  constructor() {
    this._keys    = {};
    this._pressed = {}; // teclas presionadas este frame (one-shot)
    this._active  = false;

    this._onDown = (e) => {
      if (!this._keys[e.code]) {
        this._pressed[e.code] = true; // one-shot: solo primer frame
      }
      this._keys[e.code] = true;
    };
    this._onUp = (e) => {
      this._keys[e.code]    = false;
      this._pressed[e.code] = false;
    };
  }

  activate() {
    if (this._active) return;
    window.addEventListener("keydown", this._onDown);
    window.addEventListener("keyup",   this._onUp);
    this._active = true;
  }

  deactivate() {
    window.removeEventListener("keydown", this._onDown);
    window.removeEventListener("keyup",   this._onUp);
    this._active  = false;
    this._keys    = {};
    this._pressed = {};
  }

  // ¿Está la tecla sostenida?
  isDown(code) {
    return !!this._keys[code];
  }

  // ¿Se acaba de presionar este frame? (one-shot)
  wasPressed(code) {
    const result = !!this._pressed[code];
    this._pressed[code] = false; // consumir
    return result;
  }

  // Simular press desde UI (botón en pantalla)
  simulatePress(code) {
    this._pressed[code] = true;
    this._keys[code]    = true;
    setTimeout(() => { this._keys[code] = false; }, 100);
  }
}

// Singleton global — persiste entre fases
export const Input = new InputManager();