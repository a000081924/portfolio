"""Rebuild slides/ from the capstone repository's final-presentation deck.

Run from the portfolio root:
    uv run --no-project python scripts/build_slides.py [path-to-news-reconstruction]

The deck's own files are left untouched. A temporary copy of slides.md fills in the
name placeholders, switches to hash routing so the build works under any GitHub Pages
path, and turns off the presenter view, which holds the recording script. A temporary
global layer makes a left click on the slide go to the next step.
"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "news-reconstruction"
DECK = SRC / "docs" / "final-presentation"
OUT = ROOT / "slides"
TEMP = DECK / "portfolio-build.md"
LAYER = DECK / "global-bottom.vue"

# Slidev only navigates on clicks in the letterbox around the slide, not on the slide.
CLICK_TO_ADVANCE = """\
<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useNav } from '@slidev/client'

const { next } = useNav()
const INTERACTIVE = 'a, button, input, select, textarea, summary, label, [role="button"], nav'

function onClick(e: MouseEvent) {
  const target = e.target as Element
  if (e.button !== 0 || e.defaultPrevented || !target.closest('#slide-content'))
    return
  if (target.closest(INTERACTIVE) || window.getSelection()?.toString())
    return
  next()
}

onMounted(() => window.addEventListener('click', onClick))
onBeforeUnmount(() => window.removeEventListener('click', onClick))
</script>

<template>
  <div />
</template>
"""

text = (DECK / "slides.md").read_text(encoding="utf-8")
replacements = {
    "author: Your name\n": "author: Tom Chan\n",
    "colorSchema: light\n": "colorSchema: light\nrouterMode: hash\npresenter: dev\ndownload: false\n",
    "Your name · Course · October 2026": "Tom Chan · Capstone project · October 2026",
    "**[name]**": "Tom Chan",
}
for old, new in replacements.items():
    if old not in text:
        sys.exit(f"placeholder not found in slides.md: {old!r}")
    text = text.replace(old, new, 1)

if LAYER.exists():
    sys.exit(f"{LAYER} already exists; this script would overwrite it")

TEMP.write_text(text, encoding="utf-8")
LAYER.write_text(CLICK_TO_ADVANCE, encoding="utf-8")
try:
    if OUT.exists():
        shutil.rmtree(OUT)
    subprocess.run(
        ["bun", "x", "slidev", "build", TEMP.name, "--base", "./", "--out", str(OUT)],
        cwd=DECK, check=True, shell=sys.platform == "win32",
    )
finally:
    TEMP.unlink(missing_ok=True)
    LAYER.unlink(missing_ok=True)

(OUT / "_redirects").unlink(missing_ok=True)  # Netlify only
print(f"slides built in {OUT}")
