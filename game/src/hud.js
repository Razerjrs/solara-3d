// DOM HUD: wanted stars, cash, health, speed, mission tracker, dialogue,
// toasts and district banners. EVERY element sits at least 24px inside the
// viewport edges — never clipped like the 2D entry's star row was.
import { currentObjective } from './missions.js';

export function createHud(root) {
  const el = {};
  const mk = (id, html) => {
    const d = document.createElement('div');
    d.id = id;
    d.innerHTML = html;
    root.appendChild(d);
    el[id] = d;
    return d;
  };
  // Wanted stars: top-left, inset 28px from the left and 30px from the top.
  mk('hud-stars', '');
  mk('hud-wanted', 'WANTED');
  mk('hud-cash', '');
  mk('hud-mission', '');
  mk('hud-dialogue', '');
  mk('hud-health', '<div id="hud-health-fill"></div>');
  mk('hud-speed', '');
  mk('hud-toasts', '');
  mk('hud-district', '');
  mk('hud-hint', 'WASD move / drive &nbsp;·&nbsp; Shift run &nbsp;·&nbsp; E enter car &nbsp;·&nbsp; F punch &nbsp;·&nbsp; Space handbrake &nbsp;·&nbsp; M mute &nbsp;·&nbsp; K save');
  el['hud-health-fill'] = document.getElementById('hud-health-fill');
  return el;
}

function starRow(wanted) {
  let s = '';
  for (let i = 0; i < 5; i++) {
    s += `<span class="star${i < wanted ? ' on' : ''}">★</span>`;
  }
  return s;
}

export function updateHud(el, world, fps) {
  const p = world.player;
  const inCar = !!world.car;
  const wanted = world.police.wanted;
  el['hud-stars'].innerHTML = starRow(wanted);
  el['hud-wanted'].style.opacity = wanted > 0 ? '1' : '0';
  el['hud-cash'].innerHTML = `<b>$${world.cash}</b><span>Best $${world.best}</span>`;
  const hp = Math.max(0, Math.round(inCar ? world.car.health : p.health));
  el['hud-health-fill'].style.width = hp + '%';
  el['hud-health-fill'].style.background = hp > 50 ? '#58d158' : hp > 25 ? '#e8b13c' : '#e04040';
  const speed = inCar ? Math.round(Math.abs(world.car.speed) * 3.6) : 0;
  el['hud-speed'].innerHTML = inCar ? `<b>${speed}</b><span>km/h</span><small>${world.car.spec.name}</small>` : '';
  const obj = world.mission ? currentObjectiveText(world) : '';
  el['hud-mission'].innerHTML = obj;
  if (world.dialogue) {
    el['hud-dialogue'].style.opacity = '1';
    el['hud-dialogue'].innerHTML = `<b>${world.dialogue.speaker}</b><p>${world.dialogue.text}</p><span>Enter to continue</span>`;
  } else {
    el['hud-dialogue'].style.opacity = '0';
  }
  el['hud-toasts'].innerHTML = world.toasts.map((t) => `<div>${t.text}</div>`).join('');
  const d = world.district;
  if (d !== updateHud._lastDistrict) {
    updateHud._lastDistrict = d;
    el['hud-district'].innerHTML = `<b>${d}</b><span>Solara</span>`;
    el['hud-district'].classList.remove('show');
    void el['hud-district'].offsetWidth;
    el['hud-district'].classList.add('show');
  }
  if (fps !== undefined) {
    el['hud-hint'].dataset.fps = fps;
  }
}

function currentObjectiveText(world) {
  const o = currentObjective(world.mission);
  if (!o) return '';
  const timer = o.timer ? ` &nbsp;<b>${o.timer}s</b>` : '';
  return `<span>◆</span> ${o.text}${timer}`;
}

