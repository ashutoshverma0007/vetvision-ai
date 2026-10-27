# VetVision AI — Phase 4: EfficientNet-B0 ONNX Export and Deployment Verification Report

**Author / Team:** VetVision AI Engineering  
**Date:** October 15, 2026  
**Artifact Status:** Verified & Deployed to Service  
**Deployment Target:** CPU Inference via ONNX Runtime (`services/ai/models/efficientnetb0_lsd_v1.onnx`)

---

## 1. Executive Summary

In Phase 4 of the VetVision AI model development lifecycle, the winning model from Experiment 3—**EfficientNet-B0** (Epoch 51, Validation Macro-F1 $87.67\%$, Test Accuracy $90.54\%$, Test Macro-F1 $83.35\%$)—was exported to ONNX format, rigorously verified for numerical equivalence against PyTorch, benchmarked on CPU hardware, integrated into the FastAPI inference engine (`ONNXAdapter`), and validated through a 36-test automated regression suite.

### Key Highlights
- **Artifact Compression:** Checkpoint size reduced from **39.76 MB** (PyTorch `.pth`) to **15.29 MB** (ONNX), a **61.54%** footprint reduction.
- **Numerical Equivalence:** On 50 synthetic tensors ($224 \times 224 \times 3$), max absolute logit discrepancy was **$7.23 \times 10^{-5}$** (well below the $10^{-4}$ tolerance threshold), with **100.0%** class argmax agreement.
- **CPU Inference Acceleration:** Mean latency dropped from **26.11 ms** (PyTorch) to **6.82 ms** (ONNX Runtime CPU), yielding a **73.88% latency reduction** ($3.83\times$ speedup) and increasing model throughput from **38.30 FPS** to **146.61 FPS**.
- **Service Integration:** Successfully hooked into `ONNXAdapter` and `InferenceEngine` in `services/ai/app/`, supporting real end-to-end cattle image screening with no mocked or fabricated predictions.
- **Automated Verification:** 36 automated test cases covering model loading, shapes, class ordering, numerical equivalence, invalid inputs, corrupt formats, missing weights, and API route security passed with 100% success.

---

## 2. Source Checkpoint and Configuration

### Source Checkpoint Verification
- **Artifact Path:** `services/ai/research/models/efficientnetb0_exp3_best.pth`
- **Origin Run:** Experiment 3 (AdamW, inverse-frequency class weights $[0.4793, 1.5163, 3.9322]$, initial LR $10^{-4}$, Cosine Annealing, no label smoothing)
- **Selection Criterion:** Best Validation Macro-F1 ($87.67\%$) strictly on validation split (150 images), achieved at Epoch 51
- **Preserved Status:** Selected checkpoint remains untouched and unchanged.

### Prior Reported Test Metrics (Quarantined Test Split: 148 images)
> *Note: Test set was not re-evaluated during this export and deployment task.*
- **Test Accuracy:** 90.54% (134 / 148)
- **Test Macro F1:** 83.35%
- **Test Weighted F1:** 90.38%
- **Per-Class Metrics:**
  - Normal (103 images): Precision 96.08%, Recall 95.15%, F1 95.61%
  - Mild (33 images): Precision 75.00%, Recall 72.73%, F1 73.85%
  - Severe (12 images): Precision 84.62%, Recall 91.67%, F1 88.00%
- **Severe-to-Normal Misclassifications:** 0 (0.00%)

### Model Architecture and Preprocessing Specification
- **Base Architecture:** `torchvision.models.efficientnet_b0(weights=None)`
- **Classifier Head:** `Dropout(p=0.2, inplace=True)` followed by `Linear(in_features=1280, out_features=3)`
- **Class Index Mapping:**
  - `0`: `Normal`
  - `1`: `Mild`
  - `2`: `Severe`
- **Input Tensor Dimensions:** Fixed NCHW shape $[1, 3, 224, 224]$, `float32`
- **Image Resampling:** Bilinear interpolation with RGB channel ordering (alpha channel stripped)
- **Pixel Standardization (ImageNet):**
  - $\text{Mean} = [0.485, 0.456, 0.406]$
  - $\text{Std} = [0.229, 0.224, 0.225]$
  - Formula: $x_{\text{norm}} = (x / 255.0 - \text{mean}) / \text{std}$

