import os
import time
from typing import Dict, Any, Optional
import numpy as np
from .adapter import ModelAdapter

class ONNXAdapter(ModelAdapter):
    def __init__(self, version: str = "lsd-resnet50-v1.0.0"):
        self.version = version
        self.framework = "ONNX"
        self.session = None
        self.input_name = None
        self.artifact_path = None
        self.ort = None
        self._check_onnx()

    def _check_onnx(self):
        try:
            import onnxruntime as ort
            self.ort = ort
        except ImportError:
            self.ort = None

    def load(self, artifact_path: Optional[str]) -> bool:
        if not artifact_path or not os.path.isfile(artifact_path):
            self.session = None
            self.artifact_path = None
            return False

        if not self.ort:
            self.session = None
            return False

        try:
            self.session = self.ort.InferenceSession(artifact_path, providers=["CPUExecutionProvider"])
            self.input_name = self.session.get_inputs()[0].name
            self.artifact_path = artifact_path
            return True
        except Exception:
            self.session = None
            self.artifact_path = None
            return False

    def is_available(self) -> bool:
        return self.session is not None

    def predict(self, tensor: np.ndarray) -> Dict[str, Any]:
        if not self.is_available() or not self.input_name:
            raise RuntimeError("ONNX model session is not loaded or artifact unavailable")

        start = time.perf_counter()
        outputs = self.session.run(None, {self.input_name: tensor.astype(np.float32)})
        logits = outputs[0][0]

        # Softmax over logits
        exp_logits = np.exp(logits - np.max(logits))
        probs = exp_logits / np.sum(exp_logits)

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
