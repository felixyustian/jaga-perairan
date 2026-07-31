"""
JAGA PERAIRAN — phytoplankton density detection & HAB early-warning.

IMPORTANT: this ships a *classical placeholder detector*, not the production
trained plankton model. It works on real pixels (synthetic microscopy fields it
can also generate), using thresholding + connected components to find particles,
then classifies each blob as "harmful-like" vs "benign" by size/shape. Density
of harmful-like particles drives an early-warning level. Swap in the trained
detector for real species-accurate deployment.
"""
from __future__ import annotations
import numpy as np
from scipy import ndimage

IMG = 512

# Alert thresholds on harmful-like particle count per field of view.
ALERT_LEVELS = [
    (0, "AMAN", "Kepadatan rendah — pantau rutin."),
    (8, "WASPADA", "Kepadatan meningkat — tingkatkan frekuensi pemantauan."),
    (20, "BAHAYA", "Potensi bloom — siapkan mitigasi (aerasi/panen dini)."),
]


def synth_field(harmful: int = 12, benign: int = 40, seed: int = 0) -> np.ndarray:
    """Generate a grayscale microscopy-like field (uint8) with particles."""
    rng = np.random.default_rng(seed)
    img = np.full((IMG, IMG), 235, dtype=np.float64)         # light background
    img += rng.normal(0, 4, (IMG, IMG))                      # sensor noise
    yy, xx = np.mgrid[0:IMG, 0:IMG]

    def blob(cx, cy, r, depth):
        d = ((xx - cx) ** 2 + (yy - cy) ** 2) / (r * r)
        return np.clip(depth * np.exp(-d), 0, None)

    # benign: small, round, faint
    for _ in range(benign):
        cx, cy = rng.integers(10, IMG - 10, 2)
        r = rng.uniform(2.5, 4.5)
        img -= blob(cx, cy, r, rng.uniform(40, 70))
    # harmful-like: larger, darker (elongated chains approximated by bigger radius)
    for _ in range(harmful):
        cx, cy = rng.integers(15, IMG - 15, 2)
        r = rng.uniform(6.0, 10.0)
        img -= blob(cx, cy, r, rng.uniform(90, 140))

    return np.clip(img, 0, 255).astype(np.uint8)


def detect(img: np.ndarray) -> dict:
    """Threshold + connected components; classify blobs by area."""
    g = img.astype(np.float64)
    # Particles are darker than the ~235 background. Threshold well below
    # background so only particle cores are masked; harmful-like blobs (drawn
    # darker & larger) then form large connected components, benign form small.
    bg = float(np.median(g))
    thr = bg - 70.0
    mask = g < thr
    mask = ndimage.binary_opening(mask, iterations=1)
    labels, n = ndimage.label(mask)
    if n == 0:
        return {"particles": [], "harmful_count": 0, "benign_count": 0,
                "total": 0, **_alert(0)}

    areas = ndimage.sum(np.ones_like(labels), labels, index=range(1, n + 1))
    coms = ndimage.center_of_mass(np.ones_like(labels), labels, index=range(1, n + 1))

    particles = []
    harmful = benign = 0
    for i, (area, com) in enumerate(zip(areas, coms)):
        if area < 10:           # noise / faint benign core
            continue
        is_harmful = area >= 45  # large dark blob -> harmful-like
        if is_harmful:
            harmful += 1
        else:
            benign += 1
        particles.append({
            "y": round(float(com[0]), 1), "x": round(float(com[1]), 1),
            "area": int(area), "class": "harmful" if is_harmful else "benign",
        })

    return {"particles": particles, "harmful_count": harmful,
            "benign_count": benign, "total": harmful + benign, **_alert(harmful)}


def _alert(harmful: int) -> dict:
    level, name, msg = ALERT_LEVELS[0]
    for thr, nm, m in ALERT_LEVELS:
        if harmful >= thr:
            level, name, msg = thr, nm, m
    return {"alert_level": name, "alert_message": msg, "harmful_threshold": level}
