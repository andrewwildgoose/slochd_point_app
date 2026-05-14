export const METERS_PER_KILOMETER = 1000;
export const KILOMETERS_PER_MILE = 1.609344;
export const MILES_PER_KILOMETER = 1 / KILOMETERS_PER_MILE;
export const METERS_PER_MILE = METERS_PER_KILOMETER * KILOMETERS_PER_MILE;

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
export const SLOCHD_DENOMINATOR = 1 + KILOMETERS_PER_MILE;

export function metersToKilometers(meters: number): number {
	return meters / METERS_PER_KILOMETER;
}

export function metersToMiles(meters: number): number {
	return meters / METERS_PER_MILE;
}

export function milesToMeters(miles: number): number {
	return miles * METERS_PER_MILE;
}

export function kilometersToMiles(kilometers: number): number {
	return kilometers * MILES_PER_KILOMETER;
}

export function milesToKilometers(miles: number): number {
	return miles * KILOMETERS_PER_MILE;
}
