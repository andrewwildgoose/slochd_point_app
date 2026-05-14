import {
	buildCumulativeDistances,
	findPointAtDistance,
	type RoutePoint
} from '../route/interpolation.js';
import {
	metersToKilometers,
	metersToMiles,
	milesToMeters,
	SLOCHD_DENOMINATOR
} from './units.js';

export type { RoutePoint };

export interface SlochdPointOnRoute {
	/** Latitude of the slochd point. */
	lat: number;
	/** Longitude of the slochd point. */
	lon: number;
	/** Elevation of the slochd point, when available. */
	ele?: number;
	/** Distance from the route start to the slochd point, in meters. */
	distanceFromStartMeters: number;
	/** Miles completed from the route start to the slochd point. */
	milesCompleted: number;
	/** Kilometers remaining from the slochd point to the route end. */
	kilometersRemaining: number;
	/** Fraction of the total route distance covered at the slochd point (0–1). */
	percentThroughRoute: number;
}

/**
 * Calculates the slochd point on a route: the location where miles completed
 * from the start equals kilometres remaining to the finish.
 *
 * @param points - An ordered array of route points (at least two).
 * @returns The slochd point and associated metadata.
 * @throws {RangeError} If fewer than two points are supplied or the route has
 *   zero length.
 */
export function calculateSlochdPointOnRoute(points: RoutePoint[]): SlochdPointOnRoute {
	if (points.length < 2) {
		throw new RangeError('Route must contain at least two points');
	}

	const withDistances = buildCumulativeDistances(points);
	const totalDistanceMeters = withDistances[withDistances.length - 1].cumulativeDistanceMeters;

	if (totalDistanceMeters === 0) {
		throw new RangeError('Route total distance must be greater than zero');
	}

	const totalDistanceKilometers = metersToKilometers(totalDistanceMeters);

	/*
	 * At the slochd point:
	 *   milesCompleted = kilometersRemaining
	 * milesCompleted = totalKilometers / (1 + KILOMETERS_PER_MILE)
	 */
	const milesCompleted = totalDistanceKilometers / SLOCHD_DENOMINATOR;
	const distanceFromStartMeters = milesToMeters(milesCompleted);

	const location = findPointAtDistance(withDistances, distanceFromStartMeters);

	const kilometersRemaining = metersToKilometers(totalDistanceMeters - distanceFromStartMeters);

	return {
		...location,
		distanceFromStartMeters,
		milesCompleted,
		kilometersRemaining,
		percentThroughRoute: distanceFromStartMeters / totalDistanceMeters
	};
}
