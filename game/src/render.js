// Three.js scene, sunset lighting, sky dome and the chase camera rig.
// The camera follows the player smoothly: behind the car while driving,
// over the shoulder on foot, with a look-ahead toward motion.
import * as THREE from 'three';
import { SUNSET } from './config.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(SUNSET.fog, 60, 260);

  // Sunset sky: a big gradient dome, warm at the horizon, dusk purple above.
  const skyGeo = new THREE.SphereGeometry(420, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(SUNSET.skyTop) },
      mid: { value: new THREE.Color(0xe0708a) },
      horizon: { value: new THREE.Color(SUNSET.skyHorizon) },
      sunDir: { value: new THREE.Vector3(...SUNSET.sunPos).normalize() },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 sunDir;
      void main() {
        float h = clamp(vDir.y, -0.05, 1.0);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.22, h));
        col = mix(col, top, smoothstep(0.2, 0.65, h));
        float sun = pow(max(dot(normalize(vDir), normalize(sunDir)), 0.0), 90.0);
        col += vec3(1.0, 0.75, 0.4) * sun * 1.4;
        float glow = pow(max(dot(normalize(vDir), normalize(sunDir)), 0.0), 6.0);
        col += vec3(1.0, 0.5, 0.2) * glow * 0.35;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // Low sun over the ocean + warm hemisphere fill.
  const sun = new THREE.DirectionalLight(SUNSET.sunColor, SUNSET.sunIntensity);
  sun.position.set(...SUNSET.sunPos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 320;
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);
  scene.add(new THREE.HemisphereLight(SUNSET.hemiSky, SUNSET.hemiGround, SUNSET.hemiIntensity));
  // A faint warm ambient lift so shadowed faces never go black.
  scene.add(new THREE.AmbientLight(0x604050, 0.55));

  return { scene, sun };
}

export function createCamera() {
  return new THREE.PerspectiveCamera(62, 1280 / 720, 0.1, 900);
}

// Camera rig: lerps toward its target so motion feels smooth, never snaps.
export function createCameraRig(camera) {
  const pos = new THREE.Vector3(0, 12, 20);
  const look = new THREE.Vector3(0, 1, 0);
  let yaw = 0;

  function update(dt, focus, heading, speed, driving) {
    // Desired offset: behind the heading, higher and further when driving fast.
    const dist = driving ? 11 + Math.min(speed * 0.1, 4) : 7.5;
    const height = driving ? 4.8 + Math.min(speed * 0.03, 1.5) : 3.6;
    const tx = focus.x - Math.sin(heading) * dist;
    const tz = focus.z - Math.cos(heading) * dist;
    const k = 1 - Math.exp(-dt * (driving ? 5.5 : 7));
    pos.x += (tx - pos.x) * k;
    pos.y += (height - pos.y) * k;
    pos.z += (tz - pos.z) * k;
    const lx = focus.x + Math.sin(heading) * 6;
    const lz = focus.z + Math.cos(heading) * 6;
    look.x += (lx - look.x) * (1 - Math.exp(-dt * 8));
    look.y += (1.6 - look.y) * (1 - Math.exp(-dt * 8));
    look.z += (lz - look.z) * (1 - Math.exp(-dt * 8));
    camera.position.copy(pos);
    camera.lookAt(look);
    yaw = heading;
  }

  function snap(focus, heading, driving) {
    const dist = driving ? 11 : 7.5;
    const height = driving ? 4.8 : 3.6;
    pos.set(focus.x - Math.sin(heading) * dist, height, focus.z - Math.cos(heading) * dist);
    look.set(focus.x + Math.sin(heading) * 6, 1.6, focus.z + Math.cos(heading) * 6);
    camera.position.copy(pos);
    camera.lookAt(look);
    yaw = heading;
  }

  return { update, snap, get yaw() { return yaw; } };
}

export function resize(renderer, camera, w, h) {
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
