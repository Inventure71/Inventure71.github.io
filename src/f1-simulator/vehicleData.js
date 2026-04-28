const RATING_MINIMUM = 0;
const RATING_NEUTRAL = 50;
const RATING_MAXIMUM = 100;

export const VEHICLE_STAT_DEFINITIONS = {
  power: { minimum: RATING_MINIMUM, neutral: RATING_NEUTRAL, maximum: RATING_MAXIMUM, base: 43000, variance: 3200, output: 'powerNewtons' },
  braking: { minimum: RATING_MINIMUM, neutral: RATING_NEUTRAL, maximum: RATING_MAXIMUM, base: 59000, variance: 4200, output: 'brakeNewtons' },
  aero: { minimum: RATING_MINIMUM, neutral: RATING_NEUTRAL, maximum: RATING_MAXIMUM, base: 6.1, variance: 0.35, output: 'downforceCoefficient' },
  dragEfficiency: { minimum: RATING_MINIMUM, neutral: RATING_NEUTRAL, maximum: RATING_MAXIMUM, base: 0.33, variance: 0.035, direction: -1, output: 'dragCoefficient' },
  mechanicalGrip: { minimum: RATING_MINIMUM, neutral: RATING_NEUTRAL, maximum: RATING_MAXIMUM, base: 2.35, variance: 0.18, output: 'tireGrip' },
  weightControl: { minimum: RATING_MINIMUM, neutral: RATING_NEUTRAL, maximum: RATING_MAXIMUM, base: 798, variance: 10, direction: -1, output: 'mass' },
  tireCare: { minimum: RATING_MINIMUM, neutral: RATING_NEUTRAL, maximum: RATING_MAXIMUM, base: 1, variance: 0.12, output: 'tireCare' },
};

function clampRating(value, label) {
  const rating = Number(value);
  if (!Number.isFinite(rating)) throw new Error(`Invalid vehicle rating for ${label}: ${value}`);
  return Math.min(Math.max(rating, RATING_MINIMUM), RATING_MAXIMUM);
}

function applyRating(definition, value) {
  const normalized = (value - definition.neutral) / (definition.maximum - definition.neutral);
  const direction = definition.direction ?? 1;
  return definition.base + normalized * definition.variance * direction;
}

export class VehicleData {
  constructor({
    id = null,
    name = null,
    power = RATING_NEUTRAL,
    braking = RATING_NEUTRAL,
    aero = RATING_NEUTRAL,
    dragEfficiency = RATING_NEUTRAL,
    mechanicalGrip = RATING_NEUTRAL,
    weightControl = RATING_NEUTRAL,
    tireCare = RATING_NEUTRAL,
  } = {}) {
    this.id = id;
    this.name = name;
    this.power = clampRating(power, 'power');
    this.braking = clampRating(braking, 'braking');
    this.aero = clampRating(aero, 'aero');
    this.dragEfficiency = clampRating(dragEfficiency, 'dragEfficiency');
    this.mechanicalGrip = clampRating(mechanicalGrip, 'mechanicalGrip');
    this.weightControl = clampRating(weightControl, 'weightControl');
    this.tireCare = clampRating(tireCare, 'tireCare');
  }

  ratings() {
    return {
      power: this.power,
      braking: this.braking,
      aero: this.aero,
      dragEfficiency: this.dragEfficiency,
      mechanicalGrip: this.mechanicalGrip,
      weightControl: this.weightControl,
      tireCare: this.tireCare,
    };
  }

  toConstructorArgs() {
    const ratings = this.ratings();
    const values = Object.fromEntries(Object.entries(VEHICLE_STAT_DEFINITIONS).map(([key, definition]) => [
      definition.output,
      applyRating(definition, ratings[key]),
    ]));

    return {
      id: this.id,
      name: this.name,
      ratings,
      ...values,
    };
  }
}
