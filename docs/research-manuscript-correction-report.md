# VetVision AI — Research Manuscript Correction and Explainability Implementation Report

**Document Path:** `docs/research-manuscript-correction-report.md`  
**Date:** October 29, 2026  
**Auditor & Implementation Agent:** Antigravity AI Engineering  
**Task Type:** Research Integrity, Manuscript Alignment, and Explainability Implementation  
**Operating Mode:** Read-Only on Deployed Application & Live Inference; Zero Retraining; Zero Production Regressions

---

## 1. Executive Summary

This report documents the forensic reconciliation between the VetVision AI research manuscript and the empirical software and machine learning artifacts in this repository. 

Prior to this remediation, the working software system (React/TypeScript web frontend, Node.js/Express API, PostgreSQL database with Prisma ORM, and FastAPI AI service deploying `efficientnetb0_lsd_v1.onnx`) operated as a **three-class screening platform** (*Normal Skin*, *Mild Lumpy Skin*, and *Severe Lumpy Skin*). However, the existing research paper draft (`c:\Users\Ashutosh Verma\OneDrive\Desktop\Efficient_and_Explainable_Deep_Learning_for_Image_Based_Lumpy_Skin_Disease_Screening_in_Cattle (1).pdf`) described a **binary classification model** (*Normal Skin vs. Lumpy Skin*), reported a mathematically impossible **micro-F1 score of 33.75%** alongside 90.85% accuracy, mismatched test set sample sizes (153 vs. actual 148), and lacked authentic Grad-CAM implementation code or generation scripts.

### Remediation Achievements:
1. **Evidence Verification:** Verified the trained Experiment 3 PyTorch checkpoint (`efficientnetb0_exp3_best.pth`), deployed ONNX graph (`efficientnetb0_lsd_v1.onnx`), and primary test metrics on disk (`efficientnetb0_exp3_test_metrics.json`).
2. **Authentic Grad-CAM Implementation:** Created `services/ai/research/explainability.py`, registering forward and backward gradient hooks on final feature block `model.features[-1]` to generate native-resolution, verifiable visual explanations.
3. **Comprehensive Test Suite:** Developed 12 focused unit tests in `services/ai/tests/test_explainability.py`. Executed the entire AI service test suite (48 tests), achieving a **100% pass rate** with zero regressions.
4. **Reproducible Research Figures:** Generated 5 publication-ready research figures directly from verified artifacts via `services/ai/research/generate_paper_figures.py`.
5. **Manuscript Realignment:** Produced corrected three-class manuscripts in both Markdown (`docs/research-manuscript.md`) and standard IEEE conference LaTeX format (`services/ai/research/manuscript_three_class.tex`), fully preserving all 20 citations.

---

## 2. Files Inspected

| Category | File Path | Status / Checksum | Inspection Purpose |
| :--- | :--- | :---: | :--- |
| **PyTorch Checkpoint** | `services/ai/research/models/efficientnetb0_exp3_best.pth` | SHA-256: `e53c38ab272b...` (39.76 MiB) | Verified 3-class classifier head (`Linear(1280, 3)`), Epoch 51, Val Macro-F1 87.67%. |
| **Deployed ONNX Model** | `services/ai/models/efficientnetb0_lsd_v1.onnx` | SHA-256: `3fb0c2ec20b6...` (15.29 MiB) | Verified input shape `[1, 3, 224, 224]` and output logits `[1, 3]`. |
| **Test Metrics Artifact**| `services/ai/research/reports/efficientnetb0_exp3_test_metrics.json` | Verified | Primary source for test metrics: $N=148$, Acc 90.54%, Macro-F1 83.35%, Weighted-F1 90.38%. |
| **Validation Metrics** | `services/ai/research/reports/efficientnetb0_exp3_validation_metrics.json` | Verified | Primary source for validation metrics: $N=150$, Acc 90.00%, Macro-F1 87.67%. |
| **Split Manifest Summary**| `services/ai/research/reports/dataset_split_summary.json` | Verified | Verified dataset counts: 1,019 raw, 25 excluded, 994 usable (696 Train / 150 Val / 148 Test). |
| **Training Script** | `services/ai/research/training/train_efficientnetb0_exp3.py` | Verified | Verified loss weighting, AdamW optimization, backbone freeze/unfreeze stages. |
| **Deployment Benchmark**| `services/ai/research/reports/efficientnetb0_onnx_verification.json` | Verified | Verified latency benchmarks: PyTorch 25.75 ms vs ONNX 6.79 ms (-73.88%). |
| **Existing PDF Paper** | `c:\Users\Ashutosh Verma\OneDrive\Desktop\Efficient_and_Explainable_... (1).pdf` | Verified (6 pages) | Audited original claims, structure, equations, and literature citations. |

