// The wanted system: stars rise with crimes, police cars chase and ram,
// foot cops close in and arrest, and a helicopter joins at 3 stars.
// Heat fades after a quiet spell out of sight.
import * as THREE from 'three';
import { WANTED } from './config.js';
import { createCar } from './vehicles.js';
import { personMesh } from './player.js';
import { clampCity } from './city.js';

export function createPolice(scene) {
  return {
    wanted: 0,
    quietTime: 0,
    bustTimer: 0,
    cars: [],
    cops: [],
    heli: null,
    heliAngle: 0,
  };
}

export function addWanted(police, stars) {
  police.wanted = Math.min(WANTED.max, police.wanted + stars);
  police.quietTime = 0;
}

export function setWanted(police, stars) {
  police.wanted = Math.max(0, Math.min(WANTED.max, stars));
  police.quietTime = 0;
}

function spawnPoliceCar(scene, x, z) {
  const car = createCar('police', x, z, 0);
  car.speed = 0;
  car.sirenPhase = Math.random() * 2;
  scene.add(car.mesh);
  return car;
}

function spawnCop(scene, x, z) {
  const mesh = personMesh(0x1a2a4a, 0xc98a5e);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  return { mesh, x, z, heading: 0, speed: 5.2, phase: Math.random() * 6 };
}

function buildHeli(scene) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.4, metalness: 0.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.2, 1.6), bodyMat);
  body.castShadow = true;
  g.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 0.4), bodyMat);
  tail.position.set(0, 0.3, -2.8);
  g.add(tail);
  const rotorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.08, 0.4), rotorMat);
  rotor.position.y = 0.9;
  g.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.3), rotorMat);
  tailRotor.position.set(0.3, 0.4, -4.2);
  g.add(tailRotor);
  // Spotlight cone: wide and bright enough to read against the sunset sky.
  const spotMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const spot = new THREE.Mesh(new THREE.ConeGeometry(4.5, 18, 16, 1, true), spotMat);
  spot.position.y = -9;
  spot.rotation.x = Math.PI;
  g.add(spot);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2b0, emissiveIntensity: 2.5 }),
  );
  lamp.position.set(0, -0.7, 0.8);
  g.add(lamp);
  g.userData = { rotor, tailRotor };
  return g;
}

export function updatePolice(police, scene, target, dt, t) {
  const wanted = police.wanted;
  // Spawn pressure scales with the wanted level.
  const wantCars = wanted === 0 ? 0 : wanted <= 2 ? 2 : wanted <= 3 ? 3 : 4;
  while (police.cars.length < wantCars) {
    const a = Math.random() * Math.PI * 2;
    const c = clampCity(target.x + Math.sin(a) * 55, target.z + Math.cos(a) * 55);
    police.cars.push(spawnPoliceCar(scene, c.x, c.z));
  }
  while (police.cars.length > wantCars) {
    const car = police.cars.pop();
    scene.remove(car.mesh);
  }
  const wantCops = wanted >= 2 ? Math.min(wanted, 3) : 0;
  while (police.cops.length < wantCops) {
    const a = Math.random() * Math.PI * 2;
    police.cops.push(spawnCop(scene, target.x + Math.sin(a) * 22, target.z + Math.cos(a) * 22));
  }
  while (police.cops.length > wantCops) {
    const cop = police.cops.pop();
    scene.remove(cop.mesh);
  }
  // Helicopter at 3+ stars.
  if (wanted >= WANTED.heliAt && !police.heli) {
    police.heli = buildHeli(scene);
    scene.add(police.heli);
  } else if (wanted < WANTED.heliAt && police.heli) {
    scene.remove(police.heli);
    police.heli = null;
  }

  // Police cars chase: steer toward the target, ram on contact.
  let nearestCopDist = 1e9;
  for (const car of police.cars) {
    const dx = target.x - car.x;
    const dz = target.z - car.z;
    const d = Math.hypot(dx, dz);
    nearestCopDist = Math.min(nearestCopDist, d);
    const wantHeading = Math.atan2(dx, dz);
    let dh = wantHeading - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    car.heading += dh * Math.min(1, dt * 2.2);
    car.speed += (Math.min(WANTED.chaseSpeed, d * 0.9 + 10) - car.speed) * Math.min(1, dt * 1.6);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    car.sirenPhase += dt * 6;
    const on = Math.sin(car.sirenPhase) > 0;
    const bars = car.mesh.userData.sirens;
    if (bars) {
      bars[0].material.emissiveIntensity = on ? 2.4 : 0.3;
      bars[1].material.emissiveIntensity = on ? 0.3 : 2.4;
    }
    if (d < 3.4 && target.onRam) target.onRam(car);
  }

  // Foot cops close in; staying in range busts the player.
  for (const cop of police.cops) {
    const dx = target.x - cop.x;
    const dz = target.z - cop.z;
    const d = Math.hypot(dx, dz);
    nearestCopDist = Math.min(nearestCopDist, d);
    cop.heading = Math.atan2(dx, dz);
    const sp = d < 4 ? cop.speed * 0.4 : cop.speed;
    cop.x += Math.sin(cop.heading) * sp * dt;
    cop.z += Math.cos(cop.heading) * sp * dt;
    cop.phase += dt * sp * 2;
    cop.mesh.position.set(cop.x, 0, cop.z);
    cop.mesh.rotation.y = cop.heading;
    cop.mesh.userData.armL.rotation.x = Math.sin(cop.phase) * 0.5;
    cop.mesh.userData.armR.rotation.x = -Math.sin(cop.phase) * 0.5;
  }
  if (nearestCopDist < WANTED.arrestRange && !target.inCar) {
    police.bustTimer += dt;
  } else {
    police.bustTimer = Math.max(0, police.bustTimer - dt * 2);
  }

  // Helicopter circles overhead.
  if (police.heli) {
    police.heliAngle += dt * 0.35;
    police.heli.position.set(
      target.x + Math.sin(police.heliAngle) * 16,
      34 + Math.sin(t * 0.7) * 1.5,
      target.z + Math.cos(police.heliAngle) * 16,
    );
    police.heli.rotation.y = Math.atan2(target.x - police.heli.position.x, target.z - police.heli.position.z);
    police.heli.userData.rotor.rotation.y += dt * 22;
    police.heli.userData.tailRotor.rotation.x += dt * 30;
  }

  // Heat decays after a quiet spell.
  if (wanted > 0) {
    police.quietTime += dt;
    if (police.quietTime > WANTED.decaySeconds) {
      police.wanted -= 1;
      police.quietTime = 0;
    }
  }

  return { busted: police.bustTimer > WANTED.bustSeconds, nearestCopDist };
}

export function placePoliceCar(police, scene, x, z, heading) {
  const car = spawnPoliceCar(scene, x, z);
  car.heading = heading;
  car.mesh.rotation.y = heading;
  police.cars.push(car);
  return car;
}

export function placeHeli(police, scene, x, y, z) {
  if (police.heli) scene.remove(police.heli);
  police.heli = buildHeli(scene);
  police.heli.position.set(x, y, z);
  scene.add(police.heli);
  return police.heli;
}

export function clearPolice(police, scene) {
  for (const car of police.cars) scene.remove(car.mesh);
  for (const cop of police.cops) scene.remove(cop.mesh);
  if (police.heli) scene.remove(police.heli);
  police.cars = [];
  police.cops = [];
  police.heli = null;
  police.wanted = 0;
  police.bustTimer = 0;
}
