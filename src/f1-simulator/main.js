import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import './styles.css';
import { CHAMPIONSHIP_PROJECT_DRIVERS, formatDriverNumber } from './championship.js';
import { ProceduralTrackAsset, PROCEDURAL_TRACK_TEXTURES } from './proceduralTrackAsset.js';
import { createRaceSimulation } from './raceSimulation.js';
import { normalizeAngle, offsetTrackPoint, pointAt, WORLD } from './trackModel.js';

const CAR_TEXTURE = '/assets/game/f1-car-sprite-game.png';
const SAFETY_CAR_TEXTURE = '/assets/game/f1-safety-car-sprite.png';
const BROADCAST_PANEL_TEXTURE = '/assets/game/f1-broadcast-panel-surface.png';
const FIXED_STEP = 1 / 60;
const TARGET_RENDER_FPS = 60;
const TARGET_FRAME_MS = 1000 / TARGET_RENDER_FPS;
const FRAME_PACING_EPSILON_MS = 0.75;
const MAX_FRAME_CATCHUP_COUNT = 4;
const DOM_UPDATE_INTERVAL_MS = 100;
const SIM_SPEED = 3.25;
const CAR_WORLD_LENGTH = 66;
const CAR_WORLD_WIDTH = 23;
const SAFETY_CAR_WORLD_LENGTH = 92;
const SAFETY_CAR_WORLD_WIDTH = 38;
const CAMERA_PRESETS = {
  overview: 1,
  leader: 5.35,
  selected: 6.1,
};
const SHOW_ALL_PADDING = 520;
const SHOW_ALL_MIN_ZOOM = 1.1;
const SHOW_ALL_MAX_ZOOM = 6.4;
const SHOW_ALL_TOP_RESERVED = 92;
const SHOW_ALL_BOTTOM_RESERVED = 132;
const DRS_TRAIL_TTL = 0.68;
const DRS_TRAIL_MIN_DISTANCE = 10;
const RACE_DATA_SELECTED_VISIBLE_MS = 5200;
const RACE_ALERT_VISIBLE_MS = 7600;
const RACE_ALERT_LIMIT = 4;
const RACE_IDLE_QUOTE_INTERVAL = 8.8;
const PROJECT_DRIVERS = CHAMPIONSHIP_PROJECT_DRIVERS;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (start, end, amount) => start + (end - start) * amount;
const DRIVER_BY_ID = new Map(PROJECT_DRIVERS.map((driver) => [driver.id, driver]));

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getTireClass(tire) {
  return String(tire ?? 'M').toLowerCase();
}

function smoothAngle(current, target, amount) {
  if (!Number.isFinite(current)) return target;
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * amount;
}

function interpolateAngle(previous, current, amount) {
  if (!Number.isFinite(previous)) return current;
  return previous + normalizeAngle(current - previous) * amount;
}

