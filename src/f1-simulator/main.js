import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import './styles.css';
import { CHAMPIONSHIP_PROJECT_DRIVERS, formatDriverNumber } from './championship.js';
import { ProceduralTrackAsset, PROCEDURAL_TRACK_TEXTURES } from './proceduralTrackAsset.js';
import { createRaceSimulation } from './raceSimulation.js';
import { createRenderSnapshot } from './renderSnapshot.js';
import { clamp } from './simMath.js';
import { offsetTrackPoint, pointAt, WORLD } from './trackModel.js';

const CAR_TEXTURE = '/assets/game/f1-car-sprite-game.png';
const SAFETY_CAR_TEXTURE = '/assets/game/f1-safety-car-sprite.png';
const BROADCAST_PANEL_TEXTURE = '/assets/game/f1-broadcast-panel-surface.png';
const FIXED_STEP = 1 / 60;
const TARGET_RENDER_FPS = 60;
const TARGET_FRAME_MS = 1000 / TARGET_RENDER_FPS;
const FRAME_PACING_EPSILON_MS = 0.75;
const MAX_FRAME_CATCHUP_COUNT = 4;
const MAX_SIMULATION_STEPS_PER_RENDER = 5;
const DOM_UPDATE_INTERVAL_MS = 100;
const TIMING_UPDATE_INTERVAL_MS = 250;
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
const RADIO_BREAK_MIN_MS = 4800;
const RADIO_BREAK_MAX_MS = 11800;
const RADIO_VISIBLE_MIN_MS = 6200;
const RADIO_VISIBLE_MAX_MS = 9200;
const DRS_DRAG_REDUCTION_PERCENT = 58;
const PROJECT_DRIVERS = CHAMPIONSHIP_PROJECT_DRIVERS;

const DRIVER_BY_ID = new Map(PROJECT_DRIVERS.map((driver) => [driver.id, driver]));
const TINT_BY_COLOR = new Map();

function createPageTrackSeed() {
  const values = new Uint32Array(1);
  try {
    globalThis.crypto?.getRandomValues?.(values);
  } catch {
    values[0] = 0;
  }
  return (values[0] || Math.floor(Date.now() + performance.now() * 1000)) >>> 0;
}

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

function colorToTint(color) {
  if (TINT_BY_COLOR.has(color)) return TINT_BY_COLOR.get(color);
  const tint = Number.parseInt(String(color ?? '').replace('#', ''), 16);
  const normalizedTint = Number.isFinite(tint) ? tint : 0xffffff;
  TINT_BY_COLOR.set(color, normalizedTint);
  return normalizedTint;
}

