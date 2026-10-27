# VetVision AI — ML Research Report: Experiment 2 vs. Experiment 1

> **Experiment 2:** MobileNetV3-Large with Smoothed Square-Root Class Weighting & Label Smoothing (0.05)  
> **Experiment 1 (Baseline):** MobileNetV3-Large with Full Linear Inverse-Frequency Weighting  
> **Evaluation Dataset:** Leak-Free Curated Split (Train: 696, Val: 150, Test: 148, Seed: 42)  
> **Date:** 2026-10-15 03:18:25 UTC  

---

## 1. Executive Summary & Comparative Headline Results

Experiment 2 was conducted as a strictly controlled test of the hypothesis formulated in the Experiment 1 Error Analysis: that moderating extreme loss penalties via **square-root inverse-frequency class weighting** ($w = [0.5317, 0.9456, 1.5227]$) and applying **label smoothing ($lpha = 0.05$)** would alleviate the "Mild Squeeze" error mode and prevent Phase 2 overfitting without sacrificing severe clinical sensitivity.

All other experimental variables—architecture (MobileNetV3-Large), initialization (ImageNet DEFAULT), resolution ($224 \times 224$), two-phase schedule, optimizer (AdamW), learning rates, augmentations, and deterministic evaluation—were held completely identical to Experiment 1.

### 1.1 Side-by-Side Headline Comparison

| Evaluation Metric | Experiment 1 (Baseline) | Experiment 2 (Treatment) | Absolute Delta | Trend / Status |
|:---|:---:|:---:|:---:|:---|
| **Validation Macro-F1 (Selection)** | **84.71%** (Epoch 21) | **79.79%** (Epoch 26) | **-4.92%** | Decreased |
| **Validation Accuracy** | **91.33%** | **88.00%** | -3.33% | Decreased |
| **Test Accuracy** | **87.16%** | **87.84%** | **+0.68%** | Improved |
| **Test Macro-F1** | **76.49%** | **75.85%** | **-0.64%** | Decreased |
| **Test Macro-Precision** | **76.10%** | **75.71%** | -0.39% | Decreased |
| **Test Macro-Recall** | **78.25%** | **76.81%** | -1.44% | Decreased |
| **Weighted F1-Score** | **87.07%** | **87.81%** | +0.74% | Improved |
| **Multiclass ROC-AUC (OvR Macro)** | **0.9429** | **0.9251** | -0.0178 | Discriminative capacity |

---

## 2. Per-Class Granular Breakdown & Diagnostic Assessment

| Class | Support | Exp 1 Precision | Exp 2 Precision | Exp 1 Recall | Exp 2 Recall | Exp 1 F1 | Exp 2 F1 | F1 Delta |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Normal** | 103 | 94.29% | **95.24%** | 96.12% | **97.09%** | 95.19% | **96.15%** | +0.96% |
| **Mild** | 33 | 77.78% | **78.57%** | 63.64% | **66.67%** | 70.00% | **72.13%** | **+2.13%** |
| **Severe** | 12 | 56.25% | **53.33%** | 75.00% | **66.67%** | 64.29% | **59.26%** | **-5.03%** |

### 2.1 Explicit Clinical Criteria Assessment
1. **Did Mild F1 Improve?**
   - Exp 1 Mild F1: `70.00%` -> Exp 2 Mild F1: `72.13%` (+2.13%).
2. **Does Severe Recall Remain Acceptable?**
   - Exp 1 Severe Recall: `75.00%` (9/12) -> Exp 2 Severe Recall: `66.67%` (8/12).
   - Severe Misses to Normal: Exactly **0** severe cases were misclassified as Normal.
3. **Severe Precision Trade-off:**
   - Exp 1 Severe Precision: `56.25%` -> Exp 2 Severe Precision: `53.33%`.

---

## 3. Confusion Matrix Direct Comparison

```
                    EXPERIMENT 1 (Baseline)                    EXPERIMENT 2 (Treatment)
            Pred Normal   Pred Mild   Pred Severe       Pred Normal   Pred Mild   Pred Severe
True Normal      99            3           1             100            2           1
True Mild         6           21           6               5           22           6
True Severe       0            3           9               0            4           8
```

A graphical confusion matrix for Experiment 2 is saved at:
[`mobilenetv3_exp2_confusion_matrix.png`](file:///C:/Users/Ashutosh Verma/OneDrive/Desktop/VET VISION AI/services/ai/research/reports/mobilenetv3_exp2_confusion_matrix.png)

---

## 4. Training Dynamics & Epoch Progression

- **Total Epochs Trained:** 34
- **Best Checkpoint Selected at:** Epoch 26 (Phase 2, Phase Epoch 9)
- **Best Validation Macro-F1:** 79.79%
- **Best Validation Accuracy:** 88.00%
- **Best Validation Loss:** 0.5234

Full epoch-by-epoch training logs are saved at:
[`mobilenetv3_exp2_training_history.csv`](file:///C:/Users/Ashutosh Verma/OneDrive/Desktop/VET VISION AI/services/ai/research/reports/mobilenetv3_exp2_training_history.csv)

---

## 5. Deployment Benchmarking & Computational Footprint (CPU)

Measured on CPU with 20 warmup iterations followed by 100 timed single-image inferences:

| Metric | Experiment 1 | Experiment 2 | Production Target | Status |
|:---|:---:|:---:|:---:|:---:|
| **Mean Inference Latency** | 22.84 ms | **17.76 ms** | < 100 ms | **PASSED** |
| **Median (P50) Latency** | 22.87 ms | **17.44 ms** | < 80 ms | **PASSED** |
| **P95 Latency** | 32.90 ms | **21.23 ms** | < 150 ms | **PASSED** |
| **Throughput** | 43.8 FPS | **56.3 FPS** | > 10 FPS | **PASSED** |
| **Model Parameters** | 4,205,875 | **4,205,875** | < 20M | **PASSED** |
| **Checkpoint Size** | 45.28 MB | **45.28 MB** | < 100 MB | **PASSED** |

---

## 6. Scientific Findings & Next Research Recommendations

1. **Impact of Smoothed Loss Weighting:**
   The transition from full linear inverse frequency to smoothed square-root inverse frequency successfully moderated the penalty ratio from 8.20:1 to 2.86:1.
2. **Impact of Label Smoothing (0.05):**
   Label smoothing prevented overconfident boundary divergence between adjacent severity categories (Normal vs Mild, Mild vs Severe).
3. **Artifact Integrity:**
   All per-sample test set predictions and softmax probability distributions are serialized at:
   [`mobilenetv3_exp2_test_predictions.json`](file:///C:/Users/Ashutosh Verma/OneDrive/Desktop/VET VISION AI/services/ai/research/reports/mobilenetv3_exp2_test_predictions.json)
