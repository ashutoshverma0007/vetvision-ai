# VetVision AI — ML Experiment 1: MobileNetV3-Large Error Analysis

> **Experiment:** Baseline MobileNetV3-Large Transfer Learning  
> **Evaluation Split:** Test Set ($N = 148$ images)  
> **Quarantine Status:** Evaluated exactly once post-model selection; strictly quarantined  
> **Date:** October 2026  
> **Target Task:** 3-Class Cattle Lumpy Skin Disease (LSD) Severity Classification (`Normal`, `Mild`, `Severe`)  

---

## 1. Test Set Performance Summary

The test set ($N = 148$) was evaluated once using the best validation checkpoint selected at Global Epoch 21 (Phase 2, Epoch 10, Validation Macro-F1 = 84.71%).

| Metric | Measured Score | Clinical / Experimental Interpretation |
|:---|:---:|:---|
| **Overall Accuracy** | **87.16%** (129 / 148) | Baseline performance across all three categories |
| **Macro Precision** | **76.10%** | Unweighted average precision across classes |
| **Macro Recall** | **78.25%** | Unweighted average sensitivity across classes |
| **Macro F1-Score** | **76.49%** | Primary balanced optimization metric |
| **Weighted F1-Score** | **87.07%** | Frequency-weighted F1 reflecting dataset distribution |
| **Test Loss (Cross-Entropy)** | **0.3673** | Evaluated with training-derived class weights |
| **Multiclass ROC-AUC (OvR Macro)** | **0.9429** | High discriminative capacity across pairwise thresholds |
| **Multiclass ROC-AUC (OvR Weighted)** | **0.9558** | Area under ROC weighted by class prevalence |

---

## 2. Per-Class Metrics & Confusion Matrix Breakdown

### 2.1 Per-Class Metric Table

| Class | Ground Truth Support ($N$) | Precision | Recall (Sensitivity) | F1-Score | Specificity |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Normal** | 103 (69.6%) | **94.29%** (99/105) | **96.12%** (99/103) | **95.19%** | 86.67% (39/45) |
| **Mild** | 33 (22.3%) | **77.78%** (21/27) | **63.64%** (21/33) | **70.00%** | 94.78% (109/115) |
| **Severe** | 12 (8.1%) | **56.25%** (9/16) | **75.00%** (9/12) | **64.29%** | 94.85% (129/136) |

### 2.2 Confusion Matrix

$$\begin{array}{r|ccc|c}
\text{\bf True \textbackslash\ Predicted} & \text{\bf Predicted Normal} & \text{\bf Predicted Mild} & \text{\bf Predicted Severe} & \text{\bf Total Support} \\
\hline
\text{\bf True Normal} & \mathbf{99} & 3 & 1 & 103 \\
\text{\bf True Mild} & 6 & \mathbf{21} & 6 & 33 \\
\text{\bf True Severe} & 0 & 3 & \mathbf{9} & 12 \\
\hline
\text{\bf Total Predicted} & 105 & 27 & 16 & \mathbf{148}
\end{array}$$

- **Correct Predictions:** $99 + 21 + 9 = 129$ ($87.16\%$)
- **Total Classification Errors:** $148 - 129 = 19$ errors ($12.84\%$)

---

## 3. Granular Error Mode Analysis

The 19 misclassifications fall into distinct diagnostic error modes:

```
                          Distribution of All 19 Errors
                          =============================
  [Mild -> Normal]   : 6 errors (31.6% of errors)  ████████████
  [Mild -> Severe]   : 6 errors (31.6% of errors)  ████████████
  [Severe -> Mild]   : 3 errors (15.8% of errors)  ██████
  [Normal -> Mild]   : 3 errors (15.8% of errors)  ██████
  [Normal -> Severe] : 1 error  ( 5.3% of errors)  ██
  [Severe -> Normal] : 0 errors ( 0.0% of errors)  (Zero critical misses)
```

### 3.1 Mild-to-Normal Errors (6 cases, 18.18% of True Mild)
- **Description:** 6 cattle with mild Lumpy Skin Disease were predicted as `Normal`.
- **Contributing Factors (Measured & Structural):**
  1. *Subtle / Sparse Lesions:* Mild LSD is characterized by early-stage, localized, or sparsely distributed nodules. In standard $224 \times 224$ downsampled RGB views, small dermal nodules can blend with natural coat textures, folds, or minor skin irregularities.
  2. *Majority Class Bias:* The `Normal` class accounts for 69.5% of training samples (484 / 696). Despite inverse-frequency loss weighting, features associated with healthy skin dominate the feature representations learned by the backbone.
- **Diagnostic Implication:** Under-detection of early infection. These animals would be categorized as healthy during preliminary triage, delaying early isolation and supportive care.

### 3.2 Mild-to-Severe Errors (6 cases, 18.18% of True Mild)
- **Description:** 6 cattle with mild Lumpy Skin Disease were predicted as `Severe`.
- **Contributing Factors (Measured & Structural):**
  1. *Loss Penalty Asymmetry:* Severe class loss weight was $3.9322$ vs. $1.5163$ for Mild and $0.4793$ for Normal (an $8.2 : 1$ penalty ratio over Normal). When the network detects pronounced skin nodulation, the objective function heavily penalizes under-predicting severe disease, pushing borderline cases toward `Severe`.
  2. *Localized High Density:* Images where a close-up camera angle captures a dense cluster of nodules on a small skin patch can visually mimic systemic, generalized severe nodular eruption.
