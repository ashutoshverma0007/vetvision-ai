# VetVision AI — Experiment 4: EfficientNet-B0 Training Ablation Report

**Author / Team:** VetVision AI Engineering  
**Date:** October 15, 2026  
**Experiment:** Experiment 4 — EfficientNet-B0 with Smoothed Square-Root Class Weighting and Label Smoothing ($\alpha = 0.05$)  
**Reference Baseline:** Experiment 3 — EfficientNet-B0 with Linear Inverse-Frequency Class Weighting  
**Status:** Completed (Validation-Only Comparison; Test Set Strictly Quarantined)

---

## 1. Executive Summary

Experiment 4 investigated whether replacing linear inverse-frequency class weighting with smoothed square-root class weighting and applying label smoothing ($\alpha = 0.05$) improves the balanced classification performance and clinical sensitivity of **EfficientNet-B0** on the curated cattle Lumpy Skin Disease (LSD) dataset.

### Core Findings
1. **Validation Macro-F1 Decreased:** Experiment 4 achieved a Validation Macro-F1 of **85.62%**, which is **2.05% lower** than Experiment 3's **87.67%**.
2. **Validation Accuracy Unchanged:** Both Experiment 3 and Experiment 4 achieved identical validation accuracy of **90.00%** (135 / 150 correct).
3. **Clinical Safety Degradation:** In Experiment 3, there were **0** Severe-to-Normal false negatives on the validation set. In Experiment 4, **1 Severe animal was misclassified as Normal**, alongside a drop in Severe F1 from **92.31%** to **85.71%**.
4. **Early Plateau & Stopping:** Training peaked rapidly at **Epoch 34** (Phase 2, Epoch 4) and triggered early stopping after 8 epochs without Macro-F1 improvement, running 42 total epochs (compared to 56 epochs in Experiment 3).
5. **Production Decision:** **Experiment 3 remains our winning model.** Experiment 4 is not adopted, and the deployed ONNX model (`services/ai/models/efficientnetb0_lsd_v1.onnx` from Experiment 3) remains unchanged.

---

## 2. Experimental Setup and Integrity

### Pre-Training Integrity Verification
- **Manifest File:** `services/ai/research/reports/dataset_split.csv`
- **Integrity Status:** Verified 100% compliant before training.
  - **TRAIN:** Exactly 696 samples (Normal: 484, Mild: 153, Severe: 59).
  - **VALIDATION:** Exactly 150 samples (Normal: 104, Mild: 33, Severe: 13).
  - **TEST:** Exactly 148 samples (Normal: 103, Mild: 33, Severe: 12) — **Quarantined**.
- **Cryptographic Independence:** 0 duplicate filenames, 0 SHA-256 hash overlaps across splits.
- **Random Seed:** Fixed seed `42` across random, numpy, and torch.

### Model Architecture and Preprocessing
- **Base Architecture:** `torchvision.models.efficientnet_b0(weights=DEFAULT)`.
- **Classification Head:** `Dropout(p=0.2, inplace=True)` $\rightarrow$ `Linear(in_features=1280, out_features=3)`.
- **Class Ordering:** `0: Normal`, `1: Mild`, `2: Severe`.
- **Input Resolution & Normalization:** $224 \times 224$ RGB, ImageNet standardization ($\text{mean}=[0.485, 0.456, 0.406]$, $\text{std}=[0.229, 0.224, 0.225]$).
- **Data Augmentation:** Train-only random horizontal flip ($p=0.5$), rotation ($\pm 15^\circ$), affine translation ($\pm 5\%$) and scale ($0.95\text{--}1.05$), color jitter ($0.1$ brightness/contrast, $0.05$ saturation). Validation preprocessing was strictly deterministic.

### Ablation Treatment (Experiment 4 vs Experiment 3)
| Hyperparameter / Component | Experiment 3 Baseline | Experiment 4 Treatment | Rationale for Ablation |
|---|---|---|---|
| **Weighting Scheme** | Linear Inverse-Frequency | Smoothed Square-Root Inverse-Frequency | Soften minority over-penalization |
| **Formula** | $w_c = \frac{N_{\text{train}}}{K \cdot N_c}$ | $w_c^{\text{raw}} = \sqrt{\frac{N_{\text{train}}}{N_c}}$, normalized to mean 1.0 | Square-root dampens extreme ratios |
| **Normal Weight** | **0.4793** | **0.5317** | $+10.9\%$ penalty increase |
| **Mild Weight** | **1.5163** | **0.9456** | $-37.6\%$ penalty decrease |
| **Severe Weight** | **3.9322** | **1.5227** | $-61.3\%$ penalty decrease |
| **Severe:Normal Ratio** | **8.20 : 1** | **2.86 : 1** | Substantial minority penalty compression |
| **Label Smoothing ($\alpha$)** | **0.00** (Standard One-Hot) | **0.05** | Regularize overconfident predictions |
| **Loss Function** | `WeightedCrossEntropy(weights, 0.0)` | `WeightedCrossEntropy(weights, 0.05)` | Sqrt weighted + smoothed CE |
| **Test Set Evaluation** | Evaluated once post-selection | **Quarantined (NOT evaluated)** | Preserve test integrity under Step 3 |