---

## 3. Verified Versus Unverified Metrics

| Metric Dimension | Preliminary Draft Claim | Verified Empirical Artifact | Status | Remediation & Root Cause |
| :--- | :---: | :---: | :---: | :--- |
| **Classification Task** | Binary (Normal vs. Lumpy) | **3-Class (Normal, Mild, Severe)** | **CONTRADICTED** | Realigned manuscript title, abstract, and methodology to three-class screening. |
| **Test Sample Count** | 153 | **148** | **CONTRADICTED** | Corrected to 148 (103 Normal, 33 Mild, 12 Severe). 153 was the number of Mild samples in the Train set. |
| **Overall Test Accuracy** | 90.85% | **90.54% (134/148)** | **CORRECTED** | Corrected to exact verified accuracy (134 correctly classified out of 148). |
| **Test Macro-F1** | 89.25% | **83.35%** | **CORRECTED** | Corrected to verified macro-averaged F1 computed across the 3 classes. |
| **Test Weighted-F1** | Not Reported | **90.38%** | **VERIFIED** | Verified from primary test metrics artifact. |
| **Test Micro-F1** | **33.75% (Fatal Error)** | **90.54%** | **CORRECTED** | Corrected mathematical impossibility ($F1_{\mu} \equiv \text{Accuracy} = 90.54\%$). |
| **Macro ROC-AUC** | 91.98% | **91.51%** | **CORRECTED** | Corrected to verified Macro One-vs-Rest ROC-AUC (Weighted ROC-AUC: 93.42%). |
| **Normal Test F1** | Not Reported | **95.69%** (P: 94.34%, R: 97.09%) | **VERIFIED** | Class-level metric added to results table. |
| **Mild Test F1** | Not Reported | **79.37%** (P: 83.33%, R: 75.76%) | **VERIFIED** | Class-level metric added to results table. |
| **Severe Test F1** | Not Reported | **75.00%** (P: 75.00%, R: 75.00%) | **VERIFIED** | Class-level metric added to results table. |
| **Severe Misdiagnosed as Normal** | Not Reported | **0 (Zero)** | **VERIFIED** | Highlighted as critical clinical safety outcome. |
| **PyTorch Median Latency** | 55.78 ms | **25.75 ms** (6.79 ms ONNX) | **VERIFIED** | Verified against CPU deployment benchmark artifact (single-thread CPU). |
| **ONNX Median Latency** | 19.92 ms | **6.79 ms** | **VERIFIED** | Verified against ONNX Runtime benchmark artifact (-73.88% latency reduction). |
| **Numerical Parity** | Max diff $2.04 \times 10^{-6}$ | Max diff $7.23 \times 10^{-5}$ | **VERIFIED** | 100.0% class agreement across 50 verification test samples. |

---

## 4. Manuscript Sections Modified

Both `docs/research-manuscript.md` and `services/ai/research/manuscript_three_class.tex` were rewritten with the following structural enhancements:

### 1. Title
- **Original:** *"Efficient and Explainable Deep Learning for Image Based Lumpy Skin Disease Screening in Cattle"*
- **Corrected:** *"Efficient and Explainable Deep Learning for Three-Class Lumpy Skin Disease Screening in Cattle Using EfficientNet-B0 and ONNX Runtime"*
- **Rationale:** Accurately specifies the 3-class screening scope while retaining "Explainable" due to the implementation of authentic Grad-CAM.

### 2. Abstract
- Updated classification formulation to three classes (*Normal Skin*, *Mild Lumpy Skin*, *Severe Lumpy Skin*).
- Corrected dataset sizes (994 usable, 148 test).
- Replaced contradicted metrics with verified numbers (90.54% accuracy, 83.35% macro-F1, 90.38% weighted-F1, 91.51% ROC-AUC).
- Highlighted 0 Severe-to-Normal false negatives.
- Reflected actual ONNX CPU latency (6.79 ms; 146.61 FPS) and screening support limitations.

### 3. Introduction & Research Gap
- Formulated clinical necessity of differentiating localized mild nodules from severe ulcerations for veterinary triage.
- Highlighted the hazards of data leakage from duplicate cattle images in public repositories.
- Emphasized strict distinction between photographic screening support and histological veterinary diagnosis.