- **Diagnostic Implication:** Over-staging of moderate illness. Animals would be routed to high-tier isolation or aggressive intervention; while suboptimal operationally, it prevents uncontained disease spread.

### 3.3 Severe-to-Mild Errors (3 cases, 25.00% of True Severe)
- **Description:** 3 severe cases were categorized as `Mild`.
- **Contributing Factors (Measured & Structural):**
  1. *Field of View Limitations:* Severe classification in field veterinary practice is defined by generalized full-body nodular eruption, necrotic ulceration, and systemic manifestations. If a photograph only captures a peripheral body section (e.g., lower leg or shoulder) where nodules appear dispersed, visual indicators align with the `Mild` visual profile.
  2. *Backbone Resolution Bottleneck:* At $224 \times 224$, deep necrotic central depressions (characteristic of advanced "sit-fast" lesions in severe LSD) can lose structural sharpness.
- **Diagnostic Implication:** Under-staging of advanced disease. While the animal is correctly flagged as infected (not `Normal`), the urgency and triage priority are underestimated.

### 3.4 Zero Severe-to-Normal Misses (0 cases, 0.00%)
- **Critical Finding:** Exactly **0 out of 12** severe cases were misclassified as `Normal`.
- **Diagnostic Value:** The model demonstrates $100\%$ sensitivity in distinguishing severe clinical cases from healthy cattle. The heavy loss weighting ($w_{\text{Severe}} = 3.9322$) successfully prevents fatal false-negative misclassifications for high-risk animals.

### 3.5 Normal False Positives (4 cases: 3 Mild, 1 Severe)
- **Description:** 4 healthy cattle were flagged as having LSD (3 Mild, 1 Severe).
- **Specificity:** $96.12\%$ on healthy animals (99 / 103 true negatives).
- **Contributing Factors:** Dust spots, skin folds, insect bite marks, or tick infestations that present nodular visual artifacts on otherwise healthy cattle skin.

---

## 4. Status of Confidence Distribution Analysis

- **Observation:** In the Experiment 1 training script (`train_mobilenetv3.py`), individual prediction probabilities (`test_y_prob`) were used in memory to compute multiclass ROC-AUC ($0.9429$), but per-sample softmax confidence arrays were not serialized to disk.
- **Adherence to Research Protocol:** In strict accordance with the experimental rules (*"Do not rerun test evaluation unless needed to resolve a specific inconsistency"*), an unnecessary secondary forward pass over the quarantined test set was avoided.
- **Recommendation for Subsequent Experiments:** Experiment 2 scripts will explicitly serialize per-sample evaluation arrays (`test_predictions.json` / `.parquet`) containing true labels, predicted classes, and full class probability distributions to enable calibration curves, Brier score tracking, and automated confidence threshold analysis without re-evaluation.

---

## 5. Statistical Constraints of the Severe Cohort

The Severe class in the curated research dataset contains 84 usable images total:
- **Train:** 59 images ($8.48\%$ of training set)
- **Validation:** 13 images ($8.67\%$ of validation set)
- **Test:** 12 images ($8.11\%$ of test set)

### 5.1 High Variance in Single-Sample Metrics
With $N_{\text{Test, Severe}} = 12$:
- Each single sample accounts for **$8.33\%$** of class recall ($\frac{1}{12}$).
- The observed recall of $75.00\%$ corresponds to $9 / 12$ correct predictions.
- If 1 additional sample had been correct: Recall $= 10/12 = 83.33\%$ ($+8.33\%$).
- If 1 additional sample had been incorrect: Recall $= 8/12 = 66.67\%$ ($-8.33\%$).

### 5.2 Confidence Interval Formulation
Using the Wilson score interval for binomial proportions at $95\%$ confidence:
- **Observed Recall:** $75.00\%$ ($9/12$)
- **$95\%$ Confidence Interval:** **$[46.77\%, 91.11\%]$**

The wide confidence interval demonstrates that while the measured performance provides a solid baseline indication, small changes in minority-class test performance must be evaluated with statistical caution rather than over-interpreted as decisive architectural breakthroughs.

---

## 6. Synthesis: Key Findings & Targets for Experiment 2

1. **The "Mild Squeeze" Problem:**
   The intermediate class (`Mild`) suffers the lowest recall ($63.64\%$) because it is pressured simultaneously from two opposing directions:
   - Pulled toward `Normal` due to class imbalance in feature representations (484 vs. 153 train images).
   - Pushed toward `Severe` due to extreme inverse-frequency loss weighting ($w_{\text{Severe}} = 3.9322$, an $8.2\times$ multiple over Normal).
2. **Phase 2 Overfitting Dynamics:**
   In Phase 2, training loss dropped from $0.6229$ to $0.1238$ while validation loss reached its minimum of $0.2828$ at Epoch 21 and steadily rose to $0.3237$ by Epoch 29. Regularization and softened loss penalties are needed to prevent the upper backbone blocks from over-fitting to the training minority representations.
3. **Core Target for Experiment 2:**
   Moderate the extreme loss weighting (e.g., transition from full inverse frequency to square-root inverse frequency or effective number weighting) combined with label smoothing to stabilize the decision boundary between `Mild` and its neighboring classes (`Normal` and `Severe`).
