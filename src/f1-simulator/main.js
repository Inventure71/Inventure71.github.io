import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import './styles.css';
import { PROJECT_DRIVERS } from './drivers.js';
import { createRaceSimulation } from './raceSimulation.js';
import { offsetTrackPoint, pointAt, WORLD } from './trackModel.js';

const CAR_TEXTURE = '/assets/game/f1-car-sprite.png';
const FIXED_STEP = 1 / 60;
const SIM_SPEED = 1.65;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function smoothAngle(current, target, amount) {
  if (!Number.isFinite(current)) return target;
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * amount;
}

class F1SimulatorApp {
  constructor(root) {
    this.root = root;
    this.canvasHost = root.querySelector('[data-track-canvas]');
    this.safetyButton = root.querySelector('[data-safety-car]');
    this.restartButton = root.querySelector('[data-restart-race]');
    this.timingList = root.querySelector('[data-timing-list]');
    this.readouts = {
      mode: root.querySelector('[data-race-mode]'),
      lap: root.querySelector('[data-lap-readout]'),
      drs: root.querySelector('[data-drs-readout]'),
      contacts: root.querySelector('[data-contact-readout]'),
      selectedCode: root.querySelector('[data-selected-code]'),
      selectedName: root.querySelector('[data-selected-name]'),
      speed: root.querySelector('[data-telemetry-speed]'),
      throttle: root.querySelector('[data-telemetry-throttle]'),
      brake: root.querySelector('[data-telemetry-brake]'),
      tyres: root.querySelector('[data-telemetry-tyres]'),
      selectedDrs: root.querySelector('[data-telemetry-drs]'),
      gap: root.querySelector('[data-telemetry-gap]'),
    };
    this.sim = null;
    this.app = null;
    this.trackLayer = null;
    this.drsLayer = null;
    this.carLayer = null;
    this.carSprites = new Map();
    this.carHitAreas = new Map();
    this.selectedId = PROJECT_DRIVERS[0]?.id ?? null;
    this.accumulator = 0;
    this.lastTime = performance.now();
  }

  async init() {
    this.sim = createRaceSimulation({ seed: 1971, drivers: PROJECT_DRIVERS, totalLaps: 10 });
    this.app = new Application();
    await this.app.init({
      resizeTo: this.canvasHost,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      backgroundAlpha: 0,
    });
    this.canvasHost.appendChild(this.app.canvas);

    this.trackLayer = new Container();
    this.drsLayer = new Container();
    this.carLayer = new Container();
    this.app.stage.addChild(this.trackLayer, this.drsLayer, this.carLayer);

    await this.loadCars();
    this.bindControls();
    this.renderTrack();
    window.addEventListener('resize', () => this.renderTrack());
    this.app.ticker.add(() => this.tick());
  }

  async loadCars() {
    let texture = Texture.WHITE;
    try {
      texture = await Assets.load(CAR_TEXTURE);
    } catch {
      texture = Texture.WHITE;
    }

    PROJECT_DRIVERS.forEach((driver) => {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      const baseScale = Math.min(46 / Math.max(texture.width, 1), 20 / Math.max(texture.height, 1));
      sprite.baseScale = baseScale;
      sprite.scale.set(baseScale);
      sprite.tint = driver.color;
      sprite.eventMode = 'static';
      sprite.cursor = 'pointer';
      sprite.on('pointerdown', () => {
        this.selectedId = driver.id;
        this.updateDom(this.sim.snapshot());
      });
      this.carSprites.set(driver.id, sprite);
      this.carLayer.addChild(sprite);

      const hit = new Graphics();
      hit.circle(0, 0, 16).fill({ color: 0xffffff, alpha: 0.001 });
      hit.eventMode = 'static';
      hit.cursor = 'pointer';
      hit.on('pointerdown', () => {
        this.selectedId = driver.id;
        this.updateDom(this.sim.snapshot());
      });
      this.carHitAreas.set(driver.id, hit);
      this.carLayer.addChild(hit);
    });
  }

