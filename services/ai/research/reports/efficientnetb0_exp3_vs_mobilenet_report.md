# VetVision AI — ML Research Report: Experiment 3 (EfficientNet-B0) vs. MobileNetV3-Large

> **Experiment 3:** EfficientNet-B0 Baseline (ImageNet Pretrained)  
> **Reference Model (Exp 1):** MobileNetV3-Large Baseline (Full Linear Inverse-Frequency Weights)  
> **Ablation Model (Exp 2):** MobileNetV3-Large (Square-Root Weights + Label Smoothing)  
> **Dataset Partition:** Fixed Curated Split (Train: 696, Val: 150, Test: 148, Random Seed: 42)  
> **Date:** 2026-10-15 04:35:46 UTC  

---

## 1. Executive Summary & Comparative Headline Results

Experiment 3 evaluates **EfficientNet-B0** as an alternative convolutional backbone for 3-class cattle Lumpy Skin Disease (LSD) severity classification. To enable a rigorous architectural comparison against the MobileNetV3-Large baseline, Experiment 3 mirrors the **Experiment 1 reference configuration**:
- Exact same data split (696 Train, 150 Val, 148 Test, seed 42)
- Linear inverse-frequency class weighting ($w = [0.4793, 1.5163, 3.9322]$)
- No label smoothing ($lpha = 0.0$)
- Two-phase fine-tuning (Phase 1 classifier head only, Phase 2 upper backbone blocks unfrozen)
- AdamW optimizer, identical learning rates ($10^-4$ Phase 1; $2\times 10^-5$ backbone, $5\times 10^-5$ head Phase 2)
- ReduceLROnPlateau scheduler and early stopping based strictly on Validation Macro-F1

> [!WARNING]
> **Methodological Quarantine Limitation:** The fixed test set ($N = 148$) was previously evaluated at the conclusion of Experiments 1 and 2. While the model configuration for Experiment 3 was completely locked prior to test evaluation, test set results must be interpreted with this limitation in mind.

### 1.1 Multi-Experiment Headline Comparison

| Evaluation Metric | Exp 1: MobileNetV3 Baseline | Exp 2: MobileNetV3 Sqrt+Smooth | Exp 3: EfficientNet-B0 Baseline | Exp 3 vs. Exp 1 Delta |
|:---|:---:|:---:|:---:|:---:|
| **Architecture** | MobileNetV3-Large | MobileNetV3-Large | **EfficientNet-B0** | Architectural Change |
| **Validation Macro-F1 (Selection)** | **84.71%** (Epoch 21) | 79.79% (Epoch 26) | **87.67%** (Epoch 51) | +2.96% |
| **Validation Accuracy** | **91.33%** | 88.00% | **90.00%** | -1.33% |
| **Test Accuracy** | 87.16% | 87.84% | **90.54%** | **+3.38%** |
| **Test Macro-F1** | 76.49% | 75.85% | **83.35%** | **+6.86%** |
| **Test Macro-Precision** | 76.10% | 75.71% | **84.22%** | +8.12% |
| **Test Macro-Recall** | 78.25% | 76.81% | **82.61%** | +4.36% |
| **Test Weighted-F1** | 87.07% | 87.81% | **90.38%** | +3.31% |
| **Multiclass ROC-AUC (OvR Macro)** | 0.9429 | 0.9251 | **0.9151** | -0.0278 |

---

## 2. Per-Class Granular Breakdown & Diagnostic Assessment

| Class | Support | Exp 1 F1 | Exp 2 F1 | Exp 3 Precision | Exp 3 Recall | Exp 3 F1-Score | Exp 3 vs Exp 1 F1 Delta |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Normal** | 103 | 95.19% | 96.15% | **94.34%** | **97.09%** | **95.69%** | +0.50% |
| **Mild** | 33 | 70.00% | 72.13% | **83.33%** | **75.76%** | **79.37%** | **+9.37%** |
| **Severe** | 12 | 64.29% | 59.26% | **75.00%** | **75.00%** | **75.00%** | **+10.71%** |

