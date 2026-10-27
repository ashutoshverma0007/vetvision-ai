#!/usr/bin/env python3
"""
==============================================================================
VetVision AI - Experiment 4: EfficientNet-B0 Training Ablation
==============================================================================
Module: services.ai.research.training.train_efficientnetb0_exp4
Purpose: Investigates whether smoothed square-root class weighting and label
         smoothing (alpha = 0.05) improve EfficientNet-B0's classification
         performance, minority class sensitivity, and calibration relative to
         the linear inverse-weighted baseline in Experiment 3.

Experimental Configuration:
1. Architecture: EfficientNet-B0 (ImageNet pretrained weights).
2. Manifest: Same 696 TRAIN / 150 VAL / 148 TEST split from dataset_split.csv.
3. Seed: Fixed random seed 42.
4. Loss: Weighted Cross-Entropy with smoothed square-root class weights and
         label smoothing (alpha = 0.05):
         - Raw formula: w_c_raw = sqrt(N_train / N_c)
         - Normalized: Normal: 0.5317, Mild: 0.9456, Severe: 1.5227
5. Two-phase fine-tuning:
   - Phase 1: Classification head only (backbone frozen), AdamW (lr 1e-4, wd 1e-4).
   - Phase 2: Upper backbone fine-tuning (stages 6-8 unfrozen), AdamW (backbone lr 2e-5, head lr 5e-5).
6. Scheduler: ReduceLROnPlateau (mode='max', factor=0.5, patience=3, min_lr=1e-6).
7. Early stopping: Patience 8 epochs based strictly on VALIDATION Macro-F1.
8. Best Checkpoint Selection: Strictly on VALIDATION Macro-F1.
9. TEST SET POLICY: Strictly quarantined. Under Step 3 instructions, the test
   set is NOT evaluated for this ablation to preserve test integrity.
==============================================================================
"""

import argparse
import csv
import json
import os
import random
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
        sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)
    except Exception:
        pass

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms

# Ensure workspace root is in sys.path
_repo_root = Path(__file__).resolve().parents[4]
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

try:
    from services.ai.research.training.evaluate import (
        benchmark_cpu_inference,
        compute_classification_metrics,
        evaluate_model,
        plot_confusion_matrix,
    )
except ImportError:
    from evaluate import (
        benchmark_cpu_inference,
        compute_classification_metrics,
        evaluate_model,
        plot_confusion_matrix,
    )

CLASS_NAMES = ["Normal", "Mild", "Severe"]
CLASS_TO_IDX = {"Normal": 0, "Mild": 1, "Severe": 2}
IDX_TO_CLASS = {0: "Normal", 1: "Mild", 2: "Severe"}

DEFAULT_SEED = 42
DEFAULT_BATCH_SIZE = 32
DEFAULT_PHASE1_EPOCHS = 30
DEFAULT_PHASE2_EPOCHS = 30
LABEL_SMOOTHING = 0.05


def seed_everything(seed: int = DEFAULT_SEED) -> None:
    """Sets deterministic random seeds across all libraries."""
    random.seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


class LSDDataset(Dataset):
    """
    Dataset loader for cattle Lumpy Skin Disease images based on manifest metadata.
    Resolves image paths safely relative to workspace and disk.
    """

    def __init__(
        self,
        records: List[Dict[str, str]],
        workspace_root: Path,
        transform: Optional[transforms.Compose] = None,
    ):
        self.records = records
        self.workspace_root = workspace_root
        self.transform = transform

        self.dataset_root = (
            workspace_root
            / "data"
            / "lsd"
            / "LumpySkinDisease_DataHub"
            / "LumpySkinDisease_DataHub"
            / "data-processed"
            / "lumpy_unbalanced"
            / "lumpy"
        )

    def __len__(self) -> int:
        return len(self.records)

    def _resolve_image_path(self, record: Dict[str, str]) -> Path:
        abs_p = Path(record.get("absolute_path", ""))
        if abs_p.exists():
            return abs_p

        filename = record.get("filename", "")
        fallback_p = self.dataset_root / filename
        if fallback_p.exists():
            return fallback_p

        rel_p = self.workspace_root / record.get("relative_path", "")
        if rel_p.exists():
            return rel_p

        raise FileNotFoundError(
            f"Could not resolve image file '{filename}'. Tried:\n"
            f" 1. {abs_p}\n"
            f" 2. {fallback_p}\n"
            f" 3. {rel_p}"
        )

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int, str]:
        record = self.records[idx]
        image_path = self._resolve_image_path(record)

        try:
            image = Image.open(image_path).convert("RGB")
        except Exception as e:
            raise RuntimeError(f"Error opening image {image_path}: {e}")

        cls_str = record.get("class", "").strip()
        if cls_str not in CLASS_TO_IDX:
            raise ValueError(f"Unknown class '{cls_str}' for image {record.get('filename')}")
        label = CLASS_TO_IDX[cls_str]

        if self.transform:
            image_tensor = self.transform(image)
        else:
            image_tensor = transforms.ToTensor()(image)

        filename = record.get("filename", image_path.name)
        return image_tensor, label, filename