  bindControls() {
    this.safetyButton?.addEventListener('click', () => {
      const next = this.sim.snapshot().raceControl.mode !== 'safety-car';
      this.sim.setSafetyCar(next);
      this.safetyButton.classList.toggle('is-active', next);
      this.safetyButton.setAttribute('aria-pressed', String(next));
    });

    this.restartButton?.addEventListener('click', () => {
      this.sim = createRaceSimulation({ seed: 1971, drivers: PROJECT_DRIVERS, totalLaps: 10 });
      this.selectedId = PROJECT_DRIVERS[0]?.id ?? null;
      this.safetyButton?.classList.remove('is-active');
      this.safetyButton?.setAttribute('aria-pressed', 'false');
      this.renderTrack();
    });
  }

  tick() {
    const now = performance.now();
    const frameSeconds = Math.min((now - this.lastTime) / 1000, 0.08);
    this.lastTime = now;
    this.accumulator += frameSeconds * SIM_SPEED;

    while (this.accumulator >= FIXED_STEP) {
      this.sim.step(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }

    const snapshot = this.sim.snapshot();
    this.renderCars(snapshot);
    this.updateDom(snapshot);
  }

  renderTrack() {
    const width = this.canvasHost.clientWidth || 900;
    const height = this.canvasHost.clientHeight || 640;
    this.trackLayer.removeChildren();
    this.drsLayer.removeChildren();
    const snapshot = this.sim.snapshot();
    const track = snapshot.track;

    const base = new Graphics();
    const points = track.samples.map((point) => this.worldToScreen(point, width, height));
    const roadWidth = clamp((track.width / WORLD.width) * width, 76, 112);
    base.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => base.lineTo(point.x, point.y));
    base.stroke({ width: roadWidth + 18, color: 0x08090b, alpha: 0.78, join: 'round', cap: 'round' });
    base.stroke({ width: roadWidth, color: 0x2a2f37, alpha: 1, join: 'round', cap: 'round' });
    base.stroke({ width: 5, color: 0xf4f7fb, alpha: 0.46, join: 'round', cap: 'round' });
    base.stroke({ width: 2, color: 0xe10600, alpha: 0.74, join: 'round', cap: 'round' });
    this.trackLayer.addChild(base);

    track.drsZones.forEach((zone) => {
      const zoneLine = new Graphics();
      const steps = 44;
      for (let index = 0; index <= steps; index += 1) {
        const point = this.worldToScreen(pointAt(track, zone.start + ((zone.end - zone.start) * index) / steps), width, height);
        if (index === 0) zoneLine.moveTo(point.x, point.y);
        else zoneLine.lineTo(point.x, point.y);
      }
      zoneLine.stroke({ width: clamp(roadWidth * 0.16, 12, 18), color: 0x14c784, alpha: 0.72, join: 'round', cap: 'round' });
      this.drsLayer.addChild(zoneLine);
    });
  }

  renderCars(snapshot) {
    const width = this.canvasHost.clientWidth || 900;
    const height = this.canvasHost.clientHeight || 640;
    const carViews = snapshot.cars.map((car) => ({ ...car, ...this.worldToScreen(car, width, height) }));
    const safety = this.worldToScreen(snapshot.safetyCar, width, height);

    carViews.forEach((car) => {
      const sprite = this.carSprites.get(car.id);
      const hit = this.carHitAreas.get(car.id);
      if (!sprite || !hit) return;
      sprite.x = car.x;
      sprite.y = car.y;
      sprite.currentRotation = smoothAngle(sprite.currentRotation, car.heading, 0.24);
      sprite.rotation = sprite.currentRotation;
      sprite.alpha = snapshot.raceControl.mode === 'safety-car' ? 0.82 : 1;
      sprite.scale.set(sprite.baseScale * (car.drsActive ? 1.12 : 1));
      sprite.tint = Number.parseInt(car.color.replace('#', ''), 16);
      hit.x = car.x;
      hit.y = car.y;
    });

    if (!this.safetySprite && snapshot.safetyCar.deployed) {
      this.safetySprite = new Graphics();
      this.safetySprite.roundRect(-24, -10, 48, 20, 4).fill(0xfacc15);
      this.safetySprite.rect(-18, -6, 14, 12).fill(0x111318);
      this.carLayer.addChild(this.safetySprite);
    }

    if (this.safetySprite) {
      this.safetySprite.visible = snapshot.safetyCar.deployed;
      this.safetySprite.x = safety.x;
      this.safetySprite.y = safety.y;
      this.safetySprite.rotation = snapshot.safetyCar.heading;
    }
  }

