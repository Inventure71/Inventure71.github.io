import { Container, Graphics, Texture, TilingSprite } from 'pixi.js';
import { offsetTrackPoint, pointAt, WORLD } from './trackModel.js';

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
const FINISH_LINE_DEPTH = 58;
const FINISH_LINE_COLUMNS = 10;

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
    this.addAsphalt(track);
    this.addKerbs(track);
    this.addBorders(track);
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
    const gravel = this.makeRunoffSideBand(
      track,
      track.width / 2 + 8,
      track.width / 2 + track.gravelWidth,
      GRAVEL_COLOR,
    );
    this.container.addChild(gravel);
  }

  makeRunoffSideBand(track, innerOffset, outerOffset, color) {
    const band = new Graphics();
    const samples = track.samples.slice(0, -1);

    [-1, 1].forEach((side) => {
      const outerPoints = samples.map((sample) => offsetTrackPoint(sample, side * outerOffset));
      const innerPoints = [...samples].reverse().map((sample) => offsetTrackPoint(sample, side * innerOffset));
      const polygon = [...outerPoints, ...innerPoints].flatMap((point) => [point.x, point.y]);
      band.poly(polygon).fill(color);
    });

    return band;
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

    const roadTint = makeTrackPath(track);
    roadTint.stroke({
      width: track.width,
      color: 0x34383e,
      alpha: 0.18,
      join: 'round',
      cap: 'butt',
    });
    this.container.addChild(roadTint);
  }

  addBorders(track) {
    [-1, 1].forEach((side) => {
      const edge = makeTrackPath(track, side * track.width / 2);
      edge.stroke({
        width: 5,
        color: 0xf8fafc,
        alpha: 0.86,
        join: 'round',
        cap: 'butt',
      });
      this.container.addChild(edge);

      const darkEdge = makeTrackPath(track, side * (track.width / 2 + 15));
      darkEdge.stroke({
        width: 7,
        color: 0x090a0d,
        alpha: 0.56,
        join: 'round',
        cap: 'butt',
      });
      this.container.addChild(darkEdge);
    });
  }

  addKerbs(track) {
    const kerbs = new Graphics();
    const samples = track.samples.slice(0, -1);
    const step = 12;

    for (let index = 0; index < samples.length; index += step) {
      const sample = samples[index];
      const next = samples[(index + step) % samples.length];
      const curvature = Math.max(sample.curvature, next.curvature);
      if (curvature < 0.00038) continue;

      const color = Math.floor(index / step) % 2 === 0 ? 0xe10600 : 0xf8fafc;
      [-1, 1].forEach((side) => {
        const innerA = offsetTrackPoint(sample, side * (track.width / 2 - 5));
        const outerA = offsetTrackPoint(sample, side * (track.width / 2 + 24));
        const outerB = offsetTrackPoint(next, side * (track.width / 2 + 24));
        const innerB = offsetTrackPoint(next, side * (track.width / 2 - 5));
        kerbs.poly([innerA.x, innerA.y, outerA.x, outerA.y, outerB.x, outerB.y, innerB.x, innerB.y]).fill(color);
      });
    }
    this.container.addChild(kerbs);
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
