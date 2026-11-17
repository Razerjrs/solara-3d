// The world: everything the game simulates, advanced one fixed step at a
// time. Owns the player, cars, traffic, pedestrians, police, missions,
// combat results, save/load and the objective beacon.
import * as THREE from 'three';
import { buildCity, clampCity, districtAt } from './city.js';
import { createCar, updateCar, collideCars, carSpeedKmh } from './vehicles.js';
import { createPlayer, updatePlayer, tryPunch, nearestCar, personMesh } from './player.js';
import { createTraffic, updateTraffic, createPedestrians, updatePedestrians, removePedestrian } from './traffic.js';
import { createPolice, updatePolice, addWanted, setWanted, clearPolice } from './police.js';
import { resolvePunch, carHitsPeds, ramDamage } from './combat.js';
import { MISSIONS, createMissionState, updateMission, currentObjective, nextMission } from './missions.js';
import { SAVE_KEY, BEST_KEY, WANTED } from './config.js';
import { createRandom, pick } from './random.js';

const PARKED_TYPES = ['sedan', 'taxi', 'sports', 'van', 'sedan', 'truck'];

export function createWorld(scene, rng, seed) {
  const city = buildCity(scene, rng);
  const player = createPlayer(0, 20, Math.PI);
  scene.add(player.mesh);

  // Parked cars the player can steal.
  const parked = [];
  const spots = [
    [14, 28, 'sedan'], [-14, -28, 'taxi'], [28, 56, 'sports'], [-56, 14, 'van'],
    [56, -14, 'sedan'], [-84, 28, 'truck'], [84, 84, 'sedan'], [14, -56, 'taxi'],
    [-28, 112, 'sports'], [112, -28, 'van'], [28, -84, 'sedan'], [-112, -56, 'sedan'],
  ];
  for (const [x, z, type] of spots) {
    const car = createCar(type, x, z, (rng() * 4 | 0) * Math.PI / 2);
    scene.add(car.mesh);
    parked.push(car);
  }

  const traffic = createTraffic(scene, rng, 14);
  const peds = createPedestrians(scene, rng, 36);
  const police = createPolice(scene);

  // Objective beacon: a glowing ring + light beam at the current target.
  const beacon = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.22, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffc040 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.3;
  beacon.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffc040, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 13;
  beacon.add(beam);
  scene.add(beacon);

  const world = {
    scene, rng, seed, city,
    player, parked, traffic, peds, police,
    car: null,              // the car the player is driving, if any
    rivals: [],
    mission: createMissionState(),
    cash: 0, best: 0,
    time: 0,
    status: 'title',        // title | play | paused | over
    overReason: '',
    toasts: [],
    dialogue: null,
    shake: 0,
    beacon, ring,
    district: 'Central',
    stats: { stolen: 0, punched: 0, missions: 0 },
  };
  try { world.best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch { /* no storage */ }
  return world;
}

export function toast(world, text) {
  world.toasts.push({ text, until: world.time + 4 });
  if (world.toasts.length > 3) world.toasts.shift();
}

export function say(world, speaker, text, seconds = 5) {
  world.dialogue = { speaker, text, until: world.time + seconds };
}

function startMission(world, index) {
  const m = MISSIONS[index];
  if (!m) return;
  say(world, m.fixer, m.brief, 7);
  toast(world, `New mission: ${m.name}`);
  if (m.name === 'Turf Sweep') spawnRivals(world);
  if (m.name === 'Hot Cargo') ensureTruck(world);
}

function spawnRivals(world) {
  const { scene } = world;
  for (let i = 0; i < 3; i++) {
    const mesh = personMesh(0xd94040);
    const x = -6 + i * 6;
    const z = -4 + (i % 2) * 8;
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    world.rivals.push({ mesh, x, z, heading: 0, phase: i });
  }
}

function ensureTruck(world) {
  const near = world.parked.find((c) => c.type === 'truck');
  if (near) return;
  const car = createCar('truck', world.player.x + 8, world.player.z + 4, 0);
  world.scene.add(car.mesh);
  world.parked.push(car);
}

export function stepWorld(world, input, actions, dt) {
  if (world.status !== 'play') return;
  world.time += dt;
  const p = world.player;

  // --- Enter / exit a car.
  if (actions.enter) {
    if (world.car) {
      const car = world.car;
      world.car = null;
      const sx = car.x - Math.sin(car.heading) * 2.5;
      const sz = car.z - Math.cos(car.heading) * 2.5;
      const c = clampCity(sx, sz);
      p.x = c.x; p.z = c.z;
      p.heading = car.heading;
      p.mesh.visible = true;
      toast(world, 'Out of the car');
    } else {
      const car = nearestCar(p, world.parked);
      if (car) {
        world.parked.splice(world.parked.indexOf(car), 1);
        world.car = car;
        p.mesh.visible = false;
        world.stats.stolen += 1;
        if (world.mission.index === 0) addWanted(world.police, 0);
        toast(world, `Stole the ${car.spec.name}`);
        if (car.type === 'truck' || Math.random() < 0.4) addWanted(world.police, 1);
      }
    }
  }

  // --- Punching.
  if (actions.punch && !world.car && tryPunch(p)) {
    const hits = resolvePunch(p, world.peds, world.police.cops, (kind, target) => {
      if (kind === 'cop') { addWanted(world.police, 1); toast(world, 'You hit a cop!'); }
      else { addWanted(world.police, 1); }
    });
    // Rivals count toward the Turf Sweep step.
    for (let i = world.rivals.length - 1; i >= 0; i--) {
      const r = world.rivals[i];
      const dx = r.x - p.x, dz = r.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 3 && dx * Math.sin(p.heading) + dz * Math.cos(p.heading) > 0.2) {
        r.x += Math.sin(p.heading) * 3.5;
        r.z += Math.cos(p.heading) * 3.5;
        r.mesh.position.set(r.x, 0, r.z);
        world.mission.punched += 1;
        world.stats.punched += 1;
        world.rivals.splice(i, 1);
        world.scene.remove(r.mesh);
        hits += 1;
      }
    }
    if (hits > 0 && world.mission.index === 3) {
      // punched count is read by the mission step
    }
  }

  // --- Movement.
  if (world.car) {
    updateCar(world.car, input, dt);
    const c = clampCity(world.car.x, world.car.z);
    if (c.x !== world.car.x || c.z !== world.car.z) {
      world.car.x = c.x; world.car.z = c.z;
      world.car.speed *= -0.4;
    }
    // Running over pedestrians.
    const hits = carHitsPeds(world.car, world.peds, world.scene, removePedestrian);
    if (hits > 0) addWanted(world.police, 1);
    // Collisions with traffic and parked cars.
    for (const t of world.traffic) collideCars(world.car, t);
    for (const q of world.parked) collideCars(world.car, q);
    if (world.car.health <= 0) {
      world.car.smoke = 1;
      toast(world, 'The car is wrecked!');
      const car = world.car;
      world.car = null;
      p.x = car.x - 3; p.z = car.z;
      p.mesh.visible = true;
      p.health = Math.max(1, p.health - 20);
    }
  } else {
    updatePlayer(p, input, world.camYaw || 0, dt);
    const c = clampCity(p.x, p.z);
    p.x = c.x; p.z = c.z;
  }

  // --- Traffic, pedestrians, city.
  const focus = world.car || p;
  updateTraffic(world.traffic, world.city.lightStateAt, dt, { x: focus.x, z: focus.z });
  updatePedestrians(world.peds, { x: focus.x, z: focus.z, level: world.police.wanted }, dt);
  world.city.update(dt, world.time);

  // --- Police.
  const target = world.car
    ? { x: world.car.x, z: world.car.z, inCar: true, onRam: (car) => { if (ramDamage(world.car, 6)) { /* wreck handled above */ } } }
    : { x: p.x, z: p.z, inCar: false, onRam: null };
  const res = updatePolice(world.police, world.scene, target, dt, world.time);
  if (res.busted) {
    world.status = 'over';
    world.overReason = 'BUSTED';
    return;
  }
  // Police ramming the player on foot hurts.
  if (!world.car && res.nearestCopDist < 2.2) {
    p.health -= 12 * dt;
    world.shake = Math.max(world.shake, 0.4);
    if (p.health <= 0) {
      world.status = 'over';
      world.overReason = 'WASTED';
      return;
    }
  }
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 1.5);

  // --- Missions.
  const obj = currentObjective(world.mission);
  if (obj) {
    world.beacon.visible = obj.x !== 0 || obj.z !== 0 || world.mission.index === 0;
    world.beacon.position.set(obj.x, 0, obj.z);
    world.ring.rotation.z += dt * 1.5;
  } else {
    world.beacon.visible = false;
  }
  const ev = updateMission(world.mission, {
    dt, x: focus.x, z: focus.z,
    inCar: !!world.car, wanted: world.police.wanted,
  });
  if (ev.completed) {
    const m = MISSIONS[world.mission.index];
    world.cash += m.reward;
    world.stats.missions += 1;
    say(world, m.fixer, ev.message, 5);
    const next = nextMission(world.mission);
    if (next) startMission(world, world.mission.index);
    else {
      say(world, 'NADIA REYES', 'That is every job, kid. Solara is yours now. +$1000 bonus.', 7);
      world.cash += 1000;
    }
  }
  if (ev.failed) {
    say(world, 'NADIA REYES', ev.message, 5);
    // Retry the mission from its first step.
    world.mission.step = 0;
    world.mission.timer = 0;
    world.mission.punched = 0;
    world.mission.failed = false;
    setWanted(world.police, Math.max(0, world.police.wanted - 1));
  }

  // --- District banner + best cash.
  world.district = districtAt(focus.x, focus.z).name;
  if (world.cash > world.best) {
    world.best = world.cash;
    try { localStorage.setItem(BEST_KEY, String(world.best)); } catch { /* no storage */ }
  }
  if (world.dialogue && world.time > world.dialogue.until) world.dialogue = null;
  world.toasts = world.toasts.filter((t) => world.time < t.until);
}

