// SOLARA boot and game loop: screens (title / play / paused / game over),
// fixed 1/60 s simulation steps, the chase camera, HUD, minimap, sound,
// save/load, and the deterministic ?shot= staging mode for screenshots.
import * as THREE from 'three';
import { createRenderer, createScene, createCamera, createCameraRig, resize } from './render.js';
import { createWorld, stepWorld, saveGame, loadSave, applySave, resetWorld, toast, say } from './state.js';
import { createInput } from './input.js';
import { createHud, updateHud, hudCss } from './hud.js';
import { createMinimap } from './minimap.js';
import { createAudio } from './audio.js';
import { currentObjective, MISSIONS } from './missions.js';
import { stageShot } from './shots.js';
import { createRandom } from './random.js';
import { SUNSET } from './config.js';

const STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1337;

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const { scene, sun } = createScene();
const camera = createCamera();
const rig = createCameraRig(camera);
const rng = createRandom(seed);
const world = createWorld(scene, rng, seed);
const input = createInput();
// Debug handle for scripted play-tests (drive, save/load): read-only probe
// of the live world; the game never reads it back.
window.__solara = { world, input };
const audio = createAudio();

const style = document.createElement('style');
style.textContent = hudCss();
document.head.appendChild(style);

const hudRoot = document.createElement('div');
hudRoot.id = 'hud';
document.body.appendChild(hudRoot);
const hud = createHud(hudRoot);
const mmCanvas = document.createElement('canvas');
mmCanvas.id = 'minimap';
mmCanvas.width = 200;
mmCanvas.height = 200;
hudRoot.appendChild(mmCanvas);
const minimap = createMinimap(mmCanvas);

function showScreen(kind, html) {
  for (const id of ['title-screen', 'pause-screen', 'over-screen']) {
    const old = document.getElementById(id);
    if (old) old.remove();
  }
  if (!kind) return;
  const d = document.createElement('div');
  d.id = kind;
  d.innerHTML = html;
  document.body.appendChild(d);
}

function titleHtml() {
  const save = loadSave();
  return `<h1>SOLARA</h1><h2>A CRIME STORY IN SOLARA BAY</h2>
  <p>Sunset over Solara Bay. Steal cars, outrun the police, and run six jobs
  for Nadia Reyes — from your first stolen wheels to the big score.</p>
  <p><b>Enter</b> — New game${save ? ' &nbsp;·&nbsp; <b>C</b> — Continue your save' : ''}</p>
  <p class="keys">WASD move / drive · Shift run · E enter car · F punch · Space handbrake<br>Esc pause · M mute · K save</p>`;
}

function pauseHtml() {
  return `<h1>PAUSED</h1><p>Progress autosaved.<br>Esc — resume &nbsp;·&nbsp; R — restart the run</p>`;
}

function overHtml() {
  const m = MISSIONS[world.mission.index];
  return `<h1>${world.overReason}</h1>
  <p>${world.overReason === 'BUSTED' ? 'The Solara police finally caught up with you.' : 'Solara got the better of you this time.'}</p>
  <p>Cash <b>$${world.cash}</b> · Missions done <b>${world.stats.missions}</b> · Cars stolen <b>${world.stats.stolen}</b><br>
  Best cash <b>$${world.best}</b>${m ? `<br>Next job: <b>${m.name}</b>` : ''}</p>
  <p><b>Enter</b> — play again</p>`;
}

function focusOf() {
  return world.car || world.player;
}

function updateCameraTarget(dt) {
  const f = focusOf();
  const targetYaw = f.heading;
  let d = targetYaw - (world.camYaw ?? f.heading);
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  world.camYaw = (world.camYaw ?? f.heading) + d * Math.min(1, dt * 3);
}

function renderFrame() {
  const f = focusOf();
  // Sun shadow box follows the player so shadows stay crisp.
  const sunDir = new THREE.Vector3(...SUNSET.sunPos).normalize();
  sun.position.set(f.x + sunDir.x * 130, f.y + sunDir.y * 130, f.z + sunDir.z * 130);
  sun.target.position.set(f.x, 0, f.z);
  sun.target.updateMatrixWorld();
  // Objective position for the minimap.
  const obj = currentObjective(world.mission);
  world.objectivePos = obj && (obj.x !== 0 || obj.z !== 0) ? { x: obj.x, z: obj.z } : null;
  renderer.render(scene, camera);
}

