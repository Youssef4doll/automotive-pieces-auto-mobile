"""crop.py in.png out.png [size] [pad] — trim to the part, keep a soft piece
of its shadow, and fit it on a square transparent canvas."""
import sys
from PIL import Image, ImageDraw, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
size = int(sys.argv[3]) if len(sys.argv) > 3 else 768
pad = float(sys.argv[4]) if len(sys.argv) > 4 else 0.11
im = Image.open(src).convert('RGBA')
a = im.getchannel('A').point(lambda v: 255 if v > 200 else 0)
box = a.getbbox()
x0, y0, x1, y1 = box
w, h = x1 - x0, y1 - y0
side = int(max(w, h) * (1 + 2 * pad))
cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
# shadows fall downward: bias the window a little down so it is kept
cy += int(h * 0.03)
left, top = cx - side // 2, cy - side // 2
canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
canvas.alpha_composite(im.crop((left, top, left + side, top + side)))
# fade the edges so a cut shadow never shows a hard line
mask = Image.new('L', (side, side), 0)
d = ImageDraw.Draw(mask)
m = int(side * 0.04)
d.rounded_rectangle((m, m, side - m, side - m), radius=int(side * 0.08), fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(side * 0.03))
alpha = canvas.getchannel('A')
from PIL import ImageChops
canvas.putalpha(ImageChops.multiply(alpha, mask))
canvas.resize((size, size), Image.LANCZOS).save(dst)
