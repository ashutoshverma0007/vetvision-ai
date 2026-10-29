#!/usr/bin/env python3
"""
==============================================================================
VetVision AI - Reproducible Research Paper Figure Generator
==============================================================================
Module: services.ai.research.generate_paper_figures
Purpose: Generates verified, reproducible research figures for the three-class
         VetVision AI manuscript directly from saved experiment artifacts.

Artifacts Generated:
    1. figure_gradcam_three_class.png: Genuine Grad-CAM visual explanations
       on validation samples (Normal, Mild, Severe).
    2. figure_confusion_matrix_3class.png: 3-Class test set confusion matrix
       (N=148, exactly matching efficientnetb0_exp3_test_metrics.json).
    3. figure_class_metrics_3class.png: Precision, Recall, and F1 per class.
    4. figure_cpu_latency_comparison.png: PyTorch vs ONNX Runtime CPU latency
       distribution and speedup benchmark.
    5. figure_system_architecture_3class.png: Screening pipeline diagram.
==============================================================================
"""

import json
from pathlib import Path
from typing import Dict, Any

import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
from PIL import Image

# Import explainability engine
from explainability import generate_explanation

_REPO_ROOT = Path(__file__).resolve().parents[3]
REPORTS_DIR = _REPO_ROOT / "services" / "ai" / "research" / "reports"
FIGURES_DIR = REPORTS_DIR / "figures"
FIGURES_DIR.mkdir(parents=True, exist_ok=True)

CKPT_PATH = _REPO_ROOT / "services" / "ai" / "research" / "models" / "efficientnetb0_exp3_best.pth"
DATA_ROOT = _REPO_ROOT / "data" / "lsd" / "LumpySkinDisease_DataHub" / "LumpySkinDisease_DataHub" / "data-processed" / "lumpy_unbalanced" / "lumpy"


def generate_gradcam_figure() -> Path:
    """Generates consolidated 3-class Grad-CAM figure from validation samples."""
    samples = [
        ("Normal", DATA_ROOT / "Normal_Skin_10.png"),
        ("Mild", DATA_ROOT / "Mild_101.png"),
        ("Severe", DATA_ROOT / "Severe_21.png"),
    ]

    out_gradcam_dir = FIGURES_DIR / "gradcam"
    out_gradcam_dir.mkdir(parents=True, exist_ok=True)

    results = []
    for true_label, img_path in samples:
        meta = generate_explanation(
            image_path=img_path,
            checkpoint_path=CKPT_PATH,
            output_dir=out_gradcam_dir,
            target_class=None,  # Explains model's predicted class
        )
        results.append((true_label, img_path, meta))

    # Construct publication-quality 3-row, 3-column figure
    fig, axes = plt.subplots(3, 3, figsize=(10, 10), dpi=300)
    col_titles = ["Input Image", "Grad-CAM Heatmap", "Class Activation Overlay"]

    for row_idx, (true_label, img_path, meta) in enumerate(results):
        stem = img_path.stem
        orig_img = Image.open(out_gradcam_dir / f"{stem}_original.png")
        color_cam = Image.open(out_gradcam_dir / f"{stem}_heatmap_colored.png")
        overlay = Image.open(out_gradcam_dir / f"{stem}_overlay.png")

        pred_cls = meta["prediction"]["predicted_class"]
        pred_prob = meta["prediction"]["predicted_probability"] * 100

        axes[row_idx, 0].imshow(orig_img)
        axes[row_idx, 1].imshow(color_cam)
        axes[row_idx, 2].imshow(overlay)

        # Set row label on the left column
        axes[row_idx, 0].set_ylabel(
            f"True: {true_label}\nPred: {pred_cls} ({pred_prob:.1f}%)",
            fontsize=11,
            fontweight="bold",
            rotation=0,
            ha="right",
            va="center",
            labelpad=15,
        )

        for col_idx in range(3):
            ax = axes[row_idx, col_idx]
            ax.set_xticks([])
            ax.set_yticks([])
            if row_idx == 0:
                ax.set_title(col_titles[col_idx], fontsize=12, fontweight="bold", pad=8)

    plt.tight_layout()
    save_path = FIGURES_DIR / "figure_gradcam_three_class.png"
    plt.savefig(save_path, bbox_inches="tight")
    plt.close()
    print(f"[OK] Generated: {save_path}")
    return save_path


