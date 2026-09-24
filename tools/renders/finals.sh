#!/bin/bash
# Render every family, the three "ways in" and the home hero, then write the
# app's webp files. See docs/imagery.md. Needs: python3.11 venv with
# bpy==4.5.14 and pillow, and the HDRIs in $HDRI (lib.py).
set -e
cd "$(dirname "$0")"
PY=${PY:-python}
OUT=${OUT:-/tmp/apa-renders}
ASSETS=${ASSETS:-../../assets/renders}
export OUT
mkdir -p "$OUT/out" "$OUT/final" "$ASSETS"
for f in freinage filtres suspension allumage_prechauffage lubrifiant demarrage_electrique eclairage moteur cardan_et_transmission embrayage courroie_tendeur_et_chaine capteurs_et_sondes carosserie climatisation direction_et_trains_roulants refroidissement_moteur phone magnifier car_key; do
  $PY build.py $f final "$OUT/out/${f}_full.png"
  $PY crop.py "$OUT/out/${f}_full.png" "$OUT/final/${f}.png" 640
  # the phone's screen shows the brake disc, so it is made once that exists
  [ "$f" = freinage ] && $PY phone_screen.py "$OUT"
done
$PY hero.py final "$OUT/out/hero_full.png"
$PY towebp.py "$OUT" "$ASSETS"
