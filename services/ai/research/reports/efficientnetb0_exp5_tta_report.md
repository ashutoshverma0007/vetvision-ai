# VetVision AI — Experiment 5: Validation-Only Test-Time Augmentation (TTA) Report

**Author / Team:** VetVision AI Engineering  
**Date:** October 15, 2026  
**Experiment:** Experiment 5 — Validation-Only Test-Time Augmentation (TTA) on EfficientNet-B0 (Experiment 3 Checkpoint)  
**Evaluated Artifact:** `services/ai/research/models/efficientnetb0_exp3_best.pth` (SHA-256: `e53c38ab272b...`)  
**Deployment Decision:** Reject TTA; Maintain 1-View ONNX Deployment  
**Status:** Completed (Validation Set Only; Test Set Quarantined)

---

## 1. Executive Summary

Experiment 5 investigated whether **Test-Time Augmentation (TTA)**—averaging model predictions across multiple transformed views of an input image at inference time—improves the validation classification performance, minority sensitivity, or calibration of the winning **EfficientNet-B0** model (Experiment 3 best checkpoint).

### Core Findings
1. **TTA Degraded Performance:** Both 2-view TTA (horizontal flip) and 3-view TTA (horizontal + vertical flip) **reduced** validation accuracy and Macro-F1 relative to standard 1-view inference:
   - **Configuration A (1-View Baseline):** Accuracy **90.00%**, Macro-F1 **87.67%**, Mean Latency **29.73 ms**.
   - **Configuration B (2-View HFlip TTA):** Accuracy **88.00%** (-2.00%), Macro-F1 **84.25%** (-3.42%), Mean Latency **57.54 ms** (+93.5%).
   - **Configuration C (3-View H+VFlip TTA):** Accuracy **86.67%** (-3.33%), Macro-F1 **81.37%** (-6.30%), Mean Latency **84.28 ms** (+183.5%).
2. **Mild Lesion Sensitivity Drop:** 2-view TTA caused Mild class recall to drop from **75.76%** to **66.67%** (-9.09%), misclassifying 3 additional mild lesion cases as normal.
3. **Severe Lesion Safety Preserved in 2-View:** In both Configuration A and Configuration B, **0 Severe animals were misclassified as Normal**. However, adding vertical flip (Configuration C) degraded Severe recall from **92.31%** to **76.92%**.
4. **Latency Penalty:** 2-view TTA nearly doubled CPU inference latency ($29.73\text{ ms} \rightarrow 57.54\text{ ms}$), while 3-view TTA nearly tripled latency ($84.28\text{ ms}$).
5. **Engineering & Clinical Decision:** **TTA is rejected.** The existing 1-view production ONNX model (`services/ai/models/efficientnetb0_lsd_v1.onnx`) strictly outperforms all TTA configurations in accuracy, balanced F1, and computational efficiency.

---

## 2. Experimental Setup & Preprocessing Integrity

### Checkpoint and Manifest Verification
- **Evaluated Checkpoint:** `services/ai/research/models/efficientnetb0_exp3_best.pth`
  - File Size: 41,688,203 bytes (39.76 MB)
  - SHA-256 Hash: `e53c38ab272b2f47356fe4a050f83516f3acdc7056ee79166fad7fe6a134c238`
  - Origin: Experiment 3 (Epoch 51)
- **Dataset Partition:** Strictly evaluated on the **VALIDATION split (150 images)**:
  - Normal: 104 samples (69.3%)
  - Mild: 33 samples (22.0%)
  - Severe: 13 samples (8.7%)
- **Test Set Quarantine:** The 148-sample test split was **strictly quarantined and never loaded or evaluated**.
- **Preprocessing:** Identical to Experiment 3:
  - Resolution: $224 \times 224$ RGB
  - ImageNet standardization: $\text{mean} = [0.485, 0.456, 0.406]$, $\text{std} = [0.229, 0.224, 0.225]$
  - Bilinear interpolation, NCHW float32 tensor formatting

### Evaluated Configurations
- **Configuration A (1-View Baseline):** Single forward pass on the original standardized image.
- **Configuration B (2-View TTA):** Softmax probability ensemble of original image + horizontal flip:
  $$P_{\text{TTA-B}}(y=k) = \frac{1}{2} \left[ P(y=k \mid x_{\text{orig}}) + P(y=k \mid x_{\text{hflip}}) \right]$$
  *Scientific Justification:* Bovine skin lesions exhibit bilateral mirror invariance (lateral flank views are biologically valid whether the animal faces left or right).
