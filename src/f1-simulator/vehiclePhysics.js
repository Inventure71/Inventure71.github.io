import { normalizeAngle } from './trackModel.js';

const G = 9.80665;

export const VEHICLE_LIMITS = {
  wheelbase: 3.65,
  maxSteer: 0.56,
  steerRate: 2.35,
  maxSpeed: 165,
  carLength: 66,
  carWidth: 21,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const SURFACE_MODEL = {
  track: { grip: 1, drag: 0, rollingResistance: 0 },
  gravel: { grip: 0.43, drag: 5.4, rollingResistance: 0.72 },
  grass: { grip: 0.34, drag: 3.2, rollingResistance: 0.42 },
  barrier: { grip: 0.18, drag: 9, rollingResistance: 1.2 },
};

export function integrateVehiclePhysics(car, controls, dt) {
  const steeringTarget = clamp(controls.steering ?? 0, -VEHICLE_LIMITS.maxSteer, VEHICLE_LIMITS.maxSteer);
  const steerDelta = clamp(
    steeringTarget - car.steeringAngle,
    -VEHICLE_LIMITS.steerRate * dt,
    VEHICLE_LIMITS.steerRate * dt,
  );
  car.steeringAngle += steerDelta;

  const throttle = clamp(controls.throttle ?? 0, 0, 1);
  const brake = clamp(controls.brake ?? 0, 0, 1);
  const surface = SURFACE_MODEL[car.trackState?.surface] ?? SURFACE_MODEL.track;
  const dragMultiplier = car.drsActive ? 0.58 : 1;
  const engineForce = throttle * car.powerNewtons * Math.max(0.18, 1 - car.speed / 178);
  const brakeForce = brake * car.brakeNewtons;
  const dragForce = (car.dragCoefficient * dragMultiplier + surface.drag) * car.speed * car.speed;
  const rollingForce = surface.rollingResistance * car.mass * G;
  const acceleration = (engineForce - brakeForce - dragForce - rollingForce) / car.mass;

  car.speed = clamp(car.speed + acceleration * dt, 0, VEHICLE_LIMITS.maxSpeed);

  const rawYawRate = car.speed / VEHICLE_LIMITS.wheelbase * Math.tan(car.steeringAngle);
  const downforceGrip = car.downforceCoefficient * car.speed * car.speed / car.mass;
  const surfaceGrip = surface.grip;
  const tyreConditionGrip = clamp(0.82 + (car.tireEnergy ?? 100) / 560, 0.82, 1);
  const maxYawRate = ((car.tireGrip * tyreConditionGrip * G + downforceGrip) * surfaceGrip) / Math.max(car.speed, 8);
  car.yawRate = clamp(rawYawRate, -maxYawRate, maxYawRate);
  car.turnRadius = Math.abs(car.yawRate) < 0.001 ? Infinity : car.speed / Math.abs(car.yawRate);
  car.heading = normalizeAngle(car.heading + car.yawRate * dt);
  car.x += Math.cos(car.heading) * car.speed * dt;
  car.y += Math.sin(car.heading) * car.speed * dt;
  car.throttle = throttle;
  car.brake = brake;
  car.lateralAcceleration = car.speed * car.yawRate;
  car.steerSaturation = rawYawRate === 0 ? 0 : Math.abs(car.yawRate / rawYawRate);
  const tyreLoad = Math.abs(car.lateralAcceleration) / G;
  const wearRate = 0.035 + tyreLoad * 0.11 + brake * 0.07 + throttle * 0.025;
  car.tireEnergy = clamp((car.tireEnergy ?? 100) - wearRate * dt, 38, 100);

  return car;
}

export function getCarCorners(car) {
  const halfLength = VEHICLE_LIMITS.carLength / 2;
  const halfWidth = VEHICLE_LIMITS.carWidth / 2;
  const cos = Math.cos(car.heading);
  const sin = Math.sin(car.heading);
  const forward = { x: cos, y: sin };
  const right = { x: -sin, y: cos };

  return [
    {
      x: car.x + forward.x * halfLength + right.x * halfWidth,
      y: car.y + forward.y * halfLength + right.y * halfWidth,
    },
    {
      x: car.x + forward.x * halfLength - right.x * halfWidth,
      y: car.y + forward.y * halfLength - right.y * halfWidth,
    },
    {
      x: car.x - forward.x * halfLength - right.x * halfWidth,
      y: car.y - forward.y * halfLength - right.y * halfWidth,
    },
    {
      x: car.x - forward.x * halfLength + right.x * halfWidth,
      y: car.y - forward.y * halfLength + right.y * halfWidth,
    },
  ];
}
