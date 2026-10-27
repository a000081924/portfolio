"""Build the site's images from the capstone repository.

Run from the portfolio root:
    uv run --no-project --with pillow python scripts/build_assets.py [path-to-news-reconstruction]
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "news-reconstruction"
OUT = ROOT / "assets" / "img"
OUT.mkdir(parents=True, exist_ok=True)

PRES = SRC / "docs" / "presentation" / "public" / "img"
FINAL = SRC / "docs" / "final-presentation" / "public" / "img"


def save(im, name, width=None, quality=82):
    if width and im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    path = OUT / name
    if name.endswith(".webp"):
        im.save(path, "WEBP", quality=quality, method=6)
    elif name.endswith(".jpg"):
        im.convert("RGB").save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    else:
        im.save(path, optimize=True)
    print(f"{name:28} {im.width}x{im.height}  {path.stat().st_size // 1024} KB")


# Avatar and favicons
avatar = Image.open(SRC / "avator-unmarker.jpg").convert("RGB")
save(avatar, "avatar.webp", 320, 90)
save(avatar.resize((180, 180), Image.LANCZOS), "apple-touch-icon.png")
save(avatar.resize((64, 64), Image.LANCZOS), "favicon.png")

# Screenshots and figures
save(Image.open(FINAL / "04-done.png").convert("RGB"), "workbench.webp", 1600)
save(Image.open(FINAL / "04-done.png").convert("RGB").crop((0, 0, 1600, 1000)), "card-workbench.webp", 900)
save(Image.open(FINAL / "08-after.png").convert("RGB"), "corrected.webp", 1059)
save(Image.open(FINAL / "09-compare-viewer.png").convert("RGB"), "compare.webp", 1163)
save(Image.open(FINAL / "chart_latency.png").convert("RGB"), "chart-latency.webp", 1452, 90)
save(Image.open(PRES / "scan.png").convert("RGB"), "scan.webp", 723)
for i, name in enumerate(["uploaded", "layout", "lines", "done"], 1):
    save(Image.open(PRES / f"strip-{name}.png").convert("RGB"), f"stage-{i}-{name}.webp", 445)

arch = Image.open(PRES / "architecture.png").convert("RGB")
save(arch, "architecture.webp", 2400, 88)
save(arch.crop((0, 0, 2400, 1529)).resize((900, 573), Image.LANCZOS), "card-architecture.webp")

# The image viewer loads this one, so the diagram's small text stays sharp when zoomed
Image.MAX_IMAGE_PIXELS = None  # the source is 11800 x 7520
save(Image.open(SRC / "docs" / "architecture.png").convert("RGB"), "architecture-full.webp", 4800, 85)

# card-slides.webp is a screenshot of the built deck's title slide; see README.

# Social preview, 1200 x 630
og = Image.open(FINAL / "04-done.png").convert("RGB").crop((0, 0, 1600, 840)).resize((1200, 630), Image.LANCZOS)
save(og, "og-image.jpg", quality=85)