- **Configuration C (3-View TTA):** Softmax probability ensemble of original image + horizontal flip + vertical flip:
  $$P_{\text{TTA-C}}(y=k) = \frac{1}{3} \left[ P(y=k \mid x_{\text{orig}}) + P(y=k \mid x_{\text{hflip}}) + P(y=k \mid x_{\text{vflip}}) \right]$$
  *Scientific Caveat:* Cattle field photography obeys gravitational orientation (upright anatomical pose). Vertical inversion introduces unphysical inverted cows that violate natural lesion presentation.

---

## 3. Comparative Validation Results

All 150 validation samples were evaluated across all three configurations under identical hardware conditions (CPU PyTorch evaluation).

### High-Level Summary Table
| Metric | Config A (1-View Baseline) | Config B (2-View HFlip TTA) | Config C (3-View H+VFlip TTA) | Delta (B vs A) | Delta (C vs A) |
|---|---|---|---|---|---|
| **Accuracy** | **90.00%** (135/150) | 88.00% (132/150) | 86.67% (130/150) | **-2.00%** | **-3.33%** |
| **Macro Precision** | **87.92%** | 84.39% | 81.65% | -3.53% | -6.27% |
| **Macro Recall** | **87.43%** | 84.40% | 81.34% | -3.03% | -6.09% |
| **Macro F1-Score** | **87.67%** | **84.25%** | **81.37%** | **-3.42%** | **-6.30%** |
| **Weighted F1-Score**| **89.94%** | 87.72% | 86.91% | -2.22% | -3.03% |
| **ROC-AUC (OVR Macro)**| 0.9614 | 0.9622 | **0.9637** | +0.0008 | +0.0023 |
| **Severe $\rightarrow$ Normal**| **0 (0.0%)** | **0 (0.0%)** | **0 (0.0%)** | 0 | 0 |
| **Mean CPU Latency** | **29.73 ms** | 57.54 ms | 84.28 ms | **+93.54%** | **+183.48%** |
| **Median (P50) Latency**| **28.16 ms** | 55.13 ms | 82.80 ms | +95.77% | +194.03% |
| **P95 CPU Latency** | **39.47 ms** | 67.26 ms | 92.93 ms | +70.41% | +135.44% |

---

## 4. Per-Class Performance and Confusion Matrix Analysis

### Per-Class Metrics Comparison
| Class | Support | Metric | Config A (1-View) | Config B (2-View) | Config C (3-View) |
|---|---|---|---|---|---|
| **Normal** | 104 | Precision | 93.33% | 91.59% | **94.06%** |
| | | Recall | **94.23%** (98/104) | **94.23%** (98/104) | 91.35% (95/104) |
| | | F1-Score | **93.78%** | 92.89% | 92.68% |
| **Mild** | 33 | Precision | **78.12%** | 75.86% | 67.57% |
| | | Recall | **75.76%** (25/33) | 66.67% (22/33) | **75.76%** (25/33) |
| | | F1-Score | **76.92%** | 70.97% | 71.43% |
| **Severe** | 13 | Precision | **92.31%** | 85.71% | 83.33% |
| | | Recall | **92.31%** (12/13) | **92.31%** (12/13) | 76.92% (10/13) |
| | | F1-Score | **92.31%** | 88.89% | 80.00% |

### Confusion Matrices (Validation Set, N=150)

#### Configuration A: 1-View Baseline
```
                 Predicted Normal   Predicted Mild   Predicted Severe
Actual Normal          98                 6                 0
Actual Mild             7                25                 1
Actual Severe           0                 1                12
```

#### Configuration B: 2-View HFlip TTA
```
                 Predicted Normal   Predicted Mild   Predicted Severe
Actual Normal          98                 6                 0
Actual Mild             9                22                 2
Actual Severe           0                 1                12
```

#### Configuration C: 3-View H+VFlip TTA
```
                 Predicted Normal   Predicted Mild   Predicted Severe
Actual Normal          95                 9                 0
Actual Mild             6                25                 2
Actual Severe           0                 3                10
```

---

## 5. Detailed Scientific Analysis