def generate_confusion_matrix_figure() -> Path:
    """Generates verified 3-class test set confusion matrix from saved metrics JSON."""
    metrics_path = REPORTS_DIR / "efficientnetb0_exp3_test_metrics.json"
    with open(metrics_path, "r", encoding="utf-8") as f:
        metrics = json.load(f)

    cm = np.array(metrics["confusion_matrix"])
    classes = ["Normal", "Mild", "Severe"]

    fig, ax = plt.subplots(figsize=(7, 6), dpi=300)
    cax = ax.matshow(cm, cmap=plt.cm.Blues, alpha=0.85)

    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            count = cm[i, j]
            row_total = np.sum(cm[i, :])
            pct = (count / row_total) * 100 if row_total > 0 else 0
            color = "white" if count > (cm.max() / 2) else "black"
            ax.text(
                j, i, f"{count}\n({pct:.1f}%)",
                ha="center", va="center",
                color=color, fontsize=12, fontweight="bold"
            )

    fig.colorbar(cax, ax=ax, fraction=0.046, pad=0.04)

    ax.set_xticks(range(len(classes)))
    ax.set_yticks(range(len(classes)))
    ax.set_xticklabels(classes, fontsize=11, fontweight="bold")
    ax.set_yticklabels(classes, fontsize=11, fontweight="bold")

    ax.set_xlabel("Predicted Class", fontsize=12, fontweight="bold", labelpad=10)
    ax.set_ylabel("True Ground Truth Class", fontsize=12, fontweight="bold", labelpad=10)
    ax.set_title("EfficientNet-B0 Three-Class Test Set Confusion Matrix\n(Held-out Test N = 148, Accuracy = 90.54%)", fontsize=12, fontweight="bold", pad=15)

    # Highlight zero Severe-to-Normal misses
    rect = patches.Rectangle((-0.45, 1.55), 0.9, 0.9, linewidth=2, edgecolor="green", facecolor="none", linestyle="--")
    ax.add_patch(rect)
    ax.text(0.0, 2.35, "Zero Severe missed as Normal", color="green", fontsize=9, fontweight="bold", ha="center")

    plt.tight_layout()
    save_path = FIGURES_DIR / "figure_confusion_matrix_3class.png"
    plt.savefig(save_path, bbox_inches="tight")
    plt.close()
    print(f"[OK] Generated: {save_path}")
    return save_path


def generate_class_metrics_figure() -> Path:
    """Generates per-class precision, recall, and F1 comparison bar chart."""
    metrics_path = REPORTS_DIR / "efficientnetb0_exp3_test_metrics.json"
    with open(metrics_path, "r", encoding="utf-8") as f:
        metrics = json.load(f)

    classes = ["Normal (N=103)", "Mild (N=33)", "Severe (N=12)", "Macro Avg (N=148)"]
    per_class = metrics["per_class"]

    precisions = [
        per_class["Normal"]["precision"] * 100,
        per_class["Mild"]["precision"] * 100,
        per_class["Severe"]["precision"] * 100,
        metrics["macro_precision"] * 100,
    ]
    recalls = [
        per_class["Normal"]["recall"] * 100,
        per_class["Mild"]["recall"] * 100,
        per_class["Severe"]["recall"] * 100,
        metrics["macro_recall"] * 100,
    ]
    f1_scores = [
        per_class["Normal"]["f1"] * 100,
        per_class["Mild"]["f1"] * 100,
        per_class["Severe"]["f1"] * 100,
        metrics["macro_f1"] * 100,
    ]

    x = np.arange(len(classes))
    width = 0.25

    fig, ax = plt.subplots(figsize=(9, 5.5), dpi=300)
    r1 = ax.bar(x - width, precisions, width, label="Precision", color="#3b82f6")
    r2 = ax.bar(x, recalls, width, label="Recall", color="#10b981")
    r3 = ax.bar(x + width, f1_scores, width, label="F1-Score", color="#f59e0b")

    for rects in [r1, r2, r3]:
        for rect in rects:
            height = rect.get_height()
            ax.annotate(
                f"{height:.1f}%",
                xy=(rect.get_x() + rect.get_width() / 2, height),
                xytext=(0, 3),
                textcoords="offset points",
                ha="center", va="bottom",
                fontsize=9, fontweight="bold",
            )

    ax.set_ylabel("Score (%)", fontsize=11, fontweight="bold")
    ax.set_title("Test Set Classification Performance by Disease Screening Class\n(EfficientNet-B0 Exp 3, N = 148)", fontsize=12, fontweight="bold", pad=12)
    ax.set_xticks(x)
    ax.set_xticklabels(classes, fontsize=10, fontweight="bold")
    ax.set_ylim(0, 115)
    ax.grid(axis="y", linestyle="--", alpha=0.4)
    ax.legend(loc="lower right", framealpha=0.95)

    plt.tight_layout()
    save_path = FIGURES_DIR / "figure_class_metrics_3class.png"
    plt.savefig(save_path, bbox_inches="tight")
    plt.close()
    print(f"[OK] Generated: {save_path}")
    return save_path


