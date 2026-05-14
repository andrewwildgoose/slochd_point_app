# Slochd Point App — Project Context

## What the slochd point means
The **slochd point** is the place on a route where:

- **miles completed from the start**
- equals
- **kilometers remaining to the finish**

This is the defining domain concept for the product and should remain the anchor for all route-calculation features.

## Main product repository and MVP target
This SvelteKit repository (`andrewwildgoose/slochd_point_app`) is now the **primary implementation home**. The earlier Python repository remains useful as a reference for ideas and examples, but new production logic should be built here.

The target MVP is intentionally narrow:

1. Upload a GPX route
2. Calculate the slochd point reliably
3. Show route + slochd point on a map
4. Show nearby cafes/pubs/restaurants
5. Export slochd point coordinates/GPX

## Why SvelteKit-first is the current recommendation
Current direction is a **SvelteKit-first MVP** with no separate FastAPI backend yet.

Reasons:

- one codebase for UI + server-side processing
- faster iteration and lower deployment complexity
- lower hosting cost for an early product
- enough capability for upload, route processing, POI lookup, and export

A separate backend can be revisited later if there is a clear need (heavy geospatial workloads, queued jobs, multi-client API use, etc.).

## Intended map / POI / export direction
Near-term product direction:

- map-first results view (route, start/end, slochd marker)
- nearby place lookup around the slochd point (cafes, pubs, restaurants)
- export path for practical reuse (GPX waypoint and coordinate copy)

The map and related outputs should help the user make decisions, not just display a single numeric result.

## Accuracy requirement: route interpolation
Long-term product quality depends on **accurate route interpolation**.

The required technical path is:

1. Parse ordered route geometry
2. Build cumulative distance along the route
3. Compute target slochd distance from start
4. Interpolate within the containing segment to get exact coordinates

Using only nearest points is not sufficient for production-grade accuracy.

## Phased roadmap guidance
- **Phase 1 (MVP):** GPX upload, core slochd calculation, map display, nearby POIs, export
- **Phase 2:** stronger UX/error handling, demo routes, mobile polish, improved POI ranking
- **Phase 3+:** route-aware stop quality, richer export/sharing, optional integrations/accounts when justified

## Implementation principles (domain logic + testing)
### Domain logic
- Keep core slochd/unit-conversion logic as framework-agnostic TypeScript in reusable modules under `src/lib/`
- Prefer pure functions with explicit inputs/outputs
- Derive formulas explicitly in code (avoid unexplained magic ratios)
- Return structured result objects for reuse across UI, server handlers, and tests

### Testing
- Protect domain math with focused unit tests
- Validate conversion constants and slochd formula invariants
- Include representative route distances and edge cases
- Use tolerance-based assertions where floating-point math is involved

These principles are intended to keep the core math trustworthy as map, POI, and export capabilities expand.
