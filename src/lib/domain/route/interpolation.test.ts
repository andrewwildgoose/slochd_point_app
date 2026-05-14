import { describe, expect, it } from 'vitest';

import {
	buildCumulativeDistances,
	findPointAtDistance,
	haversineDistanceMeters,
	interpolatePoint,
	type RoutePoint
} from './interpolation.js';

describe('haversineDistanceMeters', () => {
	it('returns 0 for identical points', () => {
		const p: RoutePoint = { lat: 51.5, lon: -0.1 };
		expect(haversineDistanceMeters(p, p)).toBe(0);
	});

	it('calculates ~111 km for 1 degree of latitude', () => {
		const a: RoutePoint = { lat: 0, lon: 0 };
		const b: RoutePoint = { lat: 1, lon: 0 };
		// 1° latitude ≈ 111 195 m at the equator
		expect(haversineDistanceMeters(a, b)).toBeCloseTo(111_195, -2);
	});

	it('calculates a known distance between two cities', () => {
		// London (51.5074, -0.1278) to Paris (48.8566, 2.3522) ≈ 340 km
		const london: RoutePoint = { lat: 51.5074, lon: -0.1278 };
		const paris: RoutePoint = { lat: 48.8566, lon: 2.3522 };
		const dist = haversineDistanceMeters(london, paris);
		expect(dist).toBeGreaterThan(340_000);
		expect(dist).toBeLessThan(345_000);
	});

	it('is symmetric', () => {
		const a: RoutePoint = { lat: 57.1, lon: -4.0 };
		const b: RoutePoint = { lat: 56.8, lon: -3.5 };
		expect(haversineDistanceMeters(a, b)).toBeCloseTo(haversineDistanceMeters(b, a), 6);
	});
});

describe('buildCumulativeDistances', () => {
	it('assigns zero to the first point', () => {
		const points: RoutePoint[] = [
			{ lat: 0, lon: 0 },
			{ lat: 1, lon: 0 }
		];
		const result = buildCumulativeDistances(points);
		expect(result[0].cumulativeDistanceMeters).toBe(0);
	});

	it('accumulates distances correctly across three points', () => {
		const a: RoutePoint = { lat: 0, lon: 0 };
		const b: RoutePoint = { lat: 1, lon: 0 };
		const c: RoutePoint = { lat: 2, lon: 0 };
		const result = buildCumulativeDistances([a, b, c]);

		const ab = haversineDistanceMeters(a, b);
		const bc = haversineDistanceMeters(b, c);

		expect(result[0].cumulativeDistanceMeters).toBe(0);
		expect(result[1].cumulativeDistanceMeters).toBeCloseTo(ab, 6);
		expect(result[2].cumulativeDistanceMeters).toBeCloseTo(ab + bc, 6);
	});

	it('preserves all original point fields', () => {
		const point: RoutePoint = { lat: 51, lon: -4, ele: 100 };
		const result = buildCumulativeDistances([point, { lat: 52, lon: -4 }]);
		expect(result[0].lat).toBe(51);
		expect(result[0].lon).toBe(-4);
		expect(result[0].ele).toBe(100);
	});
});

describe('interpolatePoint', () => {
	it('returns point a at fraction 0', () => {
		const a: RoutePoint = { lat: 0, lon: 0 };
		const b: RoutePoint = { lat: 10, lon: 10 };
		const result = interpolatePoint(a, b, 0);
		expect(result.lat).toBe(0);
		expect(result.lon).toBe(0);
	});

	it('returns point b at fraction 1', () => {
		const a: RoutePoint = { lat: 0, lon: 0 };
		const b: RoutePoint = { lat: 10, lon: 10 };
		const result = interpolatePoint(a, b, 1);
		expect(result.lat).toBe(10);
		expect(result.lon).toBe(10);
	});

	it('returns the midpoint at fraction 0.5', () => {
		const a: RoutePoint = { lat: 0, lon: 0 };
		const b: RoutePoint = { lat: 10, lon: 20 };
		const result = interpolatePoint(a, b, 0.5);
		expect(result.lat).toBeCloseTo(5, 10);
		expect(result.lon).toBeCloseTo(10, 10);
	});

	it('interpolates elevation when both points have it', () => {
		const a: RoutePoint = { lat: 0, lon: 0, ele: 100 };
		const b: RoutePoint = { lat: 0, lon: 0, ele: 200 };
		const result = interpolatePoint(a, b, 0.5);
		expect(result.ele).toBeCloseTo(150, 10);
	});

	it('omits elevation when either endpoint lacks it', () => {
		const a: RoutePoint = { lat: 0, lon: 0, ele: 100 };
		const b: RoutePoint = { lat: 0, lon: 1 };
		const result = interpolatePoint(a, b, 0.5);
		expect(result.ele).toBeUndefined();
	});
});

describe('findPointAtDistance', () => {
	const pointA: RoutePoint = { lat: 0, lon: 0 };
	const pointB: RoutePoint = { lat: 1, lon: 0 };
	const pointC: RoutePoint = { lat: 2, lon: 0 };

	it('returns the first point at distance 0', () => {
		const pts = buildCumulativeDistances([pointA, pointB]);
		const result = findPointAtDistance(pts, 0);
		expect(result.lat).toBeCloseTo(0, 10);
		expect(result.lon).toBeCloseTo(0, 10);
	});

	it('returns the last point when target exceeds total distance', () => {
		const pts = buildCumulativeDistances([pointA, pointB]);
		const totalDist = pts[pts.length - 1].cumulativeDistanceMeters;
		const result = findPointAtDistance(pts, totalDist + 1000);
		expect(result.lat).toBeCloseTo(pointB.lat, 6);
		expect(result.lon).toBeCloseTo(pointB.lon, 6);
	});

	it('returns a point exactly on a vertex when distance matches', () => {
		const pts = buildCumulativeDistances([pointA, pointB, pointC]);
		const distToB = pts[1].cumulativeDistanceMeters;
		const result = findPointAtDistance(pts, distToB);
		expect(result.lat).toBeCloseTo(1, 6);
		expect(result.lon).toBeCloseTo(0, 6);
	});

	it('interpolates within a segment', () => {
		const pts = buildCumulativeDistances([pointA, pointB]);
		const halfDist = pts[1].cumulativeDistanceMeters / 2;
		const result = findPointAtDistance(pts, halfDist);
		// Midpoint should be roughly at lat 0.5
		expect(result.lat).toBeCloseTo(0.5, 3);
		expect(result.lon).toBeCloseTo(0, 6);
	});
});
