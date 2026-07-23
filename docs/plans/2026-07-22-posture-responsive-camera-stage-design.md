# Posture Responsive Camera Stage Design

## Problem

The static Capture Lab requests a portrait `720 x 1280` stream but desktop cameras may return square or landscape video. The live viewport is always `3:4` and capped at `66dvh`; a real `720 x 720` stream was therefore displayed inside a `524 x 698` box with about 174 pixels of combined vertical letterboxing. Page headings, separate mode/quality/runtime sections, AppShell padding, and the persistent bottom navigation further reduce the useful camera area.

The skeleton currently matches CSS `object-contain`, but its contain transform is private to `PoseSkeletonCanvas`. Changing video fitting without sharing the transform would risk misalignment.

## Decision

Build one shared responsive camera stage for static and dynamic capture.

- Camera constraints use portrait ideals on narrow portrait screens and landscape ideals otherwise. Constraints remain `ideal`, never `exact`.
- After `loadedmetadata`, the real `videoWidth / videoHeight` is authoritative.
- The stage matches that media aspect ratio and grows to the largest rectangle that fits the available viewport after safe-area and overlay allowances. It does not use a fixed 3:4, 9:16, or 16:9 ratio.
- Video remains `object-contain`; because the stage follows the real media ratio, internal black bars are normally eliminated without cropping.
- A pure contain-transform helper supplies the rendered media rectangle and normalized-point mapping for the skeleton and guide overlay.
- During camera stages, the page becomes an immersive fixed layer. Return, mode/action controls, model switch, primary quality feedback, countdown, pacing, and the start/submit actions float over the media. Separate page sections and bottom navigation are hidden.
- Idle, error, and result views remain ordinary document pages.

## Shared Components

- `cameraViewport.ts`: pure constraints and contain-layout functions.
- `useVideoViewport.ts`: reads real video metadata and viewport size.
- `ResponsiveCameraStage.tsx`: owns the aspect-correct media stage and overlay slots.
- `CaptureViewport.tsx` and `DynamicCaptureLab.tsx`: provide their existing video, skeleton, guides, and controls through the shared stage.

## Coordinate Contract

The original camera frame remains unchanged. Candidate JPEGs continue to use `video.videoWidth` and `video.videoHeight`. MediaPipe landmarks remain normalized to the source image. The overlay transform maps normalized coordinates through the same contain rectangle used by the video element, including mirroring only at the final X-coordinate step.

## Verification

- Pure tests cover portrait, landscape, and square camera metadata, maximum-fit sizing, and mirrored/unmirrored point mapping.
- UI tests cover `390 x 844` mobile portrait and `1440 x 900` desktop, assert no bottom navigation during capture, verify stage aspect ratio and viewport containment, and confirm controls are overlaid.
- Existing capture, dynamic sampling, retry, and coordinate tests remain green.
- Real desktop camera and real mobile portrait checks confirm head-to-foot visibility and skeleton alignment.

No posture quality threshold, metric, analysis, growth-page module, formal repository, or inference API is changed. No commit, push, or deployment is part of this work.
