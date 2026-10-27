#!/usr/bin/env python3
"""
==============================================================================
VetVision AI - Experiment 5: Validation-Only Test-Time Augmentation (TTA)
==============================================================================
Module: services.ai.research.training.evaluate_efficientnetb0_exp5_tta
Purpose: Investigates whether inference-time augmentation improves the validation
         performance, minority sensitivity, or calibration of the existing
         EfficientNet-B0 Experiment 3 best checkpoint.

STRICT CONSTRAINTS:
1. Model weights are frozen; NO retraining is performed.
2. Evaluated strictly and exclusively on the VALIDATION split (150 images).
3. The TEST split (148 images) is QUARANTINED and never accessed or evaluated.
4. Configurations evaluated:
   - Configuration A: Standard 1-view inference (Original image).
   - Configuration B: 2-view TTA (Original + Horizontal Flip, Softmax averaging).
   - Configuration C: 3-view TTA (Original + Horizontal Flip + Vertical Flip, Softmax averaging).
==============================================================================
"""

import csv
import hashlib
import json
import os
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
        sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)
    except Exception:
        pass

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms
from torchvision.transforms import functional as TF

# Ensure workspace root is in sys.path
_repo_root = Path(__file__).resolve().parents[4]
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

try:
    from services.ai.research.training.evaluate import (
        compute_classification_metrics,
        plot_confusion_matrix,
    )
except ImportError:
    from evaluate import (
        compute_classification_metrics,
        plot_confusion_matrix,
    )

CLASS_NAMES = ["Normal", "Mild", "Severe"]
CLASS_TO_IDX = {"Normal": 0, "Mild": 1, "Severe": 2}
IDX_TO_CLASS = {0: "Normal", 1: "Mild", 2: "Severe"}


