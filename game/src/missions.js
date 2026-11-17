// Six story missions for the fixer Nadia Reyes. Each mission is a list of
// steps: go somewhere, pick something up, deliver it, lose the heat —
// with dialogue, a timer where it matters, and a cash reward.
import { DISTRICTS } from './config.js';

// Mission definitions: name, briefing, reward, and steps.
// Step kinds: 'goto' (reach a point), 'steal' (enter any car), 'pickup'
// (reach a point on foot or in a car), 'deliver' (reach a point in a car),
// 'lose' (drop wanted to 0), 'punch' (knock down N rivals).
export const MISSIONS = [
  {
    name: 'First Wheels',
    fixer: 'NADIA REYES',
    brief: 'You need wheels in this city, kid. Take a car — any car — and bring it to my garage in Central.',
    reward: 300,
    steps: [
      { kind: 'steal', text: 'Steal a car', x: 0, z: 0 },
      { kind: 'deliver', text: 'Drive to the garage', x: 0, z: 0, timer: 90 },
    ],
  },
  {
    name: 'Courier Run',
    fixer: 'NADIA REYES',
    brief: 'Package picked up — deliver it to the Beachfront. Fast. The boys in blue are bored tonight.',
    reward: 500,
    steps: [
      { kind: 'pickup', text: 'Pick up the package', x: -28, z: -28, timer: 60 },
      { kind: 'deliver', text: 'Deliver the package to the Beachfront', x: 28, z: 112, timer: 75 },
    ],
  },
  {
    name: 'The Getaway',
    fixer: 'NADIA REYES',
    brief: 'The heat is on you now. Lose them — break line of sight, stay quiet, then meet me at the Marina.',
    reward: 800,
    steps: [
      { kind: 'lose', text: 'Lose the police', x: 0, z: 0 },
      { kind: 'goto', text: 'Meet Nadia at the Marina', x: 84, z: -84 },
    ],
  },
  {
    name: 'Turf Sweep',
    fixer: 'NADIA REYES',
    brief: 'Rivals are running their mouths in the plaza. Show them whose streets these are. Fists only.',
    reward: 900,
    steps: [
      { kind: 'punch', text: 'Knock down the rivals (0/3)', x: 0, z: 0, count: 3 },
      { kind: 'goto', text: 'Get back to the garage', x: 0, z: 0 },
    ],
  },
  {
    name: 'Hot Cargo',
    fixer: 'NADIA REYES',
    brief: 'Drive the truck to the Harbor warehouse. The port police will notice. They always do.',
    reward: 1500,
    steps: [
      { kind: 'deliver', text: 'Drive the truck to the Harbor warehouse', x: 84, z: 0, timer: 120, truck: true },
    ],
  },
  {
    name: 'The Big Score',
    fixer: 'NADIA REYES',
    brief: 'One last job. Grab the case in Old Town, then get it to my garage. No mistakes. This is the big one.',
    reward: 5000,
    steps: [
      { kind: 'pickup', text: 'Grab the case in Old Town', x: -112, z: -112, timer: 90 },
      { kind: 'deliver', text: 'Deliver the case to the garage', x: 0, z: 0, timer: 120 },
    ],
  },
];

export function createMissionState() {
  return { index: 0, step: 0, timer: 0, punched: 0, done: false, failed: false };
}

// Advance the current mission step. ctx carries the live game facts.
// Returns events: { completed, failed, stepDone, message }.
export function updateMission(ms, ctx) {
  const mission = MISSIONS[ms.index];
  if (!mission || ms.done) return {};
  const step = mission.steps[ms.step];
  if (!step) return {};
  const ev = {};

  if (step.timer !== undefined && ms.timer === 0 && !step.timerStarted) {
    ms.timer = step.timer;
    step.timerStarted = true;
  }
  if (ms.timer > 0) {
    ms.timer -= ctx.dt;
    if (ms.timer <= 0) {
      ms.failed = true;
      ev.failed = true;
      ev.message = 'Too slow — the job fell through.';
      return ev;
    }
  }

  const dist = (x, z) => Math.hypot(ctx.x - x, ctx.z - z);
  const advance = () => {
    ms.step += 1;
    ms.timer = 0;
    ev.stepDone = true;
    if (ms.step >= mission.steps.length) {
      ms.done = true;
      ev.completed = true;
      ev.message = `${mission.name} complete — $${mission.reward}`;
    }
  };

  switch (step.kind) {
    case 'steal':
      if (ctx.inCar) advance();
      break;
    case 'goto':
    case 'pickup':
    case 'deliver':
      if (dist(step.x, step.z) < (step.kind === 'deliver' ? 7 : 5)) advance();
      break;
    case 'lose':
      if (ctx.wanted === 0) advance();
      break;
    case 'punch':
      if (ms.punched >= step.count) advance();
      break;
    default:
      break;
  }
  return ev;
}

export function currentObjective(ms) {
  const mission = MISSIONS[ms.index];
  if (!mission) return null;
  if (ms.done) return { text: 'All jobs done — Solara is yours', x: 0, z: 0 };
  const step = mission.steps[ms.step];
  if (!step) return null;
  let text = step.text;
  if (step.kind === 'punch') text = `Knock down the rivals (${ms.punched}/${step.count})`;
  return { text, x: step.x, z: step.z, mission: mission.name, timer: ms.timer > 0 ? Math.ceil(ms.timer) : 0 };
}

export function nextMission(ms) {
  ms.index += 1;
  ms.step = 0;
  ms.timer = 0;
  ms.punched = 0;
  ms.done = false;
  ms.failed = false;
  const m = MISSIONS[ms.index];
  if (m) {
    for (const s of m.steps) s.timerStarted = false;
  }
  return m || null;
}

export function districtName(x, z) {
  for (const d of DISTRICTS) if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d.name;
  return 'Beachfront';
}