### 2.1 Critical Clinical Guardrails
- **Severe Recall:** Exp 1: `75.00%` (9/12) vs Exp 2: `66.67%` (8/12) vs Exp 3: `75.00%` (9/12).
- **Severe-to-Normal Misses:** Exactly **0** severe cases were misdiagnosed as Normal in Experiment 3 (Exp 1: 0, Exp 2: 0).
- **Normal Specificity:** True Normal correct predictions = `100/103` (97.09%).

---

## 3. Confusion Matrix Direct Comparison

```
        EXPERIMENT 1 (MobileNetV3 Exp 1)               EXPERIMENT 3 (EfficientNet-B0 Exp 3)
         Pred Normal  Pred Mild  Pred Severe            Pred Normal  Pred Mild  Pred Severe
Normal        99            3           1                100            2           1
Mild           6           21           6                  6           25           2
Severe         0            3           9                  0            3           9
```

A graphical heatmap is saved at:
[`efficientnetb0_exp3_confusion_matrix.png`](file:///C:/Users/Ashutosh Verma/OneDrive/Desktop/VET VISION AI/services/ai/research/reports/efficientnetb0_exp3_confusion_matrix.png)

---

## 4. Architecture Adaptation & Training Dynamics

### 4.1 Architecture-Specific Layer Selection Adjustment
- **MobileNetV3-Large:** Contains 17 inverted residual feature blocks. In Phase 2, blocks 12 to 16 (top 5 blocks) were unfrozen.
- **EfficientNet-B0:** Contains 9 feature stages (stages 0 to 8). Stage 0 is the stem conv, stages 1–7 are MBConv blocks, and stage 8 is the 1x1 conv to 1280 features. In Phase 2, **stages 6, 7, and 8** were unfrozen (3,155,740 feature parameters + 3,843 classifier parameters = 3,159,583 trainable parameters, representing 78.8% of model capacity), while stages 0–5 remained frozen as low-to-mid level feature extractors.

### 4.2 Training Dynamics
- **Total Epochs Trained:** 56
- **Best Checkpoint Selected at:** Epoch 51 (Phase 2)
- **Best Validation Macro-F1:** 87.67%
- **Best Validation Accuracy:** 90.00%
- **Best Validation Loss:** 0.3315

Full training history is saved at:
[`efficientnetb0_exp3_training_history.csv`](file:///C:/Users/Ashutosh Verma/OneDrive/Desktop/VET VISION AI/services/ai/research/reports/efficientnetb0_exp3_training_history.csv)

---

## 5. Computational Footprint & Deployment Benchmarks (CPU)

Measured on CPU with 20 warmup iterations followed by 100 timed single-image inferences:

| Metric | MobileNetV3-Large (Exp 1) | EfficientNet-B0 (Exp 3) | Production Target | Status |
|:---|:---:|:---:|:---:|:---:|
| **Total Parameters** | 4,205,875 (4.2M) | **4,011,391 (4.0M)** | < 20M | **PASSED** |
| **Checkpoint Size** | 45.28 MB | **39.76 MB** | < 100 MB | **PASSED** |
| **Mean CPU Latency** | 22.84 ms | **27.51 ms** | < 100 ms | **PASSED** |
| **Median (P50) Latency** | 22.87 ms | **26.81 ms** | < 80 ms | **PASSED** |
| **P95 Latency** | 32.90 ms | **32.36 ms** | < 150 ms | **PASSED** |
| **CPU Throughput** | 43.8 FPS | **36.4 FPS** | > 10 FPS | **PASSED** |

---

## 6. Synthesis & Architectural Verdict

1. **Classification Performance:**
   EfficientNet-B0 was evaluated on the identical 3-class cattle LSD dataset under the exact Experiment 1 reference conditions.
2. **Clinical Trade-offs:**
   Evaluation assesses whether EfficientNet-B0 resolves the feature ambiguity between Mild and neighboring classes or demonstrates distinct convergence characteristics.
3. **Artifact Integrity:**
   All per-sample test predictions and softmax probability distributions are saved at:
   [`efficientnetb0_exp3_test_predictions.json`](file:///C:/Users/Ashutosh Verma/OneDrive/Desktop/VET VISION AI/services/ai/research/reports/efficientnetb0_exp3_test_predictions.json)
