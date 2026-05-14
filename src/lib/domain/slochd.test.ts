import { describe, expect, it } from 'vitest';

import {
KILOMETERS_PER_MILE,
calculateSlochdPoint,
calculateSlochdPointDistanceFromTotalKilometers,
kilometersToMiles,
milesToKilometers
} from './slochd';

const FLOAT_TOLERANCE = 1e-9;

describe('unit conversion helpers', () => {
it('converts miles to kilometers', () => {
expect(milesToKilometers(1)).toBeCloseTo(1.609344, 6);
expect(milesToKilometers(26.2)).toBeCloseTo(42.1648128, 7);
});

it('converts kilometers to miles', () => {
expect(kilometersToMiles(1.609344)).toBeCloseTo(1, 9);
expect(kilometersToMiles(10)).toBeCloseTo(6.213711922, 9);
});
});

describe('slochd formula', () => {
it('derives distance from start using explicit formula', () => {
const totalKilometers = 100;
const result = calculateSlochdPointDistanceFromTotalKilometers(totalKilometers);

const expectedMilesFromStart = totalKilometers / (1 + KILOMETERS_PER_MILE);
expect(result.miles).toBeCloseTo(expectedMilesFromStart, 12);
expect(result.kilometers).toBeCloseTo(milesToKilometers(expectedMilesFromStart), 12);
});

it('returns structured values for representative route distances', () => {
const result = calculateSlochdPoint({ value: 160, unit: 'kilometers' });
expect(result.totalDistance.kilometers).toBe(160);
expect(result.totalDistance.miles).toBeCloseTo(kilometersToMiles(160), 12);
expect(result.distanceFromStart.kilometers).toBeGreaterThan(0);
expect(result.distanceFromStart.kilometers).toBeLessThan(160);
expect(result.fractionFromStart).toBeGreaterThan(0);
expect(result.fractionFromStart).toBeLessThan(1);
});

it('ensures miles completed equals kilometers remaining within tolerance', () => {
const result = calculateSlochdPoint({ value: 100, unit: 'miles' });
expect(result.distanceFromStart.miles).toBeCloseTo(result.distanceRemaining.kilometers, 9);
expect(Math.abs(result.distanceFromStart.miles - result.distanceRemaining.kilometers)).toBeLessThan(
FLOAT_TOLERANCE
);
});
});

describe('edge cases and invalid input handling', () => {
it('supports zero total distance', () => {
const result = calculateSlochdPoint({ value: 0, unit: 'kilometers' });
expect(result.totalDistance.kilometers).toBe(0);
expect(result.distanceFromStart.kilometers).toBe(0);
expect(result.distanceRemaining.kilometers).toBe(0);
});

it('throws for negative distances', () => {
expect(() => milesToKilometers(-1)).toThrow(RangeError);
expect(() => kilometersToMiles(-1)).toThrow(RangeError);
expect(() => calculateSlochdPointDistanceFromTotalKilometers(-1)).toThrow(RangeError);
expect(() => calculateSlochdPoint({ value: -1, unit: 'miles' })).toThrow(RangeError);
});

it('throws for non-finite distances', () => {
expect(() => milesToKilometers(Number.NaN)).toThrow(TypeError);
expect(() => kilometersToMiles(Number.POSITIVE_INFINITY)).toThrow(TypeError);
expect(() => calculateSlochdPointDistanceFromTotalKilometers(Number.NaN)).toThrow(TypeError);
expect(() => calculateSlochdPoint({ value: Number.NaN, unit: 'kilometers' })).toThrow(TypeError);
});
});
