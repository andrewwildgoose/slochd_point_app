# MVP Architecture Proposal

This document proposes a production-ready MVP architecture for `andrewwildgoose/slochd_point_app` using **SvelteKit as the primary framework**.

It is based on the following assumptions:
- the app should be cheap or free to host initially
- the preferred stack is SvelteKit-first
- a separate FastAPI backend should be avoided unless it becomes clearly necessary
- MVP features are:
  - GPX upload
  - slochd point calculation
  - map display
  - nearby cafes / pubs / restaurants
  - GPX export

The goal is to keep the architecture simple, maintainable, and suitable for a first real release.

---

## Architecture summary

Recommended architecture:
- **single SvelteKit application**
- **client-side map rendering**
- **server endpoints for analysis, POI lookup, and export**
- **shared pure TypeScript domain modules** for route parsing and slochd calculation
- **stateless by default** for the MVP

This keeps the initial implementation lightweight while still giving enough structure for growth.

---

## 1. Proposed directory structure

A practical project structure for the MVP could look like this:

```text
src/
  app.html

  lib/
    components/
      layout/
        AppShell.svelte
        Header.svelte
        SidePanel.svelte
      upload/
        GpxUploadForm.svelte
        DemoRouteButton.svelte
      map/
        RouteMap.svelte
        SlochdMarker.svelte
        PoiMarkers.svelte
        MapLegend.svelte
      results/
        RouteStatsCard.svelte
        PoiList.svelte
        ExportActions.svelte
      ui/
        Button.svelte
        Card.svelte
        EmptyState.svelte
        ErrorState.svelte
        LoadingSpinner.svelte

    domain/
      route/
        types.ts
        distance.ts
        interpolation.ts
        bounds.ts
      slochd/
        calculateSlochdPoint.ts
        units.ts
        validators.ts
      gpx/
        parseGpx.ts
        serializeGpx.ts
        types.ts
      poi/
        types.ts
        ranking.ts
        filters.ts

    server/
      poi/
        overpass.ts
        transform.ts
      config/
        env.ts

    utils/
      formatDistance.ts
      formatCoordinates.ts
      errors.ts

  routes/
    +layout.svelte
    +page.svelte
    about/+page.svelte

    analyse/
      +page.svelte
      +page.server.ts

    api/
      analyse/+server.ts
      poi/+server.ts
      export-gpx/+server.ts

  params/
  hooks.server.ts

static/
  demo/
    sample-route.gpx
  icons/

tests/
  unit/
    domain/
      gpx/
      route/
      slochd/
      poi/
  integration/
    api/
  fixtures/
    gpx/
      simple-route.gpx
      loop-route.gpx
      noisy-route.gpx
      short-route.gpx
```

### Why this structure works
- `src/lib/domain/` contains the core business logic and should remain framework-agnostic
- `src/lib/server/` contains server-only integrations such as POI requests
- `src/routes/api/` contains HTTP endpoints for the MVP features
- `src/lib/components/` keeps UI concerns separated by function
- `tests/fixtures/gpx/` makes route logic easier to test with real examples

---

## 2. Server/client responsibility split

### Client responsibilities
The client should handle:
- file selection and upload UX
- map rendering
- route and marker display
- UI state such as loading/errors/filters
- result presentation
- user actions such as export and copy

In practice, the browser should:
- render the route polyline using MapLibre
- show the slochd point and nearby place markers
- render stats and POI panels
- manage map interactions and lightweight UI state

### Server responsibilities
The server should handle:
- GPX validation and parsing when files are uploaded
- slochd-point calculation
- nearby POI lookup
- GPX export generation
- external API/network calls
- response normalization and validation

In practice, the server endpoints should:
- receive uploaded GPX
- parse and normalize route points
- calculate the slochd point
- query Overpass or another OSM-compatible source for nearby places
- generate export files for download

### Why this split is recommended
This split keeps the UI responsive while centralizing the more fragile and integration-heavy work on the server side.

