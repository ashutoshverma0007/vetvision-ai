#!/usr/bin/env python3
"""
==============================================================================
VetVision AI - Explainability Module: Genuine Grad-CAM for EfficientNet-B0
==============================================================================
Module: services.ai.research.explainability
Purpose: Generates reproducible, authentic Gradient-weighted Class Activation
         Mapping (Grad-CAM) visual explanations for cattle skin disease
         screening using the trained EfficientNet-B0 checkpoint (Experiment 3).

Mathematical Foundation (Selvaraju et al., ICCV 2017):
    1. Forward pass extracts feature map A in R^(C x H x W) from final conv layer.
    2. Backward pass computes gradient dY^c / dA^k for target class c.
    3. Channel importance weight: alpha_k^c = (1 / Z) * sum_{i,j} (dY^c / dA_{i,j}^k)
    4. Heatmap: L_{Grad-CAM}^c = ReLU(sum_k alpha_k^c * A^k)
    5. Normalization: L_norm = (L - min(L)) / (max(L) - min(L) + 1e-8)
    6. Bilinear upsampling to native image resolution (W_orig x H_orig).
    7. False-color mapping (Jet) and alpha-blending with original RGB image.

Integrity Commitments:
    - Zero synthetic or decorative heatmaps. Every pixel reflects true gradient
      propagation through the verified checkpoint.
    - Preserves native input image dimensions.
    - Full provenance logging: checkpoint SHA-256, image SHA-256, layer ID,
      per-class softmax probabilities, and environment versions.
==============================================================================
"""

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import matplotlib
import matplotlib.cm as cm
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

# Default class mapping matching Experiment 3 training and ONNX deployment
CLASS_NAMES: List[str] = ["Normal", "Mild", "Severe"]
CLASS_TO_IDX: Dict[str, int] = {name: idx for idx, name in enumerate(CLASS_NAMES)}
IDX_TO_CLASS: Dict[int, str] = {idx: name for idx, name in enumerate(CLASS_NAMES)}

IMAGENET_MEAN: List[float] = [0.485, 0.456, 0.406]
IMAGENET_STD: List[float] = [0.229, 0.224, 0.225]


