// Traffic cars that follow the road grid (and stop at red lights) and
// pedestrians who walk the sidewalks and flee from danger.
import * as THREE from 'three';
import { STREET_LINES, nearestStreet, clampCity } from './city.js';
import { createCar, updateCar, collideCars } from './vehicles.js';
import { personMesh } from './player.js';
import { pick, range, int } from './random.js';

const CAR_TYPES = ['sedan', 'sedan', 'taxi', 'van', 'sports'];

// A traffic car drives along one street axis, turns at intersections, and
// stops for red lights and for the car ahead.
export function createTraffic(scene, rng, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const axis = rng() < 0.5 ? 'x' : 'z';
    const line = pick(rng, STREET_LINES);
    const along = range(rng, -120, 120);
    const dir = rng() < 0.5 ? 1 : -1;
    const type = pick(rng, CAR_TYPES);
    const x = axis === 'x' ? along : line + (dir > 0 ? 2.8 : -2.8);
    const z = axis === 'z' ? along : line + (dir > 0 ? -2.8 : 2.8);
    const heading = axis === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    const car = createCar(type, x, z, heading);
    car.speed = range(rng, 8, 14);
    car.axis = axis;
    car.dir = dir;
    car.cruise = car.speed;
    scene.add(car.mesh);
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, lightStateAt, dt, playerPos) {
  for (const car of cars) {
    // Stop for a red light ahead (within 8 units of the next intersection).
    const ahead = car.speed * 1.2;
    const nx = car.x + Math.sin(car.heading) * ahead;
    const nz = car.z + Math.cos(car.heading) * ahead;
    const nearX = nearestStreet(nx);
    const nearZ = nearestStreet(nz);
    const atX = Math.abs(nx - nearX) < 5 && Math.abs(car.z - nearZ) > 4;
    const atZ = Math.abs(nz - nearZ) < 5 && Math.abs(car.x - nearX) > 4;
    let stop = false;
    if (atX || atZ) {
      const lx = atX ? nearX : car.x;
      const lz = atZ ? nearZ : car.z;
      if (lightStateAt(lx, lz) === 0) stop = true;
    }
    // Stop for the player in front.
    if (playerPos) {
      const dx = playerPos.x - car.x;
      const dz = playerPos.z - car.z;
      const d = Math.hypot(dx, dz);
      if (d < 7 && dx * Math.sin(car.heading) + dz * Math.cos(car.heading) > 0) stop = true;
    }
    const target = stop ? 0 : car.cruise;
    car.speed += (target - car.speed) * Math.min(1, dt * 2.5);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    // Turn at an intersection sometimes, staying on the grid.
    const onXLine = Math.abs(car.x - nearestStreet(car.x)) < 1.2;
    const onZLine = Math.abs(car.z - nearestStreet(car.z)) < 1.2;
    if (onXLine && onZLine && Math.random() < dt * 0.25) {
      car.heading += (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
      car.axis = car.axis === 'x' ? 'z' : 'x';
    }
    const c = clampCity(car.x, car.z);
    if (c.x !== car.x || c.z !== car.z) {
      car.heading += Math.PI;
      car.x = c.x; car.z = c.z;
    }
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
  }
  // Gentle separation between traffic cars.
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) collideCars(cars[i], cars[j]);
  }
}

// Pedestrians: walk along sidewalks, flee when danger is near.
export function createPedestrians(scene, rng, count) {
  const peds = [];
  const shirts = [0xd94040, 0x40a0d9, 0x6abf69, 0xe8b13c, 0x9b59d0, 0xd97a40];
  for (let i = 0; i < count; i++) {
    const axis = rng() < 0.5 ? 'x' : 'z';
    const line = pick(rng, STREET_LINES);
    const along = range(rng, -120, 120);
    const side = rng() < 0.5 ? 8 : -8;
    const x = axis === 'x' ? along : line + side;
    const z = axis === 'z' ? along : line + side;
    const mesh = personMesh(pick(rng, shirts));
    mesh.scale.setScalar(0.95);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    peds.push({
      mesh, x, z,
      heading: rng() * Math.PI * 2,
      speed: range(rng, 1.2, 2.2),
      flee: 0,
      phase: rng() * 6,
    });
  }
  return peds;
}

export function updatePedestrians(peds, danger, dt) {
  for (const p of peds) {
    const dx = p.x - danger.x;
    const dz = p.z - danger.z;
    const d = Math.hypot(dx, dz);
    if (danger.level > 0 && d < 14) {
      p.flee = 2;
      p.heading = Math.atan2(dx, dz);
    } else if (p.flee > 0) {
      p.flee -= dt;
    }
    const speed = p.flee > 0 ? 5.5 : p.speed;
    p.x += Math.sin(p.heading) * speed * dt;
    p.z += Math.cos(p.heading) * speed * dt;
    // Stay on sidewalks: snap back toward the nearest street line + 8.
    if (Math.abs(p.x - nearestStreet(p.x)) > 10 && Math.abs(p.z - nearestStreet(p.z)) > 10) {
      p.heading += Math.PI * 0.75 * dt * 4;
    }
    const c = clampCity(p.x, p.z);
    if (c.x !== p.x || c.z !== p.z) { p.heading += Math.PI; p.x = c.x; p.z = c.z; }
    p.phase += dt * speed * 2;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
    const swing = Math.sin(p.phase) * 0.45;
    p.mesh.userData.armL.rotation.x = swing;
    p.mesh.userData.armR.rotation.x = -swing;
  }
}

// Remove a pedestrian mesh from the scene (knocked down by a car).
export function removePedestrian(scene, peds, index) {
  const p = peds[index];
  if (!p) return;
  scene.remove(p.mesh);
  peds.splice(index, 1);
}
