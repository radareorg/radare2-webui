#!/usr/bin/env python3
"""Render an SVG as a black mark on a white squircle, then pack native icons.

Build-time requirements: Python 3 and ImageMagick 7 (`magick`).
No Python packages or icon conversion utilities are required.
"""

import argparse
import math
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parent.parent
SIZES = (16, 24, 32, 48, 64, 128, 256, 512, 1024)


def run(*args):
    subprocess.run([str(arg) for arg in args], check=True)


def write_ico(path, images):
    """Windows Vista+ supports PNG-compressed images in ICO directories."""
    sizes = [size for size in SIZES if size <= 256]
    offset = 6 + 16 * len(sizes)
    directory = bytearray(struct.pack("<HHH", 0, 1, len(sizes)))
    payload = bytearray()
    for size in sizes:
        data = images[size].read_bytes()
        directory.extend(struct.pack("<BBBBHHII", size % 256, size % 256,
                                     0, 0, 1, 32, len(data), offset))
        payload.extend(data)
        offset += len(data)
    path.write_bytes(directory + payload)


def write_icns(path, images):
    """PNG representations, including the standard macOS Retina slots."""
    representations = ((b"icp4", 16), (b"icp5", 32), (b"icp6", 64),
                       (b"ic07", 128), (b"ic08", 256), (b"ic09", 512),
                       (b"ic10", 1024), (b"ic11", 32), (b"ic12", 64),
                       (b"ic13", 256), (b"ic14", 512))
    chunks = bytearray()
    for kind, size in representations:
        data = images[size].read_bytes()
        chunks.extend(struct.pack(">4sI", kind, len(data) + 8))
        chunks.extend(data)
    path.write_bytes(struct.pack(">4sI", b"icns", len(chunks) + 8) + chunks)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("svg", nargs="?", type=Path, default=ROOT / "assets/radare.svg")
    parser.add_argument("--output", type=Path, default=ROOT / "assets/icons")
    args = parser.parse_args()
    magick = shutil.which("magick")
    if not magick:
        parser.error("ImageMagick 7 is required: install it to provide the magick command")
    if not args.svg.is_file():
        parser.error(f"SVG does not exist: {args.svg}")
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    (output / "png").mkdir(exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="r2webui-icons-") as directory:
        work = Path(directory)
        # Some copies of the upstream logo have an https SVG namespace typo.
        source = args.svg.read_text(encoding="utf-8").replace(
            "https://www.w3.org/2000/svg", "http://www.w3.org/2000/svg")
        ET.fromstring(source)  # Reject malformed input before invoking the renderer.
        (work / "logo.svg").write_text(source, encoding="utf-8")
        # Trim the original canvas before centering, preserving the mark's shape.
        run(magick, "-background", "none", "-density", "384", work / "logo.svg",
            "-trim", "+repage", "-channel", "RGB", "-evaluate", "set", "0", "+channel",
            "-resize", "640x640", "PNG32:" + str(work / "logo.png"))

        # x^4 + y^4 = r^4: a true squircle with a transparent outer margin.
        points = []
        for index in range(512):
            angle = index * 2 * math.pi / 512
            c, s = math.cos(angle), math.sin(angle)
            x = 512 + 432 * math.copysign(abs(c) ** 0.5, c)
            y = 512 + 432 * math.copysign(abs(s) ** 0.5, s)
            points.append(f"{x:.4f},{y:.4f}")
        background = '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">'
        background += '<path fill="white" d="M' + ' L'.join(points) + ' Z"/></svg>'
        (work / "background.svg").write_text(background, encoding="utf-8")
        master = output / "r2webui.png"
        run(magick, "-background", "none", work / "background.svg", work / "logo.png",
            "-gravity", "center", "-compose", "over", "-composite", "-strip", "PNG32:" + str(master))
        images = {}
        for size in SIZES:
            images[size] = output / "png" / f"{size}.png"
            run(magick, master, "-resize", f"{size}x{size}", "-strip",
                "PNG32:" + str(images[size]))

    write_ico(output / "r2webui.ico", images)
    write_icns(output / "r2webui.icns", images)
    print(f"Generated PNGs, {output / 'r2webui.ico'} and {output / 'r2webui.icns'}")


if __name__ == "__main__":
    main()
