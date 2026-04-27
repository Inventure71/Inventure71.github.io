import { Container, Graphics, Texture, TilingSprite } from 'pixi.js';
import { nearestTrackState, offsetTrackPoint, pointAt, WORLD } from './trackModel.js';

export const PROCEDURAL_TRACK_TEXTURES = {
  asphalt: '/assets/game/f1-texture-asphalt.png',
};

const MATERIAL_TILE_SCALE = {
  asphalt: { x: 0.66, y: 0.66 },
};
const WORLD_BACKGROUND_PADDING = 2200;
const GRASS_COLOR = 0x2e7d32;
const GRAVEL_COLOR = 0xb49a68;
const ASPHALT_COLOR = 0x4a4d52;
const EDGE_REVEAL_OFFSET = 5;
const EDGE_REVEAL_WIDTH = 16;
const OUTER_BOUNDARY_OFFSET = 23;
const OUTER_BOUNDARY_WIDTH = 16;
const KERB_OFFSET = 9;
const KERB_WIDTH = 29;
const FINISH_LINE_DEPTH = 58;
const FINISH_LINE_COLUMNS = 10;
const START_GRID_SLOT_COUNT = 20;
const START_GRID_SLOT_SPACING = 82;
const START_GRID_FIRST_DISTANCE = -42;
const START_GRID_LATERAL_OFFSET = 42;
const START_GRID_BOX_LENGTH = 58;
const START_GRID_BOX_WIDTH = 34;
const SEGMENTED_STROKE_STEP = 2;
const KERB_STEP = 4;
const KERB_CURVATURE_THRESHOLD = 0.00038;
const OFFSET_SEGMENT_SAMPLE_COUNT = 7;
const NON_LOCAL_SAMPLE_STEP = 8;
const OFFSET_GAP_SAMPLE_COUNT = 4;

function makeTrackPath(track, offset = 0) {
  const path = new Graphics();
  const samples = track.samples.slice(0, -1);
  const first = offset === 0 ? samples[0] : offsetTrackPoint(samples[0], offset);
  path.moveTo(first.x, first.y);

  samples.slice(1).forEach((sample) => {
    const point = offset === 0 ? sample : offsetTrackPoint(sample, offset);
    path.lineTo(point.x, point.y);
  });
  path.closePath();

  return path;
}

function textureOrWhite(texture) {
  return texture ?? Texture.WHITE;
}

function arcDistance(track, first, second) {
  const delta = Math.abs(first - second);
  return Math.min(delta, track.length - delta);
}

function offsetPointIsLocal(track, source, point, offset) {
  const state = nearestTrackState(track, point);
  const localTolerance = Math.max(220, Math.abs(offset) * 2.1);
  const minimumEdgeDistance = Math.min(track.width / 2 - 8, Math.abs(offset) * 0.72);

  return (
    arcDistance(track, state.distance, source.distance) <= localTolerance &&
    state.crossTrackError >= minimumEdgeDistance
  );
}

function offsetPointOverlapsNonLocalRoad(track, source, point, offset) {
  const localTolerance = Math.max(220, Math.abs(offset) * 2.1);
  const roadBand = track.width / 2 + (track.kerbWidth ?? 0) + 8;
  const roadBandSquared = (roadBand + 42) ** 2;

  for (let index = 0; index < track.samples.length - 1; index += NON_LOCAL_SAMPLE_STEP) {
    const sample = track.samples[index];
    if (arcDistance(track, sample.distance, source.distance) <= localTolerance) continue;

    const dx = point.x - sample.x;
    const dy = point.y - sample.y;
    if (dx * dx + dy * dy > roadBandSquared) continue;

    const signedOffset = dx * sample.normalX + dy * sample.normalY;
    if (Math.abs(signedOffset) <= roadBand) return true;
  }

  return false;
}

function interpolatedSegmentPoint(start, end, amount) {
  return {
    x: start.x + (end.x - start.x) * amount,
    y: start.y + (end.y - start.y) * amount,
  };
}

