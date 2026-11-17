// Procedural low-poly cars from boxes, cylinders and shared materials, plus
// simple arcade driving physics (accelerate, steer, handbrake drift).
import * as THREE from 'three';
import { VEHICLES } from './config.js';

const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
const cabinGeo = new THREE.BoxGeometry(1, 1, 1);
const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
const lightGeo = new THREE.BoxGeometry(0.34, 0.18, 0.1);
const matCache = new Map();

function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55, ...opts }));
  }
  return matCache.get(key);
}

const tireMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.95 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x18222e, roughness: 0.15, metalness: 0.8 });
const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 1.8 });
const tailMat = new THREE.MeshStandardMaterial({ color: 0x881111, emissive: 0xff2211, emissiveIntensity: 1.2 });
const sirenRed = new THREE.MeshStandardMaterial({ color: 0xaa1111, emissive: 0xff1111, emissiveIntensity: 2.4 });
const sirenBlue = new THREE.MeshStandardMaterial({ color: 0x1111aa, emissive: 0x2244ff, emissiveIntensity: 2.4 });

// Build one car mesh. Returns a Group whose forward is +X when heading is 0
// (we rotate the group by heading around Y; forward = (sin h, 0, cos h)).
// The mesh is built facing +Z in local space to match heading math below.
export function buildCarMesh(type) {
  const spec = VEHICLES[type];
  const g = new THREE.Group();
  g.name = 'car-' + type;
  const L = spec.len, W = spec.wid;

  const body = new THREE.Mesh(bodyGeo, mat(spec.color));
  body.scale.set(W, 0.62, L);
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);

  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.scale.set(W * 0.82, 0.55, L * 0.42);
  cabin.position.set(0, 1.1, -L * 0.06);
  cabin.castShadow = true;
  g.add(cabin);

  if (type === 'truck') {
    const bed = new THREE.Mesh(bodyGeo, mat(0x8a6a3a));
    bed.scale.set(W * 0.9, 0.5, L * 0.4);
    bed.position.set(0, 1.05, L * 0.22);
    bed.castShadow = true;
    g.add(bed);
  }
  if (type === 'taxi') {
    const sign = new THREE.Mesh(bodyGeo, mat(0x222222));
    sign.scale.set(0.7, 0.22, 0.5);
    sign.position.set(0, 1.5, -L * 0.06);
    g.add(sign);
    const signTop = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0xffd060, emissiveIntensity: 1.4 }));
    signTop.scale.set(0.74, 0.08, 0.54);
    signTop.position.set(0, 1.62, -L * 0.06);
    g.add(signTop);
  }

  // Headlights (front = +Z) and taillights.
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(lightGeo, headMat);
    hl.position.set(s * W * 0.32, 0.62, L / 2 + 0.02);
    g.add(hl);
    const tl = new THREE.Mesh(lightGeo, tailMat);
    tl.position.set(s * W * 0.32, 0.62, -L / 2 - 0.02);
    g.add(tl);
  }

  // Wheels.
  const wheels = [];
  for (const [wx, wz] of [[-W / 2, L * 0.32], [W / 2, L * 0.32], [-W / 2, -L * 0.32], [W / 2, -L * 0.32]]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    w.castShadow = true;
    g.add(w);
    wheels.push(w);
  }

  let sirens = null;
  if (type === 'police') {
    sirens = [];
    for (const [s, m] of [[-1, sirenRed], [1, sirenBlue]]) {
      const bar = new THREE.Mesh(bodyGeo, m);
      bar.scale.set(0.4, 0.18, 0.3);
      bar.position.set(s * 0.28, 1.42, -L * 0.06);
      g.add(bar);
      sirens.push(bar);
    }
    const stripe = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
    stripe.scale.set(W * 1.01, 0.14, L * 0.98);
    stripe.position.y = 0.72;
    g.add(stripe);
  }

  g.userData = { wheels, sirens, spec, type };
  return g;
}

// Arcade car state: position, heading, speed; update with input + dt.
export function createCar(type, x, z, heading = 0) {
  const spec = VEHICLES[type];
  const mesh = buildCarMesh(type);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  return {
    type, spec, mesh,
    x, z, heading,
    speed: 0,           // signed, units/second along forward
    steer: 0,           // smoothed steering angle
    health: 100,
    smoke: 0,
  };
}

export function updateCar(car, input, dt) {
  const spec = car.spec;
  const throttle = input.up ? 1 : input.down ? -0.6 : 0;
  const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  car.steer += (steerTarget * 0.55 - car.steer) * Math.min(1, dt * 8);

  const grip = input.handbrake ? spec.grip * 0.45 : spec.grip;
  const dir = car.speed >= 0 ? 1 : -1;
  car.heading += car.steer * grip * dir * Math.min(Math.abs(car.speed) / 8, 1) * dt * 0.9;
  if (input.handbrake) car.heading += car.steer * 0.9 * dt * dir;

  if (throttle > 0) car.speed += spec.accel * dt;
  else if (throttle < 0) car.speed += spec.accel * 0.7 * throttle * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 9 * dt);
  if (input.handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 16 * dt);
  car.speed = Math.max(-spec.top * 0.45, Math.min(spec.top, car.speed));

  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  // Front wheels steer visually.
  const w = car.mesh.userData.wheels;
  w[0].rotation.y = car.steer * 0.5;
  w[1].rotation.y = car.steer * 0.5;
  // Body lean.
  car.mesh.rotation.z = -car.steer * Math.min(Math.abs(car.speed) / spec.top, 1) * 0.06;
}

export function carSpeedKmh(car) {
  return Math.abs(car.speed) * 3.6;
}

// Simple circle collision between two cars (swaps a little speed on hit).
export function collideCars(a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const d = Math.hypot(dx, dz);
  const min = 2.6;
  if (d > 0.01 && d < min) {
    const push = (min - d) / 2;
    const nx = dx / d, nz = dz / d;
    a.x -= nx * push; a.z -= nz * push;
    b.x += nx * push; b.z += nz * push;
    const s = a.speed;
    a.speed = b.speed * 0.6;
    b.speed = s * 0.6;
    a.health -= 2; b.health -= 2;
    return true;
  }
  return false;
}