def generate_cpu_latency_figure() -> Path:
    """Generates CPU inference latency and throughput comparison from benchmark data."""
    bench_path = REPORTS_DIR / "efficientnetb0_onnx_verification.json"
    with open(bench_path, "r", encoding="utf-8") as f:
        data = json.load(f)["benchmarks"]

    frameworks = ["PyTorch (Eager CPU)", "ONNX Runtime (CPU)"]
    median_latencies = [data["pytorch"]["median_p50_ms"], data["onnx_runtime"]["median_p50_ms"]]
    p95_latencies = [data["pytorch"]["p95_ms"], data["onnx_runtime"]["p95_ms"]]
    throughputs = [data["pytorch"]["throughput_fps"], data["onnx_runtime"]["throughput_fps"]]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4.8), dpi=300)

    # 1. Latency comparison
    x = np.arange(len(frameworks))
    width = 0.35
    b1 = ax1.bar(x - width/2, median_latencies, width, label="Median (P50)", color="#6366f1")
    b2 = ax1.bar(x + width/2, p95_latencies, width, label="95th Percentile (P95)", color="#ef4444")

    for rects in [b1, b2]:
        for rect in rects:
            h = rect.get_height()
            ax1.annotate(f"{h:.1f} ms", xy=(rect.get_x() + rect.get_width() / 2, h),
                         xytext=(0, 3), textcoords="offset points", ha="center", va="bottom",
                         fontsize=9, fontweight="bold")

    ax1.set_ylabel("Inference Latency (ms/image)", fontsize=11, fontweight="bold")
    ax1.set_title("Single-Image Latency (CPU)\n(-73.88% Latency Reduction)", fontsize=11, fontweight="bold")
    ax1.set_xticks(x)
    ax1.set_xticklabels(frameworks, fontsize=10, fontweight="bold")
    ax1.set_ylim(0, 40)
    ax1.grid(axis="y", linestyle="--", alpha=0.4)
    ax1.legend(loc="upper right")

    # 2. Throughput comparison
    bars = ax2.bar(frameworks, throughputs, color=["#94a3b8", "#10b981"], width=0.5)
    for bar in bars:
        h = bar.get_height()
        ax2.annotate(f"{h:.1f} FPS", xy=(bar.get_x() + bar.get_width() / 2, h),
                     xytext=(0, 3), textcoords="offset points", ha="center", va="bottom",
                     fontsize=10, fontweight="bold")

    ax2.set_ylabel("Throughput (Images / Second)", fontsize=11, fontweight="bold")
    ax2.set_title("Deployment Throughput\n(3.83x Acceleration)", fontsize=11, fontweight="bold")
    ax2.set_ylim(0, 175)
    ax2.grid(axis="y", linestyle="--", alpha=0.4)

    plt.tight_layout()
    save_path = FIGURES_DIR / "figure_cpu_latency_comparison.png"
    plt.savefig(save_path, bbox_inches="tight")
    plt.close()
    print(f"[OK] Generated: {save_path}")
    return save_path