A fully client-side approach is possible, but it is less attractive for the MVP because:
- POI lookup is cleaner server-side
- export generation is easier to standardize server-side
- future caching or rate limiting is easier if requests are already routed through the server

---

## 3. Recommended data flow

### A. Upload and analysis flow
1. User visits the app and uploads a `.gpx` file
2. Client sends the file to `POST /api/analyse`
3. Server validates the file
4. Server parses GPX into normalized route points
5. Server calculates route distance and the slochd point
6. Server returns an analysis payload
7. Client renders the route, markers, and stats

### B. Nearby places flow
1. Client sends slochd point coordinates to `POST /api/poi`
2. Server queries the POI provider for nearby cafes / pubs / restaurants
3. Server normalizes and ranks the results
4. Server returns POIs to the client
5. Client renders markers and the nearby places list

### C. Export flow
1. User clicks export
2. Client sends the route and slochd point result to `POST /api/export-gpx`
3. Server generates GPX with a slochd waypoint
4. Server returns the file
5. Client downloads it

---

## 4. Where to put route parsing and calculation logic

### GPX parsing
Put GPX parsing in:

```text
src/lib/domain/gpx/parseGpx.ts
```

This module should:
- accept raw GPX text or uploaded content
- return normalized route data
- remain independent of SvelteKit request/response objects
- throw typed domain errors for invalid input

### Slochd calculation
Put core calculation logic in:

```text
src/lib/domain/slochd/calculateSlochdPoint.ts
```

Supporting route math should live in:

```text
src/lib/domain/route/distance.ts
src/lib/domain/route/interpolation.ts
src/lib/domain/slochd/units.ts
```

### Design principle
The domain layer should be:
- pure
- deterministic
- reusable
- heavily tested
- independent of UI and transport layers

Endpoint handlers should orchestrate the flow, but not contain the core algorithm.

---

## 5. How to structure POI lookup

Recommended approach:
- treat POI lookup as a server integration
- normalize results into a stable app-specific POI type
- keep ranking/filter logic separate from raw API calls

### Suggested structure
```text
src/lib/server/poi/overpass.ts
src/lib/server/poi/transform.ts
src/lib/domain/poi/types.ts
src/lib/domain/poi/ranking.ts
src/lib/domain/poi/filters.ts
```

### Responsibilities
#### `src/lib/server/poi/overpass.ts`
- build Overpass queries
- make HTTP requests
- handle timeouts/retries at a basic level
- return raw POI results

#### `src/lib/server/poi/transform.ts`
- normalize raw results into app POI objects
- clean category/name fields
- discard unusable or incomplete records

#### `src/lib/domain/poi/ranking.ts`
- sort by distance to the slochd point
- support future ranking heuristics

#### `src/lib/domain/poi/filters.ts`
- apply category/radius filters
- support future route-aware filtering

### Suggested POI type
A simple normalized MVP type might be:

```ts
type Poi = {
  id: string;
  name: string;
  category: 'cafe' | 'pub' | 'restaurant';
  lat: number;
  lon: number;
  distanceFromSlochdMeters: number;
};
```

### MVP simplification
For the MVP, “nearby” should mean:
- **straight-line distance from the slochd point**

Do not initially try to calculate:
- walking route to the POI
- detour cost
- advanced on-route/off-route scoring

Those can be added later if needed.

---

## 6. Recommended response shape for analysis

A normalized response payload helps the client render results cleanly and keeps the API stable.

Example:

```ts
type AnalyseRouteResponse = {
  route: {
    name?: string;
    points: Array<{ lat: number; lon: number; ele?: number }>;
    bounds: {
      minLat: number;
      minLon: number;
      maxLat: number;
      maxLon: number;
    };
    totalDistanceMeters: number;
  };
  slochdPoint: {
    lat: number;
    lon: number;
    ele?: number;
    distanceFromStartMeters: number;
    milesCompleted: number;
    kilometersRemaining: number;
    percentThroughRoute: number;
  };
  stats: {
    totalDistanceMeters: number;
    totalDistanceMiles: number;
    totalDistanceKilometers: number;
  };
};
```

