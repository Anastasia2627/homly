#!/usr/bin/env python3
"""Build the HOMLY GitHub Pages website with an optimized transparent hero image.

The original user-supplied PNG remains unchanged in the repository.
The published site uses a much smaller local WebP version of the same photo,
including for the 3D-unboxing result. No third-party image hosting.
"""
from __future__ import annotations

import shutil
from pathlib import Path
from urllib.parse import quote

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dist"
SOURCE_NAME = "Розовая сумочка из бусин с цветами.png"
OLD_URL = quote(SOURCE_NAME)
NEW_URL = "assets/hero-bag.webp"

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
(OUT / "assets").mkdir()

for filename in ROOT.iterdir():
    if filename.is_file() and filename.suffix.lower() in {".html", ".css", ".js"}:
        text = filename.read_text(encoding="utf-8")
        if filename.suffix.lower() in {".html", ".js"}:
            text = text.replace(OLD_URL, NEW_URL)
        (OUT / filename.name).write_text(text, encoding="utf-8")

shutil.copytree(ROOT / "assets", OUT / "assets", dirs_exist_ok=True)

source = ROOT / SOURCE_NAME
if not source.is_file():
    raise FileNotFoundError(f"Original HOMLY bag photo missing: {source}")

with Image.open(source) as original:
    original = ImageOps.exif_transpose(original)
    original.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
    original = original.convert("RGBA") if "A" in original.getbands() else original.convert("RGB")
    original.save(
        OUT / NEW_URL,
        format="WEBP",
        quality=85,
        method=6,
        exact=True,
    )

# This is the version visitors receive; request the hero asset before scripts
# execute. Browser tests exercise dist/ to cover the same output as GitHub Pages.
html = OUT / "index.html"
html_text = html.read_text(encoding="utf-8")
if "rel=\"preload\" as=\"image\"" not in html_text:
    raise RuntimeError("Missing critical hero image preload from index.html")
if OLD_URL in html_text or OLD_URL in (OUT / "app.js").read_text(encoding="utf-8"):
    raise RuntimeError("Original heavyweight PNG URL leaked into the production site")
if NEW_URL not in html_text:
    raise RuntimeError("Optimized WebP wasn't linked for preload")
for path in ("app.js", "unbox-3d.js"):
    if NEW_URL not in (OUT / path).read_text(encoding="utf-8"):
        raise RuntimeError(f"{path} does not reference the optimized asset")
old_size = source.stat().st_size
new_size = (OUT / NEW_URL).stat().st_size
print(f"HOMLY hero image: {old_size:,} B PNG → {new_size:,} B WebP "
      f"({new_size/old_size:.1%} of original)")
if new_size >= old_size:
    raise RuntimeError("Hero image optimization was ineffective")
