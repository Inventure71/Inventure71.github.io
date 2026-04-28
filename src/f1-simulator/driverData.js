const RATING_MINIMUM = 0;
const RATING_NEUTRAL = 50;
const RATING_MAXIMUM = 100;

export const DRIVER_STAT_DEFINITIONS = {
  pace: { minimum: RATING_MINIMUM, neutral: RATING_NEUTRAL, maximum: RATING_MAXIMUM, base: 1, variance: 0.08 },
  racecraft: { minimum: RATING_MINIMUM, neutral: RATING_NEUTRAL, maximum: RATING_MAXIMUM, base: 0.78, variance: 0.16 },
  aggression: { minimum: RATING_MINIMUM, neutral: RATING_NEUTRAL, maximum: RATING_MAXIMUM, base: 0.5, variance: 0.34 },
  riskTolerance: { minimum: RATING_MINIMUM, neutral: RATING_NEUTRAL, maximum: RATING_MAXIMUM, base: 0.5, variance: 0.28 },
  patience: { minimum: RATING_MINIMUM, neutral: RATING_NEUTRAL, maximum: RATING_MAXIMUM, base: 0.5, variance: 0.28 },
  consistency: { minimum: RATING_MINIMUM, neutral: RATING_NEUTRAL, maximum: RATING_MAXIMUM, base: 0.75, variance: 0.16 },
};

function clampRating(value, label) {
  const rating = Number(value);
  if (!Number.isFinite(rating)) throw new Error(`Invalid driver rating for ${label}: ${value}`);
  return Math.min(Math.max(rating, RATING_MINIMUM), RATING_MAXIMUM);
}

function applyRating(definition, value) {
  const normalized = (value - definition.neutral) / (definition.maximum - definition.neutral);
  return definition.base + normalized * definition.variance;
}

export class DriverData {
  constructor({
    pace = RATING_NEUTRAL,
    racecraft = RATING_NEUTRAL,
    aggression = RATING_NEUTRAL,
    riskTolerance = RATING_NEUTRAL,
    patience = RATING_NEUTRAL,
    consistency = RATING_NEUTRAL,
  } = {}) {
    this.pace = clampRating(pace, 'pace');
    this.racecraft = clampRating(racecraft, 'racecraft');
    this.aggression = clampRating(aggression, 'aggression');
    this.riskTolerance = clampRating(riskTolerance, 'riskTolerance');
    this.patience = clampRating(patience, 'patience');
    this.consistency = clampRating(consistency, 'consistency');
  }

  ratings() {
    return {
      pace: this.pace,
      racecraft: this.racecraft,
      aggression: this.aggression,
      riskTolerance: this.riskTolerance,
      patience: this.patience,
      consistency: this.consistency,
    };
  }

  toConstructorArgs() {
    return {
      ratings: this.ratings(),
      pace: applyRating(DRIVER_STAT_DEFINITIONS.pace, this.pace),
      racecraft: applyRating(DRIVER_STAT_DEFINITIONS.racecraft, this.racecraft),
      consistency: applyRating(DRIVER_STAT_DEFINITIONS.consistency, this.consistency),
      personality: {
        aggression: applyRating(DRIVER_STAT_DEFINITIONS.aggression, this.aggression),
        riskTolerance: applyRating(DRIVER_STAT_DEFINITIONS.riskTolerance, this.riskTolerance),
        patience: applyRating(DRIVER_STAT_DEFINITIONS.patience, this.patience),
      },
    };
  }
}