function smoothAngle(current, target, amount) {
  if (!Number.isFinite(current)) return target;
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * amount;
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
      startLights: root.querySelector('[data-start-lights]'),
      startLightsLabel: root.querySelector('[data-start-lights-label]'),
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
      carOverview: root.querySelector('.car-overview'),
      carOverviewDiagram: root.querySelector('.car-overview-diagram'),
      carOverviewCode: root.querySelector('[data-car-overview-code]'),
      carOverviewIcon: root.querySelector('[data-car-overview-icon]'),
      carOverviewNumber: root.querySelector('[data-car-overview-number]'),
      carOverviewCoreStat: root.querySelector('[data-car-overview-core-stat]'),
      carOverviewMaxSpeed: root.querySelector('[data-car-overview-max-speed]'),
      carOverviewPower: root.querySelector('[data-car-overview-power]'),
      carOverviewBrakeForce: root.querySelector('[data-car-overview-brake-force]'),
      carOverviewTyreGrip: root.querySelector('[data-car-overview-tyre-grip]'),
      carOverviewAero: root.querySelector('[data-car-overview-aero]'),
      carOverviewDrsEffect: root.querySelector('[data-car-overview-drs-effect]'),
      carOverviewAggression: root.querySelector('[data-car-overview-aggression]'),
      carOverviewBaseAggression: root.querySelector('[data-car-overview-base-aggression]'),
      raceDataPanel: root.querySelector('[data-race-data-panel]'),
      raceDataKicker: root.querySelector('[data-race-data-kicker]'),
      raceDataTitle: root.querySelector('[data-race-data-title]'),
      raceDataNumber: root.querySelector('[data-race-data-number]'),
      raceDataSubtitle: root.querySelector('[data-race-data-subtitle]'),
      raceDataLink: root.querySelector('[data-race-data-link]'),
    };
    this.startLightNodes = [...(this.readouts.startLights?.querySelectorAll('.start-lights__gantry span') ?? [])];
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
    this.trackSeed = createPageTrackSeed();
    this.selectedId = PROJECT_DRIVERS[0]?.id ?? null;
    this.activeRaceDataId = this.selectedId;
    this.lastRaceDataInteraction = performance.now();
    this.radioRandomState = (this.trackSeed ^ 0x9e3779b9) >>> 0;
    this.radioState = {
      visible: false,
      nextChangeAt: this.lastRaceDataInteraction + this.randomRadioRange(RADIO_BREAK_MIN_MS, RADIO_BREAK_MAX_MS),
      driverIndex: 0,
      quoteIndex: 0,
    };
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
    this.lastTimingRenderTime = 0;
    this.lastTimingRaceMode = null;
    this.fps = {
      frames: 0,
      current: 0,
      lastSample: this.lastTime,
    };
  }

  async init() {
    if (!this.canvasHost) {
      throw new Error('F1 simulator canvas host is missing.');
    }

    this.sim = createRaceSimulation({ seed: 1971, trackSeed: this.trackSeed, drivers: PROJECT_DRIVERS, totalLaps: 10 });
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
      sprite.tint = colorToTint(driver.color);
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
      const active = this.sim.snapshot().raceControl.mode === 'safety-car';
      this.safetyButton.classList.toggle('is-active', active);
      this.safetyButton.setAttribute('aria-pressed', String(active));
    });

    this.restartButton?.addEventListener('click', () => {
      this.sim = createRaceSimulation({ seed: 1971, trackSeed: this.trackSeed, drivers: PROJECT_DRIVERS, totalLaps: 10 });
      this.selectedId = PROJECT_DRIVERS[0]?.id ?? null;
      this.activeRaceDataId = this.selectedId;
      this.lastRaceDataInteraction = performance.now();
      this.scheduleRadioBreak(this.lastRaceDataInteraction);
      this.safetyButton?.classList.remove('is-active');
      this.safetyButton?.setAttribute('aria-pressed', 'false');
      this.drsTrails.clear();
      this.trailLayer?.clear();
      this.lastTimingRenderTime = 0;
      this.lastTimingRaceMode = null;
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

    let simulationSteps = 0;
    while (this.accumulator >= FIXED_STEP && simulationSteps < MAX_SIMULATION_STEPS_PER_RENDER) {
      this.sim.step(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
      simulationSteps += 1;
    }

    if (this.accumulator >= FIXED_STEP) {
      this.accumulator %= FIXED_STEP;
      this.nextGameFrameTime = now + TARGET_FRAME_MS;
    }

    const snapshot = this.sim.snapshot();
    const renderSnapshot = createRenderSnapshot(snapshot, clamp(this.accumulator / FIXED_STEP, 0, 1));
    this.applyCamera(renderSnapshot);
    this.renderDrsTrails(renderSnapshot);
    this.renderCars(renderSnapshot);
    if (now - this.lastDomUpdateTime >= DOM_UPDATE_INTERVAL_MS) {
      this.updateDom(snapshot);
      this.lastDomUpdateTime = now;
    }
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
      sprite.tint = colorToTint(car.color);
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

    if (this.activeRaceDataId && now - this.lastRaceDataInteraction > RACE_DATA_SELECTED_VISIBLE_MS) {
      this.activeRaceDataId = null;
      this.scheduleRadioBreak(now);
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
      this.readouts.timingTower.classList.toggle('is-pre-start', snapshot.raceControl.mode === 'pre-start');
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
    this.renderStartLights(snapshot.raceControl);
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
    if (
      now - this.lastTimingRenderTime >= TIMING_UPDATE_INTERVAL_MS ||
      this.lastTimingRaceMode !== snapshot.raceControl.mode
    ) {
      this.renderTiming(snapshot.cars, leader, snapshot.raceControl.mode);
      this.lastTimingRenderTime = now;
      this.lastTimingRaceMode = snapshot.raceControl.mode;
    }
    this.renderTelemetry(selected);
    const activeRaceDataCar = this.activeRaceDataId
      ? snapshot.cars.find((car) => car.id === this.activeRaceDataId)
      : null;
    if (activeRaceDataCar) {
      this.renderRaceData(activeRaceDataCar);
    } else {
      this.renderProjectRadio(now);
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

  renderStartLights(raceControl) {
    const panel = this.readouts.startLights;
    if (!panel) return;

    const start = raceControl.start;
    const visible = Boolean(start?.visible);
    panel.hidden = !visible;
    if (!visible) return;

    this.startLightNodes.forEach((light, index) => {
      light.classList.toggle('is-lit', index < (start.lightsLit ?? 0));
    });
    panel.classList.toggle('is-lights-out', raceControl.mode === 'green' && start.released);

    if (this.readouts.startLightsLabel) {
      this.readouts.startLightsLabel.textContent = raceControl.mode === 'green' && start.released
        ? 'Lights out'
        : `${start.lightsLit}/${start.lightCount}`;
    }
  }

  selectCar(id, { focus = false } = {}) {
    this.selectedId = id;
    this.activeRaceDataId = id;
    this.lastRaceDataInteraction = performance.now();
    this.scheduleRadioBreak(this.lastRaceDataInteraction);
    if (focus) {
      this.camera.mode = 'selected';
      this.camera.zoom = CAMERA_PRESETS.selected;
      this.updateCameraControls();
    }
    this.lastTimingRenderTime = 0;
    this.updateDom(this.sim.snapshot());
  }

  renderTiming(cars, leader, raceMode) {
    if (!this.timingList) return;
    const leaderDistance = leader?.raceDistance ?? 0;
    this.timingList.innerHTML = cars.map((car) => {
      const driver = DRIVER_BY_ID.get(car.id);
      let gap = 'Leader';
      if (raceMode === 'safety-car' && car.rank > 1) {
        gap = 'SC';
      } else if (raceMode === 'pre-start') {
        gap = car.rank === 1 ? 'Pole' : 'Grid';
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
    const driver = DRIVER_BY_ID.get(car.id);
    const icon = car.icon ?? driver?.icon ?? car.code;
    const driverNumber = formatDriverNumber(car.driverNumber ?? driver?.driverNumber);
    const drsState = car.drsActive ? 'OPEN' : car.drsEligible ? 'READY' : 'OFF';
    const surface = (car.surface ?? 'track').toUpperCase();

    this.readouts.selectedCode.textContent = car.code;
    this.readouts.selectedCode.style.color = car.color;
    this.readouts.selectedName.textContent = car.name;
    this.readouts.speed.textContent = `${Math.round(car.speedKph)} km/h`;
    this.readouts.throttle.textContent = `${Math.round(car.throttle * 100)}%`;
    this.readouts.brake.textContent = `${Math.round(car.brake * 100)}%`;
    this.readouts.tyres.textContent = `${Math.round(car.tireEnergy ?? 100)}%`;
    this.readouts.selectedDrs.textContent = drsState;
    if (this.readouts.surface) {
      this.readouts.surface.textContent = surface;
    }
    this.readouts.gap.textContent = car.rank === 1 || !Number.isFinite(car.gapAheadSeconds)
      ? '--'
      : `${car.gapAheadSeconds.toFixed(2)}s`;

    this.readouts.carOverview?.style.setProperty('--driver-color', car.color);
    this.readouts.carOverviewDiagram?.style.setProperty('--driver-color', car.color);
    if (this.readouts.carOverviewCode) this.readouts.carOverviewCode.textContent = `${car.code} P${car.rank}`;
    if (this.readouts.carOverviewIcon) this.readouts.carOverviewIcon.textContent = icon;
    if (this.readouts.carOverviewNumber) this.readouts.carOverviewNumber.textContent = driverNumber;
    if (this.readouts.carOverviewCoreStat) this.readouts.carOverviewCoreStat.textContent = `${Math.round(car.setup?.massKg ?? 0)} kg`;
    if (this.readouts.carOverviewMaxSpeed) this.readouts.carOverviewMaxSpeed.textContent = `${Math.round(car.setup?.maxSpeedKph ?? 0)} km/h`;
    if (this.readouts.carOverviewPower) this.readouts.carOverviewPower.textContent = `${(car.setup?.powerUnitKn ?? 0).toFixed(1)} kN`;
    if (this.readouts.carOverviewBrakeForce) this.readouts.carOverviewBrakeForce.textContent = `${(car.setup?.brakeSystemKn ?? 0).toFixed(0)} kN`;
    if (this.readouts.carOverviewTyreGrip) this.readouts.carOverviewTyreGrip.textContent = `${(car.setup?.tireGrip ?? 0).toFixed(2)}`;
    if (this.readouts.carOverviewAero) this.readouts.carOverviewAero.textContent = `${(car.setup?.downforceCoefficient ?? 0).toFixed(1)} DF`;
    if (this.readouts.carOverviewDrsEffect) this.readouts.carOverviewDrsEffect.textContent = `-${DRS_DRAG_REDUCTION_PERCENT}%`;
    if (this.readouts.carOverviewAggression) this.readouts.carOverviewAggression.textContent = `${Math.round(car.aggressionPercent ?? (car.aggression ?? 0) * 100)}%`;
    if (this.readouts.carOverviewBaseAggression) {
      this.readouts.carOverviewBaseAggression.textContent = `${Math.round((car.personality?.baseAggression ?? 0) * 100)}%`;
    }
  }

  renderRaceData(car) {
    if (!car || !this.readouts.raceDataPanel) return;
    const driver = PROJECT_DRIVERS.find((item) => item.id === car.id);
    if (!driver) return;

    this.readouts.raceDataPanel.style.setProperty('--driver-color', driver.color);
    this.readouts.raceDataPanel.classList.remove('is-hidden');
    this.readouts.raceDataPanel.classList.add('is-project-mode');
    this.readouts.raceDataPanel.classList.remove('is-radio-mode');
    this.readouts.raceDataPanel.removeAttribute('data-idle-mode');
    if (this.readouts.raceDataKicker) this.readouts.raceDataKicker.textContent = 'Project';
    this.readouts.raceDataTitle.textContent = driver.name;
    if (this.readouts.raceDataNumber) {
      this.readouts.raceDataNumber.textContent = formatDriverNumber(car.driverNumber ?? driver.driverNumber);
    }
    if (this.readouts.raceDataSubtitle) {
      this.readouts.raceDataSubtitle.textContent = `${car.code} - P${car.rank} - ${driver.raceData?.[0] ?? 'Project entry'}`;
    }
    if (this.readouts.raceDataLink) {
      this.readouts.raceDataLink.href = driver.projectUrl;
      this.readouts.raceDataLink.target = '_blank';
      this.readouts.raceDataLink.rel = 'noopener';
      this.readouts.raceDataLink.hidden = false;
    }
  }

  renderProjectRadio(now = performance.now()) {
    if (!this.readouts.raceDataPanel) return;
    this.updateRadioSchedule(now);
    if (!this.radioState.visible) {
      this.hideRaceDataPanel();
      return;
    }

    const radio = this.getProjectRadioQuote();

    this.readouts.raceDataPanel.style.setProperty('--driver-color', radio.color);
    this.readouts.raceDataPanel.classList.remove('is-hidden');
    this.readouts.raceDataPanel.classList.add('is-radio-mode');
    this.readouts.raceDataPanel.classList.remove('is-project-mode');
    this.readouts.raceDataPanel.dataset.idleMode = 'quote';
    if (this.readouts.raceDataKicker) this.readouts.raceDataKicker.textContent = 'Project radio';
    this.readouts.raceDataTitle.textContent = radio.title;
    if (this.readouts.raceDataNumber) this.readouts.raceDataNumber.textContent = '';
    if (this.readouts.raceDataSubtitle) this.readouts.raceDataSubtitle.textContent = radio.subtitle;
    if (this.readouts.raceDataLink) {
      this.readouts.raceDataLink.hidden = true;
      this.readouts.raceDataLink.removeAttribute('href');
    }
  }

  hideRaceDataPanel() {
    this.readouts.raceDataPanel.classList.add('is-hidden');
    this.readouts.raceDataPanel.classList.remove('is-project-mode', 'is-radio-mode');
    this.readouts.raceDataPanel.removeAttribute('data-idle-mode');
    if (this.readouts.raceDataLink) this.readouts.raceDataLink.hidden = true;
  }

  updateRadioSchedule(now) {
    while (now >= this.radioState.nextChangeAt) {
      if (this.radioState.visible) {
        this.scheduleRadioBreak(this.radioState.nextChangeAt);
      } else {
        this.scheduleRadioPopup(this.radioState.nextChangeAt);
      }
    }
  }

  scheduleRadioBreak(now) {
    this.radioState.visible = false;
    this.radioState.nextChangeAt = now + this.randomRadioRange(RADIO_BREAK_MIN_MS, RADIO_BREAK_MAX_MS);
  }

  scheduleRadioPopup(now) {
    const driverIndex = Math.floor(this.nextRadioRandom() * PROJECT_DRIVERS.length);
    const driver = PROJECT_DRIVERS[driverIndex] ?? PROJECT_DRIVERS[0];
    const quoteCount = Math.max(1, driver.raceData?.length ?? 1);
    this.radioState.visible = true;
    this.radioState.driverIndex = driverIndex;
    this.radioState.quoteIndex = Math.floor(this.nextRadioRandom() * quoteCount);
    this.radioState.nextChangeAt = now + this.randomRadioRange(RADIO_VISIBLE_MIN_MS, RADIO_VISIBLE_MAX_MS);
  }

  randomRadioRange(min, max) {
    return min + this.nextRadioRandom() * (max - min);
  }

  nextRadioRandom() {
    this.radioRandomState = (Math.imul(1664525, this.radioRandomState) + 1013904223) >>> 0;
    return this.radioRandomState / 0x100000000;
  }

  getProjectRadioQuote() {
    const driver = PROJECT_DRIVERS[this.radioState.driverIndex] ?? PROJECT_DRIVERS[0];
    const quote = driver.raceData?.[this.radioState.quoteIndex] ?? 'Project entry';

    return {
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
  app.init().catch((error) => {
    root.dataset.simulatorState = 'error';
    console.error('F1 simulator failed to initialize.', error);
  });
}
