# The app's pictures — what they are, and how they are made

Asked for in September 2026: "use real images … make it look so real". This is
what that became, and the rules it keeps.

## What is shown where

| Where | Picture | Source |
|---|---|---|
| A product with a photograph | the photograph | uploaded in /admin (`ProductImage`) |
| A product without one | the family's studio render, tagged **Illustration** | `assets/renders/<family>.webp` |
| A family (tiles, rails, family hero, search) | the family picture uploaded in /admin, else the family's render | `Category.imageUrl` / `assets/renders` |
| A car (vehicle cards, garage hero, home vehicle line, picker) | the make's real mark in a white disc | `VehicleMake.logoUrl`, else `src/illustrations/marques.ts` |
| A parts maker (brand strip, search) | the uploaded logo, else the real mark where on record, else the name in type | `Brand.logoUrl` / `marques.ts` |
| Home hero | a drilled disc under a gold caliper on a dark studio floor | `assets/renders/hero.webp` |
| The ways in | a car key, a disc, a magnifier, a phone framing a disc | `assets/renders/*.webp` |

## Why renders, and not stock photographs

Two reasons, one practical and one binding.

- **The binding one (BRIEF.md):** a product must never be shown with a
  photograph of a different part as if it were that part. A stock photo of
  "some brake pads" on a TRW pad's page is exactly that. The renders are
  pictures of a *kind* of part, branded by nobody, and on a product page or
  tile they carry the word "Illustration" until the shop uploads the real
  photograph — which then replaces them with no release.
- **The practical one:** this project has no licence to anybody's product
  photography, and a photo library's licence would not cover the use above
  anyway. The renders are the shop's own.

## Why the make's mark, and not a picture of a car

A vehicle card says "BMW Série 1 (E87)". A photograph of a generic hatchback
beside it would say something false, and a photograph of the right car is a
licence nobody holds. The make's mark says which car it is, truthfully, the
way every parts catalogue does. The marks come from
[Simple Icons](https://simpleicons.org) (SVG data released CC0); they remain
their owners' trademarks and are used to identify the make, never as an
endorsement. A logo the shop uploads always wins. The owner should confirm
they are content to show them; removing one is deleting its line in
`marques.ts` — the card falls back to initials.

A procedural car was modelled and rejected: at the quality a lofted mesh
reaches it reads as a toy, which is worse than no car.

## How the renders are made

`tools/renders/` — Blender 4.5 (the `bpy` Python module), Cycles, a dark
studio with long softboxes (steel only looks like steel when it has
something dark to reflect), a shadow catcher, transparent output, then an
automatic crop. Every part is modelled in code (`parts.py`): the disc's
192-segment rings, its 54 cross-drilled holes and 36 vanes; the pad's
backing plate and chamfered friction block; the spark plug's thread pitch;
the clutch's 18 diaphragm fingers. Lighting maps are the CC0 Poly Haven
HDRIs packaged in `@pmndrs/assets`.

```bash
python3.11 -m venv .venv && .venv/bin/pip install bpy==4.5.14 pillow
# HDRIs: extract studio.exr (and the others) from @pmndrs/assets into $HDRI
HDRI=/path/to/hdri PY=.venv/bin/python bash tools/renders/finals.sh
```

One family: `python build.py freinage preview` renders a quick 640px look in
a few seconds; `final` renders the 900px source. `view.py` makes a contact
sheet on the app's grey for judging.

## Adding a family

1. Add a function to `parts.py` named after the slug (`-` → `_`) that
   returns the objects it built.
2. `python build.py <slug> preview`, look at it, adjust, repeat.
3. Add it to the list in `finals.sh`, run it, and add the `require` to
   `src/illustrations/renders.ts`.

Until then the family shows the website's line drawing, as before.