function pointDistance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function offsetSegmentIsSafe(track, current, next, start, end, offset) {
  const centerDistance = Math.hypot(next.x - current.x, next.y - current.y);
  const edgeDistance = Math.hypot(end.x - start.x, end.y - start.y);
  const maxEdgeDistance = Math.max(centerDistance * 2.6, track.width * 0.58);
  if (edgeDistance > maxEdgeDistance || Math.abs(offset) > track.width + track.gravelWidth + track.runoffWidth) {
    return false;
  }

  const forwardDistance = ((next.distance - current.distance + track.length) % track.length) || centerDistance;

  for (let sample = 0; sample <= OFFSET_SEGMENT_SAMPLE_COUNT; sample += 1) {
    const amount = sample / OFFSET_SEGMENT_SAMPLE_COUNT;
    const source = {
      distance: (current.distance + forwardDistance * amount) % track.length,
    };
    const point = interpolatedSegmentPoint(start, end, amount);
    if (!offsetPointIsLocal(track, source, point, offset)) return false;
    if (offsetPointOverlapsNonLocalRoad(track, source, point, offset)) return false;
  }

  return true;
}

export function offsetGapBridgeIsSafe(track, start, end, width) {
  const bridgeDistance = pointDistance(start, end);
  const maximumBridgeDistance = Math.max(track.width * 0.08, width * 3.4);
  if (bridgeDistance > maximumBridgeDistance) return false;

  const minimumEdgeDistance = track.width / 2 - Math.max(width * 2.5, 10);
  for (let sample = 1; sample < OFFSET_GAP_SAMPLE_COUNT; sample += 1) {
    const amount = sample / OFFSET_GAP_SAMPLE_COUNT;
    const point = interpolatedSegmentPoint(start, end, amount);
    const state = nearestTrackState(track, point);
    if (state.crossTrackError < minimumEdgeDistance) return false;
  }

  return true;
}

export function getOffsetStrokeSegments(track, {
  side,
  offset,
  step = SEGMENTED_STROKE_STEP,
}) {
  const samples = track.samples.slice(0, -1);
  const signedOffset = side * offset;

  return samples.map((current, index) => {
    if (index % step !== 0) return null;

    const next = samples[(index + step) % samples.length];
    const start = offsetTrackPoint(current, signedOffset);
    const end = offsetTrackPoint(next, signedOffset);

    return {
      current,
      next,
      start,
      end,
      safe: offsetSegmentIsSafe(track, current, next, start, end, signedOffset),
    };
  }).filter(Boolean);
}

export function getOffsetGapBridges(track, segments, width) {
  if (segments.length < 2) return [];

  return segments.flatMap((segment, index) => {
    if (!segment.safe) return [];

    const previousIndex = (index - 1 + segments.length) % segments.length;
    if (segments[previousIndex].safe) return [];

    let previousSafe = null;
    for (let lookup = 2; lookup <= segments.length; lookup += 1) {
      const candidate = segments[(index - lookup + segments.length) % segments.length];
      if (!candidate.safe) continue;
      previousSafe = candidate;
      break;
    }

    if (!previousSafe || previousSafe === segment) return [];
    if (!offsetGapBridgeIsSafe(track, previousSafe.end, segment.start, width)) return [];

    return [{
      start: previousSafe.end,
      end: segment.start,
    }];
  });
}

function drawOffsetSegment(graphics, start, end, {
  width,
  color,
  alpha,
  cap,
}) {
  graphics.moveTo(start.x, start.y);
  graphics.lineTo(end.x, end.y);
  graphics.stroke({
    width,
    color,
    alpha,
    join: 'round',
    cap,
  });
}

function drawContinuousOffsetStroke(graphics, track, {
  side,
  offset,
  width,
  color,
  alpha = 1,
  step = SEGMENTED_STROKE_STEP,
}) {
  const samples = track.samples.slice(0, -1).filter((_, index) => index % step === 0);
  if (samples.length < 2) return;

  const first = offsetTrackPoint(samples[0], side * offset);
  graphics.moveTo(first.x, first.y);
  samples.slice(1).forEach((sample) => {
    const point = offsetTrackPoint(sample, side * offset);
    graphics.lineTo(point.x, point.y);
  });
  graphics.closePath();
  graphics.stroke({
    width,
    color,
    alpha,
    join: 'round',
    cap: 'round',
  });
}

