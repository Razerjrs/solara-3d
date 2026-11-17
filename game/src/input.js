// Keyboard + mouse input. Tracks held keys, edge-triggered actions, and
// the mouse for punch direction. Works with a canvas element or the window.
import { KEYS } from './config.js';

export function createInput() {
  const held = new Set();
  const actions = new Set();
  let mouse = { x: 0, y: 0, down: false };

  function code(c) { return c; }

  function onKeyDown(e) {
    if (e.repeat) return;
    held.add(code(e.code));
    actions.add(code(e.code));
    if (e.code === 'Space') e.preventDefault();
  }
  function onKeyUp(e) { held.delete(code(e.code)); }
  function onMouseMove(e) { mouse.x = e.clientX; mouse.y = e.clientY; }
  function onMouseDown(e) { mouse.down = true; actions.add('Mouse'); }
  function onMouseUp() { mouse.down = false; }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  function any(list) { return list.some((c) => held.has(c)); }
  function pressed(list) { return list.some((c) => actions.has(c)); }

  return {
    get mouse() { return mouse; },
    state() {
      return {
        up: any(KEYS.up), down: any(KEYS.down),
        left: any(KEYS.left), right: any(KEYS.right),
        run: any(KEYS.run), handbrake: any(KEYS.handbrake),
      };
    },
    takeActions() {
      const a = {
        enter: pressed(KEYS.enter),
        punch: pressed(KEYS.punch) || actions.has('Mouse'),
        pause: pressed(KEYS.pause),
        mute: pressed(KEYS.mute),
        save: pressed(KEYS.save),
        cont: pressed(KEYS.cont),
        confirm: pressed(KEYS.confirm),
      };
      actions.clear();
      return a;
    },
    // For scripted play-tests: pretend keys are held.
    inject(keys) { for (const k of keys) held.add(k); },
    release(keys) { for (const k of keys) held.delete(k); },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    },
  };
}