---

## 3. ONNX Export Process

- **Target Artifact:** `services/ai/models/efficientnetb0_lsd_v1.onnx`
- **Opset Version:** 17
- **Exporter Backend:** TorchScript-based exporter (`torch.onnx.export(..., dynamo=False)`)
- **Evaluation Mode:** Explicitly set via `model.eval()` prior to tracing
- **Input Node Name:** `"input"` (shape: $[1, 3, 224, 224]$)
- **Output Node Name:** `"logits"` (shape: $[1, 3]$)
- **Validation Check:** Passed `onnx.checker.check_model()` and ONNX Runtime shape inference with zero warnings and zero unsupported operators.

| Metric | PyTorch Checkpoint | Exported ONNX Artifact | Change |
|---|---|---|---|
| **File Path** | `services/ai/research/models/efficientnetb0_exp3_best.pth` | `services/ai/models/efficientnetb0_lsd_v1.onnx` | Deployed to production model folder |
| **Artifact Size** | 39.76 MB | 15.29 MB | **-61.54%** (-24.47 MB) |
| **Batch Dim** | Variable | Fixed (1) | Optimized for single-image CPU requests |
| **Opset** | N/A | 17 | Standard ONNX Runtime CPU compatibility |

---

## 4. Numerical Equivalence Verification

To guarantee that the export process introduced no degradation or numerical drift, identical synthetic preprocessed tensors were evaluated through both models. In accordance with clinical validation guidelines, test set images were **quarantined and not evaluated**.

- **Evaluation Sample:** 50 deterministic synthetic tensors ($224 \times 224 \times 3$, diverse distributions: standard normal, uniform $[0, 1]$, extreme values, zeros, ones).
- **Execution Environment:** PyTorch 2.14.1 CPU vs ONNX Runtime 1.31.0 CPU (`CPUExecutionProvider`).

### Equivalence Results
| Metric | Observed Value | Clinical / Engineering Tolerance | Status |
|---|---|---|---|
| **Max Absolute Logit Difference** | **$0.00007227$** ($7.23 \times 10^{-5}$) | $< 0.0001$ ($10^{-4}$) | **PASSED** |
| **Mean Absolute Logit Difference** | **$0.00000522$** ($5.22 \times 10^{-6}$) | $< 0.00005$ | **PASSED** |
| **Predicted Class Agreement (Argmax)** | **100.00%** (50 / 50 samples) | 100.00% | **PASSED** |
| **Operator Support Warnings** | **0** | 0 | **PASSED** |

The maximum discrepancy observed across all outputs was under $0.000073$, confirming near-perfect numerical parity between PyTorch and ONNX Runtime.

---

## 5. CPU Inference Benchmarks

### Timing Methodology
- **Hardware:** Intel x86_64 CPU (Local Workstation Environment)
- **Batch Size:** 1
- **Input Tensor:** $1 \times 3 \times 224 \times 224$ (synthetic standardized RGB float32)
- **Warmup Iterations:** 20 iterations (to warm up CPU caches and JIT paths)
- **Timed Iterations:** 100 timed iterations using high-resolution monotonic timer (`time.perf_counter()`)
- **Scope Distinction:** These measurements represent **pure model-only forward pass latency** on CPU. End-to-end latency additionally includes disk I/O, PIL decode, preprocessing ($\approx 2.5\text{--}4.0\text{ ms}$), JSON serialization, and HTTP transport.

### Comparative Results
| Backend / Metric | Mean Latency | Median (P50) | P95 Latency | P99 Latency | Throughput |
|---|---|---|---|---|---|
| **PyTorch (CPU)** | 26.11 ms | 25.75 ms | 31.67 ms | 34.75 ms | 38.30 FPS |
| **ONNX Runtime (CPU)** | **6.82 ms** | **6.79 ms** | **7.61 ms** | **8.00 ms** | **146.61 FPS** |
| **Relative Delta** | **-73.88%** | **-73.63%** | **-75.97%** | **-76.98%** | **+282.8% ($3.83\times$)** |