export function hudCss() {
  return `
  #hud { position: fixed; inset: 0; pointer-events: none; font-family: 'Segoe UI', system-ui, sans-serif; color: #fff; }
  #hud-stars { position: absolute; top: 30px; left: 28px; font-size: 30px; letter-spacing: 4px; text-shadow: 0 2px 6px rgba(0,0,0,.7); }
  #hud-stars .star { color: rgba(255,255,255,.28); }
  #hud-stars .star.on { color: #ffc040; }
  #hud-wanted { position: absolute; top: 68px; left: 30px; font-size: 15px; font-weight: 800; letter-spacing: 3px; color: #ff5040; text-shadow: 0 2px 6px rgba(0,0,0,.8); transition: opacity .3s; }
  #hud-cash { position: absolute; top: 28px; right: 28px; text-align: right; background: rgba(10,10,18,.55); padding: 8px 14px; border-radius: 8px; }
  #hud-cash b { font-size: 24px; color: #7dd87d; display: block; }
  #hud-cash span { font-size: 12px; opacity: .75; }
  #hud-mission { position: absolute; top: 28px; left: 50%; transform: translateX(-50%); background: rgba(10,10,18,.62); padding: 9px 18px; border-radius: 8px; font-size: 16px; white-space: nowrap; }
  #hud-mission span { color: #ffc040; }
  #hud-mission b { color: #ffc040; }
  #hud-dialogue { position: absolute; left: 50%; bottom: 92px; transform: translateX(-50%); width: 620px; max-width: 80vw; background: rgba(12,12,22,.78); border-left: 4px solid #ffc040; padding: 12px 18px; border-radius: 6px; transition: opacity .3s; }
  #hud-dialogue b { color: #ffc040; font-size: 14px; letter-spacing: 1px; }
  #hud-dialogue p { margin: 4px 0 0; font-size: 16px; line-height: 1.4; }
  #hud-dialogue span { float: right; font-size: 11px; opacity: .6; }
  #hud-health { position: absolute; top: 96px; right: 28px; width: 190px; height: 12px; background: rgba(10,10,18,.6); border-radius: 6px; overflow: hidden; }
  #hud-health-fill { height: 100%; width: 100%; background: #58d158; transition: width .2s; }
  #hud-speed { position: absolute; right: 30px; bottom: 28px; text-align: right; text-shadow: 0 2px 8px rgba(0,0,0,.8); }
  #hud-speed b { font-size: 52px; line-height: 1; }
  #hud-speed span { font-size: 16px; margin-left: 6px; }
  #hud-speed small { display: block; font-size: 15px; color: #7dd8e8; letter-spacing: 1px; }
  #hud-toasts { position: absolute; top: 120px; left: 30px; font-size: 15px; }
  #hud-toasts div { background: rgba(10,10,18,.55); padding: 6px 12px; border-radius: 6px; margin-bottom: 6px; }
  #hud-district { position: absolute; top: 34%; left: 50%; transform: translateX(-50%); text-align: center; opacity: 0; }
  #hud-district.show { animation: districtIn 3s ease forwards; }
  #hud-district b { display: block; font-size: 44px; text-shadow: 0 3px 12px rgba(0,0,0,.8); }
  #hud-district span { font-size: 16px; letter-spacing: 6px; opacity: .85; }
  @keyframes districtIn { 0% { opacity: 0; } 12% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; } }
  #hud-hint { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); font-size: 12px; opacity: .65; white-space: nowrap; }
  #minimap { position: absolute; left: 28px; bottom: 28px; width: 200px; height: 200px; border-radius: 10px; border: 2px solid rgba(255,255,255,.35); background: rgba(10,14,10,.7); }
  #title-screen, #pause-screen, #over-screen { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(180deg, rgba(20,8,32,.82), rgba(60,20,20,.88)); color: #fff; font-family: 'Segoe UI', system-ui, sans-serif; z-index: 10; }
  #title-screen h1 { font-size: 84px; margin: 0; letter-spacing: 10px; color: #ffb060; text-shadow: 0 4px 30px rgba(255,120,40,.6); }
  #title-screen h2 { font-size: 20px; font-weight: 400; margin: 6px 0 26px; letter-spacing: 3px; opacity: .9; }
  #title-screen p, #pause-screen p, #over-screen p { font-size: 16px; line-height: 1.6; max-width: 560px; text-align: center; opacity: .9; }
  #title-screen .keys, #pause-screen .keys { font-size: 14px; opacity: .75; margin-top: 18px; }
  #over-screen h1 { font-size: 72px; margin: 0; letter-spacing: 8px; color: #ff5040; }
  #pause-screen h1 { font-size: 56px; margin: 0; letter-spacing: 6px; }
  `;
}