def get_transforms() -> Tuple[transforms.Compose, transforms.Compose]:
    """
    Returns (train_transform, eval_transform).
    Identical to Experiment 1, 2, and 3 reference preprocessing.
    """
    imagenet_mean = [0.485, 0.456, 0.406]
    imagenet_std = [0.229, 0.224, 0.225]

    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=(-15, 15)),
        transforms.RandomAffine(
            degrees=0,
            translate=(0.05, 0.05),
            scale=(0.95, 1.05),
        ),
        transforms.ColorJitter(
            brightness=0.1,
            contrast=0.1,
            saturation=0.05,
            hue=0.0,
        ),
        transforms.ToTensor(),
        transforms.Normalize(mean=imagenet_mean, std=imagenet_std),
    ])

    eval_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=imagenet_mean, std=imagenet_std),
    ])

    return train_transform, eval_transform


def verify_split_manifest(
    manifest_path: Path,
) -> Tuple[List[Dict[str, str]], List[Dict[str, str]], List[Dict[str, str]]]:
    """
    Loads dataset_split.csv and performs strict pre-training integrity verification:
    1. Exactly 696 TRAIN, 150 VALIDATION, 148 TEST records.
    2. Exact class counts per split.
    3. Zero excluded records.
    4. Zero filename or SHA-256 overlap across splits.
    """
    if not manifest_path.exists():
        raise FileNotFoundError(f"Dataset split manifest not found at: {manifest_path}")

    train_rows: List[Dict[str, str]] = []
    val_rows: List[Dict[str, str]] = []
    test_rows: List[Dict[str, str]] = []
    unknown_rows: List[Dict[str, str]] = []

    with open(manifest_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            split = row.get("split", "").strip().upper()
            if split == "TRAIN":
                train_rows.append(row)
            elif split == "VALIDATION":
                val_rows.append(row)
            elif split == "TEST":
                test_rows.append(row)
            else:
                unknown_rows.append(row)

    print("=" * 80)
    print(" PRE-TRAINING MANIFEST INTEGRITY VERIFICATION (EXPERIMENT 4: EFFICIENTNET-B0 ABLATION)")
    print("=" * 80)
    print(f"Manifest File: {manifest_path.resolve()}")
    print(f"  Observed Split Counts: TRAIN={len(train_rows)}, VALIDATION={len(val_rows)}, TEST={len(test_rows)}")

    if len(train_rows) != 696 or len(val_rows) != 150 or len(test_rows) != 148:
        raise ValueError(
            f"SPLIT COUNT VIOLATION: Expected 696 TRAIN / 150 VAL / 148 TEST, "
            f"got {len(train_rows)} / {len(val_rows)} / {len(test_rows)}"
        )
    if unknown_rows:
        raise ValueError(f"UNKNOWN SPLITS: Found {len(unknown_rows)} records with invalid split column")

    train_counts = Counter(r["class"] for r in train_rows)
    val_counts = Counter(r["class"] for r in val_rows)
    test_counts = Counter(r["class"] for r in test_rows)

    expected_train = {"Normal": 484, "Mild": 153, "Severe": 59}
    expected_val = {"Normal": 104, "Mild": 33, "Severe": 13}
    expected_test = {"Normal": 103, "Mild": 33, "Severe": 12}

    if dict(train_counts) != expected_train:
        raise ValueError(f"TRAIN class count mismatch: expected {expected_train}, got {dict(train_counts)}")
    if dict(val_counts) != expected_val:
        raise ValueError(f"VALIDATION class count mismatch: expected {expected_val}, got {dict(val_counts)}")
    if dict(test_counts) != expected_test:
        raise ValueError(f"TEST class count mismatch: expected {expected_test}, got {dict(test_counts)}")

    for s_name, rows in [("TRAIN", train_rows), ("VAL", val_rows), ("TEST", test_rows)]:
        excluded_in_split = [
            r["filename"] for r in rows
            if r.get("research_status", "").upper() != "USABLE"
            or r.get("exclusion_reason", "").upper() not in ("", "NONE")
        ]
        if excluded_in_split:
            raise ValueError(f"EXCLUDED RECORD LEAKAGE in {s_name}: {excluded_in_split[:5]}")

    train_files = {r["filename"] for r in train_rows}
    val_files = {r["filename"] for r in val_rows}
    test_files = {r["filename"] for r in test_rows}

    if train_files & val_files or train_files & test_files or val_files & test_files:
        raise ValueError("FILE DUPLICATION: Same filename appears in multiple splits!")

    train_shas = {r["sha256"] for r in train_rows}
    val_shas = {r["sha256"] for r in val_rows}
    test_shas = {r["sha256"] for r in test_rows}

    if train_shas & val_shas or train_shas & test_shas or val_shas & test_shas:
        raise ValueError("CRYPTOGRAPHIC LEAKAGE: Same SHA-256 hash appears in multiple splits!")

    print(">>> PRE-TRAINING VERIFICATION PASSED: All 994 usable records verified. Zero leakage. <<<")
    print("=" * 80)
    return train_rows, val_rows, test_rows


def compute_exp4_sqrt_class_weights(
    train_rows: List[Dict[str, str]],
    device: torch.device,
) -> Tuple[torch.Tensor, Dict[str, float]]:
    """
    Computes smoothed square-root inverse-frequency class weights STRICTLY from the training set:
        w_c_raw = sqrt(N_train / N_c)
        w_c = K * (w_c_raw / sum(w_k_raw))
    Normalizes weights so their mean equals 1.0 (sum = K = 3).
    Matches Experiment 2 treatment for controlled comparison.
    """
    counts = Counter(r["class"] for r in train_rows)
    total_train = len(train_rows)
    num_classes = len(CLASS_NAMES)

    raw_weights: Dict[str, float] = {}
    for c_name in CLASS_NAMES:
        c_count = counts[c_name]
        raw_weights[c_name] = np.sqrt(total_train / c_count)

    sum_raw = sum(raw_weights.values())
    normalized_weights: Dict[str, float] = {}
    weights_list: List[float] = []

    print("\n--- Training Set Class Weights: Smoothed Square-Root Inverse Frequency (Exp 4) ---")
    print(f"Total Training Samples: {total_train} across {num_classes} classes")
    for c_name in CLASS_NAMES:
        w = float(num_classes * (raw_weights[c_name] / sum_raw))
        normalized_weights[c_name] = round(w, 4)
        weights_list.append(w)
        c_count = counts[c_name]
        print(f"  Class {c_name:<7} (N={c_count:>3}): raw={raw_weights[c_name]:.4f} -> normalized={w:.4f}")

    ratio_sev_norm = normalized_weights["Severe"] / normalized_weights["Normal"]
    ratio_sev_mild = normalized_weights["Severe"] / normalized_weights["Mild"]
    print(f"  Penalty Ratios: Severe:Normal = {ratio_sev_norm:.2f}:1 (Exp 3 was 8.20:1) | Severe:Mild = {ratio_sev_mild:.2f}:1 (Exp 3 was 2.59:1)")

    weights_tensor = torch.tensor(weights_list, dtype=torch.float32).to(device)
    return weights_tensor, normalized_weights


def create_efficientnetb0_model(num_classes: int = 3) -> nn.Module:
    """
    Instantiates EfficientNet-B0 with ImageNet pretrained weights and replaces
    the classifier head with: Dropout(p=0.2, inplace=True) -> Linear(1280, num_classes).
    Matches Experiment 3 architecture exactly.
    """
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
    in_features = model.classifier[1].in_features  # 1280
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.2, inplace=True),
        nn.Linear(in_features, num_classes),
    )
    return model


