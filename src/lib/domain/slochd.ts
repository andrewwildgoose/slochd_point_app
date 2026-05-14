export const KILOMETERS_PER_MILE = 1.609344;
export const MILES_PER_KILOMETER = 1 / KILOMETERS_PER_MILE;

const SLOCHD_DENOMINATOR = 1 + KILOMETERS_PER_MILE;
const SLOCHD_FRACTION_FROM_START = KILOMETERS_PER_MILE / SLOCHD_DENOMINATOR;

export type DistanceUnit = 'kilometers' | 'miles';

export interface Distance {
kilometers: number;
miles: number;
}

export interface SlochdPointResult {
totalDistance: Distance;
distanceFromStart: Distance;
distanceRemaining: Distance;
fractionFromStart: number;
}

function assertValidDistance(value: number, fieldName: string): void {
if (!Number.isFinite(value)) {
throw new TypeError(`${fieldName} must be a finite number`);
}

if (value < 0) {
throw new RangeError(`${fieldName} must be zero or greater`);
}
}

export function milesToKilometers(miles: number): number {
assertValidDistance(miles, 'miles');
return miles * KILOMETERS_PER_MILE;
}

export function kilometersToMiles(kilometers: number): number {
assertValidDistance(kilometers, 'kilometers');
return kilometers * MILES_PER_KILOMETER;
}

export function calculateSlochdPointDistanceFromTotalKilometers(totalKilometers: number): Distance {
assertValidDistance(totalKilometers, 'totalKilometers');

/*
 * At the slochd point:
 *   milesCompleted = kilometersRemaining
 * Let d = total route distance in kilometers.
 * Let m = miles completed at slochd point.
 * Then kilometers completed is m * KILOMETERS_PER_MILE and:
 *   m = d - (m * KILOMETERS_PER_MILE)
 *   m * (1 + KILOMETERS_PER_MILE) = d
 *   m = d / (1 + KILOMETERS_PER_MILE)
 */
const milesFromStart = totalKilometers / SLOCHD_DENOMINATOR;
const kilometersFromStart = milesToKilometers(milesFromStart);

return {
kilometers: kilometersFromStart,
miles: milesFromStart
};
}

export function calculateSlochdPoint(input: { value: number; unit: DistanceUnit }): SlochdPointResult {
const totalDistanceKilometers =
input.unit === 'kilometers' ? input.value : milesToKilometers(input.value);

const distanceFromStart = calculateSlochdPointDistanceFromTotalKilometers(totalDistanceKilometers);
const distanceRemainingKilometers = totalDistanceKilometers - distanceFromStart.kilometers;
const distanceRemainingMiles = kilometersToMiles(distanceRemainingKilometers);

return {
totalDistance: {
kilometers: totalDistanceKilometers,
miles: kilometersToMiles(totalDistanceKilometers)
},
distanceFromStart,
distanceRemaining: {
kilometers: distanceRemainingKilometers,
miles: distanceRemainingMiles
},
fractionFromStart: SLOCHD_FRACTION_FROM_START
};
}
