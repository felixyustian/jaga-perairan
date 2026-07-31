from __future__ import annotations
import base64
import io

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image

from .engine import synth_field, detect, IMG

app = FastAPI(title="JAGA PERAIRAN — HAB Early Warning", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ImageRequest(BaseModel):
    image_b64: str = Field(..., description="Base64-encoded grayscale/RGB image")


class SyntheticRequest(BaseModel):
    harmful: int = Field(12, ge=0, le=80)
    benign: int = Field(35, ge=0, le=200)
    seed: int = 0
    return_image: bool = True


def _png_b64(arr: np.ndarray) -> str:
    buf = io.BytesIO()
    Image.fromarray(arr).save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


@app.get("/health")
def health():
    return {"status": "ok", "service": "jaga-perairan", "img": IMG}


@app.post("/detect")
def detect_endpoint(req: ImageRequest):
    raw = base64.b64decode(req.image_b64)
    im = Image.open(io.BytesIO(raw)).convert("L").resize((IMG, IMG))
    arr = np.asarray(im, dtype=np.uint8)
    return detect(arr)


@app.post("/synthetic/detect")
def synthetic_detect(req: SyntheticRequest):
    arr = synth_field(harmful=req.harmful, benign=req.benign, seed=req.seed)
    result = detect(arr)
    if req.return_image:
        result["image_b64"] = _png_b64(arr)
        result["img_size"] = IMG
    return result
