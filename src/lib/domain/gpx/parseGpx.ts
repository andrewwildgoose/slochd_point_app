export interface ParsedRoutePoint {
lat: number;
lon: number;
ele?: number;
}

export interface ParsedRoute {
name?: string;
points: ParsedRoutePoint[];
}

function normalizeTagName(tagName: string): string {
const parts = tagName.split(':');
return parts[parts.length - 1].toLowerCase();
}

function assertLikelyValidXml(input: string): void {
const tagPattern = /<[^>]+>/g;
const stack: string[] = [];
let match: RegExpExecArray | null;

while ((match = tagPattern.exec(input)) !== null) {
const rawTag = match[0];

if (
rawTag.startsWith('<?') ||
rawTag.startsWith('<!--') ||
rawTag.startsWith('<![CDATA[') ||
rawTag.startsWith('<!DOCTYPE')
) {
continue;
}

const isClosingTag = /^<\s*\//.test(rawTag);
const isSelfClosing = /\/\s*>$/.test(rawTag);
const nameMatch = rawTag.match(/^<\s*\/?\s*([a-zA-Z_][\w:.-]*)/);

if (!nameMatch) {
throw new Error('Invalid XML tag structure');
}

const tagName = normalizeTagName(nameMatch[1]);

if (isClosingTag) {
const expectedTag = stack.pop();
if (expectedTag !== tagName) {
throw new Error(`Unexpected closing tag </${tagName}>`);
}
continue;
}

if (!isSelfClosing) {
stack.push(tagName);
}
}

if (stack.length > 0) {
throw new Error(`Unclosed tag <${stack[stack.length - 1]}>`);
}
}

function extractFirstTagText(input: string, tagNames: string[]): string | undefined {
	const nameRegexByTagName: Record<string, RegExp> = {
		trk: /<trk\b[^>]*>[\s\S]*?<name\b[^>]*>([\s\S]*?)<\/name>[\s\S]*?<\/trk>/i,
		rte: /<rte\b[^>]*>[\s\S]*?<name\b[^>]*>([\s\S]*?)<\/name>[\s\S]*?<\/rte>/i
	};

	for (const tagName of tagNames) {
		const regex = nameRegexByTagName[tagName];
		if (!regex) {
			continue;
		}

		const match = input.match(regex);
		if (match) {
			const name = match[1].trim();
if (name.length > 0) {
return name;
}
}
}

return undefined;
}

function parsePointAttributes(attributes: string): { lat: number; lon: number } | null {
const latMatch = attributes.match(/\blat\s*=\s*(['"])(.*?)\1/i);
const lonMatch = attributes.match(/\blon\s*=\s*(['"])(.*?)\1/i);

if (!latMatch || !lonMatch) {
return null;
}

const lat = Number.parseFloat(latMatch[2]);
const lon = Number.parseFloat(lonMatch[2]);

if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
return null;
}

return { lat, lon };
}

function parseElevation(body: string | undefined): number | undefined {
if (!body) {
return undefined;
}

const eleMatch = body.match(/<ele\b[^>]*>([\s\S]*?)<\/ele>/i);
if (!eleMatch) {
return undefined;
}

const elevation = Number.parseFloat(eleMatch[1].trim());
return Number.isFinite(elevation) ? elevation : undefined;
}

export function parseGpx(gpxText: string): ParsedRoute {
if (typeof gpxText !== 'string' || gpxText.trim().length === 0) {
throw new Error('GPX input must be a non-empty string');
}

const normalizedInput = gpxText.trim();

try {
assertLikelyValidXml(normalizedInput);
} catch (error) {
const message = error instanceof Error ? error.message : 'Malformed XML';
throw new Error(`Invalid GPX XML: ${message}`);
}

if (!/<\s*gpx\b/i.test(normalizedInput)) {
throw new Error('Invalid GPX: missing <gpx> root element');
}

const points: ParsedRoutePoint[] = [];
	const pointPattern = /<(trkpt|rtept)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/gi;
let match: RegExpExecArray | null;

while ((match = pointPattern.exec(normalizedInput)) !== null) {
const attributeText = match[2];
const body = match[3];
const coords = parsePointAttributes(attributeText);
if (!coords) {
continue;
}

const ele = parseElevation(body);
points.push(ele === undefined ? coords : { ...coords, ele });
}

if (points.length === 0) {
throw new Error('GPX contains no usable route points');
}

const name = extractFirstTagText(normalizedInput, ['trk', 'rte']);
return name ? { name, points } : { points };
}
