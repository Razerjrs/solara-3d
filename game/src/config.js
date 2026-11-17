// SOLARA tuning, palette, districts, vehicle types and key bindings.
// One place for every number a designer would want to change.
export const WORLD = {
  block: 44,          // size of one city block (units)
  street: 12,         // street width between blocks
  blocks: 5,          // blocks across (5 x 5 grid)
  beachZ: 132,        // south edge: sand starts here
  waterZ: 152,        // ocean starts here
  northZ: -132,       // north edge of the city
};

export const DISTRICTS = [
  { name: 'Old Town', x0: -132, z0: -132, x1: -44, z1: -44, color: 0x8a5a3c },
  { name: 'Downtown', x0: -44, z0: -132, x1: 44, z1: -44, color: 0x4a5a7a },
  { name: 'Marina', x0: 44, z0: -132, x1: 132, z1: -44, color: 0x3c7a8a },
  { name: 'Westside', x0: -132, z0: -44, x1: -44, z1: 44, color: 0x7a6a4a },
  { name: 'Central', x0: -44, z0: -44, x1: 44, z1: 44, color: 0x5a4a6a },
  { name: 'Harbor', x0: 44, z0: -44, x1: 132, z1: 44, color: 0x4a7a5a },
  { name: 'Beachfront', x0: -132, z0: 44, x1: 132, z1: 132, color: 0xc98a4a },
];

export const SUNSET = {
  skyTop: 0x8a5fb0,      // dusk purple overhead
  skyHorizon: 0xff9a5c,  // orange band at the horizon
  fog: 0xe08a5e,
  sunColor: 0xffc98a,
  sunIntensity: 3.1,
  hemiSky: 0xffc0a0,
  hemiGround: 0x6a5560,
  hemiIntensity: 1.45,
  sunPos: [-90, 42, 140], // low sun over the ocean (south-west)
};

export const VEHICLES = {
  sedan:   { name: 'Sedan',    top: 34, accel: 16, grip: 2.6, color: 0x7a8a9a, len: 4.2, wid: 1.9 },
  taxi:    { name: 'Taxi',     top: 32, accel: 15, grip: 2.6, color: 0xe8b13c, len: 4.2, wid: 1.9 },
  truck:   { name: 'Truck',    top: 26, accel: 10, grip: 2.2, color: 0xc8a03c, len: 6.4, wid: 2.2 },
  sports:  { name: 'Sports',   top: 46, accel: 24, grip: 3.4, color: 0xc02020, len: 4.4, wid: 2.0 },
  van:     { name: 'Van',      top: 28, accel: 12, grip: 2.3, color: 0x6a8a6a, len: 5.0, wid: 2.1 },
  police:  { name: 'Interceptor', top: 40, accel: 20, grip: 3.2, color: 0x1a1a22, len: 4.4, wid: 2.0 },
};

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 10,
  punchRange: 2.2,
  punchDamage: 34,
  health: 100,
};

export const WANTED = {
  max: 5,
  decaySeconds: 14,   // quiet time out of sight before heat drops one star
  chaseSpeed: 30,      // police car cruise speed while chasing
  heliAt: 3,           // helicopter joins at this wanted level
  arrestRange: 2.6,
  bustSeconds: 3,      // a cop must stay in range this long to bust you
};

export const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  enter: ['KeyE'],
  punch: ['KeyF'],
  handbrake: ['Space'],
  pause: ['Escape', 'KeyP'],
  mute: ['KeyM'],
  save: ['KeyK'],
  cont: ['KeyC'],
  confirm: ['Enter'],
};

export const SAVE_KEY = 'solara-save-v1';
export const BEST_KEY = 'solara-best-v1';