def compute_sha256(file_path: Path) -> str:
    """Computes SHA-256 hash of a file on disk."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def load_validation_manifest(manifest_path: Path) -> List[Dict[str, str]]:
    """
    Loads dataset_split.csv and extracts ONLY the VALIDATION partition records.
    Strictly asserts that no test or train records are returned.
    """
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    val_records: List[Dict[str, str]] = []
    test_count = 0
    train_count = 0

    with open(manifest_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            split = row.get("split", "").strip().upper()
            if split == "VALIDATION":
                val_records.append(row)
            elif split == "TEST":
                test_count += 1
            elif split == "TRAIN":
                train_count += 1

    print("=" * 80)
    print(" EXPERIMENT 5: VALIDATION-ONLY TTA EVALUATION")
    print("=" * 80)
    print(f"Manifest File: {manifest_path.resolve()}")
    print(f"  Total Manifest Rows Encountered: TRAIN={train_count}, VALIDATION={len(val_records)}, TEST={test_count}")
    print("  [INTEGRITY GUARANTEE] TEST split is QUARANTINED. Zero test images loaded.")

    if len(val_records) != 150:
        raise ValueError(f"Expected 150 VALIDATION records, found {len(val_records)}")

    counts = Counter(r["class"] for r in val_records)
    expected_counts = {"Normal": 104, "Mild": 33, "Severe": 13}
    if dict(counts) != expected_counts:
        raise ValueError(f"Validation class distribution mismatch: {dict(counts)} vs expected {expected_counts}")

    print(f"  Validated Split Counts: Normal={counts['Normal']}, Mild={counts['Mild']}, Severe={counts['Severe']}")
    print("=" * 80)
    return val_records


def resolve_image_path(record: Dict[str, str], workspace_root: Path) -> Path:
    """Resolves local absolute image path using metadata fallbacks."""
    abs_p = Path(record.get("absolute_path", ""))
    if abs_p.exists():
        return abs_p

    dataset_root = (
        workspace_root
        / "data"
        / "lsd"
        / "LumpySkinDisease_DataHub"
        / "LumpySkinDisease_DataHub"
        / "data-processed"
        / "lumpy_unbalanced"
        / "lumpy"
    )
    fallback_p = dataset_root / record.get("filename", "")
    if fallback_p.exists():
        return fallback_p

    rel_p = workspace_root / record.get("relative_path", "")
    if rel_p.exists():
        return rel_p

    raise FileNotFoundError(f"Could not locate image file for record: {record.get('filename')}")


def get_eval_transform() -> transforms.Compose:
    """Returns deterministic evaluation preprocessing transform (ImageNet normalization)."""
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])


def load_efficientnetb0_checkpoint(checkpoint_path: Path, device: torch.device) -> Tuple[nn.Module, Dict[str, Any]]:
    """Loads Experiment 3 best checkpoint into evaluation mode."""
    if not checkpoint_path.exists():
        raise FileNotFoundError(f"Checkpoint not found at: {checkpoint_path}")

    print(f"Loading Experiment 3 checkpoint from: {checkpoint_path.resolve()}")
    ckpt = torch.load(checkpoint_path, map_location=device)

    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.2, inplace=True),
        nn.Linear(in_features, len(CLASS_NAMES)),
    )
    model.load_state_dict(ckpt["model_state_dict"])
    model.to(device)
    model.eval()

    print(f"  Checkpoint Epoch: {ckpt.get('epoch')}")
    print(f"  Reported Best Val Macro-F1: {ckpt.get('val_macro_f1')}")
    print(f"  Class Names: {ckpt.get('class_names')}")
    return model, ckpt


def run_tta_evaluation() -> int:
    workspace_root = _repo_root
    manifest_path = workspace_root / "services/ai/research/reports/dataset_split.csv"
    checkpoint_path = workspace_root / "services/ai/research/models/efficientnetb0_exp3_best.pth"
    onnx_path = workspace_root / "services/ai/models/efficientnetb0_lsd_v1.onnx"
    reports_dir = workspace_root / "services/ai/research/reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    metrics_out_path = reports_dir / "efficientnetb0_exp5_tta_validation_metrics.json"
    predictions_out_path = reports_dir / "efficientnetb0_exp5_tta_validation_predictions.json"
    cm_plot_out_path = reports_dir / "efficientnetb0_exp5_tta_confusion_matrix.png"

    # Step 1: Record initial hashes
    initial_ckpt_hash = compute_sha256(checkpoint_path)
    initial_onnx_hash = compute_sha256(onnx_path)
    print(f"\nInitial Checkpoint SHA-256: {initial_ckpt_hash}")
    print(f"Initial ONNX Artifact SHA-256: {initial_onnx_hash}")

    # Step 2: Load validation split
    val_records = load_validation_manifest(manifest_path)

    # Step 3: Load Model
    device = torch.device("cpu")  # Standardize on CPU deployment benchmarking
    model, ckpt_meta = load_efficientnetb0_checkpoint(checkpoint_path, device)

    eval_transform = get_eval_transform()

    # Pre-load all validation PIL images and ground truth labels
    print("\nLoading and pre-caching 150 validation images...")
    images_pil: List[Image.Image] = []
    labels: List[int] = []
    filenames: List[str] = []

    for r in val_records:
        img_p = resolve_image_path(r, workspace_root)
        with Image.open(img_p) as raw_img:
            img = raw_img.convert("RGB")
            images_pil.append(img.copy())
        labels.append(CLASS_TO_IDX[r["class"]])
        filenames.append(r["filename"])

    y_true = np.array(labels)

    # Warmup 20 iterations to prime CPU caches
    print("Warming up model on CPU (20 iterations)...")
    dummy_tensor = eval_transform(images_pil[0]).unsqueeze(0).to(device)
    with torch.no_grad():
        for _ in range(20):
            _ = model(dummy_tensor)

    # --------------------------------------------------------------------------
    # CONFIGURATION A: Standard 1-View (Original Image)
    # --------------------------------------------------------------------------
    print("\n[CONFIGURATION A] Running 1-View Baseline Evaluation (Original Image)...")
    probs_a: List[np.ndarray] = []
    latencies_a: List[float] = []

    with torch.no_grad():
        for img in images_pil:
            t0 = time.perf_counter()
            tensor = eval_transform(img).unsqueeze(0).to(device)
            logits = model(tensor)
            p = torch.softmax(logits, dim=1).numpy()[0]
            lat = (time.perf_counter() - t0) * 1000.0

            probs_a.append(p)
            latencies_a.append(lat)

    y_prob_a = np.array(probs_a)
    y_pred_a = np.argmax(y_prob_a, axis=1)
    metrics_a = compute_classification_metrics(y_true, y_pred_a, y_prob_a, CLASS_NAMES)
    metrics_a["latency"] = {
        "mean_ms": float(round(np.mean(latencies_a), 2)),
        "median_ms": float(round(np.median(latencies_a), 2)),
        "p95_ms": float(round(np.percentile(latencies_a, 95), 2)),
    }
    print(f"  Config A Accuracy: {metrics_a['accuracy']*100:.2f}% | Macro-F1: {metrics_a['macro_f1']*100:.2f}% | Mean Latency: {metrics_a['latency']['mean_ms']} ms")

    # --------------------------------------------------------------------------
    # CONFIGURATION B: 2-View TTA (Original + Horizontal Flip)
    # --------------------------------------------------------------------------
    print("\n[CONFIGURATION B] Running 2-View TTA Evaluation (Original + Horizontal Flip)...")
    probs_b: List[np.ndarray] = []
    latencies_b: List[float] = []

    with torch.no_grad():
        for img in images_pil:
            t0 = time.perf_counter()

            # View 1: Original
            t_orig = eval_transform(img).unsqueeze(0).to(device)
            logits_orig = model(t_orig)
            p_orig = torch.softmax(logits_orig, dim=1).numpy()[0]

            # View 2: Horizontal Flip
            img_h = TF.hflip(img)
            t_h = eval_transform(img_h).unsqueeze(0).to(device)
            logits_h = model(t_h)
            p_h = torch.softmax(logits_h, dim=1).numpy()[0]

            # Softmax Probability Averaging
            p_ensemble = 0.5 * (p_orig + p_h)
            lat = (time.perf_counter() - t0) * 1000.0

            probs_b.append(p_ensemble)
            latencies_b.append(lat)

    y_prob_b = np.array(probs_b)
    y_pred_b = np.argmax(y_prob_b, axis=1)
    metrics_b = compute_classification_metrics(y_true, y_pred_b, y_prob_b, CLASS_NAMES)
    metrics_b["latency"] = {
        "mean_ms": float(round(np.mean(latencies_b), 2)),
        "median_ms": float(round(np.median(latencies_b), 2)),
        "p95_ms": float(round(np.percentile(latencies_b, 95), 2)),
    }
    print(f"  Config B Accuracy: {metrics_b['accuracy']*100:.2f}% | Macro-F1: {metrics_b['macro_f1']*100:.2f}% | Mean Latency: {metrics_b['latency']['mean_ms']} ms")

    # --------------------------------------------------------------------------
    # CONFIGURATION C: 3-View TTA (Original + Horizontal Flip + Vertical Flip)
    # --------------------------------------------------------------------------
    print("\n[CONFIGURATION C] Running 3-View TTA Evaluation (Original + HFlip + VFlip)...")
    probs_c: List[np.ndarray] = []
    latencies_c: List[float] = []

    with torch.no_grad():
        for img in images_pil:
            t0 = time.perf_counter()

            # View 1: Original
            t_orig = eval_transform(img).unsqueeze(0).to(device)
            p_orig = torch.softmax(model(t_orig), dim=1).numpy()[0]

            # View 2: Horizontal Flip
            img_h = TF.hflip(img)
            t_h = eval_transform(img_h).unsqueeze(0).to(device)
            p_h = torch.softmax(model(t_h), dim=1).numpy()[0]

            # View 3: Vertical Flip
            img_v = TF.vflip(img)
            t_v = eval_transform(img_v).unsqueeze(0).to(device)
            p_v = torch.softmax(model(t_v), dim=1).numpy()[0]

            # Softmax Probability Averaging
            p_ensemble = (p_orig + p_h + p_v) / 3.0
            lat = (time.perf_counter() - t0) * 1000.0

            probs_c.append(p_ensemble)
            latencies_c.append(lat)

    y_prob_c = np.array(probs_c)
    y_pred_c = np.argmax(y_prob_c, axis=1)
    metrics_c = compute_classification_metrics(y_true, y_pred_c, y_prob_c, CLASS_NAMES)
    metrics_c["latency"] = {
        "mean_ms": float(round(np.mean(latencies_c), 2)),
        "median_ms": float(round(np.median(latencies_c), 2)),
        "p95_ms": float(round(np.percentile(latencies_c, 95), 2)),
    }
    print(f"  Config C Accuracy: {metrics_c['accuracy']*100:.2f}% | Macro-F1: {metrics_c['macro_f1']*100:.2f}% | Mean Latency: {metrics_c['latency']['mean_ms']} ms")

    # --------------------------------------------------------------------------
    # COMPARISON & SEVERE-TO-NORMAL ERROR CHECK
    # --------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print(" EXPERIMENT 5 — COMPARATIVE VALIDATION SUMMARY")
    print("=" * 80)
    print(f"{'Metric':<25} | {'Config A (1-View)':<16} | {'Config B (2-View)':<16} | {'Config C (3-View)':<16}")
    print("-" * 80)
    print(f"{'Validation Accuracy':<25} | {metrics_a['accuracy']*100:>15.2f}% | {metrics_b['accuracy']*100:>15.2f}% | {metrics_c['accuracy']*100:>15.2f}%")
    print(f"{'Validation Macro-F1':<25} | {metrics_a['macro_f1']*100:>15.2f}% | {metrics_b['macro_f1']*100:>15.2f}% | {metrics_c['macro_f1']*100:>15.2f}%")
    print(f"{'Validation Weighted-F1':<25} | {metrics_a['weighted_f1']*100:>15.2f}% | {metrics_b['weighted_f1']*100:>15.2f}% | {metrics_c['weighted_f1']*100:>15.2f}%")
    print(f"{'Normal F1':<25} | {metrics_a['per_class']['Normal']['f1']*100:>15.2f}% | {metrics_b['per_class']['Normal']['f1']*100:>15.2f}% | {metrics_c['per_class']['Normal']['f1']*100:>15.2f}%")
    print(f"{'Mild Recall':<25} | {metrics_a['per_class']['Mild']['recall']*100:>15.2f}% | {metrics_b['per_class']['Mild']['recall']*100:>15.2f}% | {metrics_c['per_class']['Mild']['recall']*100:>15.2f}%")
    print(f"{'Mild F1':<25} | {metrics_a['per_class']['Mild']['f1']*100:>15.2f}% | {metrics_b['per_class']['Mild']['f1']*100:>15.2f}% | {metrics_c['per_class']['Mild']['f1']*100:>15.2f}%")
    print(f"{'Severe Recall':<25} | {metrics_a['per_class']['Severe']['recall']*100:>15.2f}% | {metrics_b['per_class']['Severe']['recall']*100:>15.2f}% | {metrics_c['per_class']['Severe']['recall']*100:>15.2f}%")
    print(f"{'Severe F1':<25} | {metrics_a['per_class']['Severe']['f1']*100:>15.2f}% | {metrics_b['per_class']['Severe']['f1']*100:>15.2f}% | {metrics_c['per_class']['Severe']['f1']*100:>15.2f}%")
    print(f"{'Severe->Normal Errors':<25} | {metrics_a['confusion_matrix'][2][0]:>16} | {metrics_b['confusion_matrix'][2][0]:>16} | {metrics_c['confusion_matrix'][2][0]:>16}")
    print(f"{'Mean CPU Latency (ms)':<25} | {metrics_a['latency']['mean_ms']:>16.2f} | {metrics_b['latency']['mean_ms']:>16.2f} | {metrics_c['latency']['mean_ms']:>16.2f}")
    print("=" * 80)

    # Save validation metrics JSON
    combined_metrics = {
        "experiment": "Experiment 5: EfficientNet-B0 Validation-Only Test-Time Augmentation (TTA)",
        "source_checkpoint": str(checkpoint_path.resolve()),
        "checkpoint_sha256": initial_ckpt_hash,
        "sample_count": 150,
        "split_evaluated": "VALIDATION ONLY (Test set quarantined)",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "configurations": {
            "config_a_1view_original": metrics_a,
            "config_b_2view_hflip_tta": metrics_b,
            "config_c_3view_hvflip_tta": metrics_c,
        },
        "deltas_relative_to_baseline_config_a": {
            "config_b_delta_acc": round(metrics_b["accuracy"] - metrics_a["accuracy"], 4),
            "config_b_delta_macro_f1": round(metrics_b["macro_f1"] - metrics_a["macro_f1"], 4),
            "config_b_delta_mild_recall": round(metrics_b["per_class"]["Mild"]["recall"] - metrics_a["per_class"]["Mild"]["recall"], 4),
            "config_b_delta_severe_recall": round(metrics_b["per_class"]["Severe"]["recall"] - metrics_a["per_class"]["Severe"]["recall"], 4),
            "config_b_latency_overhead_percent": round((metrics_b["latency"]["mean_ms"] - metrics_a["latency"]["mean_ms"]) / metrics_a["latency"]["mean_ms"] * 100, 2),
            "config_c_delta_acc": round(metrics_c["accuracy"] - metrics_a["accuracy"], 4),
            "config_c_delta_macro_f1": round(metrics_c["macro_f1"] - metrics_a["macro_f1"], 4),
            "config_c_delta_mild_recall": round(metrics_c["per_class"]["Mild"]["recall"] - metrics_a["per_class"]["Mild"]["recall"], 4),
            "config_c_delta_severe_recall": round(metrics_c["per_class"]["Severe"]["recall"] - metrics_a["per_class"]["Severe"]["recall"], 4),
            "config_c_latency_overhead_percent": round((metrics_c["latency"]["mean_ms"] - metrics_a["latency"]["mean_ms"]) / metrics_a["latency"]["mean_ms"] * 100, 2),
        }
    }

    with open(metrics_out_path, "w", encoding="utf-8") as f:
        json.dump(combined_metrics, f, indent=2)
    print(f"\nMetrics persisted to: {metrics_out_path}")

    # Save detailed per-sample predictions JSON
    sample_records = []
    for i in range(len(filenames)):
        fname = filenames[i]
        true_c = CLASS_NAMES[y_true[i]]
        sample_records.append({
            "index": i,
            "filename": fname,
            "true_class": true_c,
            "true_label": int(y_true[i]),
            "config_a": {
                "predicted_class": CLASS_NAMES[y_pred_a[i]],
                "is_correct": bool(y_pred_a[i] == y_true[i]),
                "confidence": float(round(float(np.max(y_prob_a[i])), 4)),
                "probabilities": {c: float(round(float(y_prob_a[i][idx]), 4)) for idx, c in enumerate(CLASS_NAMES)},
            },
            "config_b": {
                "predicted_class": CLASS_NAMES[y_pred_b[i]],
                "is_correct": bool(y_pred_b[i] == y_true[i]),
                "confidence": float(round(float(np.max(y_prob_b[i])), 4)),
                "probabilities": {c: float(round(float(y_prob_b[i][idx]), 4)) for idx, c in enumerate(CLASS_NAMES)},
            },
            "config_c": {
                "predicted_class": CLASS_NAMES[y_pred_c[i]],
                "is_correct": bool(y_pred_c[i] == y_true[i]),
                "confidence": float(round(float(np.max(y_prob_c[i])), 4)),
                "probabilities": {c: float(round(float(y_prob_c[i][idx]), 4)) for idx, c in enumerate(CLASS_NAMES)},
            },
        })

    with open(predictions_out_path, "w", encoding="utf-8") as f:
        json.dump(sample_records, f, indent=2)
    print(f"Per-sample predictions persisted to: {predictions_out_path}")

    # Generate comparative confusion matrix visual
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    cm_a = np.array(metrics_a["confusion_matrix"])
    cm_b = np.array(metrics_b["confusion_matrix"])
    cm_c = np.array(metrics_c["confusion_matrix"])

    def draw_cm(ax, cm, title):
        im = ax.imshow(cm, interpolation="nearest", cmap="Blues")
        ax.set_title(title, fontsize=11, fontweight="bold", pad=12)
        ax.set_xticks(range(3))
        ax.set_yticks(range(3))
        ax.set_xticklabels(CLASS_NAMES, fontsize=10)
        ax.set_yticklabels(CLASS_NAMES, fontsize=10)
        ax.set_ylabel("True Class", fontsize=10, fontweight="bold")
        ax.set_xlabel("Predicted Class", fontsize=10, fontweight="bold")

        thresh = cm.max() / 2.0
        for r in range(3):
            for c in range(3):
                val = cm[r, c]
                row_sum = np.sum(cm[r, :])
                pct = (val / row_sum * 100) if row_sum > 0 else 0
                color = "white" if val > thresh else "black"
                ax.text(c, r, f"{val}\n({pct:.1f}%)", ha="center", va="center", color=color, fontsize=9)

    draw_cm(axes[0], cm_a, f"Config A: 1-View Baseline\nAcc: {metrics_a['accuracy']*100:.1f}% | F1: {metrics_a['macro_f1']*100:.1f}%")
    draw_cm(axes[1], cm_b, f"Config B: 2-View HFlip TTA\nAcc: {metrics_b['accuracy']*100:.1f}% | F1: {metrics_b['macro_f1']*100:.1f}%")
    draw_cm(axes[2], cm_c, f"Config C: 3-View H+VFlip TTA\nAcc: {metrics_c['accuracy']*100:.1f}% | F1: {metrics_c['macro_f1']*100:.1f}%")

    plt.tight_layout()
    plt.savefig(cm_plot_out_path, dpi=200, bbox_inches="tight")
    plt.close()
    print(f"Comparative confusion matrix plot saved to: {cm_plot_out_path}")

    # Final post-check: verify artifact hashes have not changed
    final_ckpt_hash = compute_sha256(checkpoint_path)
    final_onnx_hash = compute_sha256(onnx_path)
    assert final_ckpt_hash == initial_ckpt_hash, "CRITICAL: Checkpoint hash changed during evaluation!"
    assert final_onnx_hash == initial_onnx_hash, "CRITICAL: Deployed ONNX model changed during evaluation!"
    print("\n[VERIFICATION PASSED] Original checkpoint and deployed ONNX artifact hashes remain 100% identical.")
    print("=" * 80)
    return 0


if __name__ == "__main__":
    sys.exit(run_tta_evaluation())
