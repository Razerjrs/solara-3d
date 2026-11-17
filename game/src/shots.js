// Deterministic staged screenshot scenes (?shot=cover|onfoot|driving|mission
// with &seed=N). Everything is placed explicitly — no simulation steps run,
// so the same seed always renders the same frame.
import { createCar } from './vehicles.js';
import { setWanted, placePoliceCar, placeHeli } from './police.js';
import { say, toast } from './state.js';

function putPlayerInCar(world, type, x, z, heading, speed) {
  const i = world.parked.findIndex((c) => c.type === type);
  let car;
  if (i >= 0) {
    car = world.parked.splice(i, 1)[0];
  } else {
    car = createCar(type, x, z, heading);
    world.scene.add(car.mesh);
  }
  car.x = x; car.z = z; car.heading = heading; car.speed = speed;
  car.mesh.position.set(x, 0, z);
  car.mesh.rotation.y = heading;
  world.car = car;
  world.player.mesh.visible = false;
  world.player.x = x; world.player.z = z; world.player.heading = heading;
  return car;
}

function setMission(world, index, step, timer) {
  world.mission.index = index;
  world.mission.step = step;
  world.mission.timer = timer || 0;
  world.mission.punched = 0;
  world.mission.done = false;
  world.mission.failed = false;
}

export function stageShot(world, name) {
  const p = world.player;
  // Clear any police from world creation, then stage exactly what the shot needs.
  for (const c of world.police.cars) world.scene.remove(c.mesh);
  for (const c of world.police.cops) world.scene.remove(c.mesh);
  if (world.police.heli) world.scene.remove(world.police.heli);
  world.police.cars = [];
  world.police.cops = [];
  world.police.heli = null;
  setWanted(world.police, 0);

  if (name === 'cover') {
    // Sunset police chase on the beachfront road: 3 stars, two interceptors
    // ahead of the player inside the chase camera's view cone, helicopter
    // low overhead, courier mission live. Chase cam looks along the road,
    // so the beach, the ocean and the low sun are all in frame.
    // The car runs the road's south edge (z 147, close to the water) so the
    // beach palms (z <= 142) sit at the frame's right edge instead of dead
    // centre, and the camera rides high (camLift 3.4) to look over them.
    // The helicopter hangs low over the road centreline (y 7) and close
    // enough (x −16) to read as a helicopter, not a smudge, with its
    // searchlight cone visible against the sky.
    putPlayerInCar(world, 'sports', 0, 147, -Math.PI / 2, 22);
    setWanted(world.police, 3);
    placePoliceCar(world.police, world.scene, -16, 145, -Math.PI / 2);
    placePoliceCar(world.police, world.scene, -22, 147.5, Math.PI / 2);
    placeHeli(world.police, world.scene, -16, 7, 145);
    setMission(world, 1, 1, 58);
    say(world, 'NADIA REYES', 'Package picked up — deliver it to the Beachfront. Fast.', 99);
    toast(world, 'New mission: Courier Run');
    return { focus: { x: 0, z: 147 }, heading: -Math.PI / 2, driving: true, camLift: 3.4, lookY: 1.1 };
  }

  if (name === 'onfoot') {
    // On foot in Downtown at sunset, traffic and pedestrians around.
    p.x = -28; p.z = -20; p.heading = Math.PI / 4;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
    p.mesh.visible = true;
    world.car = null;
    setMission(world, 0, 0, 0);
    say(world, 'NADIA REYES', 'First Wheels — $300', 99);
    toast(world, 'New mission: First Wheels');
    return { focus: { x: p.x, z: p.z }, heading: p.heading, driving: false };
  }

  if (name === 'driving') {
    // Fast drive north through the city at sunset, traffic around.
    putPlayerInCar(world, 'sports', -28, 60, Math.PI, 26);
    setMission(world, 0, 1, 0);
    say(world, 'NADIA REYES', 'First Wheels — $300', 99);
    return { focus: { x: -28, z: 60 }, heading: Math.PI, driving: true, lookY: 0.7 };
  }

  if (name === 'mission') {
    // Hot Cargo: the yellow truck with two interceptors ahead of it in the
    // chase camera's view cone, 3 stars. The camera rides a little high
    // (camLift 2) so no near traffic car intrudes at the bottom edge.
    putPlayerInCar(world, 'truck', 28, -28, 0, 18);
    setWanted(world.police, 3);
    placePoliceCar(world.police, world.scene, 28, -10, 0);
    placePoliceCar(world.police, world.scene, 24.5, -16, 0);
    setMission(world, 4, 0, 96);
    say(world, 'NADIA REYES', 'Drive it to the Harbor warehouse. The port police will notice. They always do.', 99);
    toast(world, 'New mission: Hot Cargo');
    return { focus: { x: 28, z: -28 }, heading: 0, driving: true, lookY: 0.7, camLift: 2.0 };
  }

  // Fallback: the title view.
  return { focus: { x: 0, z: 20 }, heading: Math.PI, driving: false };
}

export const SHOT_NAMES = ['cover', 'onfoot', 'driving', 'mission'];