class F1SimulatorApp {
  constructor(root) {
    this.root = root;
    this.root.style.setProperty('--broadcast-panel-surface', `url('${BROADCAST_PANEL_TEXTURE}')`);
    this.canvasHost = root.querySelector('[data-track-canvas]');
    this.safetyButton = root.querySelector('[data-safety-car]');
    this.restartButton = root.querySelector('[data-restart-race]');
    this.timingList = root.querySelector('[data-timing-list]');
    this.cameraButtons = root.querySelectorAll('[data-camera-mode]');
    this.zoomInButton = root.querySelector('[data-zoom-in]');
    this.zoomOutButton = root.querySelector('[data-zoom-out]');
    this.readouts = {
      timingTower: root.querySelector('[data-timing-tower]'),
      mode: root.querySelector('[data-race-mode]'),
      towerLap: root.querySelector('[data-tower-lap-readout]'),
      towerTotalLaps: root.querySelector('[data-tower-total-laps]'),
      towerSafetyBanner: root.querySelector('[data-tower-safety-banner]'),
      lap: root.querySelector('[data-lap-readout]'),
      drs: root.querySelector('[data-drs-readout]'),
      contacts: root.querySelector('[data-contact-readout]'),
      camera: root.querySelector('[data-camera-readout]'),
      fps: root.querySelector('[data-fps-readout]'),
      selectedCode: root.querySelector('[data-selected-code]'),
      selectedName: root.querySelector('[data-selected-name]'),
      speed: root.querySelector('[data-telemetry-speed]'),
      throttle: root.querySelector('[data-telemetry-throttle]'),
      brake: root.querySelector('[data-telemetry-brake]'),
      tyres: root.querySelector('[data-telemetry-tyres]'),
      selectedDrs: root.querySelector('[data-telemetry-drs]'),
      surface: root.querySelector('[data-telemetry-surface]'),
      gap: root.querySelector('[data-telemetry-gap]'),
      raceDataPanel: root.querySelector('[data-race-data-panel]'),
      raceDataKicker: root.querySelector('[data-race-data-kicker]'),
      raceDataTitle: root.querySelector('[data-race-data-title]'),
      raceDataCode: root.querySelector('[data-race-data-code]'),
      raceDataPace: root.querySelector('[data-race-data-pace]'),
      raceDataNumber: root.querySelector('[data-race-data-number]'),
      raceDataSubtitle: root.querySelector('[data-race-data-subtitle]'),
      raceDataChips: root.querySelector('[data-race-data-chips]'),
      raceDataLink: root.querySelector('[data-race-data-link]'),
    };
    this.sim = null;
    this.app = null;
    this.worldLayer = null;
    this.trackAsset = null;
    this.drsLayer = null;
    this.trailLayer = null;
    this.carLayer = null;
    this.textures = {};
    this.carSprites = new Map();
    this.carHitAreas = new Map();
    this.drsTrails = new Map();
    this.selectedId = PROJECT_DRIVERS[0]?.id ?? null;
    this.activeRaceDataId = this.selectedId;
    this.lastRaceDataInteraction = performance.now();
    this.raceAlerts = [];
    this.seenAlertKeys = new Set();
    this.camera = {
      mode: 'leader',
      zoom: CAMERA_PRESETS.leader,
      scale: null,
      x: WORLD.width / 2,
      y: WORLD.height / 2,
    };
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.nextGameFrameTime = this.lastTime + TARGET_FRAME_MS;
    this.lastDomUpdateTime = 0;
    this.fps = {
      frames: 0,
      current: 0,
      lastSample: this.lastTime,
    };
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

    this.worldLayer = new Container();
    this.drsLayer = new Container();
    this.trailLayer = new Graphics();
    this.carLayer = new Container();
    this.app.stage.addChild(this.worldLayer);

    await this.loadAssets();
    this.trackAsset = new ProceduralTrackAsset({ textures: this.textures, world: WORLD });
    this.worldLayer.addChild(this.trackAsset.container, this.drsLayer, this.trailLayer, this.carLayer);
    this.createCars();
    this.bindControls();
    this.renderTrack();
    window.addEventListener('resize', () => this.applyCamera(this.sim.snapshot()));
    this.app.ticker.add(() => this.tick());
  }

  async loadAssets() {
    this.textures.car = Texture.WHITE;
    try {
      this.textures.car = await Assets.load(CAR_TEXTURE);
      this.textures.car.source.scaleMode = 'linear';
      this.textures.car.source.autoGenerateMipmaps = true;
    } catch {
      this.textures.car = Texture.WHITE;
    }

    try {
      this.textures.safetyCar = await Assets.load(SAFETY_CAR_TEXTURE);
      this.textures.safetyCar.source.scaleMode = 'linear';
      this.textures.safetyCar.source.autoGenerateMipmaps = true;
    } catch {
      this.textures.safetyCar = Texture.WHITE;
    }

    await Promise.all(Object.entries(PROCEDURAL_TRACK_TEXTURES).map(async ([key, url]) => {
      try {
        const texture = await Assets.load(url);
        texture.source.scaleMode = 'linear';
        this.textures[key] = texture;
      } catch {
        this.textures[key] = Texture.WHITE;
      }
    }));
  }