### Benchmark Observations
1. **Significant Speedup:** ONNX Runtime's CPU constant-folding, memory allocation optimizations, and operator fusion reduced forward pass execution time from $\sim 26.1\text{ ms}$ to under $7\text{ ms}$.
2. **P95 Latency Stability:** Tail latency (P95) remained strictly bounded below $8.0\text{ ms}$, ensuring highly predictable performance for real-time veterinary screening workloads.
3. **Throughput Scaling:** CPU processing capacity increased from 38 to 146 images per second per CPU core thread.

---

## 6. AI Service Integration

The existing FastAPI AI inference service (`services/ai/app`) was inspected and verified.

### Integration Changes
1. **Configuration (`app/core/config.py`):**
   - Default `MODEL_ARTIFACT_PATH` updated to `"services/ai/models/efficientnetb0_lsd_v1.onnx"`.
   - `MODEL_VERSION` set to `"lsd-efficientnetb0-v1.0.0"`.
   - `MODEL_FRAMEWORK` set to `"ONNX"`.
2. **Adapter Layer (`app/models/onnx_adapter.py`):**
   - Enhanced with model property accessor and `unload()` lifecycle hook to ensure complete polymorphic compatibility with `ModelAdapter`.
   - Evaluates Softmax probabilities cleanly: $P(y=k) = \frac{e^{z_k}}{\sum_j e^{z_j}}$.
3. **Path Resolution Resilience (`app/inference/engine.py`):**
   - Added `_resolve_model_path()` helper that correctly resolves relative paths across diverse execution roots (repo root, `services/ai`, or container deployment paths).
   - Replaced deprecated `logger.warn` calls with `logger.warning`.
4. **Preserved Architecture & Guarantees:**
   - **No Mocking / Zero Fabrication:** When model weights are missing or unconfigured, the service honestly returns `status: "MODEL_UNAVAILABLE"` and logs an operational alert.
   - **Authentication:** Protected internal endpoints (`/internal/v1/inference`, `/internal/v1/health`, `/internal/v1/models`) strictly enforce `X-Internal-Token` header verification (`403 Forbidden` on mismatch).
   - **API Schema Preservation:** Full compatibility maintained with `InferenceRequest` and `InferenceResponse` Pydantic schemas.

---

## 7. Automated Test Suite Verification

A comprehensive automated test suite in `services/ai/tests/` verifies model export integrity, adapter contracts, and operational failure handling:

```
tests/test_adapters.py ..                                                [  5%]
tests/test_api_routes.py ...                                             [ 13%]
tests/test_build_research_manifest.py ..                                 [ 19%]
tests/test_dataset_audit.py ...                                          [ 27%]
tests/test_inference.py .......                                          [ 47%]
tests/test_metrics.py ..                                                 [ 52%]
tests/test_onnx_deployment.py .......                                    [ 72%]
tests/test_preprocessing.py ..                                           [ 77%]
tests/test_split_dataset.py ........                                     [100%]
======================= 36 passed, 0 warnings in 8.62s ========================
```

### Coverage Breakdown
- **Artifact Existence & Integrity:** `test_onnx_artifact_exists` validates file presence and minimum non-empty binary size ($> 10\text{ MB}$).
- **Adapter Session Loading:** `test_onnx_adapter_successful_loading` verifies ONNX Runtime CPU session initialization and input naming.
- **Output Shape & Probabilities:** `test_onnx_output_shape_and_probability_distribution` verifies output shape $[1, 3]$, valid $[0, 1]$ range, and unit probability sum.
- **Class Ordering:** `test_onnx_class_ordering_contract` guarantees index 0 maps to Normal, 1 to Mild, 2 to Severe.
- **Pytorch/ONNX Numerical Parity:** `test_onnx_pytorch_numerical_equivalence_synthetic` runs synthetic tensors through both PyTorch and ONNX models, enforcing $< 10^{-4}$ tolerance.
- **Missing / Corrupted Inputs:** `test_inference_engine_missing_image_file`, `test_inference_engine_corrupted_image_file`, and `test_inference_engine_unsupported_image_format` confirm graceful failure handling with `status: "FAILED"`.
- **Honest Availability Reporting:** `test_inference_engine_returns_model_unavailable_when_weights_unconfigured` guarantees `status: "MODEL_UNAVAILABLE"` when unconfigured.
- **API Security & Contracts:** `test_api_health_endpoint`, `test_api_models_endpoint`, and `test_api_inference_endpoint_real_image` verify token authentication and real image processing.

