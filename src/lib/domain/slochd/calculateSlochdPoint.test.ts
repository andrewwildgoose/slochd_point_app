import { describe, expect, it } from 'vitest';

import { buildCumulativeDistances } from '../route/interpolation.js';
import { calculateSlochdPointOnRoute, type RoutePoint } from './calculateSlochdPoint.js';
import { KILOMETERS_PER_MILE } from './units.js';

// A tiny straight-line route running south–north along longitude 0.
// Each degree of latitude is approximately 111 195 m.
const METRES_PER_DEGREE_LAT = 111_195;

/** Build a straight N-S route of `totalMeters` length starting at lat 0, lon 0. */
function buildStraightRoute(totalMeters: number, numPoints = 10): RoutePoint[] {
	const degreeSpan = totalMeters / METRES_PER_DEGREE_LAT;
	return Array.from({ length: numPoints }, (_, i) => ({
		lat: (degreeSpan * i) / (numPoints - 1),
		lon: 0
	}));
}

describe('calculateSlochdPointOnRoute — normal route', () => {
	it('returns valid lat/lon within the route bounds', () => {
		const points = buildStraightRoute(100_000); // 100 km route
		const result = calculateSlochdPointOnRoute(points);

		expect(result.lat).toBeGreaterThanOrEqual(points[0].lat);
		expect(result.lat).toBeLessThanOrEqual(points[points.length - 1].lat);
		expect(result.lon).toBeCloseTo(0, 6);
	});

	it('returns distanceFromStartMeters > 0 and < totalDistance', () => {
		const points = buildStraightRoute(100_000);
		const result = calculateSlochdPointOnRoute(points);

		expect(result.distanceFromStartMeters).toBeGreaterThan(0);
		expect(result.distanceFromStartMeters).toBeLessThan(100_000);
	});

	it('returns percentThroughRoute between 0 and 1 exclusive', () => {
		const points = buildStraightRoute(100_000);
		const result = calculateSlochdPointOnRoute(points);

		expect(result.percentThroughRoute).toBeGreaterThan(0);
		expect(result.percentThroughRoute).toBeLessThan(1);
	});
});

describe('calculateSlochdPointOnRoute — slochd invariant', () => {
	it('ensures milesCompleted ≈ kilometersRemaining', () => {
		const points = buildStraightRoute(160_000); // 160 km
		const result = calculateSlochdPointOnRoute(points);

		expect(Math.abs(result.milesCompleted - result.kilometersRemaining)).toBeLessThan(1e-6);
	});

	it('satisfies the invariant for various route lengths', () => {
		for (const totalKm of [10, 50, 100, 200, 500]) {
			const points = buildStraightRoute(totalKm * 1000, 20);
			const result = calculateSlochdPointOnRoute(points);
			expect(Math.abs(result.milesCompleted - result.kilometersRemaining)).toBeLessThan(1e-6);
		}
	});

	it('places the slochd point at the correct fraction of the route', () => {
		// Expected fraction: KILOMETERS_PER_MILE / (1 + KILOMETERS_PER_MILE)
		const expectedFraction = KILOMETERS_PER_MILE / (1 + KILOMETERS_PER_MILE);
		const points = buildStraightRoute(100_000, 100);
		const result = calculateSlochdPointOnRoute(points);

		expect(result.percentThroughRoute).toBeCloseTo(expectedFraction, 3);
	});
});

describe('calculateSlochdPointOnRoute — interpolation', () => {
	it('interpolates between waypoints when target falls between them', () => {
		// Two-point route: guaranteed interpolation since the slochd point won't
		// exactly land on either endpoint.
		const totalMeters = 100_000;
		const points: RoutePoint[] = [
			{ lat: 0, lon: 0 },
			{ lat: totalMeters / METRES_PER_DEGREE_LAT, lon: 0 }
		];
		const result = calculateSlochdPointOnRoute(points);

		// lat should be strictly between the two endpoints
		expect(result.lat).toBeGreaterThan(0);
		expect(result.lat).toBeLessThan(totalMeters / METRES_PER_DEGREE_LAT);
	});

	it('preserves elevation when both neighbouring points have ele', () => {
		const totalMeters = 100_000;
		const points: RoutePoint[] = [
			{ lat: 0, lon: 0, ele: 0 },
			{ lat: totalMeters / METRES_PER_DEGREE_LAT, lon: 0, ele: 1000 }
		];
		const result = calculateSlochdPointOnRoute(points);

		expect(result.ele).toBeDefined();
		expect(result.ele!).toBeGreaterThan(0);
		expect(result.ele!).toBeLessThan(1000);
	});
});

describe('calculateSlochdPointOnRoute — unit conversion correctness', () => {
	it('distanceFromStartMeters matches milesCompleted converted to metres', () => {
		const points = buildStraightRoute(100_000);
		const result = calculateSlochdPointOnRoute(points);

		const METERS_PER_MILE = 1609.344;
		const expectedMeters = result.milesCompleted * METERS_PER_MILE;
		expect(result.distanceFromStartMeters).toBeCloseTo(expectedMeters, 3);
	});

	it('kilometersRemaining matches distance-remaining converted to km', () => {
		const points = buildStraightRoute(100_000, 20);
		const result = calculateSlochdPointOnRoute(points);

		const withDistances = buildCumulativeDistances(points);
		const totalMeters = withDistances[withDistances.length - 1].cumulativeDistanceMeters;
		const remainingMeters = totalMeters - result.distanceFromStartMeters;
		const remainingKm = remainingMeters / 1000;

		expect(result.kilometersRemaining).toBeCloseTo(remainingKm, 6);
	});
});

describe('calculateSlochdPointOnRoute — invalid / too-short routes', () => {
	it('throws RangeError for a single-point route', () => {
		expect(() => calculateSlochdPointOnRoute([{ lat: 0, lon: 0 }])).toThrow(RangeError);
	});

	it('throws RangeError for an empty route', () => {
		expect(() => calculateSlochdPointOnRoute([])).toThrow(RangeError);
	});

	it('throws RangeError when all points are identical (zero-length route)', () => {
		const samePoint: RoutePoint = { lat: 57.1, lon: -4.0 };
		expect(() => calculateSlochdPointOnRoute([samePoint, samePoint, samePoint])).toThrow(
			RangeError
		);
	});
});
