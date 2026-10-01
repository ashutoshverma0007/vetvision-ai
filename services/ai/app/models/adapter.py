from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import numpy as np

class ModelAdapter(ABC):
    """
    Abstract base adapter for deep learning inference backends.
    Supports PyTorch, ONNX, and future frameworks.
    """

    @abstractmethod
    def load(self, artifact_path: Optional[str]) -> bool:
        """
        Loads model weights from artifact path.
        Returns True if successfully loaded, False otherwise.
        """
        pass

    @abstractmethod
    def predict(self, tensor: np.ndarray) -> Dict[str, Any]:
        """
        Executes model inference on preprocessed NCHW tensor.
        Returns dictionary containing:
          - normal_prob (float)
          - mild_prob (float)
          - severe_prob (float)
          - latency_ms (float)
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        Indicates whether valid model weights are actively loaded in memory.
        """
        pass

    @abstractmethod
    def get_metadata(self) -> Dict[str, Any]:
        """
        Returns model version, framework, and input specifications.
        """
        pass
