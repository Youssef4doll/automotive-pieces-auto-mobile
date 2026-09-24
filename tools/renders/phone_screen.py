"""phone_screen.py <render dir> — what the phone in "Photo / Expert" shows:
its camera framing the brake disc render, with focus corners and a shutter."""
import os
import sys

from PIL import Image, ImageDraw

base = sys.argv[1]
W, H = 690, 1480
ramp = Image.new('L', (1, H))
for y in range(H):
    ramp.putpixel((0, y), int(40 + 30 * (y / H)))
g = ramp.resize((W, H))
im = Image.merge('RGBA', (g, g.point(lambda v: int(v * 1.02)), g.point(lambda v: int(v * 1.1)), Image.new('L', (W, H), 255)))
part = Image.open(os.path.join(base, 'final', 'freinage.png')).convert('RGBA').resize((600, 600))
im.alpha_composite(part, (45, 420))
d = ImageDraw.Draw(im)
c = (255, 210, 60, 255)
x0, y0, x1, y1 = 120, 470, 570, 960
L, w = 60, 6
for (x, y, dx, dy) in [(x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)]:
    d.line([(x, y), (x + dx * L, y)], fill=c, width=w)
    d.line([(x, y), (x, y + dy * L)], fill=c, width=w)
d.ellipse((W // 2 - 70, H - 230, W // 2 + 70, H - 90), outline=(255, 255, 255, 255), width=10)
d.ellipse((W // 2 - 54, H - 214, W // 2 + 54, H - 106), fill=(255, 255, 255, 255))
d.rounded_rectangle((W // 2 - 90, 30, W // 2 + 90, 70), radius=20, fill=(0, 0, 0, 255))
im.convert('RGB').save(os.path.join(base, 'out', 'phone_screen.png'))
