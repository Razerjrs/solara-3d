// Live 2D minimap: a small canvas in the HUD's bottom-left corner showing
// the city grid, the beach, the player, police, mission target and traffic.
import { DISTRICTS } from './config.js';

export function createMinimap(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  // City spans x -146..146, z -146..168; map it onto the canvas.
  function toMap(x, z) {
    return [
      ((x + 146) / 292) * W,
      ((z + 146) / 314) * H,
    ];
  }
  function draw(world) {
    ctx.clearRect(0, 0, W, H);
    // Land.
    ctx.fillStyle = '#3a4a38';
    ctx.fillRect(0, 0, W, H);
    // Districts in their own colours (faint, so the grid stays readable).
    ctx.globalAlpha = 0.35;
    for (const d of DISTRICTS) {
      const [x0, y0] = toMap(d.x0, d.z0);
      const [x1, y1] = toMap(d.x1, d.z1);
      ctx.fillStyle = '#' + d.color.toString(16).padStart(6, '0');
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    ctx.globalAlpha = 1;
    // Beach + ocean.
    const [, by] = toMap(0, 132);
    ctx.fillStyle = '#b89a5a';
    ctx.fillRect(0, by, W, toMap(0, 152)[1] - by);
    ctx.fillStyle = '#1e5f8a';
    ctx.fillRect(0, toMap(0, 152)[1], W, H - toMap(0, 152)[1]);
    // Roads.
    ctx.strokeStyle = '#7a7e88';
    ctx.lineWidth = 3;
    const lines = [-140, -84, -28, 28, 84, 140];
    for (const s of lines) {
      const [px] = toMap(s, 0);
      const [, py] = toMap(0, s);
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
    }
    // Mission target (yellow diamond).
    const obj = world.objectivePos;
    if (obj) {
      const [ox, oy] = toMap(obj.x, obj.z);
      ctx.fillStyle = '#ffc040';
      ctx.beginPath();
      ctx.moveTo(ox, oy - 7); ctx.lineTo(ox + 6, oy); ctx.lineTo(ox, oy + 7); ctx.lineTo(ox - 6, oy);
      ctx.closePath(); ctx.fill();
    }
    // Traffic (small grey dots).
    ctx.fillStyle = '#aab0b8';
    for (const t of world.traffic) {
      const [tx, ty] = toMap(t.x, t.z);
      ctx.fillRect(tx - 1, ty - 1, 2, 2);
    }
    // Police (red/blue dots).
    for (const c of world.police.cars) {
      const [cx, cy] = toMap(c.x, c.z);
      ctx.fillStyle = '#ff4030';
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (world.police.heli) {
      const [hx, hy] = toMap(world.police.heli.position.x, world.police.heli.position.z);
      ctx.fillStyle = '#ff8030';
      ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.fill();
    }
    // Player (white arrow, rotated by heading). Canvas y grows downward
    // (world +z), so a heading h points along (sin h, cos h) on the map:
    // a single rotation of (π − h) aims the up-pointing arrow exactly there.
    const focus = world.car || world.player;
    const [fx, fy] = toMap(focus.x, focus.z);
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(Math.PI - focus.heading);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(0, 2); ctx.lineTo(-5, 5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  return { draw };
}
