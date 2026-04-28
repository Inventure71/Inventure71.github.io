# F1 Simulator Data Model

This simulator separates three responsibilities:

- `DriverData` defines the driver ratings sheet.
- `VehicleData` defines the vehicle ratings sheet.
- `championship.js` pairs one driver sheet with one vehicle sheet for each championship entry.

The race loop does not read raw rating numbers directly. It receives constructor arguments produced by the data classes.

## Rating Scale

Driver and vehicle stats use a `0-100` rating scale.

- `50` is neutral.
- Values above `50` add to the class default.
- Values below `50` subtract from the class default.
- Each stat has its own `base` and `variance`, so different stats scale by appropriate physical or behavioral amounts.

The conversion is:

```js
normalized = (rating - 50) / 50;
actualValue = base + normalized * variance;
```

For vehicle stats where lower is better, such as drag and mass, the stat definition uses `direction: -1`.

## Driver Data

`driverData.js` owns the driver data class.

```js
new DriverData({
  pace,
  racecraft,
  aggression,
  riskTolerance,
  patience,
  consistency,
})
```

Driver stats:

- `pace`: Converts to the driver's base speed potential.
- `racecraft`: Converts to the driver's ability to handle traffic, steering, and race situations.
- `aggression`: Converts to the driver's willingness to attack and choose passing lines.
- `riskTolerance`: Converts to how much nearby traffic risk the driver accepts.
- `patience`: Converts to how much the driver waits before escalating aggression.
- `consistency`: Stored as constructor data for future behavior tuning.

`DriverData.toConstructorArgs()` returns:

```js
{
  ratings,
  pace,
  racecraft,
  consistency,
  personality: {
    aggression,
    riskTolerance,
    patience,
  },
}
```

Those values are consumed by `raceSimulation.js` and `driverController.js`.

## Vehicle Data

`vehicleData.js` owns the vehicle data class.

```js
new VehicleData({
  id,
  name,
  power,
  braking,
  aero,
  dragEfficiency,
  mechanicalGrip,
  weightControl,
  tireCare,
})
```

Vehicle stats:

- `power`: Converts to `powerNewtons`.
- `braking`: Converts to `brakeNewtons`.
- `aero`: Converts to `downforceCoefficient`.
- `dragEfficiency`: Converts inversely to `dragCoefficient`; higher rating means less drag.
- `mechanicalGrip`: Converts to `tireGrip`.
- `weightControl`: Converts inversely to `mass`; higher rating means lower mass.
- `tireCare`: Converts to `tireCare`, reserved for tire behavior tuning.

`VehicleData.toConstructorArgs()` returns:

```js
{
  id,
  name,
  ratings,
  powerNewtons,
  brakeNewtons,
  downforceCoefficient,
  dragCoefficient,
  tireGrip,
  mass,
  tireCare,
}
```

Those values are consumed by `raceSimulation.js` when creating the physical car.

## Championship Pairings

`championship.js` defines one pairing per project:

```js
{
  driverId: 'budget',
  driverNumber: 71,
  timingName: 'Budget',
  driver: new DriverData({ pace: 52, racecraft: 74, ... }),
  vehicle: new VehicleData({ id: 'budget-bb01', power: 48, braking: 72, ... }),
}
```

`buildChampionshipDriverGrid()` merges the project metadata from `drivers.js` with the championship pairing data. The result still looks like the old driver objects to the UI, but now also contains:

```js
constructorArgs: {
  driver: driver.toConstructorArgs(),
  vehicle: vehicle.toConstructorArgs(),
}
```

It also copies the converted driver fields and vehicle fields onto the object used by `createRaceSimulation()`.

## Runtime Flow

1. `main.js` imports `CHAMPIONSHIP_PROJECT_DRIVERS`.
2. `main.js` passes those entries to `createRaceSimulation()`.
3. `raceSimulation.js` creates each physical car from the driver entry.
4. Driver values affect behavior through `driverController.js`.
5. Vehicle values affect physics through `vehiclePhysics.js`.

In short: the championship file chooses the pairings, the data classes convert ratings into constructor arguments, and the simulation uses those converted arguments.
