# Figma Mobile UI Import Design

## Goal

Import the complete MuscleMap Fitness web UI into a new Figma Design file so the interface can be reviewed and edited visually without changing application source code.

## Scope

- Capture every accessible application route at a mobile viewport of approximately 390 x 844.
- Capture two representative states for each route:
  - default or empty state;
  - populated state with representative local data.
- Capture representative instances for parameterized routes, including exercise detail, workout history detail, and progress-photo comparison.
- Keep all captures in one new Figma file named `MuscleMap Fitness - Mobile UI Import`.

## Figma Organization

- Group default-state captures under `Default States`.
- Group populated-state captures under `Populated States`.
- Name each imported frame using `state / route / page name`.
- Preserve the mobile viewport, fixed bottom navigation, and scrollable content boundaries.

## Import Approach

Run the existing Vite application locally and capture each route directly into Figma. Use the webpage-to-Figma capture path for layout fidelity and editable layers. Use representative browser-local data for populated states; do not modify project source code to create capture-only screens or fixtures.

## Validation

- Every route in `src/app/router.tsx` has a default and populated capture where the distinction is meaningful.
- Parameterized routes have at least one valid representative instance.
- Captures use the agreed mobile viewport.
- Fonts, images, fixed navigation, scrolling regions, and major layout relationships are visually checked after import.
- No project source files are changed as part of the import workflow.

## Known Constraints

- Figma MCP authentication and transport must be healthy before file creation and capture.
- Browser-local state may need temporary setup for populated screens.
- Runtime-only or authenticated third-party content may require a representative fallback state if the external service is unavailable.
