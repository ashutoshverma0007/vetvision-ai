import os
import time
from typing import Dict, Any, Optional
import numpy as np
from .adapter import ModelAdapter

class PyTorchAdapter(ModelAdapter):
    def __init__(self, version: str = "lsd-resnet50-v1.0.0"):
        self.version = version
        self.framework = "PYTORCH"
        self.model = None
        self.torch = None
        self.artifact_path = None
        self._check_torch()

    def _check_torch(self):
        try:
            import torch
            self.torch = torch
        except ImportError:
            self.torch = None

    def load(self, artifact_path: Optional[str]) -> bool:
        if not artifact_path or not os.path.isfile(artifact_path):
            self.model = None
            self.artifact_path = None
            return False

        if not self.torch:
            self.model = None
            return False

        try:
            # Attempt to load TorchScript model
            self.model = self.torch.jit.load(artifact_path, map_location="cpu")
            self.model.eval()
            self.artifact_path = artifact_path
            return True
        except Exception:
            try:
                # Fallback to standard torch.load
                self.model = self.torch.load(artifact_path, map_location="cpu")
                if hasattr(self.model, "eval"):
                    self.model.eval()
                self.artifact_path = artifact_path
                return True
            except Exception:
                self.model = None
                self.artifact_path = None
                return False

    def is_available(self) -> bool:
        return self.model is not None

    def predict(self, tensor: np.ndarray) -> Dict[str, Any]:
        if not self.is_available() or not self.torch:
            raise RuntimeError("PyTorch model is not loaded or artifact unavailable")

        start = time.perf_counter()
        torch_tensor = self.torch.from_numpy(tensor).float()

        with self.torch.no_grad():
            logits = self.model(torch_tensor)
            probs = self.torch.softmax(logits, dim=1).cpu().numpy()[0]

        latency_ms = (time.perf_counter() - start) * 1000.0

        return {
            "normal_prob": float(probs[0]),
            "mild_prob": float(probs[1]),
            "severe_prob": float(probs[2]),
            "latency_ms": round(latency_ms, 2)
        }

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "framework": self.framework,
            "is_available": self.is_available(),
            "artifact_path": self.artifact_path,
            "device": "cpu"
        }