function drawSegmentedOffsetStroke(graphics, track, {
  side,
  offset,
  width,
  color,
  alpha = 1,
  step = SEGMENTED_STROKE_STEP,
  cap = 'round',
}) {
  const segments = getOffsetStrokeSegments(track, { side, offset, step });

  segments.forEach((segment) => {
    if (!segment.safe) return;
    drawOffsetSegment(graphics, segment.start, segment.end, {
      width,
      color,
      alpha,
      cap,
    });
  });

  getOffsetGapBridges(track, segments, width).forEach((bridge) => {
    drawOffsetSegment(graphics, bridge.start, bridge.end, {
      width,
      color,
      alpha,
      cap: 'round',
    });
  });
}

export class ProceduralTrackAsset {
  constructor({ textures = {}, world = WORLD } = {}) {
    this.textures = textures;
    this.world = world;
    this.container = new Container();
  }

  render(track) {
    this.container.removeChildren();
    this.addGrass();
    this.addGravelRunoff(track);
    this.addBoundaryUnderlay(track);
    this.addAsphalt(track);
    this.addKerbs(track);
    this.addBorders(track);
    this.addStartingGrid(track);
    this.addFinishLine(track);
  }

  addGrass() {
    const grass = new Graphics();
    grass.rect(
      -WORLD_BACKGROUND_PADDING,
      -WORLD_BACKGROUND_PADDING,
      this.world.width + WORLD_BACKGROUND_PADDING * 2,
      this.world.height + WORLD_BACKGROUND_PADDING * 2,
    ).fill(GRASS_COLOR);
    this.container.addChild(grass);
  }

  addGravelRunoff(track) {
    const gravel = new Graphics();
    const innerOffset = track.width / 2 + 8;
    const outerOffset = track.width / 2 + track.gravelWidth;
    const centerOffset = (innerOffset + outerOffset) / 2;
    const width = outerOffset - innerOffset;

    [-1, 1].forEach((side) => {
      drawContinuousOffsetStroke(gravel, track, {
        side,
        offset: centerOffset,
        width,
        color: GRAVEL_COLOR,
        step: 4,
      });
    });
    this.container.addChild(gravel);
  }

  addBoundaryUnderlay(track) {
    const boundary = new Graphics();
    [-1, 1].forEach((side) => {
      drawContinuousOffsetStroke(boundary, track, {
        side,
        offset: track.width / 2 + OUTER_BOUNDARY_OFFSET,
        width: OUTER_BOUNDARY_WIDTH,
        color: 0x090a0d,
        alpha: 0.64,
        step: 2,
      });
    });

    this.drawKerbStripes(boundary, track, { clipUnsafeSegments: false });

    [-1, 1].forEach((side) => {
      drawContinuousOffsetStroke(boundary, track, {
        side,
        offset: track.width / 2 + EDGE_REVEAL_OFFSET,
        width: EDGE_REVEAL_WIDTH,
        color: 0xf8fafc,
        alpha: 0.94,
        step: 2,
      });
    });

    this.container.addChild(boundary);
  }

  drawKerbStripes(kerbs, track, { clipUnsafeSegments }) {
    const samples = track.samples.slice(0, -1);

    for (let index = 0; index < samples.length; index += KERB_STEP) {
      const sample = samples[index];
      const next = samples[(index + KERB_STEP) % samples.length];
      const curvature = Math.max(sample.curvature, next.curvature);
      if (curvature < KERB_CURVATURE_THRESHOLD) continue;

      const color = Math.floor(index / KERB_STEP) % 2 === 0 ? 0xe10600 : 0xf8fafc;
      [-1, 1].forEach((side) => {
        const offset = side * (track.width / 2 + KERB_OFFSET);
        const start = offsetTrackPoint(sample, offset);
        const end = offsetTrackPoint(next, offset);
        if (clipUnsafeSegments && !offsetSegmentIsSafe(track, sample, next, start, end, offset)) return;
        kerbs.moveTo(start.x, start.y);
        kerbs.lineTo(end.x, end.y);
        kerbs.stroke({
          width: KERB_WIDTH,
          color,
          alpha: 1,
          join: 'round',
          cap: 'butt',
        });
      });
    }
  }

  addMaskedMaterial({ track, texture, strokeWidth, alpha, tileScale }) {
    const sprite = new TilingSprite({
      texture: textureOrWhite(texture),
      width: this.world.width,
      height: this.world.height,
      tileScale,
    });
    sprite.alpha = alpha;

    const mask = makeTrackPath(track);
    mask.stroke({
      width: strokeWidth,
      color: 0xffffff,
      alpha: 1,
      join: 'round',
      cap: 'butt',
    });
    mask.renderable = false;
    sprite.mask = mask;
    this.container.addChild(sprite, mask);
  }

