"""towebp.py <render dir> <assets dir> — the app's files: a family's render
under its catalogue slug, the three ways in, and the hero."""
import os
import sys

from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for name in os.listdir(os.path.join(src, 'final')):
    if not name.endswith('.png'):
        continue
    stem = name[:-4]
    slug = {'car_key': 'car-key'}.get(stem, stem.replace('_', '-'))
    im = Image.open(os.path.join(src, 'final', name)).convert('RGBA').resize((512, 512), Image.LANCZOS)
    im.save(os.path.join(dst, f'{slug}.webp'), 'WEBP', quality=84, method=6)
hero = Image.open(os.path.join(src, 'out', 'hero_full.png')).convert('RGB')
hero.save(os.path.join(dst, 'hero.webp'), 'WEBP', quality=90, method=6)
print('ok')