---

## 3. Training Execution and Monitoring

- **Training Script:** `services/ai/research/training/train_efficientnetb0_exp4.py`
- **Execution Environment:** Intel x86_64 CPU (PyTorch 2.14.1)
- **Total Training Duration:** 1,239.6 seconds (**20.66 minutes**)
- **Total Epochs Executed:** 42 epochs (30 Phase 1 + 12 Phase 2)

### Phase 1: Classification Head Only (Backbone Frozen)
- **Trainable Parameters:** 3,843 (0.10% of 4,011,391 total parameters)
- **Optimizer & LR:** AdamW, initial LR $1 \times 10^{-4}$, weight decay $1 \times 10^{-4}$
- **Scheduler:** `ReduceLROnPlateau(mode='max', factor=0.5, patience=3)`
- **Progression:**
  - Epoch 1: Train Loss 1.0994, Val Loss 1.0326, Val Acc 62.7%, Val Macro-F1 36.5%
  - Epoch 10: Train Loss 0.8220, Val Loss 0.7965, Val Acc 77.3%, Val Macro-F1 61.3%
  - Epoch 20: Train Loss 0.7215, Val Loss 0.7037, Val Acc 82.7%, Val Macro-F1 73.1%
  - Epoch 28: Train Loss 0.6811, Val Loss 0.6672, Val Acc 86.7%, **Val Macro-F1 80.10%** (Phase 1 Best)
  - Phase 1 completed all 30 epochs with LR reducing to $5 \times 10^{-5}$.

### Phase 2: Upper Backbone Fine-Tuning (Stages 6–8 Unfrozen)
- **Trainable Parameters:** 3,159,583 (78.77% of total parameters)
- **Optimizer & LR:** AdamW (Backbone LR $2 \times 10^{-5}$, Head LR $5 \times 10^{-5}$)
- **Progression:**
  - Epoch 31 (Phase 2 Ep 1): Val Acc 88.0%, Val Macro-F1 82.6% (New overall best)
  - Epoch 33 (Phase 2 Ep 3): Val Acc 88.7%, Val Macro-F1 83.3% (New overall best)
  - **Epoch 34 (Phase 2 Ep 4):** Val Loss 0.5933, Val Acc 90.0%, **Val Macro-F1 85.62%** (**GLOBAL BEST**)
  - Epochs 35–42: Macro-F1 plateaued between 82.2% and 84.5%.
  - **Early Stopping Triggered:** At Epoch 42 after 8 consecutive epochs without Macro-F1 improvement.

---

## 4. Comprehensive Validation Results: Experiment 4 vs Experiment 3

In accordance with Step 3 and Step 5, comparisons are conducted strictly using **Validation Set metrics** (150 images: 104 Normal, 33 Mild, 13 Severe).

### Metric Comparison Table
| Metric | Experiment 3 (Linear Inverse) | Experiment 4 (Sqrt + Smoothing) | Absolute Delta | Relative Change |
|---|---|---|---|---|
| **Best Checkpoint Epoch** | Epoch 51 (Phase 2 Ep 25) | Epoch 34 (Phase 2 Ep 4) | -17 epochs | Earlier Convergence |
| **Validation Loss** | **0.3315** | 0.5933 | +0.2618 | Higher (Smoothed target baseline) |
| **Overall Accuracy** | **90.00%** (135/150) | **90.00%** (135/150) | 0.00% | Identical |
| **Macro Precision** | **87.92%** | 87.55% | -0.37% | -0.42% |
| **Macro Recall** | **87.43%** | 85.36% | -2.07% | -2.37% |
| **Macro F1-Score** | **87.67%** | **85.62%** | **-2.05%** | **-2.34%** |
| **Weighted F1-Score**| **89.94%** | 89.55% | -0.39% | -0.43% |
| **ROC-AUC (OVR Macro)**| **0.9614** | 0.9592 | -0.0022 | -0.23% |
| **ROC-AUC (OVR Weighted)**| 0.9551 | 0.9551 | 0.0000 | Identical |

---

## 5. Per-Class Analysis & Clinical Safety Assessment

### Per-Class Validation Breakdown
| Class | Support | Metric | Experiment 3 (Baseline) | Experiment 4 (Ablation) | Difference |
|---|---|---|---|---|---|
| **Normal** | 104 | Precision | 93.33% | 90.99% | -2.34% |
| | | Recall | 94.23% | **97.12%** | **+2.89%** |
| | | F1-Score | 93.78% | **93.95%** | **+0.17%** |
| **Mild** | 33 | Precision | 78.12% | **91.67%** | **+13.55%** |
| | | Recall | **75.76%** | 66.67% | **-9.09%** |
| | | F1-Score | 76.92% | **77.19%** | **+0.27%** |
| **Severe** | 13 | Precision | **92.31%** | 80.00% | **-12.31%** |
| | | Recall | 92.31% | 92.31% | 0.00% |
| | | F1-Score | **92.31%** | 85.71% | **-6.60%** |

