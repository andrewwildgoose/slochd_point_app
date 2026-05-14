const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (deg: number) => (deg * Math.PI) / 180;

export interface RoutePoint {
	lat: number;
	lon: number;
	ele?: number;
}

export interface RoutePointWithDistance extends RoutePoint {
	cumulativeDistanceMeters: number;
}

/**
 * Returns the great-circle distance in meters between two coordinate pairs
 * using the Haversine formula.
 */
export function haversineDistanceMeters(a: RoutePoint, b: RoutePoint): number {
	const dLat = toRadians(b.lat - a.lat);
	const dLon = toRadians(b.lon - a.lon);
	const lat1 = toRadians(a.lat);
	const lat2 = toRadians(b.lat);

	const sinHalfDLat = Math.sin(dLat / 2);
	const sinHalfDLon = Math.sin(dLon / 2);

	const h =
		sinHalfDLat * sinHalfDLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfDLon * sinHalfDLon;

	return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/**
 * Attaches a running cumulative distance (in meters) to each route point.
 * The first point always has `cumulativeDistanceMeters === 0`.
 */
export function buildCumulativeDistances(points: RoutePoint[]): RoutePointWithDistance[] {
	let running = 0;
	return points.map((point, i) => {
		if (i > 0) {
			running += haversineDistanceMeters(points[i - 1], point);
		}
		return { ...point, cumulativeDistanceMeters: running };
	});
}

/**
 * Linearly interpolates between two points by `fraction` (0 → a, 1 → b).
 * Elevation is interpolated only when both endpoints have it.
 */
export function interpolatePoint(a: RoutePoint, b: RoutePoint, fraction: number): RoutePoint {
	const lat = a.lat + (b.lat - a.lat) * fraction;
	const lon = a.lon + (b.lon - a.lon) * fraction;

	if (a.ele !== undefined && b.ele !== undefined) {
		return { lat, lon, ele: a.ele + (b.ele - a.ele) * fraction };
	}

	return { lat, lon };
}

/**
 * Finds the exact route point at `targetDistanceMeters` along the route by
 * scanning the array of points-with-cumulative-distances and interpolating
 * within the containing segment.
 *
 * Assumes `points` is non-empty and distances are non-decreasing.
 */
export function findPointAtDistance(
	points: RoutePointWithDistance[],
	targetDistanceMeters: number
): RoutePoint {
	const last = points[points.length - 1];

	// Clamp to endpoints
	if (targetDistanceMeters <= 0) {
		const { lat, lon, ele } = points[0];
		return ele !== undefined ? { lat, lon, ele } : { lat, lon };
	}
	if (targetDistanceMeters >= last.cumulativeDistanceMeters) {
		const { lat, lon, ele } = last;
		return ele !== undefined ? { lat, lon, ele } : { lat, lon };
	}

	// Find the segment that straddles the target distance
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const curr = points[i];

		if (curr.cumulativeDistanceMeters >= targetDistanceMeters) {
			const segmentLength = curr.cumulativeDistanceMeters - prev.cumulativeDistanceMeters;
			const fraction =
				segmentLength === 0
					? 0
					: (targetDistanceMeters - prev.cumulativeDistanceMeters) / segmentLength;

			return interpolatePoint(prev, curr, fraction);
		}
	}

	// Should never reach here given the clamp above
	const { lat, lon, ele } = last;
	return ele !== undefined ? { lat, lon, ele } : { lat, lon };
}