  createCars() {
    const texture = this.textures.car ?? Texture.WHITE;
    const baseScale = Math.min(
      CAR_WORLD_LENGTH / Math.max(texture.width, 1),
      CAR_WORLD_WIDTH / Math.max(texture.height, 1),
    );

    this.carSprites.forEach((sprite) => sprite.destroy());
    this.carHitAreas.forEach((hit) => hit.destroy());
    this.carSprites.clear();
    this.carHitAreas.clear();
    this.drsTrails.clear();

    if (this.safetySprite) {
      this.safetySprite.destroy();
      this.safetySprite = null;
    }

    PROJECT_DRIVERS.forEach((driver) => {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.baseScale = baseScale;
      sprite.scale.set(baseScale);
      sprite.tint = driver.color;
      sprite.eventMode = 'static';
      sprite.cursor = 'pointer';
      sprite.on('pointerdown', () => {
        this.selectCar(driver.id, { focus: true });
      });
      this.carSprites.set(driver.id, sprite);
      this.carLayer.addChild(sprite);

      const hit = new Graphics();
      hit.circle(0, 0, 24).fill({ color: 0xffffff, alpha: 0.001 });
      hit.eventMode = 'static';
      hit.cursor = 'pointer';
      hit.on('pointerdown', () => {
        this.selectCar(driver.id, { focus: true });
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
      this.activeRaceDataId = this.selectedId;
      this.lastRaceDataInteraction = performance.now();
      this.raceAlerts = [];
      this.seenAlertKeys.clear();
      this.safetyButton?.classList.remove('is-active');
      this.safetyButton?.setAttribute('aria-pressed', 'false');
      this.drsTrails.clear();
      this.trailLayer?.clear();
      this.renderTrack();
    });

    this.cameraButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.camera.mode = button.dataset.cameraMode;
        if (CAMERA_PRESETS[this.camera.mode]) this.camera.zoom = CAMERA_PRESETS[this.camera.mode];
        this.updateCameraControls();
      });
    });

    this.zoomInButton?.addEventListener('click', () => {
      this.camera.zoom = clamp(this.camera.zoom + 0.42, 0.72, 8.5);
      this.updateCameraControls();
    });

    this.zoomOutButton?.addEventListener('click', () => {
      this.camera.zoom = clamp(this.camera.zoom - 0.42, 0.72, 8.5);
      this.updateCameraControls();
    });

    this.timingList?.addEventListener('pointerdown', (event) => {
      const row = event.target instanceof Element ? event.target.closest('[data-driver-id]') : null;
      if (!row) return;
      this.selectCar(row.dataset.driverId, { focus: true });
    });
  }

  tick() {
    const now = performance.now();
    if (now < this.nextGameFrameTime - FRAME_PACING_EPSILON_MS) return;

    const elapsedFrameCount = clamp(
      Math.floor((now - this.nextGameFrameTime + FRAME_PACING_EPSILON_MS) / TARGET_FRAME_MS) + 1,
      1,
      MAX_FRAME_CATCHUP_COUNT,
    );
    const frameSeconds = (TARGET_FRAME_MS * elapsedFrameCount) / 1000;
    this.nextGameFrameTime += TARGET_FRAME_MS * elapsedFrameCount;
    if (now - this.nextGameFrameTime > TARGET_FRAME_MS * MAX_FRAME_CATCHUP_COUNT) {
      this.nextGameFrameTime = now + TARGET_FRAME_MS;
    }
    this.lastTime = now;
    this.sampleFps(now);
    this.accumulator += frameSeconds * SIM_SPEED;

    while (this.accumulator >= FIXED_STEP) {
      this.sim.step(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }

    const snapshot = this.sim.snapshot();
    const renderSnapshot = this.createRenderSnapshot(snapshot, clamp(this.accumulator / FIXED_STEP, 0, 1));
    this.applyCamera(renderSnapshot);
    this.renderDrsTrails(renderSnapshot);
    this.renderCars(renderSnapshot);
    if (now - this.lastDomUpdateTime >= DOM_UPDATE_INTERVAL_MS) {
      this.updateDom(snapshot);
      this.lastDomUpdateTime = now;
    }
  }

  createRenderSnapshot(snapshot, alpha) {
    return {
      ...snapshot,
      cars: snapshot.cars.map((car) => ({
        ...car,
        x: lerp(car.previousX ?? car.x, car.x, alpha),
        y: lerp(car.previousY ?? car.y, car.y, alpha),
        heading: interpolateAngle(car.previousHeading ?? car.heading, car.heading, alpha),
      })),
      safetyCar: {
        ...snapshot.safetyCar,
        x: lerp(snapshot.safetyCar.previousX ?? snapshot.safetyCar.x, snapshot.safetyCar.x, alpha),
        y: lerp(snapshot.safetyCar.previousY ?? snapshot.safetyCar.y, snapshot.safetyCar.y, alpha),
        heading: interpolateAngle(
          snapshot.safetyCar.previousHeading ?? snapshot.safetyCar.heading,
          snapshot.safetyCar.heading,
          alpha,
        ),
      },
    };
  }

  renderTrack() {
    this.drsLayer.removeChildren();
    const snapshot = this.sim.snapshot();
    const track = snapshot.track;

    this.trackAsset.render(track);

    track.drsZones.forEach((zone) => {
      const zoneLine = new Graphics();
      const steps = 44;
      for (let index = 0; index <= steps; index += 1) {
        const basePoint = pointAt(track, zone.start + ((zone.end - zone.start) * index) / steps);
        const point = offsetTrackPoint(basePoint, track.width / 2 - 22);
        if (index === 0) zoneLine.moveTo(point.x, point.y);
        else zoneLine.lineTo(point.x, point.y);
      }
      zoneLine.stroke({ width: 8, color: 0x14c784, alpha: 0.5, join: 'round', cap: 'round' });
      this.drsLayer.addChild(zoneLine);
    });
  }

  renderCars(snapshot) {
    snapshot.cars.forEach((car) => {
      const sprite = this.carSprites.get(car.id);
      const hit = this.carHitAreas.get(car.id);
      if (!sprite || !hit) return;
      sprite.x = car.x;
      sprite.y = car.y;
      sprite.currentRotation = smoothAngle(sprite.currentRotation, car.heading, 0.24);
      sprite.rotation = sprite.currentRotation;
      sprite.alpha = snapshot.raceControl.mode === 'safety-car' ? 0.82 : 1;
      sprite.scale.set(sprite.baseScale);
      sprite.tint = Number.parseInt(car.color.replace('#', ''), 16);
      hit.x = car.x;
      hit.y = car.y;
    });

    if (!this.safetySprite && snapshot.safetyCar.deployed) {
      const texture = this.textures.safetyCar ?? Texture.WHITE;
      this.safetySprite = new Sprite(texture);
      this.safetySprite.anchor.set(0.5);
      this.safetySprite.baseScale = Math.min(
        SAFETY_CAR_WORLD_LENGTH / Math.max(texture.width, 1),
        SAFETY_CAR_WORLD_WIDTH / Math.max(texture.height, 1),
      );
      this.safetySprite.scale.set(this.safetySprite.baseScale);
      this.carLayer.addChild(this.safetySprite);
    }

    if (this.safetySprite) {
      this.safetySprite.visible = snapshot.safetyCar.deployed;
      this.safetySprite.x = snapshot.safetyCar.x;
      this.safetySprite.y = snapshot.safetyCar.y;
      this.safetySprite.rotation = snapshot.safetyCar.heading;
    }
  }

  renderDrsTrails(snapshot) {
    if (!this.trailLayer) return;

    snapshot.cars.forEach((car) => {
      const history = this.drsTrails.get(car.id) ?? [];
      const rear = {
        x: car.x - Math.cos(car.heading) * CAR_WORLD_LENGTH * 0.46,
        y: car.y - Math.sin(car.heading) * CAR_WORLD_LENGTH * 0.46,
        at: snapshot.time,
      };
      const last = history[history.length - 1];

      if (
        car.drsActive &&
        (!last || Math.hypot(rear.x - last.x, rear.y - last.y) >= DRS_TRAIL_MIN_DISTANCE)
      ) {
        history.push(rear);
      }

      const activeTrail = history.filter((point) => snapshot.time - point.at <= DRS_TRAIL_TTL);
      if (activeTrail.length) this.drsTrails.set(car.id, activeTrail);
      else this.drsTrails.delete(car.id);
    });

    this.trailLayer.clear();
    this.drsTrails.forEach((history) => {
      for (let index = 1; index < history.length; index += 1) {
        const previous = history[index - 1];
        const point = history[index];
        const age = snapshot.time - point.at;
        const life = clamp(1 - age / DRS_TRAIL_TTL, 0, 1);
        this.trailLayer.moveTo(previous.x, previous.y);
        this.trailLayer.lineTo(point.x, point.y);
        this.trailLayer.stroke({
          width: 5 + life * 7,
          color: 0x3be8ff,
          alpha: 0.22 + life * 0.48,
          cap: 'round',
          join: 'round',
        });
      }
    });
  }

  applyCamera(snapshot) {
    if (!this.worldLayer) return;

    const width = this.canvasHost.clientWidth || 900;
    const height = this.canvasHost.clientHeight || 640;
    const baseScale = Math.min(width / (WORLD.width + 260), height / (WORLD.height + 220));
    const frame = this.getCameraFrame(snapshot, width, height, baseScale);
    const scale = frame.scale;
    const target = frame.target;
    this.camera.x += (target.x - this.camera.x) * 0.08;
    this.camera.y += (target.y - this.camera.y) * 0.08;
    const activeScale = this.camera.scale === null
      ? scale
      : this.camera.scale + (scale - this.camera.scale) * 0.12;
    this.camera.scale = activeScale;
    this.worldLayer.scale.set(activeScale);
    this.worldLayer.position.set(
      frame.screenX - this.camera.x * activeScale,
      frame.screenY - this.camera.y * activeScale,
    );
  }

  getCameraFrame(snapshot, width, height, baseScale) {
    if (this.camera.mode === 'show-all') {
      const bounds = snapshot.cars.reduce((box, car) => ({
        minX: Math.min(box.minX, car.x),
        minY: Math.min(box.minY, car.y),
        maxX: Math.max(box.maxX, car.x),
        maxY: Math.max(box.maxY, car.y),
      }), {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
      });
      const target = {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
      };
      const fitWidth = Math.max(CAR_WORLD_LENGTH * 3, bounds.maxX - bounds.minX + SHOW_ALL_PADDING);
      const fitHeight = Math.max(CAR_WORLD_LENGTH * 3, bounds.maxY - bounds.minY + SHOW_ALL_PADDING);
      const safeHeight = Math.max(height * 0.48, height - SHOW_ALL_TOP_RESERVED - SHOW_ALL_BOTTOM_RESERVED);
      const scale = clamp(
        Math.min(width / fitWidth, safeHeight / fitHeight),
        baseScale * SHOW_ALL_MIN_ZOOM,
        baseScale * SHOW_ALL_MAX_ZOOM,
      );
      return {
        target,
        scale,
        screenX: width / 2,
        screenY: SHOW_ALL_TOP_RESERVED + safeHeight / 2,
      };
    }

    return {
      target: this.getCameraTarget(snapshot),
      scale: baseScale * this.camera.zoom,
      screenX: width / 2,
      screenY: height / 2,
    };
  }

  getCameraTarget(snapshot) {
    if (this.camera.mode === 'overview') {
      return { x: WORLD.width / 2, y: WORLD.height / 2 };
    }

    if (this.camera.mode === 'selected') {
      const selected = snapshot.cars.find((car) => car.id === this.selectedId);
      if (selected) return selected;
    }

    const leader = snapshot.cars[0];
    return leader ? { x: leader.x, y: leader.y } : { x: WORLD.width / 2, y: WORLD.height / 2 };
  }

  updateDom(snapshot) {
    const leader = snapshot.cars[0];
    const selected = snapshot.cars.find((car) => car.id === this.selectedId) ?? leader;
    const activeDrs = snapshot.cars.filter((car) => car.drsActive).length;
    const contactCount = snapshot.events.filter((event) => event.type === 'contact').length;
    const now = performance.now();

    this.captureRaceAlerts(snapshot, now);
    if (this.activeRaceDataId && now - this.lastRaceDataInteraction > RACE_DATA_SELECTED_VISIBLE_MS) {
      this.activeRaceDataId = null;
    }

    if (this.readouts.mode) {
      this.readouts.mode.textContent = snapshot.raceControl.mode === 'safety-car' ? 'SC' : 'GREEN';
      this.readouts.mode.style.color = snapshot.raceControl.mode === 'safety-car' ? 'var(--yellow)' : 'var(--green)';
    }
    if (this.readouts.lap) this.readouts.lap.textContent = `${leader?.lap ?? 1}/${snapshot.totalLaps}`;
    if (this.readouts.towerLap) this.readouts.towerLap.textContent = leader?.lap ?? 1;
    if (this.readouts.towerTotalLaps) this.readouts.towerTotalLaps.textContent = snapshot.totalLaps;
    if (this.readouts.timingTower) {
      this.readouts.timingTower.classList.toggle('is-safety-car', snapshot.raceControl.mode === 'safety-car');
    }
    if (this.readouts.towerSafetyBanner) {
      this.readouts.towerSafetyBanner.hidden = snapshot.raceControl.mode !== 'safety-car';
    }
    if (this.readouts.drs) {
      this.readouts.drs.textContent = snapshot.raceControl.mode === 'safety-car'
        ? 'DISABLED'
        : activeDrs
          ? `${activeDrs} OPEN`
          : 'ARMED';
    }
    if (this.readouts.contacts) this.readouts.contacts.textContent = String(contactCount);
    if (this.readouts.camera) {
      const zoom = this.camera.mode === 'show-all'
        ? Math.round(((this.camera.scale ?? 0) / Math.max(0.0001, this.getBaseScale())) * 100)
        : Math.round(this.camera.zoom * 100);
      this.readouts.camera.textContent = `${this.camera.mode.toUpperCase().replace('-', ' ')} ${zoom}%`;
    }
    if (this.readouts.fps) {
      this.readouts.fps.textContent = this.fps.current ? `${this.fps.current}` : '--';
    }

    this.updateCameraControls();
    this.renderTiming(snapshot.cars, leader, snapshot.raceControl.mode);
    this.renderTelemetry(selected);
    const activeRaceDataCar = this.activeRaceDataId
      ? snapshot.cars.find((car) => car.id === this.activeRaceDataId)
      : null;
    if (activeRaceDataCar) {
      this.renderRaceData(activeRaceDataCar);
    } else {
      this.renderRaceAlerts(snapshot, { leader, activeDrs, contactCount });
    }
  }

  getBaseScale() {
    const width = this.canvasHost.clientWidth || 900;
    const height = this.canvasHost.clientHeight || 640;
    return Math.min(width / (WORLD.width + 260), height / (WORLD.height + 220));
  }

  sampleFps(now) {
    this.fps.frames += 1;
    const elapsed = now - this.fps.lastSample;
    if (elapsed < 500) return;
    this.fps.current = Math.round((this.fps.frames * 1000) / elapsed);
    this.fps.frames = 0;
    this.fps.lastSample = now;
  }

  selectCar(id, { focus = false } = {}) {
    this.selectedId = id;
    this.activeRaceDataId = id;
    this.lastRaceDataInteraction = performance.now();
    if (focus) {
      this.camera.mode = 'selected';
      this.camera.zoom = CAMERA_PRESETS.selected;
      this.updateCameraControls();
    }
    this.updateDom(this.sim.snapshot());
  }

  renderTiming(cars, leader, raceMode) {
    const leaderDistance = leader?.raceDistance ?? 0;
    this.timingList.innerHTML = cars.map((car) => {
      const driver = DRIVER_BY_ID.get(car.id);
      let gap = 'Leader';
      if (raceMode === 'safety-car' && car.rank > 1) {
        gap = 'SC';
      } else if (car.rank > 1) {
        gap = `+${Math.max(0, (leaderDistance - car.raceDistance) / Math.max(car.speed, 1)).toFixed(3)}`;
      }
      const tire = car.tire ?? driver?.tire ?? 'M';
      const timingCode = car.timingCode ?? driver?.timingCode ?? car.code;
      const icon = car.icon ?? driver?.icon ?? timingCode;

      return `
        <li>
          <button class="timing-row ${car.id === this.selectedId ? 'is-selected' : ''}" type="button"
            data-driver-id="${escapeHtml(car.id)}" aria-label="Select ${escapeHtml(car.name)}"
            style="--driver-color: ${escapeHtml(car.color)}">
            <span class="timing-position">${car.rank}</span>
            <span class="timing-icon" aria-hidden="true">${escapeHtml(icon)}</span>
            <span class="timing-name" title="${escapeHtml(car.name)}">${escapeHtml(timingCode)}</span>
            <span class="timing-gap">${escapeHtml(gap)}</span>
            <span class="timing-tire timing-tire--${getTireClass(tire)}">${escapeHtml(tire)}</span>
          </button>
        </li>
      `;
    }).join('');
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
    if (this.readouts.surface) {
      this.readouts.surface.textContent = (car.surface ?? 'track').toUpperCase();
    }
    this.readouts.gap.textContent = car.rank === 1 || !Number.isFinite(car.gapAheadSeconds)
      ? '--'
      : `${car.gapAheadSeconds.toFixed(2)}s`;
  }

  renderRaceData(car) {
    if (!car || !this.readouts.raceDataPanel) return;
    const driver = PROJECT_DRIVERS.find((item) => item.id === car.id);
    if (!driver) return;

    this.readouts.raceDataPanel.style.setProperty('--driver-color', driver.color);
    this.readouts.raceDataPanel.classList.add('is-project-mode');
    this.readouts.raceDataPanel.classList.remove('is-alert-mode');
    this.readouts.raceDataPanel.removeAttribute('data-idle-mode');
    this.readouts.raceDataPanel.removeAttribute('data-alert-tone');
    if (this.readouts.raceDataKicker) this.readouts.raceDataKicker.textContent = 'Project';
    this.readouts.raceDataTitle.textContent = driver.name;
    if (this.readouts.raceDataCode) this.readouts.raceDataCode.textContent = `${car.code} P${car.rank}`;
    if (this.readouts.raceDataPace) this.readouts.raceDataPace.textContent = `${Math.round(car.speedKph)} km/h`;
    if (this.readouts.raceDataNumber) {
      this.readouts.raceDataNumber.textContent = formatDriverNumber(car.driverNumber ?? driver.driverNumber);
    }
    if (this.readouts.raceDataSubtitle) {
      this.readouts.raceDataSubtitle.textContent = `${car.code} - P${car.rank} - ${driver.raceData?.[0] ?? 'Project entry'}`;
    }
    this.readouts.raceDataLink.href = driver.projectUrl;
    this.readouts.raceDataLink.target = '_blank';
    this.readouts.raceDataLink.rel = 'noopener';
    this.readouts.raceDataLink.hidden = false;
    if (this.readouts.raceDataChips) {
      this.readouts.raceDataChips.innerHTML = (driver.raceData ?? [])
        .map((item) => `<span>${escapeHtml(item)}</span>`)
        .join('');
    }
  }

  captureRaceAlerts(snapshot, now = performance.now()) {
    snapshot.events.forEach((event) => {
      const key = `${event.type}:${event.at}:${event.carId ?? ''}:${event.otherCarId ?? ''}`;
      if (this.seenAlertKeys.has(key)) return;
      this.seenAlertKeys.add(key);

      const alert = this.describeRaceEvent(event, snapshot);
      if (alert) {
        this.raceAlerts.unshift({
          ...alert,
          createdAt: now,
        });
      }
    });

    this.raceAlerts = this.raceAlerts
      .filter((alert) => now - alert.createdAt <= RACE_ALERT_VISIBLE_MS)
      .slice(0, RACE_ALERT_LIMIT);

    if (this.seenAlertKeys.size > 80) {
      this.seenAlertKeys = new Set(Array.from(this.seenAlertKeys).slice(-40));
    }
  }

  describeRaceEvent(event, snapshot) {
    if (event.type === 'safety-car') {
      return {
        tone: 'safety',
        color: '#ffd400',
        title: 'Safety car',
        subtitle: `Field neutralized - DRS disabled - lap ${snapshot.cars[0]?.lap ?? 1}/${snapshot.totalLaps}`,
      };
    }

    if (event.type === 'green-flag') {
      return {
        tone: 'green',
        color: '#20d66b',
        title: 'Green flag',
        subtitle: `Racing resumed - DRS armed - lap ${snapshot.cars[0]?.lap ?? 1}/${snapshot.totalLaps}`,
      };
    }

    if (event.type === 'contact') {
      const first = snapshot.cars.find((car) => car.id === event.carId);
      const second = snapshot.cars.find((car) => car.id === event.otherCarId);
      return {
        tone: 'contact',
        color: '#ff2f5f',
        title: 'Contact reported',
        subtitle: `${first?.code ?? 'CAR'} / ${second?.code ?? 'CAR'} under race-control review`,
      };
    }

    return null;
  }

  renderRaceAlerts(snapshot, { leader, activeDrs, contactCount }) {
    if (!this.readouts.raceDataPanel) return;
    const now = performance.now();
    const recentContactCount = this.raceAlerts
      .filter((alert) => alert.tone === 'contact' && now - alert.createdAt <= RACE_ALERT_VISIBLE_MS)
      .length;
    const latestAlert = this.raceAlerts[0];
    const fallbackAlert = snapshot.raceControl.mode === 'safety-car'
      ? {
        tone: 'safety',
        color: '#ffd400',
        title: 'Safety car',
        subtitle: `Field in order - DRS disabled - contacts ${recentContactCount || contactCount}`,
      }
      : null;
    const idleInfo = this.getIdleProjectQuote(snapshot);
    const alert = latestAlert ?? fallbackAlert ?? idleInfo;

    this.readouts.raceDataPanel.style.setProperty('--driver-color', alert.color);
    this.readouts.raceDataPanel.classList.add('is-alert-mode');
    this.readouts.raceDataPanel.classList.remove('is-project-mode');
    this.readouts.raceDataPanel.dataset.alertTone = alert.tone;
    this.readouts.raceDataPanel.dataset.idleMode = alert.kind === 'quote' ? 'quote' : 'alert';
    if (this.readouts.raceDataKicker) {
      this.readouts.raceDataKicker.textContent = alert.kind === 'quote' ? 'Project radio' : 'Race alert';
    }
    this.readouts.raceDataTitle.textContent = alert.title;
    if (this.readouts.raceDataNumber) this.readouts.raceDataNumber.textContent = '';
    if (this.readouts.raceDataSubtitle) this.readouts.raceDataSubtitle.textContent = alert.subtitle;
    if (this.readouts.raceDataLink) {
      this.readouts.raceDataLink.hidden = true;
      this.readouts.raceDataLink.removeAttribute('href');
    }
  }

  getIdleProjectQuote(snapshot) {
    const index = Math.floor(snapshot.time / RACE_IDLE_QUOTE_INTERVAL) % PROJECT_DRIVERS.length;
    const driver = PROJECT_DRIVERS[index] ?? PROJECT_DRIVERS[0];
    const quoteIndex = Math.floor(snapshot.time / (RACE_IDLE_QUOTE_INTERVAL * PROJECT_DRIVERS.length))
      % Math.max(1, driver.raceData?.length ?? 1);
    const quote = driver.raceData?.[quoteIndex] ?? 'Project entry';

    return {
      kind: 'quote',
      tone: 'quote',
      color: driver.color,
      title: driver.name,
      subtitle: `${driver.code} - "${quote}"`,
    };
  }

  updateCameraControls() {
    this.cameraButtons.forEach((button) => {
      const isActive = button.dataset.cameraMode === this.camera.mode;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }
}

const root = document.getElementById('f1-simulator-root');
if (root) {
  const app = new F1SimulatorApp(root);
  app.init();
}
