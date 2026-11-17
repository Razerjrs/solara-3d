// The on-foot player: a simple low-poly person (capsule body, head, cap),
// walk/run movement, punching, and getting in and out of cars.
import * as THREE from 'three';
import { PLAYER } from './config.js';

function personMesh(shirt = 0x3a6ad9, skin = 0xc98a5e) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2a2e38, roughness: 0.9 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.95, 8), bodyMat);
  body.position.y = 1.05;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), skinMat);
  head.position.y = 1.85;
  head.castShadow = true;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.12, 10),
    new THREE.MeshStandardMaterial({ color: 0xd94040, roughness: 0.7 }));
  cap.position.y = 2.05;
  g.add(cap);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.62, 6), pantsMat);
    leg.position.set(s * 0.18, 0.31, 0);
    leg.castShadow = true;
    g.add(leg);
  }
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.7, 6), bodyMat);
  armL.position.set(-0.48, 1.15, 0);
  armL.castShadow = true;
  g.add(armL);
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.7, 6), bodyMat);
  armR.position.set(0.48, 1.15, 0);
  armR.castShadow = true;
  g.add(armR);
  g.userData = { armL, armR, body };
  return g;
}

export function createPlayer(x, z, heading = 0) {
  const mesh = personMesh();
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  return {
    mesh, x, z, heading,
    health: PLAYER.health,
    walkPhase: 0,
    punchTimer: 0,
    punchCooldown: 0,
  };
}

// Move on foot. Input is relative to the camera heading (camYaw).
export function updatePlayer(p, input, camYaw, dt) {
  const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  let mx = 0, mz = 0;
  if (input.up) { mx += Math.sin(camYaw); mz += Math.cos(camYaw); }
  if (input.down) { mx -= Math.sin(camYaw); mz -= Math.cos(camYaw); }
  if (input.left) { mx += Math.sin(camYaw - Math.PI / 2); mz += Math.cos(camYaw - Math.PI / 2); }
  if (input.right) { mx += Math.sin(camYaw + Math.PI / 2); mz += Math.cos(camYaw + Math.PI / 2); }
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    mx /= len; mz /= len;
    p.x += mx * speed * dt;
    p.z += mz * speed * dt;
    const target = Math.atan2(mx, mz);
    let d = target - p.heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    p.heading += d * Math.min(1, dt * 10);
    p.walkPhase += dt * speed * 1.6;
  }
  if (p.punchTimer > 0) p.punchTimer -= dt;
  if (p.punchCooldown > 0) p.punchCooldown -= dt;
  p.mesh.position.set(p.x, 0, p.z);
  p.mesh.rotation.y = p.heading;
  // Walk swing + punch swing on the arms.
  const swing = len > 0.01 ? Math.sin(p.walkPhase) * 0.5 : 0;
  const u = p.mesh.userData;
  u.armL.rotation.x = swing;
  u.armR.rotation.x = -swing;
  if (p.punchTimer > 0) {
    u.armR.rotation.x = -1.5;
    u.armR.position.z = 0.35;
  } else {
    u.armR.position.z = 0;
  }
}

export function tryPunch(p) {
  if (p.punchCooldown > 0) return false;
  p.punchTimer = 0.28;
  p.punchCooldown = 0.45;
  return true;
}

// Find the nearest car the player could steal (within 3.5 units).
export function nearestCar(p, cars) {
  let best = null;
  let bd = 3.5;
  for (const c of cars) {
    const d = Math.hypot(c.x - p.x, c.z - p.z);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

export { personMesh };
