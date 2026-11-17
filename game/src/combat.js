// Combat: punches, knockback, car-vs-pedestrian hits and the damage they
// cause. Pure geometry checks — no physics engine.
import { PLAYER } from './config.js';

// Resolve a punch from the player against pedestrians and foot cops.
// Returns the number of hits landed.
export function resolvePunch(p, peds, cops, onHit) {
  const fx = Math.sin(p.heading);
  const fz = Math.cos(p.heading);
  let hits = 0;
  const hitOne = (x, z) => {
    const dx = x - p.x;
    const dz = z - p.z;
    const d = Math.hypot(dx, dz);
    if (d > PLAYER.punchRange + 0.6) return false;
    if (dx * fx + dz * fz < 0.2) return false; // must be roughly in front
    return true;
  };
  for (let i = peds.length - 1; i >= 0; i--) {
    const ped = peds[i];
    if (hitOne(ped.x, ped.z)) {
      ped.x += fx * 3; ped.z += fz * 3;
      hits += 1;
      if (onHit) onHit('ped', ped);
    }
  }
  for (const cop of cops) {
    if (hitOne(cop.x, cop.z)) {
      cop.x += fx * 2.5; cop.z += fz * 2.5;
      hits += 1;
      if (onHit) onHit('cop', cop);
    }
  }
  return hits;
}

// A fast car hitting a pedestrian knocks them down (they are removed).
// Returns how many were hit.
export function carHitsPeds(car, peds, scene, removePedestrian) {
  let hits = 0;
  if (Math.abs(car.speed) < 6) return 0;
  for (let i = peds.length - 1; i >= 0; i--) {
    const ped = peds[i];
    const d = Math.hypot(ped.x - car.x, ped.z - car.z);
    if (d < 2.4) {
      removePedestrian(scene, peds, i);
      hits += 1;
    }
  }
  return hits;
}

// A police ram damages the player's car and shakes the camera.
export function ramDamage(car, amount) {
  car.health = Math.max(0, car.health - amount);
  return car.health <= 0;
}