---

## 8. Clinical Limitations & Confidence Gating

### Preliminary Confidence Threshold Limitation
- The current codebase includes a preliminary confidence threshold: `CONFIDENCE_THRESHOLD = 0.65`.
- **Known Limitation:** This threshold was established as an initial operational heuristic during system scaffolding. It has **not yet been clinically calibrated** using post-hoc methods (such as Platt scaling, Temperature Scaling, or cost-sensitive threshold optimization on the validation set).
- If the predicted class probability is $< 0.65$, the inference engine returns `status: "LOW_CONFIDENCE"`, signaling that the result requires human expert review.

### Proposed Calibration Procedure (Future Separate Task)
1. **Temperature Scaling:** Fit a single scalar parameter $T > 0$ on the validation split logits to minimize negative log-likelihood (NLL) and improve Expected Calibration Error (ECE).
2. **Cost-Sensitive Threshold Tuning:** Given the severe veterinary and economic consequences of false negatives (missed severe LSD infections), compute Precision-Recall curves on validation data to establish operating thresholds that maximize Severe class recall while bounding false positive rates.
3. **No Test Set Contamination:** Calibration parameters must be learned strictly on validation split data.

### AI-Assisted Screening Disclaimer
VetVision AI is designed solely as an **AI-assisted diagnostic decision support tool for screening and lesion severity triaging**. It does **not** constitute a definitive veterinary diagnosis. Definitive confirmation of Lumpy Skin Disease requires clinical examination by a licensed veterinary practitioner and confirmatory laboratory assays (e.g., real-time PCR, viral isolation, or histopathology).

---

## 9. Reproduction Instructions

### Prerequisites
Activate the project virtual environment containing PyTorch, ONNX, and ONNX Runtime:
```powershell
services/ai/.venv/Scripts/python -m pip install onnx==1.23.2 onnxruntime==1.31.0
```

### Export Checkpoint to ONNX
Run the export and equivalence script:
```powershell
services/ai/.venv/Scripts/python services/ai/research/export_onnx.py
```

### Run Automated Deployment Test Suite
Execute pytest across the full test suite from the repository root:
```powershell
services/ai/.venv/Scripts/python -m pytest services/ai/tests
```
Or from within the `services/ai` directory:
```powershell
cd services/ai
.venv/Scripts/python -m pytest tests
```

### Verify FastAPI Service Locally
```powershell
cd services/ai
.venv/Scripts/python main.py
```

---

## 10. Verification Checklist Summary

| Verification Item | Specification | Result |
|---|---|---|
| **Checkpoint Integrity** | `efficientnetb0_exp3_best.pth` unchanged | **Preserved (39.76 MB)** |
| **No Retraining** | No gradient steps executed | **Compliant** |
| **No Test Set Reuse** | Test set was not re-evaluated for export | **Compliant (Quarantined)** |
| **ONNX Artifact Location** | `services/ai/models/efficientnetb0_lsd_v1.onnx` | **Created (15.29 MB, opset 17)** |
| **Numerical Equivalence** | Max logit diff $< 10^{-4}$ on synthetic inputs | **Passed ($7.23 \times 10^{-5}$)** |
| **Class Prediction Agreement** | Argmax agreement on synthetic tensors | **Passed (100.0%)** |
| **CPU Inference Benchmarking** | 20 warmup, 100 timed iterations | **Passed (6.82 ms, 146.6 FPS)** |
| **FastAPI Adapter Hook** | `ONNXAdapter` wired to engine | **Active & Verified** |
| **No Fabricated Output** | Return `MODEL_UNAVAILABLE` when weights missing | **Passed & Tested** |
| **Automated Tests** | Loading, shapes, order, equivalence, errors, auth | **36 Passed (100%)** |
| **Accuracy Target Disclaimer** | 95% target not reached (Test: 90.54%) | **Explicitly Documented** |