### Validation Confusion Matrices

#### Experiment 3 (Linear Inverse Weights):
```
                 Predicted Normal   Predicted Mild   Predicted Severe
Actual Normal          98                 6                 0
Actual Mild             7                25                 1
Actual Severe           0                 1                12
```

#### Experiment 4 (Square-Root Weights + Label Smoothing 0.05):
```
                 Predicted Normal   Predicted Mild   Predicted Severe
Actual Normal         101                 2                 1
Actual Mild             9                22                 2
Actual Severe           1                 0                12
```

### Clinical Safety & Epidemiological Implications
1. **Critical False Negative Introduced:** In Experiment 3, Severe-to-Normal error was **0%** ($0 / 13$). In Experiment 4, **1 Severe animal was classified as Normal** (`confusion_matrix[2][0] == 1`). In cattle epidemic triaging, discharging a severely nodular, contagious animal as "Normal" risks catastrophic herd transmission.
2. **Reduced Minority Class Penalties:** In Experiment 3, the linear inverse weight for Severe was $3.9322$ (ratio $8.20:1$ relative to Normal). Experiment 4 compressed this penalty to $1.5227$ (ratio $2.86:1$). This softened penalty reduced the model's defensive conservatism on the minority class, leading to lower Severe precision ($80.00\%$ vs $92.31\%$) and the Severe-to-Normal error.
3. **Mild Recall Degradation:** Mild recall dropped from $75.76\%$ to $66.67\%$, with $9$ Mild animals misclassified as Normal (up from $7$ in Exp 3). While Mild precision improved to $91.67\%$, screening sensitivity on localized lesions deteriorated.

---

## 6. Test Set Quarantine Compliance

In strict compliance with Step 3 instructions:
- **Zero Test Set Exposure:** The 148-image test set was **NOT evaluated** during or after Experiment 4 training.
- **Zero Test Set Metric Reporting:** No test accuracy, test F1, or test predictions were generated for Experiment 4, completely eliminating the risk of test-set hyperparameter snooping or optimistic selection bias.
- **Selection Isolation:** Checkpoint selection was conducted strictly and exclusively on the 150-sample validation split.

---

## 7. Artifact Manifest

The following distinct artifacts have been generated and saved for Experiment 4:

| Artifact Type | File Path | File Size | Description |
|---|---|---|---|
| **Training Script** | `services/ai/research/training/train_efficientnetb0_exp4.py` | 31.2 KB | Complete reproducible training pipeline |
| **Config JSON** | `services/ai/research/training/config_efficientnetb0_exp4.json` | 3.1 KB | Hyperparameter and path definitions |
| **Best Checkpoint** | `services/ai/research/models/efficientnetb0_exp4_best.pth` | 41.69 MB | Best validation checkpoint (Epoch 34) |
| **History CSV** | `services/ai/research/reports/efficientnetb0_exp4_training_history.csv` | 3.3 KB | Epoch-by-epoch loss, acc, lr, and F1 |
| **Validation Metrics** | `services/ai/research/reports/efficientnetb0_exp4_validation_metrics.json` | 927 B | Complete validation metrics and CM |
| **Confusion Matrix Plot**| `services/ai/research/reports/efficientnetb0_exp4_confusion_matrix.png` | 134.8 KB | Heatmap of validation predictions |
| **Final Report** | `services/ai/research/reports/efficientnetb0_exp4_report.md` | This file | Full experimental analysis |

All Experiment 1, 2, and 3 artifacts remain **unmodified and intact**.

---

## 8. Conclusion and Next Steps

### Conclusion
- Experiment 4 demonstrated that smoothed square-root class weighting paired with label smoothing ($\alpha = 0.05$) **does not improve** EfficientNet-B0's performance on this dataset.
- While overall accuracy remained tied at **90.00%**, Validation Macro-F1 dropped by **2.05%** ($87.67\% \rightarrow 85.62\%$), and clinical false negatives on the Severe class increased.
- Unlike MobileNetV3-Large (where square-root weighting improved minority F1 in Experiment 2), EfficientNet-B0's larger capacity and higher baseline representation benefits more from the stronger class penalty of linear inverse weighting.

### Final Model Selection Decision
- **Experiment 3 (`efficientnetb0_exp3_best.pth`) remains the active winning model.**
- The production ONNX model (`services/ai/models/efficientnetb0_lsd_v1.onnx`) and FastAPI service deployment verified in Phases 4 and 5 will **not** be replaced with Experiment 4.
- The 95% test accuracy target has **not** been claimed or reached. Future modeling phases should explore multi-scale feature pyramids, domain-specific animal color augmentations, or test-time augmentation (TTA) rather than further weight smoothing.