def freeze_backbone(model: nn.Module) -> None:
    """Freezes all feature extractor stages (0-8). Leaves only classifier trainable."""
    for param in model.features.parameters():
        param.requires_grad = False
    for param in model.classifier.parameters():
        param.requires_grad = True


def unfreeze_upper_backbone(model: nn.Module, unfreeze_from_stage: int = 6) -> None:
    """
    Unfreezes the upper stages of EfficientNet-B0 (stages >= unfreeze_from_stage, default 6)
    along with classifier head. Stages 0 to 5 remain frozen as lower/mid-level feature extractors.
    Matches Experiment 3 fine-tuning strategy.
    """
    for i, stage in enumerate(model.features):
        if i >= unfreeze_from_stage:
            for param in stage.parameters():
                param.requires_grad = True
        else:
            for param in stage.parameters():
                param.requires_grad = False

    for param in model.classifier.parameters():
        param.requires_grad = True


def train_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    optimizer: optim.Optimizer,
    criterion: nn.Module,
    device: torch.device,
) -> Tuple[float, float, float]:
    """Runs one training epoch. Returns (avg_loss, accuracy, macro_f1)."""
    model.train()
    total_loss = 0.0
    total_samples = 0
    all_preds: List[int] = []
    all_targets: List[int] = []

    for images, targets, _ in dataloader:
        images = images.to(device)
        targets = targets.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, targets)
        loss.backward()
        optimizer.step()

        _, preds = torch.max(outputs, 1)
        batch_size = targets.size(0)
        total_loss += loss.item() * batch_size
        total_samples += batch_size

        all_preds.extend(preds.cpu().numpy().tolist())
        all_targets.extend(targets.cpu().numpy().tolist())

    avg_loss = total_loss / total_samples if total_samples > 0 else 0.0
    metrics = compute_classification_metrics(np.array(all_targets), np.array(all_preds))
    return avg_loss, metrics["accuracy"], metrics["macro_f1"]


