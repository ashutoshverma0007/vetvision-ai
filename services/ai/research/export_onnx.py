#!/usr/bin/env python3
"""
==============================================================================
VetVision AI - Phase 4: EfficientNet-B0 ONNX Export and Equivalence Verification
==============================================================================
Module: services.ai.research.export_onnx
Purpose:
1. Exports the selected Experiment 3 EfficientNet-B0 checkpoint to ONNX.
2. Verifies strict numerical equivalence against the original PyTorch model on synthetic inputs.
3. Benchmarks CPU inference latency and throughput for PyTorch vs. ONNX Runtime.
==============================================================================
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import onnx
import onnxruntime as ort
import torch
import torch.nn as nn

_repo_root = Path(__file__).resolve().parents[3]
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from services.ai.research.training.train_efficientnetb0_exp3 import (
    CLASS_NAMES,
    create_efficientnetb0_model,
)


def export_efficientnetb0_to_onnx(
    checkpoint_path: Path,
    output_onnx_path: Path,
    opset_version: int = 17,
) -> Dict[str, Any]:
    print("=" * 80)
    print(" STEP 1 & 2: LOADING CHECKPOINT AND EXPORTING TO ONNX")
    print("=" * 80)
    print(f"Loading checkpoint from: {checkpoint_path}")
    if not checkpoint_path.exists():
        raise FileNotFoundError(f"Checkpoint not found at: {checkpoint_path}")

    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    print(f"Checkpoint Epoch: {checkpoint.get('epoch')}, Phase: {checkpoint.get('phase')}")
    print(f"Validation Macro-F1 at Selection: {checkpoint.get('val_macro_f1')}")

    model = create_efficientnetb0_model(num_classes=len(CLASS_NAMES))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    output_onnx_path.parent.mkdir(parents=True, exist_ok=True)

    dummy_input = torch.randn(1, 3, 224, 224, dtype=torch.float32)

    print(f"Exporting ONNX model to: {output_onnx_path}")
    print(f"Fixed batch dimensions: [1, 3, 224, 224], Opset: {opset_version}")

    torch.onnx.export(
        model,
        dummy_input,
        str(output_onnx_path),
        export_params=True,
        opset_version=opset_version,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["logits"],
        dynamo=False,
    )

    print("Checking exported ONNX model with onnx.checker...")
    onnx_model = onnx.load(str(output_onnx_path))
    onnx.checker.check_model(onnx_model)
    print(">>> ONNX CHECKER PASSED: Model is topologically valid. <<<")

    onnx_size_mb = round(os.path.getsize(output_onnx_path) / (1024 * 1024), 2)
    pth_size_mb = round(os.path.getsize(checkpoint_path) / (1024 * 1024), 2)
    print(f"PyTorch Checkpoint Size : {pth_size_mb} MB")
    print(f"ONNX Model File Size    : {onnx_size_mb} MB")

    return {
        "checkpoint_path": str(checkpoint_path),
        "onnx_path": str(output_onnx_path),
        "opset_version": opset_version,
        "input_shape": [1, 3, 224, 224],
        "pytorch_size_mb": pth_size_mb,
        "onnx_size_mb": onnx_size_mb,
        "classes": CLASS_NAMES,
    }


def verify_numerical_equivalence(
    model_torch: nn.Module,
    onnx_path: Path,
    num_synthetic_samples: int = 50,
    seed: int = 42,
) -> Dict[str, Any]:
    print("\n" + "=" * 80)
    print(f" STEP 3: VERIFYING NUMERICAL EQUIVALENCE ({num_synthetic_samples} SYNTHETIC SAMPLES)")
    print("=" * 80)

    np.random.seed(seed)
    torch.manual_seed(seed)
    model_torch.eval()

    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name

    max_abs_diff = 0.0
    all_abs_diffs: List[float] = []
    class_agreements: List[bool] = []

    for i in range(num_synthetic_samples):
        # Generate synthetic input simulating ImageNet-standardized images
        synthetic_np = np.random.randn(1, 3, 224, 224).astype(np.float32)
        synthetic_torch = torch.from_numpy(synthetic_np)

        # PyTorch forward pass
        with torch.no_grad():
            torch_logits = model_torch(synthetic_torch).numpy()[0]

        # ONNX Runtime forward pass
        onnx_outputs = session.run(None, {input_name: synthetic_np})
        onnx_logits = onnx_outputs[0][0]

        diff = np.abs(torch_logits - onnx_logits)
        curr_max = float(np.max(diff))
        if curr_max > max_abs_diff:
            max_abs_diff = curr_max

        all_abs_diffs.extend(diff.tolist())

        torch_pred = int(np.argmax(torch_logits))
        onnx_pred = int(np.argmax(onnx_logits))
        class_agreements.append(torch_pred == onnx_pred)

    mean_abs_diff = float(np.mean(all_abs_diffs))
    agreement_rate = float(np.mean(class_agreements)) * 100.0

    print(f"Max Absolute Logit Difference  : {max_abs_diff:.8f}")
    print(f"Mean Absolute Logit Difference : {mean_abs_diff:.8f}")
    print(f"Argmax Class Agreement Rate   : {agreement_rate:.2f}% ({sum(class_agreements)}/{num_synthetic_samples})")

    # Strict numerical threshold: differences must be negligible (float32 rounding margin < 1e-4)
    tolerance = 1e-4
    if max_abs_diff > tolerance:
        raise ValueError(f"Numerical discrepancy exceeded tolerance ({max_abs_diff} > {tolerance})!")

    print(">>> NUMERICAL EQUIVALENCE VERIFIED: Discrepancies within float32 precision limits. <<<")

    return {
        "num_synthetic_samples": num_synthetic_samples,
        "max_abs_logit_diff": float(max_abs_diff),
        "mean_abs_logit_diff": float(mean_abs_diff),
        "class_agreement_percent": float(agreement_rate),
        "tolerance": tolerance,
        "passed": True,
    }


def benchmark_inference(
    model_torch: nn.Module,
    onnx_path: Path,
    num_warmup: int = 20,
    num_runs: int = 100,
) -> Dict[str, Any]:
    print("\n" + "=" * 80)
    print(f" STEP 4: CPU INFERENCE BENCHMARKING (Warmup: {num_warmup}, Runs: {num_runs})")
    print("=" * 80)

    model_torch.eval()
    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name

    dummy_np = np.random.randn(1, 3, 224, 224).astype(np.float32)
    dummy_torch = torch.from_numpy(dummy_np)

    # 1. Warmup PyTorch
    with torch.no_grad():
        for _ in range(num_warmup):
            _ = model_torch(dummy_torch)

    # 2. Benchmark PyTorch
    torch_latencies = []
    with torch.no_grad():
        for _ in range(num_runs):
            t0 = time.perf_counter()
            _ = model_torch(dummy_torch)
            t1 = time.perf_counter()
            torch_latencies.append((t1 - t0) * 1000.0)

    # 3. Warmup ONNX Runtime
    for _ in range(num_warmup):
        _ = session.run(None, {input_name: dummy_np})

    # 4. Benchmark ONNX Runtime
    onnx_latencies = []
    for _ in range(num_runs):
        t0 = time.perf_counter()
        _ = session.run(None, {input_name: dummy_np})
        t1 = time.perf_counter()
        onnx_latencies.append((t1 - t0) * 1000.0)

    def stats(lats: List[float]) -> Dict[str, float]:
        arr = np.array(lats)
        mean_l = float(np.mean(arr))
        return {
            "mean_ms": round(mean_l, 2),
            "median_p50_ms": round(float(np.median(arr)), 2),
            "p95_ms": round(float(np.percentile(arr, 95)), 2),
            "p99_ms": round(float(np.percentile(arr, 99)), 2),
            "throughput_fps": round(1000.0 / mean_l, 2) if mean_l > 0 else 0.0,
        }

    torch_stats = stats(torch_latencies)
    onnx_stats = stats(onnx_latencies)

    print(f"PyTorch CPU  - Mean: {torch_stats['mean_ms']} ms | P50: {torch_stats['median_p50_ms']} ms | P95: {torch_stats['p95_ms']} ms | FPS: {torch_stats['throughput_fps']}")
    print(f"ONNX Runtime - Mean: {onnx_stats['mean_ms']} ms | P50: {onnx_stats['median_p50_ms']} ms | P95: {onnx_stats['p95_ms']} ms | FPS: {onnx_stats['throughput_fps']}")

    speedup = round((torch_stats["mean_ms"] - onnx_stats["mean_ms"]) / torch_stats["mean_ms"] * 100, 2)
    print(f"ONNX Runtime Latency Reduction: {speedup}%")

    return {
        "pytorch": torch_stats,
        "onnx_runtime": onnx_stats,
        "speedup_percent": speedup,
        "benchmark_runs": num_runs,
        "warmup_runs": num_warmup,
    }


def main():
    checkpoint_path = _repo_root / "services/ai/research/models/efficientnetb0_exp3_best.pth"
    output_onnx_path = _repo_root / "services/ai/models/efficientnetb0_lsd_v1.onnx"
    results_json_path = _repo_root / "services/ai/research/reports/efficientnetb0_onnx_verification.json"

    export_info = export_efficientnetb0_to_onnx(checkpoint_path, output_onnx_path, opset_version=17)

    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    model_torch = create_efficientnetb0_model(num_classes=len(CLASS_NAMES))
    model_torch.load_state_dict(checkpoint["model_state_dict"])
    model_torch.eval()

    equiv_info = verify_numerical_equivalence(model_torch, output_onnx_path, num_synthetic_samples=50)

    benchmark_info = benchmark_inference(model_torch, output_onnx_path, num_warmup=20, num_runs=100)

    full_results = {
        "export": export_info,
        "numerical_equivalence": equiv_info,
        "benchmarks": benchmark_info,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
    }

    with open(results_json_path, "w", encoding="utf-8") as f:
        json.dump(full_results, f, indent=2)
    print(f"\nVerification metrics written to: {results_json_path}")
    print("=" * 80)
    print(" PHASE 4 ONNX EXPORT AND VERIFICATION COMPLETED")
    print("=" * 80)


if __name__ == "__main__":
    main()