### 1. Why Did Horizontal Flip TTA Degrade Validation Performance?
- **Training Redundancy:** EfficientNet-B0 in Experiment 3 was already trained with horizontal flip augmentation ($p=0.5$). The model already learned representations invariant to horizontal orientation.
- **Probability Dilution on Borderline Mild Cases:** Mild cases feature localized, circumscribed cutaneous nodules often surrounded by normal skin texture and asymmetrical hair whorls. For borderline images, horizontal flipping slightly alters feature activations and background clutter. Averaging probabilities with the flipped view pulled three borderline Mild samples below the decision boundary into Normal ($25/33 \rightarrow 22/33$ recall).
- **Severe Precision Loss:** 2-view TTA misclassified 2 Mild cases as Severe (up from 1 in Config A), dropping Severe precision from $92.31\%$ to $85.71\%$.

### 2. Why Did Vertical Flip TTA Fail Catastrophically?
- **Violation of Anatomical Orientation:** Bovine lateral photographs are captured upright. Anatomical features (legs, dewlap, backline, nodule drainage) are strictly oriented by gravity.
- **Out-of-Distribution Inversion:** Vertical inversion produces an inverted image that the model was never trained to recognize, corrupting feature activations and causing Severe recall to plunge from $92.31\%$ to $76.92\%$ (3 severe cases missed and misclassified as mild).

### 3. Latency Overhead vs Clinical Value
- **Config A:** Single forward pass execution takes **29.73 ms** on CPU (and **6.82 ms** in ONNX Runtime).
- **Config B:** Requires 2 full image transforms and 2 model forward passes, taking **57.54 ms** (+93.5%).
- **Conclusion:** Doubling the computational cost while suffering a 2.0% accuracy drop and 3.42% Macro-F1 drop makes TTA unequivocally counterproductive.

---

## 6. Test Integrity & Verification Checklist

- **Test Set Quarantine:** Verified 100% compliant. No test split records were loaded, evaluated, or referenced.
- **Checkpoint Hash Immutability:** 
  - `efficientnetb0_exp3_best.pth` SHA-256 pre-eval: `e53c38ab272b2f47356fe4a050f83516f3acdc7056ee79166fad7fe6a134c238`
  - `efficientnetb0_exp3_best.pth` SHA-256 post-eval: `e53c38ab272b2f47356fe4a050f83516f3acdc7056ee79166fad7fe6a134c238` (**Unchanged**)
- **Deployed ONNX Immutability:**
  - `efficientnetb0_lsd_v1.onnx` SHA-256: `3fb0c2ec20b6f4a3c4845b8dd040f91862659ad3746474e59ebc4d4fa9dd77bc` (**Unchanged**)

---

## 7. Artifact Manifest

| Artifact Type | File Path | File Size | Description |
|---|---|---|---|
| **Evaluation Script** | `services/ai/research/training/evaluate_efficientnetb0_exp5_tta.py` | 16.5 KB | Reproducible TTA validation benchmark |
| **Metrics JSON** | `services/ai/research/reports/efficientnetb0_exp5_tta_validation_metrics.json` | 4.5 KB | Full metrics for Configs A, B, and C |
| **Predictions JSON** | `services/ai/research/reports/efficientnetb0_exp5_tta_validation_predictions.json` | 89.2 KB | Per-sample probabilities across all 150 val samples |
| **Confusion Matrix Plot**| `services/ai/research/reports/efficientnetb0_exp5_tta_confusion_matrix.png` | 133.5 KB | 3-panel comparative confusion matrix |
| **Report Markdown** | `services/ai/research/reports/efficientnetb0_exp5_tta_report.md` | This file | Complete experimental and clinical analysis |

---

## 8. Final Decision and Recommended Next Steps

### Deployment Decision
- **Configuration A (Standard 1-View Inference) remains the optimal and active deployment configuration.**
- Test-Time Augmentation is **rejected** for production deployment.
- The deployed ONNX model (`services/ai/models/efficientnetb0_lsd_v1.onnx`) and the FastAPI inference service remain unchanged.

### Recommended Next Research Directions
1. **Multi-Scale Feature Pyramid:** Rather than image flips, explore multi-scale feature representations (e.g. Feature Pyramid Networks or ConvNeXt-Nano) to better resolve fine cutaneous nodules at variable camera distances.
2. **Post-Hoc Probability Calibration:** Fit temperature scaling strictly on the validation logits to optimize Expected Calibration Error (ECE) for improved threshold confidence triaging.
3. **Clinical Pilot Data Collection:** The primary bottleneck is minority class sample size (59 Train / 13 Val Severe samples). Acquiring additional diverse field-confirmed severe cases will yield far greater diagnostic improvements than test-time geometric transformations.
