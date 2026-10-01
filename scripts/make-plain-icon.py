"""
The app icon: the shop's wordmark — AUTOMOTIVE, its red swoosh, PIÈCES
AUTO — on the launch screen's plain navy, nothing else. Built from the
launch screen's own two layers (splash-icon.png, splash-swoosh.png) so the
icon and the first screen are the same picture.

    python3 scripts/make-plain-icon.py

Writes icon.png (iOS rounds the corners itself), the three Android adaptive
layers — the wordmark kept inside the 66% safe circle the launchers may
mask to — and favicon.png.
"""
from PIL import Image

NAVY = (0x08, 0x16, 0x33, 255)  # LaunchBackground, Brand.navy950
DIR = "assets/images/"

text = Image.open(DIR + "splash-icon.png").convert("RGBA")
swoosh = Image.open(DIR + "splash-swoosh.png").convert("RGBA")
mark = Image.alpha_composite(swoosh, text)
mark = mark.crop(mark.getbbox())


def placed(width: int, frac: float, layer: Image.Image) -> Image.Image:
    w = round(width * frac)
    h = round(layer.height * w / layer.width)
    art = layer.resize((w, h), Image.LANCZOS)
    canvas = Image.new("RGBA", (width, width), (0, 0, 0, 0))
    canvas.alpha_composite(art, ((width - w) // 2, (width - h) // 2))
    return canvas


def on_navy(width: int, frac: float) -> Image.Image:
    bg = Image.new("RGBA", (width, width), NAVY)
    bg.alpha_composite(placed(width, frac, mark))
    return bg


on_navy(1024, 0.80).convert("RGB").save(DIR + "icon.png")
Image.new("RGBA", (1024, 1024), NAVY).save(DIR + "android-icon-background.png")
placed(1024, 0.60, mark).save(DIR + "android-icon-foreground.png")
mono = placed(1024, 0.60, mark)
white = Image.new("RGBA", mono.size, (255, 255, 255, 255))
white.putalpha(mono.getchannel("A"))
white.save(DIR + "android-icon-monochrome.png")
on_navy(196, 0.84).save(DIR + "favicon.png")
print("written")