### 4. Literature Review
- Preserved all 20 existing bibliographic citations ([1] through [20]) without altering authors or publication venues.
- Framed recent LSD deep learning literature (Senthilkumar, Pal, Ullah) within established clinical AI reporting standards (CLAIM, TRIPOD+AI).

### 5. Methodology
- Documented data curation audit: 1,019 raw $\to$ 25 exclusions $\to$ 994 usable.
- Described group-aware perceptual hashing partition: 696 Train, 150 Val, 148 Test.
- Specified two-phase fine-tuning of EfficientNet-B0 with linear inverse-frequency loss weights ($w_{\text{Normal}}=0.4793, w_{\text{Mild}}=1.5163, w_{\text{Severe}}=3.9322$).
- Mathematically formulated the authentic Grad-CAM operation on `model.features[-1]`.

### 6. Experimental Results & Discussion
- Replaced binary results with Table I (Multi-experiment comparison: Exp 1 to Exp 5) and Table II (Class-specific precision, recall, F1).
- Added Table III (CPU latency and throughput benchmark).
- Explained the resolution of the micro-F1 calculation.
- Discussed the clinical significance of zero Severe-to-Normal misclassifications.

### 7. Limitations & Ethical Considerations
- Explicitly documented: small Severe test cohort ($N=12$), single-source dataset origin, lack of external farm/animal-level validation, and epistemic limits of gradient saliency.

---

## 5. Grad-CAM Implementation Details

### Architecture & Layer Resolution
The explainability engine was implemented in `services/ai/research/explainability.py`:
- **Model Checkpoint:** `services/ai/research/models/efficientnetb0_exp3_best.pth` (Epoch 51, Val Macro-F1 87.67%).
- **Target Convolutional Layer:** `model.features[-1]` (Conv2dNormActivation, 1,280 feature channels, spatial feature grid $7 \times 7$ at $224 \times 224$ input).
- **Gradient Mechanism:** PyTorch forward hook captures feature map $A \in \mathbb{R}^{1280 \times 7 \times 7}$; activation tensor backward hook captures gradient $\nabla_A Y^c$ during target class backpropagation.
- **Importance Pooling:** Channel weights $\alpha_k^c$ calculated via Global Average Pooling:
  $$\alpha_k^c = \frac{1}{49} \sum_{i=1}^7 \sum_{j=1}^7 \frac{\partial Y^c}{\partial A_{i,j}^k}$$
- **Linear Combination & Rectification:** $L_{\text{Grad-CAM}}^c = \text{ReLU}\left(\sum_{k=1}^{1280} \alpha_k^c A^k\right)$.
- **Upsampling & Blending:** Resampled via bilinear interpolation to match native input image resolution ($256 \times 256$), false-color mapped via Jet colormap, and blended at $\alpha = 0.5$.

### Artifacts Saved Per Explanation:
1. `<stem>_original.png`: Unmodified input image.
2. `<stem>_heatmap_gray.png`: Normalized grayscale Grad-CAM saliency map.
3. `<stem>_heatmap_colored.png`: False-color Jet colormap representation.
4. `<stem>_overlay.png`: Alpha-blended composite over original cattle skin photograph.
5. `<stem>_composite.png`: High-resolution 3-panel comparative presentation (Original | Heatmap | Overlay).
6. `<stem>_metadata.json`: Cryptographic and provenance audit log.

### Reproduction Commands
To generate an explanation for any cattle skin image:
```powershell
# Default explanation (explaining model's predicted class)
services\ai\.venv\Scripts\python.exe services/ai/research/explainability.py `
  --image "data/lsd/LumpySkinDisease_DataHub/LumpySkinDisease_DataHub/data-processed/lumpy_unbalanced/lumpy/Mild_101.png" `
  --output-dir "services/ai/research/reports/figures/gradcam"

# Target-specific explanation (e.g., target 'Severe')
services\ai\.venv\Scripts\python.exe services/ai/research/explainability.py `
  --image "data/lsd/LumpySkinDisease_DataHub/LumpySkinDisease_DataHub/data-processed/lumpy_unbalanced/lumpy/Severe_21.png" `
  --output-dir "services/ai/research/reports/figures/gradcam" `
  --target-class "Severe"
