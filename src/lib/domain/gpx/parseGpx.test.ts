import { describe, expect, it } from 'vitest';

import { parseGpx } from './parseGpx';

describe('parseGpx', () => {
it('parses valid GPX with route name and normalized points', () => {
const gpx = `
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
<trk>
<name>Demo route</name>
<trkseg>
<trkpt lat="56.123" lon="-4.321"><ele>123.4</ele></trkpt>
<trkpt lat="56.124" lon="-4.322"></trkpt>
</trkseg>
</trk>
</gpx>
`;

expect(parseGpx(gpx)).toEqual({
name: 'Demo route',
points: [
{ lat: 56.123, lon: -4.321, ele: 123.4 },
{ lat: 56.124, lon: -4.322 }
]
});
});

it('throws a clear error for invalid XML input', () => {
const invalidGpx = '<gpx><trk><trkseg><trkpt lat="56" lon="-4"></trkseg></trk></gpx>';
expect(() => parseGpx(invalidGpx)).toThrow('Invalid GPX XML');
});

it('throws a clear error when no usable points are present', () => {
const noPointsGpx = `
<gpx version="1.1" creator="test">
<trk><name>No points</name><trkseg></trkseg></trk>
</gpx>
`;

expect(() => parseGpx(noPointsGpx)).toThrow('GPX contains no usable route points');
});
});
