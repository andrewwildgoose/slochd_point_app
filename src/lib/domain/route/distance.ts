import type { RoutePoint } from './types';

const EARTH_RADIUS_METERS = 6_371_008.8;

function toRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

function assertValidCoordinate(value: number, fieldName: string, min: number, max: number): void {
	if (!Number.isFinite(value)) {
		throw new TypeError(`${fieldName} must be a finite number`);
	}

	if (value < min || value > max) {
		throw new RangeError(`${fieldName} must be between ${min} and ${max}`);
	}
}

function assertValidRoutePoint(point: RoutePoint, index: number): void {
	assertValidCoordinate(point.lat, `route[${index}].lat`, -90, 90);
	assertValidCoordinate(point.lon, `route[${index}].lon`, -180, 180);
}

export function calculateSegmentDistanceMeters(start: RoutePoint, end: RoutePoint): number {
	assertValidRoutePoint(start, 0);
	assertValidRoutePoint(end, 1);

	const startLatRadians = toRadians(start.lat);
	const endLatRadians = toRadians(end.lat);
	const latitudeDeltaRadians = toRadians(end.lat - start.lat);
	const longitudeDeltaRadians = toRadians(end.lon - start.lon);

	const haversine =
		Math.sin(latitudeDeltaRadians / 2) ** 2 +
		Math.cos(startLatRadians) *
			Math.cos(endLatRadians) *
			Math.sin(longitudeDeltaRadians / 2) ** 2;
	const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

	return EARTH_RADIUS_METERS * centralAngle;
}

export function calculateCumulativeRouteDistancesMeters(route: RoutePoint[]): number[] {
	if (route.length === 0) {
		return [];
	}

	const cumulativeDistances = new Array<number>(route.length);
	cumulativeDistances[0] = 0;
	assertValidRoutePoint(route[0], 0);

	for (let i = 1; i < route.length; i += 1) {
		assertValidRoutePoint(route[i], i);
		const segmentDistance = calculateSegmentDistanceMeters(route[i - 1], route[i]);
		cumulativeDistances[i] = cumulativeDistances[i - 1] + segmentDistance;
	}

	return cumulativeDistances;
}

export function calculateTotalRouteDistanceMeters(route: RoutePoint[]): number {
	if (route.length < 2) {
		return 0;
	}

	const cumulativeDistances = calculateCumulativeRouteDistancesMeters(route);
	return cumulativeDistances[cumulativeDistances.length - 1];
}