def compute_sha256(file_path: Union[str, Path]) -> str:
    """Computes SHA-256 hash of a file for cryptographic provenance."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def load_efficientnetb0_checkpoint(
    checkpoint_path: Union[str, Path],
    num_classes: int = len(CLASS_NAMES),
    device: torch.device = torch.device("cpu"),
) -> Tuple[nn.Module, Dict[str, Any]]:
    """
    Constructs EfficientNet-B0 architecture with adapted 3-class classifier head
    and loads weights from the verified Experiment 3 checkpoint.
    """
    ckpt_path = Path(checkpoint_path).resolve()
    if not ckpt_path.exists():
        raise FileNotFoundError(f"Checkpoint file not found: {ckpt_path}")

    # Build base model without downloading weights (using checkpoint)
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)

    # Load state dict
    checkpoint_data = torch.load(ckpt_path, map_location=device)
    if isinstance(checkpoint_data, dict) and "model_state_dict" in checkpoint_data:
        state_dict = checkpoint_data["model_state_dict"]
        metadata = {
            "epoch": checkpoint_data.get("epoch"),
            "phase": checkpoint_data.get("phase"),
            "val_macro_f1": checkpoint_data.get("val_macro_f1"),
            "class_names": checkpoint_data.get("class_names", CLASS_NAMES),
            "class_weights": checkpoint_data.get("class_weights"),
        }
    elif isinstance(checkpoint_data, dict):
        state_dict = checkpoint_data
        metadata = {}
    else:
        raise ValueError(f"Unexpected checkpoint format from {ckpt_path}")

    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    return model, metadata


def get_target_layer(model: nn.Module) -> nn.Module:
    """
    Identifies the final convolutional feature layer of EfficientNet-B0.
    In torchvision EfficientNet-B0, model.features[-1] is the final 1280-channel
    convolutional block (stage 8 Conv2dNormActivation).
    """
    if hasattr(model, "features") and len(model.features) > 0:
        return model.features[-1]
    raise AttributeError("Could not identify target convolutional layer in model")


class GradCAM:
    """
    Gradient-weighted Class Activation Mapping (Grad-CAM) implementation.
    Registers forward and backward hooks on target convolutional layer.
    """

    def __init__(self, model: nn.Module, target_layer: Optional[nn.Module] = None, device: torch.device = torch.device("cpu")):
        self.model = model
        self.device = device
        self.model.to(self.device)
        self.model.eval()

        self.target_layer = target_layer if target_layer is not None else get_target_layer(self.model)

        self.activations: Optional[torch.Tensor] = None
        self.gradients: Optional[torch.Tensor] = None
        self.hook_handles: List[Any] = []

        self._register_hooks()

    def _register_hooks(self) -> None:
        """Registers forward hook and backward tensor hook."""
        def forward_hook(module: nn.Module, input_tensor: Any, output_tensor: torch.Tensor) -> None:
            self.activations = output_tensor

            # Attach tensor backward hook directly to activation tensor
            def tensor_backward_hook(grad: torch.Tensor) -> None:
                self.gradients = grad

            output_tensor.register_hook(tensor_backward_hook)

        handle = self.target_layer.register_forward_hook(forward_hook)
        self.hook_handles.append(handle)

    def remove_hooks(self) -> None:
        """Cleans up all registered hooks."""
        for handle in self.hook_handles:
            handle.remove()
        self.hook_handles.clear()

    def generate_cam(
        self,
        input_tensor: torch.Tensor,
        target_class_idx: Optional[int] = None,
    ) -> Tuple[np.ndarray, int, float, Dict[str, float]]:
        """
        Executes forward and backward pass to compute raw Grad-CAM activation map.

        Returns:
            cam (np.ndarray): 2D float32 array in [0, 1] at feature map resolution.
            predicted_class_idx (int): Class index with highest softmax probability.
            predicted_prob (float): Softmax probability of predicted class.
            all_probabilities (dict): Map of class name to probability.
        """
        self.model.zero_grad()
        self.activations = None
        self.gradients = None

        input_tensor = input_tensor.to(self.device)
        if input_tensor.dim() == 3:
            input_tensor = input_tensor.unsqueeze(0)

        # Forward pass
        logits = self.model(input_tensor)
        probabilities = torch.softmax(logits, dim=1).squeeze(0)

        pred_idx = int(torch.argmax(probabilities).item())
        pred_prob = float(probabilities[pred_idx].item())

        all_probs: Dict[str, float] = {
            CLASS_NAMES[i]: float(round(probabilities[i].item(), 4))
            for i in range(len(CLASS_NAMES))
        }

        # Target class for explanation (default to predicted class)
        target_idx = pred_idx if target_class_idx is None else target_class_idx

        # Backward pass on target class logit
        target_score = logits[0, target_idx]
        target_score.backward(retain_graph=True)

        if self.activations is None or self.gradients is None:
            raise RuntimeError("Grad-CAM hooks failed to capture activations or gradients.")

        # Compute channel weights via Global Average Pooling of gradients:
        # alpha_k = (1 / (H * W)) * sum_{i,j} dY^c / dA_{i,j}^k
        gradients = self.gradients.detach().cpu().numpy()[0]  # Shape: (C, H, W)
        activations = self.activations.detach().cpu().numpy()[0]  # Shape: (C, H, W)

        weights = np.mean(gradients, axis=(1, 2))  # Shape: (C,)

        # Linear combination: sum_k alpha_k * A^k
        cam = np.zeros(activations.shape[1:], dtype=np.float32)  # Shape: (H, W)
        for i, w in enumerate(weights):
            cam += w * activations[i, :, :]

        # Apply ReLU to keep only features that positively correlate with the target class
        cam = np.maximum(cam, 0)

        # Normalize to [0, 1]
        cam_min, cam_max = np.min(cam), np.max(cam)
        if cam_max > cam_min:
            cam = (cam - cam_min) / (cam_max - cam_min)
        else:
            cam = np.zeros_like(cam)

        return cam, pred_idx, pred_prob, all_probs


def preprocess_image(image_path: Union[str, Path]) -> Tuple[torch.Tensor, Image.Image, Tuple[int, int]]:
    """
    Loads image from disk, normalizes to RGB, records native dimensions,
    and formats tensor for model input matching training/inference pipeline.
    """
    img_p = Path(image_path).resolve()
    if not img_p.exists():
        raise FileNotFoundError(f"Input image not found: {img_p}")

    orig_image = Image.open(img_p).convert("RGB")
    orig_size = orig_image.size  # (width, height)

    transform = transforms.Compose([
        transforms.Resize((224, 224), interpolation=transforms.InterpolationMode.BILINEAR),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])

    input_tensor = transform(orig_image).unsqueeze(0)
    return input_tensor, orig_image, orig_size


def apply_colormap_and_overlay(
    cam_2d: np.ndarray,
    orig_image: Image.Image,
    colormap_name: str = "jet",
    alpha: float = 0.5,
) -> Tuple[np.ndarray, np.ndarray, Image.Image, Image.Image]:
    """
    Upsamples 2D CAM to native image resolution, applies false-color colormap,
    and blends with the original RGB image.

    Returns:
        heatmap_gray_uint8: (H_orig, W_orig) grayscale CAM in [0, 255].
        heatmap_colored_rgb: (H_orig, W_orig, 3) false-color RGB array.
        overlay_pil: PIL Image of blended overlay.
        composite_pil: PIL Image of 3-panel composite (Original | Heatmap | Overlay).
    """
    w_orig, h_orig = orig_image.size

    # 1. Bilinear resize CAM from feature-map resolution (7x7) to native (W_orig, H_orig)
    cam_pil = Image.fromarray((cam_2d * 255.0).astype(np.uint8))
    cam_resized = cam_pil.resize((w_orig, h_orig), resample=Image.Resampling.BILINEAR)
    cam_gray_uint8 = np.array(cam_resized)
    cam_norm = cam_gray_uint8.astype(np.float32) / 255.0

    # 2. Apply Matplotlib colormap
    try:
        cmap = matplotlib.colormaps[colormap_name]
    except (AttributeError, KeyError):
        cmap = cm.get_cmap(colormap_name)

    rgba_colored = cmap(cam_norm)  # Shape: (H, W, 4) in [0.0, 1.0]
    rgb_colored = (rgba_colored[:, :, :3] * 255.0).astype(np.uint8)

    # 3. Alpha blend with original image
    orig_np = np.array(orig_image)
    overlay_np = (alpha * rgb_colored + (1.0 - alpha) * orig_np).astype(np.uint8)
    overlay_pil = Image.fromarray(overlay_np)
    colored_cam_pil = Image.fromarray(rgb_colored)

    # 4. Construct 3-panel horizontal composite (Original | Heatmap | Overlay)
    panel_gap = 10
    total_w = (w_orig * 3) + (panel_gap * 2)
    composite_pil = Image.new("RGB", (total_w, h_orig), color=(255, 255, 255))
    composite_pil.paste(orig_image, (0, 0))
    composite_pil.paste(colored_cam_pil, (w_orig + panel_gap, 0))
    composite_pil.paste(overlay_pil, (w_orig * 2 + panel_gap * 2, 0))

    return cam_gray_uint8, rgb_colored, overlay_pil, composite_pil


def generate_explanation(
    image_path: Union[str, Path],
    checkpoint_path: Union[str, Path],
    output_dir: Union[str, Path],
    target_class: Optional[Union[str, int]] = None,
    device_name: str = "cpu",
    alpha: float = 0.5,
    colormap_name: str = "jet",
) -> Dict[str, Any]:
    """
    End-to-end explainability workflow:
    1. Loads checkpoint and verifies integrity.
    2. Preprocesses image.
    3. Runs Grad-CAM.
    4. Generates resized heatmaps and overlay.
    5. Saves artifacts and provenance metadata.
    """
    img_p = Path(image_path).resolve()
    ckpt_p = Path(checkpoint_path).resolve()
    out_dir = Path(output_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device(device_name if torch.cuda.is_available() and device_name.startswith("cuda") else "cpu")

    # Resolve target class index
    target_idx: Optional[int] = None
    if target_class is not None:
        if isinstance(target_class, int):
            if 0 <= target_class < len(CLASS_NAMES):
                target_idx = target_class
            else:
                raise ValueError(f"Invalid target class index {target_class}. Must be 0, 1, or 2.")
        elif isinstance(target_class, str):
            clean_name = target_class.strip().capitalize()
            if clean_name in CLASS_TO_IDX:
                target_idx = CLASS_TO_IDX[clean_name]
            elif target_class.isdigit() and 0 <= int(target_class) < len(CLASS_NAMES):
                target_idx = int(target_class)
            else:
                raise ValueError(f"Unknown target class '{target_class}'. Valid classes: {CLASS_NAMES}")

    # Load model and prepare Grad-CAM
    model, ckpt_meta = load_efficientnetb0_checkpoint(ckpt_p, device=device)
    gradcam = GradCAM(model, device=device)

    # Preprocess image
    input_tensor, orig_image, orig_size = preprocess_image(img_p)

    try:
        cam_2d, pred_idx, pred_prob, all_probs = gradcam.generate_cam(input_tensor, target_class_idx=target_idx)
    finally:
        gradcam.remove_hooks()

    actual_target_idx = pred_idx if target_idx is None else target_idx
    target_class_name = CLASS_NAMES[actual_target_idx]
    predicted_class_name = CLASS_NAMES[pred_idx]

    # Generate visual outputs
    cam_gray, rgb_colored, overlay_pil, composite_pil = apply_colormap_and_overlay(
        cam_2d, orig_image, colormap_name=colormap_name, alpha=alpha
    )

    # Filename prefix based on input image stem
    stem = img_p.stem
    orig_save_p = out_dir / f"{stem}_original.png"
    gray_save_p = out_dir / f"{stem}_heatmap_gray.png"
    color_save_p = out_dir / f"{stem}_heatmap_colored.png"
    overlay_save_p = out_dir / f"{stem}_overlay.png"
    composite_save_p = out_dir / f"{stem}_composite.png"
    meta_save_p = out_dir / f"{stem}_metadata.json"

    # Save images
    orig_image.save(orig_save_p, format="PNG")
    Image.fromarray(cam_gray).save(gray_save_p, format="PNG")
    Image.fromarray(rgb_colored).save(color_save_p, format="PNG")
    overlay_pil.save(overlay_save_p, format="PNG")
    composite_pil.save(composite_save_p, format="PNG")

    # Compute provenance metadata
    metadata: Dict[str, Any] = {
        "provenance": {
            "module": "services.ai.research.explainability",
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "checkpoint_path": str(ckpt_p),
            "checkpoint_sha256": compute_sha256(ckpt_p),
            "model_architecture": "EfficientNet-B0 (torchvision)",
            "target_layer": "model.features[-1] (Conv2dNormActivation, 1280 channels)",
            "input_image_path": str(img_p),
            "input_image_sha256": compute_sha256(img_p),
            "environment": {
                "python": sys.version.split()[0],
                "torch": torch.__version__,
                "numpy": np.__version__,
                "matplotlib": matplotlib.__version__,
            },
        },
        "model_metadata": ckpt_meta,
        "input_dimensions": {
            "native_width": orig_size[0],
            "native_height": orig_size[1],
            "model_input_resolution": [224, 224],
        },
        "prediction": {
            "predicted_class_index": pred_idx,
            "predicted_class": predicted_class_name,
            "predicted_probability": pred_prob,
            "class_probabilities": all_probs,
        },
        "explanation": {
            "target_class_index": actual_target_idx,
            "target_class": target_class_name,
            "feature_map_grid_resolution": list(cam_2d.shape),
            "upsampled_resolution": [orig_size[1], orig_size[0]],
            "colormap": colormap_name,
            "blend_alpha": alpha,
            "disclaimer": (
                "Grad-CAM visual explanation indicates image regions that positively influenced "
                "the model's classification score. It does not establish biological causality or "
                "replace professional veterinary histological examination."
            ),
        },
        "output_artifacts": {
            "original_image": str(orig_save_p),
            "grayscale_heatmap": str(gray_save_p),
            "colored_heatmap": str(color_save_p),
            "blended_overlay": str(overlay_save_p),
            "three_panel_composite": str(composite_save_p),
        },
    }

    with open(meta_save_p, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    return metadata


def build_cli_parser() -> argparse.ArgumentParser:
    """Constructs command-line interface argument parser."""
    parser = argparse.ArgumentParser(
        description="VetVision AI — Genuine Grad-CAM Explanation Utility for EfficientNet-B0",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--image",
        type=str,
        required=True,
        help="Path to input cattle skin photograph (PNG/JPG).",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="services/ai/research/reports/figures/gradcam",
        help="Directory where generated heatmap and overlay artifacts are saved.",
    )
    parser.add_argument(
        "--target-class",
        type=str,
        default=None,
        help="Target class for explanation ('Normal', 'Mild', 'Severe' or 0, 1, 2). Default: predicted class.",
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        default="services/ai/research/models/efficientnetb0_exp3_best.pth",
        help="Path to trained PyTorch EfficientNet-B0 checkpoint.",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="cpu",
        choices=["cpu", "cuda"],
        help="Inference execution device.",
    )
    parser.add_argument(
        "--alpha",
        type=float,
        default=0.5,
        help="Blending transparency coefficient (0.0 = original image, 1.0 = pure heatmap).",
    )
    parser.add_argument(
        "--colormap",
        type=str,
        default="jet",
        help="Matplotlib colormap name for false-color heatmap.",
    )
    return parser


def main() -> int:
    parser = build_cli_parser()
    args = parser.parse_args()

    try:
        meta = generate_explanation(
            image_path=args.image,
            checkpoint_path=args.checkpoint,
            output_dir=args.output_dir,
            target_class=args.target_class,
            device_name=args.device,
            alpha=args.alpha,
            colormap_name=args.colormap,
        )
        print("\n" + "=" * 70)
        print(" VETVISION AI — GRAD-CAM EXPLANATION GENERATION SUCCESSFUL")
        print("=" * 70)
        print(f" Input Image   : {meta['provenance']['input_image_path']}")
        print(f" Native Size   : {meta['input_dimensions']['native_width']} x {meta['input_dimensions']['native_height']}")
        print(f" Predicted     : {meta['prediction']['predicted_class']} ({meta['prediction']['predicted_probability']*100:.1f}%)")
        print(f" Target Class  : {meta['explanation']['target_class']}")
        print(f" Probabilities : {meta['prediction']['class_probabilities']}")
        print(f" Overlay Saved : {meta['output_artifacts']['blended_overlay']}")
        print(f" Composite     : {meta['output_artifacts']['three_panel_composite']}")
        print(f" Metadata JSON : {Path(meta['output_artifacts']['blended_overlay']).parent / (Path(args.image).stem + '_metadata.json')}")
        print("=" * 70 + "\n")
        return 0
    except Exception as e:
        print(f"\n[ERROR] Grad-CAM generation failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
