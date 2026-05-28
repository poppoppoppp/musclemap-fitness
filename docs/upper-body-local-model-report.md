# V0.19 Upper Body Local Model Report

Experiment date: 2026-05-28

## Scope

Local-only validation for a real upper-body anatomy model. The generated model is an experiment asset only and must stay out of Git, push, and deployment.

No formal product mapping was added. No `/three-muscle-selector` integration was changed.

## Source

- Primary source used for final GLB: BodyParts3D 4.0 OBJ data
- Source link: https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README.html
- Local downloads used:
  - `local-models/isa_BP3D_4.0_obj_99.zip`
  - `local-models/BodyParts3D-isa-obj-99/isa_BP3D_4.0_obj_99/`
  - `local-models/isa_parts_list_e.txt`
  - `local-models/isa_element_parts.txt`
- Other downloaded candidates present for later experiments:
  - `local-models/upper-limb-glb.zip`
  - `local-models/AnatomyTOOL-upper-limb-glb/upper-limb.glb`
  - `local-models/Z-Anatomy.zip`
  - `local-models/Z-Anatomy/Z-Anatomy/Startup.blend`

## Conversion

Blender was not available on this machine (`where.exe blender` did not find an executable).

Conversion used the existing project dependency `three` only:

- `OBJLoader` loaded selected BodyParts3D OBJ files from `local-models/BodyParts3D-isa-obj-99/isa_BP3D_4.0_obj_99/`.
- `GLTFExporter` exported a binary GLB.
- A temporary Node-side `FileReader` polyfill was used because `GLTFExporter` expects a browser runtime.
- No package dependency was added.

Output path:

- `public/models/private/upper-body-local.glb`

Output size:

- 19,337,564 bytes
- About 18.44 MiB

## Load Validation

Validated in `/three-muscle-demo` upper-body local sandbox.

- Local model status: loaded successfully
- Mesh count shown in page: 22
- Canvas created: yes
- Selecting first mesh works: yes
- Selected mesh shown by page: `right_clavicular_part_of_pectoralis_major`
- Highlight path works through the existing sandbox selection flow: yes
- Console errors on `/three-muscle-demo`: none observed during the successful load check

Note: the GLB JSON `meshes[].name` entries exported as generic `mesh_0` through `mesh_21`, but the GLB node names are readable. The current Three.js sandbox reads `object.name` from traversed `THREE.Mesh` nodes, so the visible `mesh.name` value in the app is readable.

## Mesh Names

Readable Three.js mesh object names:

- `right_clavicular_part_of_pectoralis_major`
- `left_clavicular_part_of_pectoralis_major`
- `right_sternocostal_part_of_pectoralis_major`
- `left_sternocostal_part_of_pectoralis_major`
- `right_abdominal_part_of_pectoralis_major`
- `left_abdominal_part_of_pectoralis_major`
- `right_clavicular_part_of_deltoid`
- `left_clavicular_part_of_deltoid`
- `right_acromial_part_of_deltoid`
- `left_acromial_part_of_deltoid`
- `right_short_head_of_biceps_brachii`
- `left_short_head_of_biceps_brachii`
- `right_long_head_of_biceps_brachii`
- `left_long_head_of_biceps_brachii`
- `right_lateral_head_of_triceps_brachii`
- `left_lateral_head_of_triceps_brachii`
- `right_long_head_of_triceps_brachii`
- `left_long_head_of_triceps_brachii`
- `right_medial_head_of_triceps_brachii`
- `left_medial_head_of_triceps_brachii`
- `right_external_oblique`
- `left_external_oblique`

## Candidate Mapping Only

Candidate mapping only:

- `right_clavicular_part_of_pectoralis_major` -> `pectoralis-major`
- `left_clavicular_part_of_pectoralis_major` -> `pectoralis-major`
- `right_sternocostal_part_of_pectoralis_major` -> `pectoralis-major`
- `left_sternocostal_part_of_pectoralis_major` -> `pectoralis-major`
- `right_abdominal_part_of_pectoralis_major` -> `pectoralis-major`
- `left_abdominal_part_of_pectoralis_major` -> `pectoralis-major`
- `right_clavicular_part_of_deltoid` -> `anterior-deltoid`
- `left_clavicular_part_of_deltoid` -> `anterior-deltoid`
- `right_acromial_part_of_deltoid` -> `lateral-deltoid`
- `left_acromial_part_of_deltoid` -> `lateral-deltoid`
- `right_short_head_of_biceps_brachii` -> `biceps-brachii`
- `left_short_head_of_biceps_brachii` -> `biceps-brachii`
- `right_long_head_of_biceps_brachii` -> `biceps-brachii`
- `left_long_head_of_biceps_brachii` -> `biceps-brachii`
- `right_lateral_head_of_triceps_brachii` -> `triceps-brachii`
- `left_lateral_head_of_triceps_brachii` -> `triceps-brachii`
- `right_long_head_of_triceps_brachii` -> `triceps-brachii`
- `left_long_head_of_triceps_brachii` -> `triceps-brachii`
- `right_medial_head_of_triceps_brachii` -> `triceps-brachii`
- `left_medial_head_of_triceps_brachii` -> `triceps-brachii`
- `right_external_oblique` -> `obliques`
- `left_external_oblique` -> `obliques`

Missing target muscleId:

- `rectus-abdominis`

Uncertain target muscleId:

- none for the selected BodyParts3D parts above

## Suitability For V0.20

This model is suitable for the next local experiment phase: front-upper real model / hotspot hybrid validation.

Useful properties:

- Small enough to load locally in the current sandbox.
- Mesh object names are readable in the current Three.js traversal path.
- Candidate coverage exists for chest, anterior/lateral shoulder, biceps, triceps, and external obliques.

Current limitations:

- No rectus abdominis mesh was found in the downloaded BodyParts3D text lists.
- GLB `meshes[].name` values are generic; current readability depends on node/object names.
- BodyParts3D OBJ parts are anatomy elements, not a polished fitness-product asset.
- The generated GLB is local-only and ignored by Git.
- No formal mapping has been added to app code.