export function saveGame(world) {
  try {
    const p = world.player;
    const data = {
      cash: world.cash, missionIndex: world.mission.index,
      health: p.health, x: p.x, z: p.z, heading: p.heading,
      inCar: !!world.car,
      carType: world.car ? world.car.type : null,
      carX: world.car ? world.car.x : 0, carZ: world.car ? world.car.z : 0,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function applySave(world, data) {
  const p = world.player;
  world.cash = data.cash || 0;
  world.mission.index = data.missionIndex || 0;
  world.mission.step = 0;
  world.mission.timer = 0;
  p.health = data.health ?? 100;
  p.x = data.x ?? 0; p.z = data.z ?? 20;
  p.heading = data.heading ?? 0;
  if (data.inCar && data.carType) {
    const car = createCar(data.carType, data.carX, data.carZ, p.heading);
    world.scene.add(car.mesh);
    world.car = car;
    p.mesh.visible = false;
  }
  const m = MISSIONS[world.mission.index];
  if (m) startMission(world, world.mission.index);
}

export function resetWorld(world) {
  clearPolice(world.police, world.scene);
  for (const r of world.rivals) world.scene.remove(r.mesh);
  world.rivals = [];
  world.mission = createMissionState();
  world.cash = 0;
  world.time = 0;
  world.toasts = [];
  world.dialogue = null;
  world.player.health = 100;
  world.player.x = 0; world.player.z = 20; world.player.heading = Math.PI;
  world.player.mesh.visible = true;
  if (world.car) { world.scene.remove(world.car.mesh); world.car = null; }
  startMission(world, 0);
}
