import { describe, expect, it } from 'vitest';

import {
	calculateCumulativeRouteDistancesMeters,
	calculateSegmentDistanceMeters,
	calculateTotalRouteDistanceMeters
} from './distance';
import type { RoutePoint } from './types';

const EQUATOR_DEGREE_DISTANCE_METERS = 111_195;

describe('route distance utilities', () => {
	it('calculates distance for a two-point route', () => {
		const route: RoutePoint[] = [
			{ lat: 0, lon: 0 },
			{ lat: 0, lon: 1 }
		];

		const segmentDistance = calculateSegmentDistanceMeters(route[0], route[1]);
		const cumulative = calculateCumulativeRouteDistancesMeters(route);
		const total = calculateTotalRouteDistanceMeters(route);

		expect(segmentDistance).toBeCloseTo(EQUATOR_DEGREE_DISTANCE_METERS, -2);
		expect(cumulative).toHaveLength(2);
		expect(cumulative[0]).toBe(0);
		expect(cumulative[1]).toBeCloseTo(segmentDistance, 6);
		expect(total).toBeCloseTo(segmentDistance, 6);
	});

	it('calculates cumulative and total distance for a multi-point route', () => {
		const route: RoutePoint[] = [
			{ lat: 0, lon: 0 },
			{ lat: 0, lon: 1 },
			{ lat: 0, lon: 2 }
		];

		const cumulative = calculateCumulativeRouteDistancesMeters(route);
		const total = calculateTotalRouteDistanceMeters(route);

		expect(cumulative).toHaveLength(3);
		expect(cumulative[0]).toBe(0);
		expect(cumulative[1]).toBeCloseTo(EQUATOR_DEGREE_DISTANCE_METERS, -2);
		expect(cumulative[2]).toBeCloseTo(2 * EQUATOR_DEGREE_DISTANCE_METERS, -2);
		expect(total).toBeCloseTo(cumulative[2], 6);
	});

	it('handles a very short route', () => {
		const route: RoutePoint[] = [
			{ lat: 57.0, lon: -3.7 },
			{ lat: 57.000001, lon: -3.700001 }
		];

		const total = calculateTotalRouteDistanceMeters(route);

		expect(total).toBeGreaterThan(0);
		expect(total).toBeLessThan(0.2);
	});

	it('handles empty input and invalid coordinates', () => {
		expect(calculateCumulativeRouteDistancesMeters([])).toEqual([]);
		expect(calculateTotalRouteDistanceMeters([])).toBe(0);

		expect(() =>
			calculateSegmentDistanceMeters({ lat: Number.NaN, lon: 0 }, { lat: 0, lon: 0 })
		).toThrow(TypeError);
		expect(() =>
			calculateSegmentDistanceMeters({ lat: 0, lon: 0 }, { lat: 95, lon: 0 })
		).toThrow(RangeError);
	});
});
