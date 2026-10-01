"""
Inference latency, memory footprint, and throughput benchmarking utility.
"""

import time
import os
import numpy as np
from typing import Dict, Any, Optional
from app.models.adapter import ModelAdapter

def run_latency_benchmark(
    adapter: ModelAdapter,
    input_shape: tuple = (1, 3, 224, 224),
    warmup_runs: int = 10,
    benchmark_runs: int = 100
) -> Dict[str, Any]:
    if not adapter.is_available():
        return {
            "status": "MODEL_UNAVAILABLE",
            "message": "Cannot benchmark unconfigured or unavailable model adapter."
        }

    dummy_input = np.random.randn(*input_shape).astype(np.float32)

    # 1. Warm-up
    for _ in range(warmup_runs):
        adapter.predict(dummy_input)

    # 2. Timing loops
    latencies = []
    for _ in range(benchmark_runs):
        start = time.perf_counter()
        adapter.predict(dummy_input)
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        latencies.append(elapsed_ms)

    arr = np.array(latencies)
    mean_ms = float(np.mean(arr))
    throughput_fps = float(1000.0 / mean_ms) if mean_ms > 0 else 0.0

    metadata = adapter.get_metadata()
    artifact_path = metadata.get("artifact_path")
    file_size_bytes = os.path.getsize(artifact_path) if artifact_path and os.path.isfile(artifact_path) else None

    return {
        "status": "COMPLETED",
        "model_version": metadata.get("version"),
        "framework": metadata.get("framework"),
        "model_size_bytes": file_size_bytes,
        "input_shape": list(input_shape),
        "iterations": benchmark_runs,
        "latency_ms": {
            "mean": round(mean_ms, 2),
            "std": round(float(np.std(arr)), 2),
            "min": round(float(np.min(arr)), 2),
            "p50": round(float(np.percentile(arr, 50)), 2),
            "p95": round(float(np.percentile(arr, 95)), 2),
            "p99": round(float(np.percentile(arr, 99)), 2),
            "max": round(float(np.max(arr)), 2)
        },
        "throughput_fps": round(throughput_fps, 2)
    }