def evaluate_model_with_filenames(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
    class_names: Optional[List[str]] = None,
) -> Tuple[Dict[str, Any], float, np.ndarray, np.ndarray, np.ndarray, List[str]]:
    """
    Evaluates a PyTorch model on a given dataloader, capturing filenames and probabilities.
    Returns: (metrics_dict, average_loss, y_true, y_pred, y_prob, filenames)
    """
    if class_names is None:
        class_names = CLASS_NAMES

    model.eval()
    total_loss = 0.0
    total_samples = 0
    all_preds: List[int] = []
    all_targets: List[int] = []
    all_probs: List[np.ndarray] = []
    all_filenames: List[str] = []

    with torch.no_grad():
        for images, targets, filenames in dataloader:
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
            all_filenames.extend(filenames)

    avg_loss = total_loss / total_samples if total_samples > 0 else 0.0
    y_true = np.array(all_targets)
    y_pred = np.array(all_preds)
    y_prob = np.concatenate(all_probs, axis=0) if all_probs else np.empty((0, len(class_names)))

    metrics = compute_classification_metrics(y_true, y_pred, y_prob, class_names=class_names)
    metrics["loss"] = float(round(avg_loss, 4))

    return metrics, avg_loss, y_true, y_pred, y_prob, all_filenames