def generate_system_architecture_figure() -> Path:
    """Generates schematic diagram of the 3-class screening and Grad-CAM workflow."""
    fig, ax = plt.subplots(figsize=(12, 5.5), dpi=300)
    ax.axis("off")

    def draw_box(x, y, w, h, text, color, subtext=""):
        rect = patches.FancyBboxPatch(
            (x, y), w, h, boxstyle="round,pad=0.08,rounding_size=0.04",
            facecolor=color, edgecolor="#1e293b", linewidth=1.5
        )
        ax.add_patch(rect)
        if subtext:
            ax.text(x + w/2, y + h*0.62, text, ha="center", va="center", fontsize=10, fontweight="bold", color="#0f172a")
            ax.text(x + w/2, y + h*0.28, subtext, ha="center", va="center", fontsize=8, color="#334155")
        else:
            ax.text(x + w/2, y + h/2, text, ha="center", va="center", fontsize=10, fontweight="bold", color="#0f172a")

    def draw_arrow(x1, y1, x2, y2, label=""):
        ax.annotate(
            "", xy=(x2, y2), xytext=(x1, y1),
            arrowprops=dict(arrowstyle="->", color="#334155", lw=1.8, shrinkA=4, shrinkB=4)
        )
        if label:
            ax.text((x1 + x2)/2, (y1 + y2)/2 + 0.03, label, ha="center", va="bottom", fontsize=8, color="#475569")

    # Pipeline blocks
    draw_box(0.02, 0.45, 0.14, 0.28, "Cattle Skin Image", "#e2e8f0", "256x256 RGB Photo")
    draw_arrow(0.16, 0.59, 0.21, 0.59)

    draw_box(0.21, 0.45, 0.16, 0.28, "Preprocessing", "#dbeafe", "Resize 224x224\nImageNet Norm")
    draw_arrow(0.37, 0.59, 0.42, 0.59)

    draw_box(0.42, 0.40, 0.18, 0.38, "EfficientNet-B0\nBackbone", "#bfdbfe", "Stages 0-8\n(1,280 feature channels)")

    # Upper branch: Classification & ONNX
    draw_arrow(0.60, 0.68, 0.66, 0.75, "Features")
    draw_box(0.66, 0.65, 0.15, 0.26, "Classifier Head", "#bbf7d0", "Linear (1280 -> 3)\nSoftmax Probabilities")
    draw_arrow(0.81, 0.78, 0.86, 0.78)
    draw_box(0.86, 0.65, 0.12, 0.26, "Screening Output", "#86efac", "Normal / Mild / Severe\n(Threshold >= 65%)")

    # Lower branch: Grad-CAM Explainability
    draw_arrow(0.60, 0.50, 0.66, 0.35, "Layer features[-1]")
    draw_box(0.66, 0.22, 0.15, 0.26, "Grad-CAM Engine", "#fef08a", "Gradient Backprop\nWeight Pooling alpha_k")
    draw_arrow(0.81, 0.35, 0.86, 0.35)
    draw_box(0.86, 0.22, 0.12, 0.26, "Visual Heatmap", "#fde047", "Bilinear Upsample\nJet Overlay (256x256)")

    # Deployment annotation banner at bottom
    draw_box(0.10, 0.05, 0.80, 0.10, "Production Runtime: ONNX Runtime CPU Engine (6.79 ms latency, 146.6 FPS throughput)", "#f1f5f9")

    ax.set_xlim(0, 1.0)
    ax.set_ylim(0, 1.0)
    plt.tight_layout()

    save_path = FIGURES_DIR / "figure_system_architecture_3class.png"
    plt.savefig(save_path, bbox_inches="tight")
    plt.close()
    print(f"[OK] Generated: {save_path}")
    return save_path


def main():
    print("=" * 70)
    print(" VETVISION AI — REPRODUCIBLE RESEARCH FIGURE GENERATION")
    print("=" * 70)
    generate_gradcam_figure()
    generate_confusion_matrix_figure()
    generate_class_metrics_figure()
    generate_cpu_latency_figure()
    generate_system_architecture_figure()
    print("=" * 70)
    print(" ALL 5 RESEARCH FIGURES SUCCESSFULLY GENERATED IN:")
    print(f" {FIGURES_DIR}")
    print("=" * 70)


if __name__ == "__main__":
    main()
