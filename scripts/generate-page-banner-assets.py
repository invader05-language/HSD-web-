"""Generate versioned, responsive page-banner WebP derivatives.

The script intentionally accepts an explicit list of assetId=sourcePath pairs.
It never scans or deletes a source directory and refuses to write outside the
explicit output directory.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps


WIDTHS = (828, 1440, 1920)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_source(value: str) -> tuple[str, Path]:
    asset_id, separator, source_path = value.partition("=")
    if not separator or not asset_id or not source_path:
        raise ValueError(f"invalid --source value: {value!r}; expected assetId=path")
    if any(character in asset_id for character in ("/", "\\", "..")):
        raise ValueError(f"invalid asset id: {asset_id!r}")
    return asset_id, Path(source_path).expanduser().resolve()


def ensure_inside(path: Path, root: Path, label: str) -> None:
    try:
        path.relative_to(root)
    except ValueError as error:
        raise ValueError(f"{label} must stay inside {root}: {path}") from error


def build_variants(asset_id: str, source: Path, output: Path, quality: int) -> dict:
    if not source.is_file():
        raise FileNotFoundError(f"source file does not exist: {source}")

    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
        source_width, source_height = image.size
        variants: list[dict] = []

        for target_width in WIDTHS:
            if target_width > source_width:
                continue
            target_height = round(source_height * target_width / source_width)
            resized = image if target_width == source_width else image.resize(
                (target_width, target_height), Image.Resampling.LANCZOS
            )
            target = (output / f"{asset_id}-v2-{target_width}w.webp").resolve()
            ensure_inside(target, output, "output file")
            resized.save(target, format="WEBP", quality=quality, method=6)
            variants.append(
                {
                    "path": target.relative_to(output).as_posix(),
                    "width": target_width,
                    "height": target_height,
                    "bytes": target.stat().st_size,
                    "sha256": sha256(target),
                }
            )

    if not variants:
        raise ValueError(f"source is narrower than the minimum derivative width: {source}")

    return {
        "assetId": asset_id,
        "source": {
            "path": source.as_posix(),
            "sha256": sha256(source),
            "width": source_width,
            "height": source_height,
        },
        "quality": quality,
        "variants": variants,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", action="append", required=True, help="explicit assetId=sourcePath")
    parser.add_argument("--output", required=True, help="derivative directory")
    parser.add_argument("--manifest", required=True, help="manifest JSON path")
    parser.add_argument("--quality", type=int, default=88)
    args = parser.parse_args()

    if not 1 <= args.quality <= 100:
        raise ValueError("--quality must be between 1 and 100")

    output = Path(args.output).expanduser().resolve()
    manifest_path = Path(args.manifest).expanduser().resolve()
    output.mkdir(parents=True, exist_ok=True)
    ensure_inside(manifest_path, output.parent, "manifest")

    sources = [parse_source(value) for value in args.source]
    asset_ids = [asset_id for asset_id, _ in sources]
    if len(asset_ids) != len(set(asset_ids)):
        raise ValueError("duplicate asset id in --source")

    assets = [build_variants(asset_id, source, output, args.quality) for asset_id, source in sources]
    manifest = {
        "version": 2,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "widths": list(WIDTHS),
        "assets": assets,
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
