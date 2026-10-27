#!/usr/bin/env python3
"""
==============================================================================
VetVision AI - Model Evaluation & Benchmarking Module
==============================================================================
Module: services.ai.research.training.evaluate
Purpose: Provides comprehensive, clinically rigorous evaluation and deployment
         benchmarking for cattle Lumpy Skin Disease (LSD) severity classification.

Metrics calculated:
- Accuracy, Macro-F1, Macro-Precision, Macro-Recall
- Weighted-F1, Weighted-Precision, Weighted-Recall
- Per-class precision, recall, F1, and support for Normal, Mild, Severe
- Multiclass ROC-AUC (One-vs-Rest macro and weighted)
- Confusion Matrix (raw counts and row-normalized percentages)
- Deployment benchmarking (parameter counts, checkpoint size, CPU latency P50/P95, throughput)
==============================================================================
"""

import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    precision_recall_fscore_support,
    roc_auc_score,
)
from torch.utils.data import DataLoader


CLASS_NAMES = ["Normal", "Mild", "Severe"]


def compute_classification_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_prob: Optional[np.ndarray] = None,
    class_names: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Computes complete classification metrics for multi-class evaluation.
    """
    if class_names is None:
        class_names = CLASS_NAMES

    labels = list(range(len(class_names)))
    acc = float(accuracy_score(y_true, y_pred))

    # Macro averages
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, average="macro", zero_division=0
    )

    # Weighted averages
    weighted_p, weighted_r, weighted_f1, _ = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, average="weighted", zero_division=0
    )

    # Per-class metrics
    per_class_p, per_class_r, per_class_f1, per_class_support = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, average=None, zero_division=0
    )

    per_class_dict: Dict[str, Dict[str, float]] = {}
    for idx, c_name in enumerate(class_names):
        per_class_dict[c_name] = {
            "precision": float(round(per_class_p[idx], 4)),
            "recall": float(round(per_class_r[idx], 4)),
            "f1": float(round(per_class_f1[idx], 4)),
            "support": int(per_class_support[idx]),
        }

    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred, labels=labels)

    # Multiclass ROC-AUC (One-vs-Rest)
    roc_auc_macro = None
    roc_auc_weighted = None
    if y_prob is not None:
        try:
            # Check that all classes are present in y_true for AUC
            unique_classes = set(y_true)
            if len(unique_classes) == len(class_names):
                roc_auc_macro = float(round(roc_auc_score(y_true, y_prob, multi_class="ovr", average="macro"), 4))
                roc_auc_weighted = float(round(roc_auc_score(y_true, y_prob, multi_class="ovr", average="weighted"), 4))
            else:
                roc_auc_macro = None
                roc_auc_weighted = None
        except Exception:
            roc_auc_macro = None
            roc_auc_weighted = None

    metrics = {
        "accuracy": float(round(acc, 4)),
        "macro_precision": float(round(macro_p, 4)),
        "macro_recall": float(round(macro_r, 4)),
        "macro_f1": float(round(macro_f1, 4)),
        "weighted_precision": float(round(weighted_p, 4)),
        "weighted_recall": float(round(weighted_r, 4)),
        "weighted_f1": float(round(weighted_f1, 4)),
        "roc_auc_ovr_macro": roc_auc_macro,
        "roc_auc_ovr_weighted": roc_auc_weighted,
        "per_class": per_class_dict,
        "confusion_matrix": cm.tolist(),
        "total_samples": int(len(y_true)),
    }
    return metrics


def evaluate_model(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
    class_names: Optional[List[str]] = None,
) -> Tuple[Dict[str, Any], float, np.ndarray, np.ndarray, np.ndarray]:
    """
    Evaluates a PyTorch model on a given dataloader.
    Returns:
        (metrics_dict, average_loss, y_true, y_pred, y_prob)
    """
    if class_names is None:
        class_names = CLASS_NAMES

    model.eval()
    total_loss = 0.0
    total_samples = 0
    all_preds: List[int] = []
    all_targets: List[int] = []
    all_probs: List[np.ndarray] = []

    with torch.no_grad():
        for images, targets in dataloader:
            images = images.to(device)
            targets = targets.to(device)

            outputs = model(images)
            loss = criterion(outputs, targets)

            probs = torch.softmax(outputs, dim=1)
            _, preds = torch.max(outputs, 1)

            batch_size = targets.size(0)
            total_loss += loss.item() * batch_size
            total_samples += batch_size

            all_preds.extend(preds.cpu().numpy().tolist())
            all_targets.extend(targets.cpu().numpy().tolist())
            all_probs.append(probs.cpu().numpy())

    avg_loss = total_loss / total_samples if total_samples > 0 else 0.0
    y_true = np.array(all_targets)
    y_pred = np.array(all_preds)
    y_prob = np.concatenate(all_probs, axis=0) if all_probs else np.empty((0, len(class_names)))

    metrics = compute_classification_metrics(y_true, y_pred, y_prob, class_names=class_names)
    metrics["loss"] = float(round(avg_loss, 4))

    return metrics, avg_loss, y_true, y_pred, y_prob


def plot_confusion_matrix(
    cm: np.ndarray,
    class_names: List[str],
    output_path: Path,
    title: str = "MobileNetV3-Large - Confusion Matrix",
) -> None:
    """
    Generates a publication-quality confusion matrix heatmap.
    Displays both absolute sample counts and row-normalized percentages.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig, ax = plt.subplots(figsize=(7, 6), dpi=300)
    fig.patch.set_facecolor("#ffffff")

    cm_sum = cm.sum(axis=1, keepdims=True)
    # Avoid zero division if a row has zero samples
    cm_norm = np.divide(cm.astype("float"), cm_sum, out=np.zeros_like(cm, dtype=float), where=cm_sum != 0)

    # Clean teal/blue colormap
    im = ax.imshow(cm, interpolation="nearest", cmap="Blues")
    cbar = ax.figure.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    cbar.ax.set_ylabel("Sample Count", rotation=-90, va="bottom", fontsize=10, fontweight="bold")

    ax.set(
        xticks=np.arange(cm.shape[1]),
        yticks=np.arange(cm.shape[0]),
        xticklabels=class_names,
        yticklabels=class_names,
        title=title,
        ylabel="True Label (Ground Truth)",
        xlabel="Predicted Label",
    )
    ax.title.set_fontsize(12)
    ax.title.set_fontweight("bold")
    ax.xaxis.label.set_fontsize(11)
    ax.xaxis.label.set_fontweight("bold")
    ax.yaxis.label.set_fontsize(11)
    ax.yaxis.label.set_fontweight("bold")

    plt.setp(ax.get_xticklabels(), rotation=0, ha="center", fontsize=10, fontweight="bold")
    plt.setp(ax.get_yticklabels(), fontsize=10, fontweight="bold")

    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            count = cm[i, j]
            pct = cm_norm[i, j] * 100
            cell_text = f"{count}\n({pct:.1f}%)"
            text_color = "white" if count > thresh else "#1f2937"
            ax.text(
                j,
                i,
                cell_text,
                ha="center",
                va="center",
                color=text_color,
                fontweight="bold",
                fontsize=10,
            )

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.close(fig)


