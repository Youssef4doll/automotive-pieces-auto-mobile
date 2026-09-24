"""python build.py <family> [preview]  — render one family's cutout."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402

import lib  # noqa: E402
import parts  # noqa: E402

name = sys.argv[1]
preview = len(sys.argv) > 2 and sys.argv[2] == 'preview'
out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.environ.get('OUT', '/tmp/apa-renders'), 'out', f'{name}.png')

lib.reset()
M = lib.mats()
lib.world('studio', strength=0.12, rotation=math.radians(40))
objs = getattr(parts, name.replace('-', '_'))(M)
lib.shadow_catcher(8, 0)
lib.studio_lights(1.0)
cam = lib.camera((0.9, -1.35, 0.75), target=(0, 0, 0.1), lens=85)
lib.frame(objs, cam, margin=1.18 if preview else 1.07)
lib.render(out, res=(640, 640) if preview else (900, 900), samples=32 if preview else 56)
print('wrote', out)