  addAsphalt(track) {
    const asphaltBase = makeTrackPath(track);
    asphaltBase.stroke({
      width: track.width,
      color: ASPHALT_COLOR,
      alpha: 1,
      join: 'round',
      cap: 'butt',
    });
    this.container.addChild(asphaltBase);

    this.addMaskedMaterial({
      track,
      texture: this.textures.asphalt,
      strokeWidth: track.width,
      alpha: 0.18,
      tileScale: MATERIAL_TILE_SCALE.asphalt,
    });

  }

  addBorders(track) {
    const borders = new Graphics();

    [-1, 1].forEach((side) => {
      drawSegmentedOffsetStroke(borders, track, {
        side,
        offset: track.width / 2,
        width: 5,
        color: 0xf8fafc,
        alpha: 0.86,
        step: 4,
      });

      drawSegmentedOffsetStroke(borders, track, {
        side,
        offset: track.width / 2 + 15,
        width: 7,
        color: 0x090a0d,
        alpha: 0.56,
        step: 4,
      });
    });

    this.container.addChild(borders);
  }

  addKerbs(track) {
    const kerbs = new Graphics();
    this.drawKerbStripes(kerbs, track, { clipUnsafeSegments: true });
    this.container.addChild(kerbs);
  }

  addStartingGrid(track) {
    const grid = new Graphics();

    for (let index = 0; index < START_GRID_SLOT_COUNT; index += 1) {
      const base = pointAt(track, START_GRID_FIRST_DISTANCE - index * START_GRID_SLOT_SPACING);
      const lateralOffset = index % 2 === 0 ? -START_GRID_LATERAL_OFFSET : START_GRID_LATERAL_OFFSET;
      const center = offsetTrackPoint(base, lateralOffset);
      const forwardX = Math.cos(base.heading);
      const forwardY = Math.sin(base.heading);
      const normalX = base.normalX;
      const normalY = base.normalY;
      const halfLength = START_GRID_BOX_LENGTH / 2;
      const halfWidth = START_GRID_BOX_WIDTH / 2;
      const corners = [
        {
          x: center.x + forwardX * halfLength + normalX * halfWidth,
          y: center.y + forwardY * halfLength + normalY * halfWidth,
        },
        {
          x: center.x + forwardX * halfLength - normalX * halfWidth,
          y: center.y + forwardY * halfLength - normalY * halfWidth,
        },
        {
          x: center.x - forwardX * halfLength - normalX * halfWidth,
          y: center.y - forwardY * halfLength - normalY * halfWidth,
        },
        {
          x: center.x - forwardX * halfLength + normalX * halfWidth,
          y: center.y - forwardY * halfLength + normalY * halfWidth,
        },
      ];

      grid.poly(corners.flatMap((corner) => [corner.x, corner.y])).stroke({
        width: 3,
        color: 0xf8fafc,
        alpha: 0.8,
        join: 'round',
      });
    }

    this.container.addChild(grid);
  }

  addFinishLine(track) {
    const finishLine = new Graphics();
    const halfDepth = FINISH_LINE_DEPTH / 2;
    this.addFinishLineHalf(finishLine, track, -halfDepth, 0, 0);
    this.addFinishLineHalf(finishLine, track, 0, halfDepth, 1);
    this.container.addChild(finishLine);
  }

  addFinishLineHalf(graphics, track, startDistance, endDistance, rowOffset) {
    const start = pointAt(track, startDistance);
    const end = pointAt(track, endDistance);
    const roadPadding = 10;
    const width = track.width - roadPadding * 2;
    const leftEdge = -width / 2;
    const cellWidth = width / FINISH_LINE_COLUMNS;

    for (let column = 0; column < FINISH_LINE_COLUMNS; column += 1) {
      const innerOffset = leftEdge + column * cellWidth;
      const outerOffset = innerOffset + cellWidth;
      const color = (column + rowOffset) % 2 === 0 ? 0xf8fafc : 0x0b0d12;
      const a = offsetTrackPoint(start, innerOffset);
      const b = offsetTrackPoint(start, outerOffset);
      const c = offsetTrackPoint(end, outerOffset);
      const d = offsetTrackPoint(end, innerOffset);

      graphics.poly([a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y]).fill(color);
    }
  }

}