  updateDom(snapshot) {
    const leader = snapshot.cars[0];
    const selected = snapshot.cars.find((car) => car.id === this.selectedId) ?? leader;
    const activeDrs = snapshot.cars.filter((car) => car.drsActive).length;
    const contactCount = snapshot.events.filter((event) => event.type === 'contact').length;

    this.readouts.mode.textContent = snapshot.raceControl.mode === 'safety-car' ? 'SC' : 'GREEN';
    this.readouts.mode.style.color = snapshot.raceControl.mode === 'safety-car' ? 'var(--yellow)' : 'var(--green)';
    this.readouts.lap.textContent = `${leader?.lap ?? 1}/${snapshot.totalLaps}`;
    this.readouts.drs.textContent = snapshot.raceControl.mode === 'safety-car'
      ? 'DISABLED'
      : activeDrs
        ? `${activeDrs} OPEN`
        : 'ARMED';
    this.readouts.contacts.textContent = String(contactCount);

    this.renderTiming(snapshot.cars, leader, snapshot.raceControl.mode);
    this.renderTelemetry(selected);
  }

  renderTiming(cars, leader, raceMode) {
    const leaderDistance = leader?.raceDistance ?? 0;
    this.timingList.innerHTML = cars.map((car) => {
      let gap = 'LEADER';
      if (raceMode === 'safety-car' && car.rank > 1) {
        gap = 'SC';
      } else if (car.rank > 1) {
        gap = `+${Math.max(0, (leaderDistance - car.raceDistance) / Math.max(car.speed, 1)).toFixed(2)}s`;
      }
      return `
        <li>
          <button class="timing-row ${car.id === this.selectedId ? 'is-selected' : ''}" type="button"
            data-driver-id="${car.id}" data-drs="${car.drsActive}" style="--driver-color: ${car.color}">
            <span class="timing-position">${car.rank}</span>
            <span class="timing-code">${car.code}</span>
            <span class="timing-name">${car.name}</span>
            <span class="timing-gap">${car.drsActive ? 'DRS' : gap}</span>
          </button>
        </li>
      `;
    }).join('');

    this.timingList.querySelectorAll('[data-driver-id]').forEach((button) => {
      button.addEventListener('click', () => {
        this.selectedId = button.dataset.driverId;
        this.updateDom(this.sim.snapshot());
      });
    });
  }

  renderTelemetry(car) {
    if (!car) return;
    this.readouts.selectedCode.textContent = car.code;
    this.readouts.selectedCode.style.color = car.color;
    this.readouts.selectedName.textContent = car.name;
    this.readouts.speed.textContent = `${Math.round(car.speedKph)} km/h`;
    this.readouts.throttle.textContent = `${Math.round(car.throttle * 100)}%`;
    this.readouts.brake.textContent = `${Math.round(car.brake * 100)}%`;
    this.readouts.tyres.textContent = `${Math.round(car.tireEnergy ?? 100)}%`;
    this.readouts.selectedDrs.textContent = car.drsActive ? 'OPEN' : car.drsEligible ? 'READY' : 'OFF';
    this.readouts.gap.textContent = car.rank === 1 || !Number.isFinite(car.gapAheadSeconds)
      ? '--'
      : `${car.gapAheadSeconds.toFixed(2)}s`;
  }

  worldToScreen(point, width, height) {
    return {
      x: (point.x / WORLD.width) * width,
      y: (point.y / WORLD.height) * height,
    };
  }
}

const root = document.getElementById('f1-simulator-root');
if (root) {
  const app = new F1SimulatorApp(root);
  app.init();
}