def run_experiment_4() -> int:
    t_start = time.time()
    seed_everything(DEFAULT_SEED)

    # 1. Paths & Configuration
    workspace_root = _repo_root
    manifest_path = workspace_root / "services/ai/research/reports/dataset_split.csv"
    models_dir = workspace_root / "services/ai/research/models"
    reports_dir = workspace_root / "services/ai/research/reports"
    models_dir.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)

    config_path = workspace_root / "services/ai/research/training/config_efficientnetb0_exp4.json"
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    best_checkpoint_path = models_dir / "efficientnetb0_exp4_best.pth"
    history_csv_path = reports_dir / "efficientnetb0_exp4_training_history.csv"
    val_metrics_json_path = reports_dir / "efficientnetb0_exp4_validation_metrics.json"
    cm_png_path = reports_dir / "efficientnetb0_exp4_confusion_matrix.png"

    # 2. Verify Manifest
    train_rows, val_rows, test_rows = verify_split_manifest(manifest_path)

    # 3. Device Setup
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"\nExecution Device: {device} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'})")

    # 4. Transforms and Datasets
    train_transform, eval_transform = get_transforms()
    train_dataset = LSDDataset(train_rows, workspace_root=workspace_root, transform=train_transform)
    val_dataset = LSDDataset(val_rows, workspace_root=workspace_root, transform=eval_transform)

    batch_size = DEFAULT_BATCH_SIZE
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0, pin_memory=torch.cuda.is_available())
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0, pin_memory=torch.cuda.is_available())

    # 5. Class Weights & Loss Formulation (Exp 4 Treatment: Sqrt Weights + Label Smoothing 0.05)
    class_weights, computed_norm_weights = compute_exp4_sqrt_class_weights(train_rows, device=device)
    criterion = nn.CrossEntropyLoss(weight=class_weights, label_smoothing=LABEL_SMOOTHING)
    print(f"\nLoss Configuration: Weighted Cross-Entropy with label_smoothing={LABEL_SMOOTHING}")

    # 6. Initialize Model
    print("\nInitializing EfficientNet-B0 with ImageNet pretrained weights...")
    model = create_efficientnetb0_model(num_classes=len(CLASS_NAMES)).to(device)

    history: List[Dict[str, Any]] = []
    best_val_macro_f1 = -1.0
    best_epoch_info: Dict[str, Any] = {}
    global_epoch = 0

    # --------------------------------------------------------------------------
    # PHASE 1: Head-Only Feature Extraction (Backbone Frozen)
    # --------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print(" EXPERIMENT 4 — STARTING PHASE 1: Training Classification Head (Backbone Frozen)")
    print("=" * 80)
    freeze_backbone(model)
    trainable_params_p1 = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total_params = sum(p.numel() for p in model.parameters())
    print(f"Total Parameters: {total_params:,} | Trainable in Phase 1: {trainable_params_p1:,} ({trainable_params_p1/total_params*100:.2f}%)")

    optimizer_p1 = optim.AdamW(model.classifier.parameters(), lr=1e-4, weight_decay=1e-4)
    scheduler_p1 = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer_p1, mode="max", factor=0.5, patience=3, min_lr=1e-6
    )

    early_stop_patience = 8
    p1_no_improve_epochs = 0

    for epoch in range(1, DEFAULT_PHASE1_EPOCHS + 1):
        global_epoch += 1
        t0 = time.time()
        train_loss, train_acc, train_f1 = train_one_epoch(model, train_loader, optimizer_p1, criterion, device)
        val_metrics, val_loss, _, _, _, _ = evaluate_model_with_filenames(model, val_loader, criterion, device, CLASS_NAMES)
        val_acc = val_metrics["accuracy"]
        val_f1 = val_metrics["macro_f1"]
        elapsed = time.time() - t0

        curr_lr = optimizer_p1.param_groups[0]["lr"]
        scheduler_p1.step(val_f1)

        is_best = val_f1 > best_val_macro_f1
        if is_best:
            best_val_macro_f1 = val_f1
            p1_no_improve_epochs = 0
            best_epoch_info = {
                "phase": 1,
                "epoch": global_epoch,
                "phase_epoch": epoch,
                "val_macro_f1": val_f1,
                "val_acc": val_acc,
                "val_loss": val_loss,
            }
            torch.save({
                "epoch": global_epoch,
                "phase": 1,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer_p1.state_dict(),
                "scheduler_state_dict": scheduler_p1.state_dict(),
                "val_macro_f1": val_f1,
                "val_metrics": val_metrics,
                "config": config,
                "class_names": CLASS_NAMES,
                "class_weights": computed_norm_weights,
                "seed": DEFAULT_SEED,
            }, best_checkpoint_path)
            star = " * [BEST CHECKPOINT SAVED]"
        else:
            p1_no_improve_epochs += 1
            star = ""

        history.append({
            "global_epoch": global_epoch,
            "phase": 1,
            "phase_epoch": epoch,
            "lr": curr_lr,
            "train_loss": round(train_loss, 4),
            "train_acc": round(train_acc, 4),
            "train_macro_f1": round(train_f1, 4),
            "val_loss": round(val_loss, 4),
            "val_acc": round(val_acc, 4),
            "val_macro_f1": round(val_f1, 4),
            "val_norm_f1": val_metrics["per_class"]["Normal"]["f1"],
            "val_mild_f1": val_metrics["per_class"]["Mild"]["f1"],
            "val_sev_f1": val_metrics["per_class"]["Severe"]["f1"],
        })

        print(
            f"Phase 1 | Ep {epoch:>2}/{DEFAULT_PHASE1_EPOCHS} (Tot {global_epoch:>2}) | "
            f"Loss: {train_loss:.4f} -> {val_loss:.4f} | "
            f"Acc: {train_acc*100:.1f}% -> {val_acc*100:.1f}% | "
            f"F1: {train_f1*100:.1f}% -> {val_f1*100:.1f}% | "
            f"LR: {curr_lr:.1e} | {elapsed:.1f}s{star}"
        )

        if p1_no_improve_epochs >= early_stop_patience:
            print(f"--- Early stopping triggered in Phase 1 after {p1_no_improve_epochs} epochs without Macro-F1 improvement ---")
            break

    # --------------------------------------------------------------------------
    # PHASE 2: Fine-Tuning Upper Backbone Stages (Stages 6, 7, 8 Unfrozen)
    # --------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print(" EXPERIMENT 4 — STARTING PHASE 2: Fine-Tuning Upper Backbone (Stages 6-8 Unfrozen)")
    print("=" * 80)

    # Load best weights from Phase 1 before starting fine-tuning
    if best_checkpoint_path.exists():
        print(f"Loading best Phase 1 checkpoint from {best_checkpoint_path.name} (Val Macro-F1: {best_val_macro_f1*100:.2f}%)...")
        checkpoint = torch.load(best_checkpoint_path, map_location=device)
        model.load_state_dict(checkpoint["model_state_dict"])

    unfreeze_upper_backbone(model, unfreeze_from_stage=6)
    trainable_params_p2 = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Trainable Parameters in Phase 2: {trainable_params_p2:,} ({trainable_params_p2/total_params*100:.2f}%)")

    backbone_params = [p for i, stage in enumerate(model.features) if i >= 6 for p in stage.parameters() if p.requires_grad]
    classifier_params = list(model.classifier.parameters())

    optimizer_p2 = optim.AdamW([
        {"params": backbone_params, "lr": 2e-5},
        {"params": classifier_params, "lr": 5e-5},
    ], weight_decay=1e-4)

    scheduler_p2 = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer_p2, mode="max", factor=0.5, patience=3, min_lr=1e-6
    )

    p2_no_improve_epochs = 0

    for epoch in range(1, DEFAULT_PHASE2_EPOCHS + 1):
        global_epoch += 1
        t0 = time.time()
        train_loss, train_acc, train_f1 = train_one_epoch(model, train_loader, optimizer_p2, criterion, device)
        val_metrics, val_loss, _, _, _, _ = evaluate_model_with_filenames(model, val_loader, criterion, device, CLASS_NAMES)
        val_acc = val_metrics["accuracy"]
        val_f1 = val_metrics["macro_f1"]
        elapsed = time.time() - t0

        curr_lr = optimizer_p2.param_groups[1]["lr"]
        scheduler_p2.step(val_f1)

        is_best = val_f1 > best_val_macro_f1
        if is_best:
            best_val_macro_f1 = val_f1
            p2_no_improve_epochs = 0
            best_epoch_info = {
                "phase": 2,
                "epoch": global_epoch,
                "phase_epoch": epoch,
                "val_macro_f1": val_f1,
                "val_acc": val_acc,
                "val_loss": val_loss,
            }
            torch.save({
                "epoch": global_epoch,
                "phase": 2,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer_p2.state_dict(),
                "scheduler_state_dict": scheduler_p2.state_dict(),
                "val_macro_f1": val_f1,
                "val_metrics": val_metrics,
                "config": config,
                "class_names": CLASS_NAMES,
                "class_weights": computed_norm_weights,
                "seed": DEFAULT_SEED,
            }, best_checkpoint_path)
            star = " * [NEW OVERALL BEST SAVED]"
        else:
            p2_no_improve_epochs += 1
            star = ""

        history.append({
            "global_epoch": global_epoch,
            "phase": 2,
            "phase_epoch": epoch,
            "lr": curr_lr,
            "train_loss": round(train_loss, 4),
            "train_acc": round(train_acc, 4),
            "train_macro_f1": round(train_f1, 4),
            "val_loss": round(val_loss, 4),
            "val_acc": round(val_acc, 4),
            "val_macro_f1": round(val_f1, 4),
            "val_norm_f1": val_metrics["per_class"]["Normal"]["f1"],
            "val_mild_f1": val_metrics["per_class"]["Mild"]["f1"],
            "val_sev_f1": val_metrics["per_class"]["Severe"]["f1"],
        })

        print(
            f"Phase 2 | Ep {epoch:>2}/{DEFAULT_PHASE2_EPOCHS} (Tot {global_epoch:>2}) | "
            f"Loss: {train_loss:.4f} -> {val_loss:.4f} | "
            f"Acc: {train_acc*100:.1f}% -> {val_acc*100:.1f}% | "
            f"F1: {train_f1*100:.1f}% -> {val_f1*100:.1f}% | "
            f"LR: {curr_lr:.1e} | {elapsed:.1f}s{star}"
        )

        if p2_no_improve_epochs >= early_stop_patience:
            print(f"--- Early stopping triggered in Phase 2 after {p2_no_improve_epochs} epochs without Macro-F1 improvement ---")
            break

    # Save training history CSV
    with open(history_csv_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(history[0].keys()))
        writer.writeheader()
        writer.writerows(history)
    print(f"\nTraining history written to: {history_csv_path}")

    # --------------------------------------------------------------------------
    # FINAL EVALUATION: Load Best Checkpoint strictly on VALIDATION SET
    # --------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print(" EXPERIMENT 4 — FINAL VALIDATION EVALUATION")
    print("=" * 80)
    print(f"Loading best checkpoint from: {best_checkpoint_path.name} (Selected at Epoch {best_epoch_info.get('epoch')})")
    final_checkpoint = torch.load(best_checkpoint_path, map_location=device)
    model.load_state_dict(final_checkpoint["model_state_dict"])
    model.eval()

    # Re-evaluate best model strictly on Validation Set
    final_val_metrics, final_val_loss, val_y_true, val_y_pred, val_y_prob, _ = evaluate_model_with_filenames(
        model, val_loader, criterion, device, CLASS_NAMES
    )
    final_val_metrics["best_epoch"] = int(best_epoch_info.get("epoch", 0))
    final_val_metrics["best_phase"] = int(best_epoch_info.get("phase", 0))
    final_val_metrics["training_duration_seconds"] = round(time.time() - t_start, 2)

    with open(val_metrics_json_path, mode="w", encoding="utf-8") as f:
        json.dump(final_val_metrics, f, indent=2)
    print(f"Validation metrics saved to: {val_metrics_json_path}")

    # Plot and save validation confusion matrix
    cm_arr = np.array(final_val_metrics["confusion_matrix"])
    plot_confusion_matrix(
        cm_arr,
        class_names=CLASS_NAMES,
        output_path=cm_png_path,
        title="EfficientNet-B0 Exp 4 (Sqrt Weights + Label Smooth 0.05) - Validation Confusion Matrix",
    )
    print(f"Validation confusion matrix plot saved to: {cm_png_path}")

    # --------------------------------------------------------------------------
    # STEP 3: STRICT TEST SET QUARANTINE NOTICE
    # --------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print(" STRICT TEST SET INTEGRITY ENFORCEMENT")
    print("=" * 80)
    print(" [POLICY COMPLIANCE] The 148-sample test split was QUARANTINED.")
    print(" Under Phase 6 instructions (Step 3):")
    print("   1. Test set was NOT evaluated during or after training.")
    print("   2. No test metrics were generated or used for checkpoint selection.")
    print("   3. Checkpoint selection was conducted 100% on validation split (N=150).")
    print("=" * 80)

    total_duration = time.time() - t_start
    print(f"\nExperiment 4 completed in {total_duration:.1f}s ({total_duration/60:.2f} mins).")
    print(f"Best Validation Macro-F1: {final_val_metrics['macro_f1']*100:.2f}% | Val Accuracy: {final_val_metrics['accuracy']*100:.2f}% (Epoch {final_val_metrics['best_epoch']})")
    print("=" * 80)
    return 0


if __name__ == "__main__":
    sys.exit(run_experiment_4())
