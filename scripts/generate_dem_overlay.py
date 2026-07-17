from pathlib import Path
import json
import math

import numpy as np
from PIL import Image
from tifffile import TiffFile, imread


workspace_root = Path.cwd()
dem_dir = workspace_root / "public" / "DEM"
source_file = dem_dir / "Gandhinagar_dem.tif"
png_file = dem_dir / "Gandhinagar_dem_overlay.png"
metadata_file = dem_dir / "Gandhinagar_dem.metadata.json"


def hex_to_rgb(value: str) -> np.ndarray:
    value = value.lstrip("#")
    return np.array([int(value[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def interpolate_palette(values: np.ndarray, stops: list[tuple[float, str]]) -> np.ndarray:
    result = np.zeros(values.shape + (3,), dtype=np.float32)

    for idx, value in np.ndenumerate(values):
        if value <= stops[0][0]:
            result[idx] = hex_to_rgb(stops[0][1])
            continue

        if value >= stops[-1][0]:
            result[idx] = hex_to_rgb(stops[-1][1])
            continue

        for lower, upper in zip(stops[:-1], stops[1:]):
            lower_pos, lower_color = lower
            upper_pos, upper_color = upper
            if lower_pos <= value <= upper_pos:
                span = upper_pos - lower_pos
                mix = 0 if span == 0 else (value - lower_pos) / span
                result[idx] = hex_to_rgb(lower_color) * (1 - mix) + hex_to_rgb(upper_color) * mix
                break

    return result.astype(np.uint8)


# Padded bounding box around Gandhinagar city (city boundary is ~72.60-72.69E, 23.16-23.28N).
crop_padding_degrees = 0.05
crop_west = 72.60 - crop_padding_degrees
crop_east = 72.69 + crop_padding_degrees
crop_south = 23.16 - crop_padding_degrees
crop_north = 23.28 + crop_padding_degrees

with TiffFile(source_file) as tif:
    page = tif.pages[0]
    width = int(page.imagewidth)
    height = int(page.imagelength)
    pixel_scale_x, pixel_scale_y, _ = page.tags["ModelPixelScaleTag"].value
    _, _, _, tie_lon, tie_lat, _ = page.tags["ModelTiepointTag"].value

tile_left = float(tie_lon)
tile_top = float(tie_lat)
pixel_scale_x = float(pixel_scale_x)
pixel_scale_y = float(pixel_scale_y)

col_start = max(0, math.floor((crop_west - tile_left) / pixel_scale_x))
col_end = min(width, math.ceil((crop_east - tile_left) / pixel_scale_x))
row_start = max(0, math.floor((tile_top - crop_north) / pixel_scale_y))
row_end = min(height, math.ceil((tile_top - crop_south) / pixel_scale_y))

left = tile_left + col_start * pixel_scale_x
right = tile_left + col_end * pixel_scale_x
top = tile_top - row_start * pixel_scale_y
bottom = tile_top - row_end * pixel_scale_y

full_array = imread(source_file)
cropped = full_array[row_start:row_end, col_start:col_end]

max_dimension = 2200
step = max(1, math.ceil(max(cropped.shape) / max_dimension))
sample = cropped[::step, ::step].astype(np.float32)

low = float(np.percentile(sample, 2))
high = float(np.percentile(sample, 98))
normalized = np.clip((sample - low) / max(high - low, 1e-6), 0, 1)

palette_stops = [
    (0.00, "#2E7D32"),
    (0.10, "#4CAF50"),
    (0.20, "#7ED957"),
    (0.35, "#C9D66B"),
    (0.48, "#E6E27A"),
    (0.58, "#EAD9A0"),
    (0.72, "#C48A5A"),
    (0.84, "#A35A3A"),
    (0.93, "#7A3A2A"),
    (0.985, "#F5F5F5"),
    (1.00, "#FFFFFF"),
]

rgb = interpolate_palette(normalized, palette_stops)
alpha = (110 + normalized * 120).astype(np.uint8)

rgba = np.dstack([rgb, alpha])
Image.fromarray(rgba, mode="RGBA").save(png_file, optimize=True)

metadata = {
    "source": source_file.name,
    "overlay": png_file.name,
    "crs": "EPSG:4326",
    "step": step,
    "bounds": {
        "west": left,
        "south": bottom,
        "east": right,
        "north": top,
    },
    "statistics": {
        "sampleMin": float(sample.min()),
        "sampleMax": float(sample.max()),
        "p2": low,
        "p98": high,
    },
}

metadata_file.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

print(f"Generated {png_file.relative_to(workspace_root)}")
print(f"Generated {metadata_file.relative_to(workspace_root)}")