// ---- Screenshot staging mode: deterministic, no loop, no input. ----
if (shotName) {
  world.status = 'play';
  world.camYaw = 0;
  const staged = stageShot(world, shotName);
  world.camYaw = staged.heading;
  // Advance only the deterministic city visuals (ocean, traffic lights).
  world.city.update(0.5, 2.0);
  world.city.update(0.5, 2.5);
  if (staged.camPos) {
    // A staged 3/4 view: set the camera directly instead of the chase rig.
    camera.position.set(staged.camPos.x, staged.camPos.y, staged.camPos.z);
    camera.lookAt(staged.camLook.x, staged.camLook.y, staged.camLook.z);
  } else {
    rig.snap(staged.focus, staged.heading, staged.driving);
    // Staged framing tweaks: lift the camera over foreground palms and aim
    // a touch lower so the vehicle sits clear of the dialogue box.
    const lookY = staged.lookY ?? 1.6;
    const lift = staged.camLift ?? 0;
    if (lookY !== 1.6 || lift) {
      camera.position.y += lift;
      camera.lookAt(
        staged.focus.x + Math.sin(staged.heading) * 6, lookY,
        staged.focus.z + Math.cos(staged.heading) * 6,
      );
    }
  }
  // No district banner in screenshots: it would cover the middle of the frame.
  hud['hud-district'].style.display = 'none';
  updateHud(hud, world);
  minimap.draw(world);
  renderFrame();
  renderFrame();
  window.__shotReady = true;
} else {
  // ---- Interactive game. ----
  world.status = 'title';
  showScreen('title-screen', titleHtml());
  rig.snap({ x: 0, z: 20 }, Math.PI, false);
  let last = performance.now();
  let acc = 0;
  let frames = 0;
  let fpsTime = 0;
  let fps = 0;

  function startGame(fromSave) {
    if (fromSave) {
      const data = loadSave();
      if (data) applySave(world, data);
      else resetWorld(world);
    } else {
      resetWorld(world);
    }
    world.status = 'play';
    showScreen(null);
    audio.resume();
    const f = focusOf();
    world.camYaw = f.heading;
    rig.snap(f, f.heading, !!world.car);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dtReal = Math.min((now - last) / 1000, 0.25);
    last = now;
    frames += 1;
    fpsTime += dtReal;
    if (fpsTime >= 1) { fps = Math.round(frames / fpsTime); frames = 0; fpsTime = 0; window.__fps = fps; }
    const actions = input.takeActions();
    const st = input.state();

    if (world.status === 'title') {
      if (actions.confirm || actions.punch) startGame(false);
      else if (actions.cont) startGame(true);
      world.city.update(dtReal, world.time);
      world.time += dtReal;
      renderFrame();
      return;
    }
    if (world.status === 'paused') {
      if (actions.pause || actions.confirm) { world.status = 'play'; showScreen(null); }
      renderFrame();
      return;
    }
    if (world.status === 'over') {
      if (actions.confirm) startGame(false);
      renderFrame();
      return;
    }

    // Playing.
    if (actions.pause) {
      world.status = 'paused';
      saveGame(world);
      showScreen('pause-screen', pauseHtml());
      renderFrame();
      return;
    }
    if (actions.mute) audio.setMuted(!audio.muted);
    if (actions.save) { if (saveGame(world)) toast(world, 'Saved'); }
    if (actions.punch) audio.punch();
    audio.resume();

    acc += dtReal;
    let n = 0;
    while (acc >= STEP && n < 5) {
      updateCameraTarget(STEP);
      stepWorld(world, st, actions, STEP);
      acc -= STEP;
      n += 1;
      actions.enter = false;
      actions.punch = false;
    }
    if (n === 5) acc = 0;

    const f = focusOf();
    rig.update(dtReal, f, world.camYaw, world.car ? Math.abs(world.car.speed) : 0, !!world.car);
    updateHud(hud, world, fps);
    minimap.draw(world);
    audio.engine(world.car ? world.car.speed : 0, !!world.car);
    audio.siren(world.police.wanted > 0, world.time);
    if (world.shake > 0) {
      camera.position.x += (Math.random() - 0.5) * world.shake * 0.5;
      camera.position.y += (Math.random() - 0.5) * world.shake * 0.3;
    }
    renderFrame();

    if (world.status === 'over') showScreen('over-screen', overHtml());
  }

  resize(renderer, camera, window.innerWidth, window.innerHeight);
  window.addEventListener('resize', () => resize(renderer, camera, window.innerWidth, window.innerHeight));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && world.status === 'play') {
      world.status = 'paused';
      saveGame(world);
      showScreen('pause-screen', pauseHtml());
    }
  });
  requestAnimationFrame(frame);
}
