import numpy as np
from PIL import Image
import os

class PreprocessingPipeline:
    def __init__(self, target_width: int = 224, target_height: int = 224):
        self.target_width = target_width
        self.target_height = target_height
        # ImageNet standardization parameters
        self.mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        self.std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        self.version = "1.0.0"

    def preprocess_image_file(self, image_path: str) -> np.ndarray:
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found at path: {image_path}")

        with Image.open(image_path) as img:
            return self.preprocess_pil_image(img)

    def preprocess_pil_image(self, img: Image.Image) -> np.ndarray:
        # Convert to RGB (stripping alpha channel if present)
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Resize to model input dimensions using high-quality resampling
        resized = img.resize((self.target_width, self.target_height), Image.Resampling.BILINEAR)

        # Convert to numpy array in [0.0, 1.0] range
        arr = np.asarray(resized, dtype=np.float32) / 255.0

        # Normalize with channel mean and standard deviation: (arr - mean) / std
        normalized = (arr - self.mean) / self.std

        # Transpose from HWC (Height, Width, Channels) to CHW (Channels, Height, Width)
        chw = np.transpose(normalized, (2, 0, 1))

        # Add batch dimension: (1, Channels, Height, Width)
        nchw = np.expand_dims(chw, axis=0)

        return np.ascontiguousarray(nchw, dtype=np.float32)

pipeline = PreprocessingPipeline()