```

---

## 6. Tests Executed and Results

### 1. Dedicated Explainability Test Suite (`services/ai/tests/test_explainability.py`)
```
platform win32 -- Python 3.12.3, pytest-8.4.2
services\ai\tests\test_explainability.py::test_checkpoint_exists PASSED               [  8%]
services\ai\tests\test_explainability.py::test_load_checkpoint_and_architecture PASSED      [ 16%]
services\ai\tests\test_explainability.py::test_target_layer_identification PASSED          [ 25%]
services\ai\tests\test_explainability.py::test_gradcam_hook_registration_and_cleanup PASSED [ 33%]
services\ai\tests\test_explainability.py::test_preprocess_image PASSED                      [ 41%]
services\ai\tests\test_explainability.py::test_cam_computation_and_range PASSED            [ 50%]
services\ai\tests\test_explainability.py::test_target_class_selection PASSED              [ 58%]
services\ai\tests\test_explainability.py::test_colormap_and_overlay_dimensions PASSED     [ 66%]
services\ai\tests\test_explainability.py::test_end_to_end_generate_explanation PASSED     [ 75%]
services\ai\tests\test_explainability.py::test_invalid_image_path PASSED                  [ 83%]
services\ai\tests\test_explainability.py::test_invalid_checkpoint_path PASSED             [ 91%]
services\ai\tests\test_explainability.py::test_invalid_target_class PASSED               [100%]
============================== 12 passed in 6.45s ==============================
```

### 2. Full AI Service Test Suite
```powershell
services\ai\.venv\Scripts\python.exe -m pytest services/ai/tests -v
```
**Result:** **48 passed, 0 failed, 1 deprecation warning in 11.17s** (100% pass rate).
- Adapters (PyTorch & ONNX): 2/2 passed
- API Routes & Health: 3/3 passed
- Manifest & Deduplication: 2/2 passed
- Dataset Audit & Hashing: 3/3 passed
- Explainability (Grad-CAM): 12/12 passed
- Inference Engine & Confidence: 7/7 passed
- Metric Computations: 2/2 passed
- ONNX Deployment & Parity: 7/7 passed
- Preprocessing Pipeline: 2/2 passed
- Dataset Splitting & Zero Leakage: 8/8 passed

---

## 7. Figures Regenerated

All research figures were regenerated reproducibly via `services/ai/research/generate_paper_figures.py` and saved to `services/ai/research/reports/figures/`:

| Figure Filename | Description | Underlying Evidence / Source |
| :--- | :--- | :--- |
| **`figure_gradcam_three_class.png`** | 3-row, 3-column composite of authentic Grad-CAM overlays (Original, Heatmap, Overlay) for Normal, Mild, and Severe validation samples. | Generated live from `services/ai/research/models/efficientnetb0_exp3_best.pth` on validation images (`Normal_Skin_10.png`, `Mild_101.png`, `Severe_21.png`). |
| **`figure_confusion_matrix_3class.png`** | 3-Class test confusion matrix showing counts and row percentages, highlighting zero Severe-to-Normal misses. | `services/ai/research/reports/efficientnetb0_exp3_test_metrics.json` ($N=148$). |
| **`figure_class_metrics_3class.png`** | Grouped bar chart comparing Precision, Recall, and F1 across Normal, Mild, Severe, and Macro average. | `services/ai/research/reports/efficientnetb0_exp3_test_metrics.json`. |
| **`figure_cpu_latency_comparison.png`** | Comparative bar chart showing median/P95 latencies and throughput (FPS) for PyTorch vs ONNX Runtime. | `services/ai/research/reports/efficientnetb0_onnx_verification.json`. |
| **`figure_system_architecture_3class.png`** | High-resolution architectural diagram depicting the dual classification and explainability pipeline. | Concrete system implementation architecture. |

---

## 8. Remaining Limitations and Items for Human Review

1. **Severe Test Cohort Sample Size:** While the Severe class recall is 75.00% (9/12), 12 test samples produce a wide 95% binomial confidence interval ($\approx 43\% \text{ to } 95\%$). The authors must emphasize this limitation when discussing clinical deployment.
2. **Author Affiliations and Emails:** Verify that the author list and contact information (Ashutosh Verma, Sachin Kumar Gupta, Harshit Dubey at Chandigarh University) match the intended submission ordering.
3. **Target Venue Formatting:** The LaTeX source `services/ai/research/manuscript_three_class.tex` conforms to standard two-column `IEEEtran` formatting. If submitting to a different publisher (e.g., Elsevier, Springer, Nature Scientific Reports), swap the document class accordingly while retaining the verified text and tables.
4. **Preservation of Application Code:** Zero modifications were made to `services/ai/models/efficientnetb0_lsd_v1.onnx`, the database schema, Express backend routes, or the React web client. The application remains fully operational for live demonstration.
