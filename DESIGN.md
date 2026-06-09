# Design System

## Theme

MuscleMap Fitness uses an Apple-inspired dark product interface: true black canvas, utility-card gray panels, SF/system typography, pill controls, restrained borders, and Action Blue for primary interaction. The muscle map keeps playful athletic energy through anatomical imagery and semantic muscle colors, but the rest of the product UI stays calm and task-first.

## Color Palette

- Background: true black (`#000000`) with subtle blue radial depth only at the app canvas level.
- Utility panels: Apple dark gray (`#1d1d1f`) with `18px` corners and quiet white borders.
- Primary action: Apple Action Blue (`#0071e3`), with hover blue (`#147ce5`) and active blue (`#006edb`).
- Secondary controls: dark utility grays around `#2c2c2e` and `#3a3a3c`.
- Muscle accents: orange/rose for chest, sky/blue for back, amber/orange for shoulders, cyan/blue for legs, violet/fuchsia for arms, emerald/cyan for core. These are semantic muscle colors, not general UI accents.
- Text: `#f5f5f7` primary, `#a1a1a6` secondary, `#86868b` tertiary.

## Typography

Use the Apple platform stack: `-apple-system`, BlinkMacSystemFont, SF Pro fallbacks, Segoe UI, and system sans-serif. Interior product pages use compact 3xl/4xl headings and medium-semibold weights. The home screen can remain more expressive, but product controls should avoid display-style exaggeration.

## Layout

Mobile-first app shell with a fixed translucent bottom navigation. Primary screens use constrained inner content, 44px minimum touch targets, dense-but-readable utility cards, and no horizontal overflow. The home screen is led by the interactive body map; other pages prioritize forms, lists, and state panels.

## Components

- Bottom navigation: four primary destinations with icon plus label, black translucent material, and blue active state.
- Muscle map hero: image-led anatomical visual, labeled muscle shortcuts, and dashed relationship lines.
- Primary action: Apple Action Blue pill button.
- Secondary action: dark utility-gray pill button.
- Cards: `18px` utility panels, border-only depth, no generic heavy shadows.
- Form controls: rounded 12px inputs/selects on dark translucent fields, blue focus ring.
- Focus states: visible Action Blue focus rings on all interactive controls.

## Motion

Use restrained hover, press, and focus transitions. Movement should clarify interactivity without causing layout shift or making the interface feel like a game.

## Imagery

Prefer real or raster-rendered anatomical fitness visuals over crude inline drawings. Interactive labels must visually correspond to the body area they control.