def benchmark_cpu_inference(
    model: nn.Module,
    input_resolution: Tuple[int, int] = (224, 224),
    num_warmup: int = 20,
    num_runs: int = 100,
    checkpoint_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Benchmarks CPU inference latency on single image batches (batch_size=1).
    Calculates: Mean, Median (P50), P95, P99 latency, and throughput (FPS).
    """
    cpu_device = torch.device("cpu")
    model_cpu = model.to(cpu_device)
    model_cpu.eval()

    # Parameter counts
    total_params = sum(p.numel() for p in model_cpu.parameters())
    trainable_params = sum(p.numel() for p in model_cpu.parameters() if p.requires_grad)

    # Checkpoint size
    checkpoint_size_mb = 0.0
    if checkpoint_path and checkpoint_path.exists():
        checkpoint_size_mb = round(os.path.getsize(checkpoint_path) / (1024 * 1024), 2)

    # Dummy tensor representing single input (1, 3, H, W)
    dummy_input = torch.randn(1, 3, input_resolution[0], input_resolution[1], device=cpu_device)

    # Warmup
    with torch.no_grad():
        for _ in range(num_warmup):
            _ = model_cpu(dummy_input)

    # Benchmark runs
    latencies_ms: List[float] = []
    with torch.no_grad():
        for _ in range(num_runs):
            t_start = time.perf_counter()
            _ = model_cpu(dummy_input)
            t_end = time.perf_counter()
            latencies_ms.append((t_end - t_start) * 1000.0)

    latencies_arr = np.array(latencies_ms)
    mean_lat = float(round(np.mean(latencies_arr), 2))
    median_lat = float(round(np.median(latencies_arr), 2))
    p95_lat = float(round(np.percentile(latencies_arr, 95), 2))
    p99_lat = float(round(np.percentile(latencies_arr, 99), 2))
    throughput = float(round(1000.0 / mean_lat, 2)) if mean_lat > 0 else 0.0

    return {
        "device": "CPU",
        "total_parameters": int(total_params),
        "trainable_parameters": int(trainable_params),
        "checkpoint_size_mb": checkpoint_size_mb,
        "benchmark_runs": num_runs,
        "warmup_runs": num_warmup,
        "latency_ms": {
            "mean": mean_lat,
            "median_p50": median_lat,
            "p95": p95_lat,
            "p99": p99_lat,
        },
        "throughput_images_per_second": throughput,
    }
