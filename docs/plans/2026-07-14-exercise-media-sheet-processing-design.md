# Exercise Media Sheet Processing Design

## Scope

Process the reviewed `back-001` 2-column by 3-row source sheet without changing exercise data or the detail-page UI. Each cell is split left-to-right into `start` and `peak`, then written to the existing `/exercise-media/{exerciseId}/{stage}.webp` convention.

## Architecture

A reusable Node.js ES module reads a batch JSON file and the source image metadata. It validates configured IDs against the current TypeScript exercise sources, calculates integer crop boundaries from the actual image dimensions, and uses Sharp to resize each crop with `fit: contain` onto the configured background before WebP encoding.

Boundary coordinates are calculated from rounded proportional edges. The last row, column, and stage therefore end exactly at the source boundary, with adjacent regions sharing the same edge and no gap or overlap.

## Error Handling and Logging

Invalid exercise IDs are reported and skipped without stopping the batch. Per-image processing failures are recorded while later exercises continue. The final summary includes batch/source metadata, crop rectangles, output paths, create/overwrite status, success counts, skip counts, and failure reasons.

## Verification

Node tests cover non-divisible source dimensions, exact cell/stage partitioning, and current-dataset ID discovery. After processing, Sharp metadata verifies all 12 outputs are readable 640×800 WebP files. Playwright opens all six detail routes and verifies that each route loads its own start and peak assets without placeholders; `contain` output dimensions and the page's `object-contain` rule prevent stretching.