Why this is helpful:
- it gives the UI exactly what it needs
- it avoids leaking parsing details into the client
- it makes export and POI requests easier to integrate later

---

## 7. MVP endpoints

The MVP likely only needs three endpoints:

### `POST /api/analyse`
Input:
- GPX file upload

Output:
- normalized route + slochd analysis result

### `POST /api/poi`
Input:
- slochd point coordinates
- optional radius / category filters

Output:
- normalized nearby POIs

### `POST /api/export-gpx`
Input:
- route + slochd result

Output:
- downloadable GPX file containing the slochd waypoint

This is enough for a functional first release without unnecessary complexity.

---

## 8. Risks and tradeoffs

### A. SvelteKit-only vs separate FastAPI backend
**Benefit:**
- fewer moving parts
- simpler deployment
- easier free hosting
- lower cognitive overhead

**Tradeoff:**
- if processing becomes heavier, serverless or lightweight server runtimes may become limiting
- if Python geospatial tooling becomes essential later, some logic may need to move or be duplicated

**Recommendation:**
Accept this tradeoff for the MVP.

### B. Server endpoints vs fully client-side processing
**Benefit:**
- better control over validation and external requests
- easier POI lookup integration
- easier export generation
- easier future caching/rate limiting

**Tradeoff:**
- requires runtime hosting rather than static-only hosting
- rules out GitHub Pages as the primary deployment target for the full app

**Recommendation:**
Prefer server endpoints for the MVP.

### C. OpenStreetMap / Overpass vs Google Places
**Benefit:**
- low cost / free-friendly
- flexible and open
- good fit for a route-oriented app
- avoids early lock-in

**Tradeoff:**
- data quality and completeness may vary by area
- recommendations are less polished than Google’s ecosystem

**Recommendation:**
Start with OSM/Overpass and reassess later if needed.

### D. Stateless processing vs storing user routes
**Benefit:**
- no database required for MVP
- lower privacy burden
- simpler architecture
- easier free hosting

**Tradeoff:**
- no saved history
- no persistent share links unless storage is added later

**Recommendation:**
Start stateless.

---

## 9. Hosting recommendation

Recommended hosting direction:
- **Netlify or another free-tier platform that supports SvelteKit server functions**

Why:
- the app is not a purely static site
- it needs upload handling
- it likely needs server-side POI queries and export generation

### Important note
GitHub Pages is not a good fit for the full MVP because:
- it is designed for static hosting
- the MVP benefits from server-side endpoints/functions

If the app is later simplified into a mostly static experience, that can be revisited, but it should not drive the architecture now.

---

## 10. Design and implementation principles

The most important architecture principle is to keep these layers separate:

### Domain layer
Pure logic such as:
- GPX parsing
- distance calculation
- interpolation
- slochd-point calculation
- POI ranking/filtering

### Server integration layer
External I/O such as:
- POI HTTP calls
- env/config handling
- file handling
- export generation

### UI layer
Svelte components and page behavior such as:
- upload flow
- map rendering
- result display
- export controls

This separation will make the app easier to test, refactor, and extend.

---

## Final recommendation

The recommended MVP architecture for `slochd_point_app` is:
- a **single SvelteKit app**
- **client-rendered maps**
- **server endpoints for analysis, POIs, and export**
- **pure shared TypeScript domain modules**
- **stateless by default**
- **free-tier-friendly hosting such as Netlify**

In one sentence:

> Use SvelteKit as both the UI and lightweight backend, keep the slochd calculation in pure reusable TypeScript modules, render maps client-side with MapLibre, query POIs through server endpoints, and avoid adding FastAPI until scale or backend complexity genuinely requires it.
