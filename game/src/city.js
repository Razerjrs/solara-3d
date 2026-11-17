// SOLARA city: a 5x5 block grid with roads, buildings, palms, beach and
// ocean, built from shared low-poly geometry. All positions derive from the
// seeded RNG so the same seed builds the same city.
import * as THREE from 'three';
import { WORLD, DISTRICTS } from './config.js';
import { pick, range, int } from './random.js';

const PITCH = WORLD.block + WORLD.street; // 56
const HALF = (WORLD.blocks * PITCH + WORLD.street) / 2; // 146

// Street centerlines (both axes): -140, -84, -28, 28, 84, 140
export const STREET_LINES = [];
for (let i = 0; i <= WORLD.blocks; i++) STREET_LINES.push(-HALF + 6 + i * PITCH);
const BLOCK_CENTERS = [];
for (let i = 0; i < WORLD.blocks; i++) BLOCK_CENTERS.push(-HALF + 6 + WORLD.street + WORLD.block / 2 + i * PITCH);

export function districtAt(x, z) {
  for (const d of DISTRICTS) if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  return DISTRICTS[DISTRICTS.length - 1];
}

export function nearestStreet(v) {
  let best = STREET_LINES[0];
  for (const s of STREET_LINES) if (Math.abs(v - s) < Math.abs(v - best)) best = s;
  return best;
}

export function onRoad(x, z) {
  const dx = Math.abs(x - nearestStreet(x));
  const dz = Math.abs(z - nearestStreet(z));
  return dx < WORLD.street / 2 + 0.5 || dz < WORLD.street / 2 + 0.5;
}

export function clampCity(x, z) {
  return {
    x: Math.max(-HALF + 2, Math.min(HALF - 2, x)),
    z: Math.max(-HALF + 2, Math.min(WORLD.beachZ + 16, z)),
  };
}

function roadTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const g = c.getContext('2d');
  const scale = 1024 / (HALF * 2 + 40);
  const toPx = (v) => (v + HALF + 20) * scale;
  g.fillStyle = '#3a3d46'; g.fillRect(0, 0, 1024, 1024); // asphalt base
  // sidewalks around every block
  g.fillStyle = '#6a6d75';
  for (const bx of BLOCK_CENTERS) for (const bz of BLOCK_CENTERS) {
    g.fillRect(toPx(bx - WORLD.block / 2 - 2), toPx(bz - WORLD.block / 2 - 2),
      (WORLD.block + 4) * scale, (WORLD.block + 4) * scale);
  }
  // block interiors (grass / plaza)
  g.fillStyle = '#557a4a';
  for (const bx of BLOCK_CENTERS) for (const bz of BLOCK_CENTERS) {
    g.fillRect(toPx(bx - WORLD.block / 2 + 1), toPx(bz - WORLD.block / 2 + 1),
      (WORLD.block - 2) * scale, (WORLD.block - 2) * scale);
  }
  // sand + water at the south edge
  g.fillStyle = '#d9b06a';
  g.fillRect(0, toPx(WORLD.beachZ), 1024, (WORLD.waterZ - WORLD.beachZ) * scale);
  g.fillStyle = '#2a6a9a';
  g.fillRect(0, toPx(WORLD.waterZ), 1024, 1024 - toPx(WORLD.waterZ));
  // dashed centre lines on every street
  g.fillStyle = '#e8c33c';
  for (const s of STREET_LINES) {
    for (let v = -HALF; v < HALF; v += 8) {
      g.fillRect(toPx(v), toPx(s) - 1.5, 4 * scale, 3);
      g.fillRect(toPx(s) - 1.5, toPx(v), 3, 4 * scale);
    }
  }
  // crosswalks at every intersection
  g.fillStyle = '#d8d8d0';
  for (const sx of STREET_LINES) for (const sz of STREET_LINES) {
    for (let k = -2; k <= 2; k++) {
      g.fillRect(toPx(sx + k * 2.2) - 2, toPx(sz - 5), 4, 10);
      g.fillRect(toPx(sx - 5), toPx(sz + k * 2.2) - 2, 10, 4);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function windowTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#20242e'; g.fillRect(0, 0, 128, 256);
  for (let y = 8; y < 248; y += 16) {
    for (let x = 8; x < 120; x += 16) {
      const lit = Math.random() < 0.55;
      g.fillStyle = lit ? (Math.random() < 0.5 ? '#ffca7a' : '#ffd9a0') : '#12151d';
      g.fillRect(x, y, 10, 11);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function billboardTexture(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 96);
  g.fillStyle = fg;
  g.font = 'bold 44px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCity(scene, rng) {
  const group = new THREE.Group();
  group.name = 'city';
  scene.add(group);

  const size = HALF * 2 + 40;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 0.95, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 10);
  ground.receiveShadow = true;
  group.add(ground);

  // Ocean: a segmented plane whose vertices roll in the render loop.
  const oceanGeo = new THREE.PlaneGeometry(420, 90, 48, 12);
  const ocean = new THREE.Mesh(oceanGeo, new THREE.MeshStandardMaterial({
    color: 0x2f7fb5, roughness: 0.15, metalness: 0.3,
    transparent: true, opacity: 0.94,
  }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0.4, WORLD.waterZ + 45);
  group.add(ocean);
  const oceanBase = oceanGeo.attributes.position.array.slice();

  // Buildings: shared box geometry, a few tinted window materials.
  const winTex = windowTexture();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const tints = [0x9a8a7a, 0x7a8a9a, 0xb09a6a, 0x8a7a9a, 0x6a7a8a, 0xa08a80];
  const mats = tints.map((t) => new THREE.MeshStandardMaterial({
    map: winTex, emissiveMap: winTex, emissive: 0xffb060, emissiveIntensity: 0.55,
    color: t, roughness: 0.85, metalness: 0.05,
  }));
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 1 });
  const buildings = [];
  for (const bx of BLOCK_CENTERS) {
    for (const bz of BLOCK_CENTERS) {
      const d = districtAt(bx, bz);
      const tall = d.name === 'Downtown';
      const n = tall ? int(rng, 3, 4) : int(rng, 1, 3);
      for (let i = 0; i < n; i++) {
        const w = range(rng, 10, 16);
        const dep = range(rng, 10, 16);
        const h = tall ? range(rng, 18, 38) : range(rng, 6, 18);
        const ox = (i % 2 === 0 ? -1 : 1) * range(rng, 6, 11);
        const oz = (i < 2 ? -1 : 1) * range(rng, 6, 11);
        const m = new THREE.Mesh(boxGeo, pick(rng, mats));
        m.scale.set(w, h, dep);
        m.position.set(bx + ox, h / 2, bz + oz);
        m.castShadow = true;
        m.receiveShadow = true;
        group.add(m);
        const roof = new THREE.Mesh(boxGeo, roofMat);
        roof.scale.set(w * 0.9, 0.6, dep * 0.9);
        roof.position.set(bx + ox, h + 0.3, bz + oz);
        group.add(roof);
        buildings.push({ x: bx + ox, z: bz + oz, w, d: dep, h });
      }
    }
  }

  // Palms along the beach and a few downtown corners.
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 5, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 });
  const frondGeo = new THREE.ConeGeometry(1.6, 3.4, 4);
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x3d7a3a, roughness: 0.9 });
  const frondMat2 = new THREE.MeshStandardMaterial({ color: 0x4a8a42, roughness: 0.9 });
  const palms = [];
  for (let x = -130; x <= 130; x += 13) {
    if (rng() < 0.75) palms.push({ x: x + range(rng, -2, 2), z: WORLD.beachZ + 6 + range(rng, -2, 4) });
  }
  for (const [px, pz] of [[-28, -28], [28, 28], [-84, 84], [84, -84], [-28, 84]]) {
    palms.push({ x: px + 8, z: pz + 8 });
  }
  for (const p of palms) {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2.5;
    trunk.rotation.z = range(rng, -0.08, 0.08);
    trunk.castShadow = true;
    palm.add(trunk);
    for (let k = 0; k < 5; k++) {
      const f = new THREE.Mesh(frondGeo, k % 2 ? frondMat : frondMat2);
      f.position.y = 5.1;
      f.rotation.z = Math.PI / 2.6;
      f.rotation.y = (k / 5) * Math.PI * 2;
      f.castShadow = true;
      palm.add(f);
    }
    palm.position.set(p.x, 0, p.z);
    group.add(palm);
  }

  // Streetlights along the main avenues (emissive heads, no extra lights).
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.12, 6, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2e3138, roughness: 0.6, metalness: 0.6 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffc060, emissiveIntensity: 1.6 });
  const lampGeo = new THREE.SphereGeometry(0.35, 8, 6);
  for (const s of STREET_LINES) {
    for (let v = -112; v <= 112; v += 56) {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(s + 7, 3, v);
      group.add(pole);
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(s + 7, 6.1, v);
      group.add(lamp);
    }
  }

  // Traffic lights at the four central intersections.
  const tlGroup = new THREE.Group();
  const tlPoleMat = new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.7 });
  const tlBoxMat = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.5 });
  const lightMats = {
    red: new THREE.MeshStandardMaterial({ color: 0x881111, emissive: 0xff2211, emissiveIntensity: 1.4 }),
    amber: new THREE.MeshStandardMaterial({ color: 0x885511, emissive: 0xffaa11, emissiveIntensity: 1.2 }),
    green: new THREE.MeshStandardMaterial({ color: 0x118844, emissive: 0x22ff66, emissiveIntensity: 1.2 }),
    off: new THREE.MeshStandardMaterial({ color: 0x1a1a1a }),
  };
  const trafficLights = [];
  for (const sx of [-28, 28]) {
    for (const sz of [-28, 28]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 5.4, 6), tlPoleMat);
      pole.position.set(sx + 6.5, 2.7, sz + 6.5);
      tlGroup.add(pole);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.9, 0.7), tlBoxMat);
      box.position.set(sx + 6.5, 5.2, sz + 6.5);
      tlGroup.add(box);
      const lamps = [];
      for (let k = 0; k < 3; k++) {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), lightMats.off);
        lamp.position.set(sx + 6.5, 5.8 - k * 0.6, sz + 6.5 + 0.4);
        tlGroup.add(lamp);
        lamps.push(lamp);
      }
      trafficLights.push({ x: sx, z: sz, lamps, phase: (sx + sz) % 2 === 0 ? 0 : 4 });
    }
  }
  group.add(tlGroup);

  // Two billboards with original names.
  const boards = [
    { text: 'SOLARA', bg: '#1a2a4a', fg: '#ffd9a0', x: -28, z: -92, ry: 0 },
    { text: 'CORAL COLA', bg: '#7a1a2a', fg: '#ffe0e0', x: 84, z: 92, ry: Math.PI },
  ];
  for (const b of boards) {
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 5.2),
      new THREE.MeshStandardMaterial({ map: billboardTexture(b.text, b.bg, b.fg), roughness: 0.7 }),
    );
    board.position.set(b.x, 9, b.z);
    board.rotation.y = b.ry;
    group.add(board);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 6.5, 6), tlPoleMat);
    post.position.set(b.x, 3.2, b.z);
    group.add(post);
  }

  function update(dt, t) {
    // Ocean swell.
    const pos = oceanGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const bx = oceanBase[i * 3];
      const by = oceanBase[i * 3 + 1];
      pos.array[i * 3 + 2] = Math.sin(bx * 0.12 + t * 0.9) * 0.55 + Math.cos(by * 0.2 + t * 0.6) * 0.4;
    }
    pos.needsUpdate = true;
    oceanGeo.computeVertexNormals();
    // Traffic light cycle: 6s green, 1.5s amber, 6s red.
    for (const tl of trafficLights) {
      tl.phase = (tl.phase + dt) % 13.5;
      const state = tl.phase < 6 ? 2 : tl.phase < 7.5 ? 1 : 0; // 2 green, 1 amber, 0 red
      tl.lamps[0].material = state === 0 ? lightMats.red : lightMats.off;
      tl.lamps[1].material = state === 1 ? lightMats.amber : lightMats.off;
      tl.lamps[2].material = state === 2 ? lightMats.green : lightMats.off;
      tl.state = state;
    }
  }

  function lightStateAt(x, z) {
    let best = null;
    let bd = 1e9;
    for (const tl of trafficLights) {
      const d = Math.hypot(tl.x - x, tl.z - z);
      if (d < bd) { bd = d; best = tl; }
    }
    if (bd > 24) return 2; // far from any light: green
    return best.state ?? 2;
  }

  return { group, buildings, trafficLights, update, lightStateAt, ocean };
}
