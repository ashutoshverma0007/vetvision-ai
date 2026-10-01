"""
BovineLesionDataset - Dataset Interface for Lumpy Skin Disease (LSD) Images.

NOTE: Real training requires a clinically validated dataset.
Do not fabricate evaluation metrics or silently download unverified datasets.
"""

import os
from typing import List, Tuple, Optional
from PIL import Image

class BovineLesionDataset:
    CLASSES = ["NORMAL", "MILD", "SEVERE"]

    def __init__(self, root_dir: str, split: str = "train", transform=None):
        self.root_dir = root_dir
        self.split = split
        self.transform = transform
        self.samples: List[Tuple[str, int]] = []
        self._load_samples()

    def _load_samples(self):
        split_dir = os.path.join(self.root_dir, self.split)
        if not os.path.exists(split_dir):
            # Dataset path not configured
            return

        for class_idx, class_name in enumerate(self.CLASSES):
            class_folder = os.path.join(split_dir, class_name)
            if os.path.isdir(class_folder):
                for fname in os.listdir(class_folder):
                    if fname.lower().endswith((".jpg", ".jpeg", ".png")):
                        self.samples.append((os.path.join(class_folder, fname), class_idx))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        if idx >= len(self.samples):
            raise IndexError("Index out of bounds")

        path, label = self.samples[idx]
        with Image.open(path) as img:
            image = img.convert("RGB")

        if self.transform:
            image = self.transform(image)

        return image, label
