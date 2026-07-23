# Posture Responsive Camera Stage Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Give static and dynamic posture capture an aspect-correct immersive camera stage on mobile and desktop without cropping the person or misaligning overlays.

**Architecture:** Centralize camera constraints, media containment, and normalized coordinate mapping in pure utilities. A shared responsive stage uses real video metadata and viewport bounds; static and dynamic capture supply their current overlays and controls without changing analysis behavior.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, MediaStream APIs, Canvas, Playwright.

---

### Task 1: Shared camera geometry and constraints

**Files:**
- Create: `src/features/posture/capture/camera/cameraViewport.ts`
- Create: `src/tests/posture-camera-viewport.spec.ts`
- Modify: `src/features/posture/capture/components/PoseSkeletonCanvas.tsx`

1. Write failing tests for portrait/desktop constraint ideals, maximum-fit stage sizing, contain rectangles, and mirrored point mapping.
2. Run the focused test and confirm RED because the shared functions do not exist.
3. Implement the minimum pure functions and reuse them in `PoseSkeletonCanvas`.
4. Run the focused geometry test and existing keypoint/capture-quality tests.
5. Perform spec review, then code-quality review; do not commit.

### Task 2: Static immersive responsive capture

**Files:**
- Create: `src/features/posture/capture/hooks/useVideoViewport.ts`
- Create: `src/features/posture/capture/components/ResponsiveCameraStage.tsx`
- Modify: `src/features/posture/capture/components/CaptureViewport.tsx`
- Modify: `src/features/posture/capture/hooks/usePostureCaptureLab.ts`
- Modify: `src/pages/PostureCaptureLabPage.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Create: `src/tests/fixtures/PostureCameraViewportHarness.tsx`
- Create: `src/tests/fixtures/posture-camera-viewport-harness.html`
- Create: `src/tests/posture-camera-responsive-ui.spec.ts`

1. Write failing mobile and desktop UI tests for real media aspect ratio, full available bounds, hidden navigation, and overlaid mode/feedback controls.
2. Confirm RED against the fixed `3:4` page layout.
3. Implement the shared stage and static immersive layout; keep idle/result layouts unchanged.
4. Use device-aware ideal constraints while treating actual metadata as authoritative.
5. Run the new UI test plus existing static capture tests.
6. Perform spec review, then code-quality review; do not commit.

### Task 3: Dynamic capture reuse

**Files:**
- Modify: `src/features/posture/capture/components/DynamicCaptureLab.tsx`
- Modify: `src/features/posture/capture/hooks/useDynamicPostureCapture.ts`
- Modify: `src/tests/posture-dynamic-capture.spec.ts`

1. Add a failing assertion that dynamic ready/countdown/capturing stages use the same responsive immersive stage and device-aware constraints.
2. Confirm RED.
3. Reuse `ResponsiveCameraStage`, floating the action label, pace cue, and current operation over the video.
4. Run dynamic capture, sampling, contract, and incomplete-phase tests.
5. Perform spec review, then code-quality review; do not commit.

### Task 4: Full verification and real viewport acceptance

**Files:**
- Update: `docs/posture-capture-lab-testing.md`

1. Run TypeScript, full Playwright, production build, and `git diff --check`.
2. Use the in-app browser at desktop size to verify actual `videoWidth/videoHeight`, stage dimensions, full-body composition, and overlay alignment.
3. Verify the mobile portrait layout at `390 x 844`; record simulated layout evidence separately from final real-phone camera acceptance.
4. Ask the user for one real mobile portrait full-body confirmation if a phone camera is not connected during implementation.
5. Record results and preserved limitations without committing, pushing, or deploying.
