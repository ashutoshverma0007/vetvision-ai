# VetVision AI - Dataset Audit & Quality Analysis Pipeline

## 1. Overview

The `services/ai/research/` module hosts the reproducible dataset audit pipeline for VetVision AI's machine learning research phase. This pipeline performs comprehensive quality control, cryptographic integrity checks, class distribution profiling, and perceptual duplicate detection on cattle health imagery—specifically Lumpy Skin Disease (LSD) datasets.

> [!IMPORTANT]
> **Strict Research Guardrails:**
> - **Read-Only:** The raw source datasets are strictly read-only. Images are never renamed, moved, altered, augmented, or deleted.
> - **Zero Model Training:** This phase audits the dataset baseline. No model training, hyperparameter tuning, or evaluation is conducted here.
> - **Zero Fabricated Accuracy:** Ground-truth metrics and contamination warnings are calculated directly from raw pixel and cryptographic hashes.

---

## 2. Research Dependencies

The research pipeline relies on lightweight, standard scientific computing libraries that are maintained independently of the production API service dependencies:

- **`pillow>=10.4.0`** (image I/O, integrity verification, antialiased resizing)
- **`numpy>=1.26.0`** (array differences and statistical metrics)
- **`matplotlib>=3.8.0`** (high-resolution class distribution chart generation)

To install or verify research dependencies inside the virtual environment:

```bash
# Activate AI service virtual environment
# Windows PowerShell:
.\services\ai\.venv\Scripts\Activate.ps1
# Linux / macOS:
# source services/ai/.venv/bin/activate

# Install research dependencies
pip install -r services/ai/research/requirements-research.txt
```

---

## 3. How to Run the Audit

### Audit the Balanced Dataset (`lumpy_balanced`)
```bash
python services/ai/research/dataset_audit.py "C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_balanced\lumpy1" --output-dir "services/ai/research/reports/balanced"
```

### Audit the Original Unbalanced Dataset (`lumpy_unbalanced`)
```bash
python services/ai/research/dataset_audit.py "C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy" --output-dir "services/ai/research/reports/unbalanced"
```

### Command-Line Arguments

| Argument | Flag | Type | Default | Description |
|---|---|---|---|---|
| `dataset_path` | Positional | `str` | Required | Path to the folder containing dataset image files. |
| `--output-dir` | `-o` | `str` | `services/ai/research/reports` | Destination directory for audit reports and charts. |
| `--near-duplicate-threshold` | `-t` | `int` | `4` | Maximum Hamming distance for 64-bit dHash near-duplicate pairing. |
| `--quiet` | `-q` | Flag | `False` | Suppresses progress logging in stdout. |

---

## 4. Generated Audit Artifacts

The pipeline generates isolated report folders for each dataset as well as a comparative synthesis under `services/ai/research/reports/`:

```
services/ai/research/reports/
├── balanced/
│   ├── dataset_audit.json
│   ├── image_inventory.csv
│   ├── class_distribution.png
│   ├── duplicate_report.csv
│   └── near_duplicate_report.csv
├── unbalanced/
│   ├── dataset_audit.json
│   ├── image_inventory.csv
│   ├── class_distribution.png
│   ├── duplicate_report.csv
│   └── near_duplicate_report.csv
├── balanced_vs_unbalanced_comparison.json
└── balanced_vs_unbalanced_distribution.png
```

---

## 5. Comprehensive Comparison: Balanced vs. Unbalanced

| Audit Metric | Unbalanced Dataset (`lumpy`) | Balanced Dataset (`lumpy1`) | Analysis & Root Cause |
|---|---|---|---|
| **Total Images** | **1,019** | **2,091** | Balanced dataset added **1,072** images (+105.2%). |
| **Normal Count** | **697** (68.40%) | **697** (33.33%) | **Identical**: Normal was kept 100% unchanged. |
| **Mild Count** | **231** (22.67%) | **697** (33.33%) | Artificially inflated by **+466 copies**. |
| **Severe Count** | **91** (8.93%) | **697** (33.33%) | Artificially inflated by **+606 copies** (~7.6x duplicate rate). |
| **Class Imbalance Ratio** | **7.66 : 2.54 : 1.0** | **1.0 : 1.0 : 1.0** | Apparent 1:1 balance in `lumpy1` is an artifact of naive duplication. |
| **Corrupted Images** | **0** (0.0%) | **0** (0.0%) | All images are readable in both datasets. |
| **File Formats** | **100% PNG** | **100% PNG** | Uniform PNG encoding across both datasets. |
| **Dimensions (W x H)** | **256 x 256** | **256 x 256** | Uniform 256x256 square format across both datasets. |
| **Color Modes** | RGB: 1,009 / RGBA: 10 | RGB: 2,062 / RGBA: 29 | Alpha channels duplicated along with RGB content. |
| **Unique SHA-256 Hashes** | **1,014** (of 1,019) | **756** (of 2,091) | **Critical**: Balanced has *fewer* unique images than unbalanced! |
| **Exact Duplicate Files** | **10** files (0.98%) | **1,791** files (85.65%) | **63.8% of total volume** in balanced is redundant duplicates. |
| **Exact Duplicate Groups** | **5** groups | **456** groups | Multiplied by a factor of 91x due to naive oversampling. |
| **Cross-Class Exact Duplicates** | **3 groups** | **2 groups** | **Severe Contamination**: Identical pixels labeled both Normal and Mild! |
| **Near-Duplicate Pairs ($d \le 4$)** | **115** pairs | **1,346** pairs | Massive pairwise similarity inflation. |
| **Cross-Class Near-Duplicates** | **10** pairs | **147** pairs | Perceptual overlap between classes multiplied by copying. |
| **Naming Convention** | `Mild_XXX.png`, `Normal_Skin_XXX.png` | `MildXXX.png`, `NormalXXX.png` | Renamed and re-indexed during oversampling script. |

---

## 6. Critical Findings: Dataset Provenance & Contamination Analysis

### 6.1 The "Balanced" Illusion
Our audits reveal the exact mechanism used to create the `lumpy_balanced` dataset:
1. The author started with `lumpy_unbalanced` (1,019 images: 697 Normal, 231 Mild, 91 Severe).
2. Rather than acquiring new samples or employing clinical data collection, the author naively **duplicated existing Mild and Severe images byte-for-byte** with new filenames until every class reached 697 images.
3. This resulted in:
   - `Mild`: 231 original images expanded to 697 (each image duplicated ~3 times).
   - `Severe`: 91 original images expanded to 697 (each image duplicated ~7.6 times).

### 6.2 Pre-Existing Cross-Class Contamination
The original `lumpy_unbalanced` dataset **already had 3 cross-class duplicates** before any balancing took place:
1. `Mild_106.png` == `Normal_Skin_429.png` (SHA-256: `cf0decc9...`)
2. `Mild_161.png` == `Normal_Skin_588.png` (SHA-256: `2999ccc0...`)
3. `Mild_56.png` == `Normal_Skin_242.png` (SHA-256: `611ef573...`)

When the author duplicated `Mild_106.png` and `Mild_56.png` during the naive balancing process, this contradictory label contamination was replicated across multiple files (e.g. `Mild1002.png`, `Mild1056.png`, `Mild1186.png`, `Mild1257.png`, `Mild918.png` vs. `Normal450.png`).

> [!WARNING]
> **Data Leakage & Invalidation Guarantee:**
> If an ML model is trained on `lumpy_balanced` without deduplication:
> 1. Duplicate images will inevitably end up in both the training set and the validation/test sets, resulting in **heavily fabricated validation accuracy**.
> 2. The loss function will be penalized with contradictory gradients because the model is instructed that the exact same pixels are both "Normal" and "Mild".

---

## 7. Next Steps for Dataset Preparation (Pre-Training Phase)

1. **Discard Naive Oversampling:** Reject `lumpy_balanced` as a training source.
2. **Canonical Deduplication:** Deduplicate the original `lumpy_unbalanced` dataset to establish a clean base of ~1,014 unique images.
3. **Quarantine Contaminated Samples:** Remove or manually review the 3 cross-class duplicate pairs.
4. **Group-Aware Stratified Splitting:** Partition near-duplicate clusters together so that no cluster spans across train/val/test splits.
5. **Channel Standardization:** Strip the 10 alpha channels (`RGBA -> RGB`).
6. **Principled Class Weighting / Augmentation:** Handle class imbalance at train time via focal loss, class-weighted cross-entropy, or controlled photometric augmentations rather than raw file duplication.

---

## 8. Research Manifest & Leakage Control Pipeline

To operationalize the audit findings into a reproducible research dataset, run:

```bash
python services/ai/research/build_research_manifest.py
```

### 8.1 Methodology: Handling Conflicts & Duplicates
- **Deduplication:** For groups of byte-for-byte identical images with matching labels, exactly **one representative image** is kept. Redundant copies are marked `EXCLUDED` with reason `EXACT_DUPLICATE_SAME_CLASS`.
- **Exclusion of Cross-Class Conflicts:** When exact or near-duplicate images have conflicting clinical labels (e.g. labeled both `Normal` and `Mild`), **all images in the conflicting component are marked `EXCLUDED`** (`CROSS_CLASS_EXACT_DUPLICATE_CONFLICT` or `CROSS_CLASS_NEAR_DUPLICATE_LABEL_CONFLICT`).
- **Rationale against Arbitrary Resolution:** Without expert veterinary re-annotation of the raw cattle photographs, arbitrarily selecting `Normal` over `Mild` or `Mild` over `Severe` introduces synthetic label noise. In medical machine learning, contaminated or ambiguous samples must be quarantined to prevent biased loss gradients and test set poisoning.
- **Group Preservation:** Same-class near-duplicate clusters are retained as `USABLE`, each tagged with a unique `near_duplicate_group` ID (e.g. `ND-SAME-0001`). These groups ensure all perceptual variants of a lesion remain grouped together in the same split (GroupKFold) during future partitioning.

### 8.2 Scientific Disclaimer
> [!NOTE]
> **Research Dataset Notice:**
> The resulting manifest defines a curated research dataset for computer vision experiments and algorithmic evaluation. It is **not certified as a clinical diagnostic benchmark** or a regulatory-grade veterinary standard.

---

## 9. Reproducible Leakage-Controlled Dataset Splitter

To partition the curated research dataset into deterministic, leakage-controlled **TRAIN**, **VALIDATION**, and **TEST** sets (~70% / 15% / 15%), run:

```bash
python services/ai/research/split_dataset.py
```

### 9.1 Partitioning Guardrails & Integrity Guarantees
1. **Group Containment (Zero Boundary Crossing):** Every same-class near-duplicate group (97 groups, 196 images) remains 100% within one split.
2. **Cryptographic Disjointness:** SHA-256 hash overlap across all partition pairs (`TRAIN ∩ VAL`, `TRAIN ∩ TEST`, `VAL ∩ TEST`) is strictly **0**.
3. **Quarantine Enforcement:** Zero excluded images (exact duplicate copies or cross-class conflicts) enter any split.
4. **Stratification Fidelity:** Class proportions (~69.5% Normal, ~22.0% Mild, ~8.5% Severe) are preserved across all splits.
5. **Deterministic Seed:** Partitions are generated using a fixed random seed (`--seed 42`).

### 9.2 Split Breakdown

| Split | Total Images | Usable % | Normal | Mild | Severe | Near-Duplicate Groups |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **TRAIN** | **696** | **70.02%** | 484 (69.5%) | 153 (22.0%) | 59 (8.5%) | 70 (39 Normal / 18 Mild / 13 Severe) |
| **VALIDATION** | **150** | **15.09%** | 104 (69.3%) | 33 (22.0%) | 13 (8.7%) | 15 (9 Normal / 3 Mild / 3 Severe) |
| **TEST** | **148** | **14.89%** | 103 (69.6%) | 33 (22.3%) | 12 (8.1%) | 12 (8 Normal / 3 Mild / 1 Severe) |
| **Total** | **994** | **100.00%** | **691** | **219** | **84** | **97 groups (0 crossing boundaries)** |

### 9.3 Generated Partition Artifacts
- `services/ai/research/reports/dataset_split.csv`
- `services/ai/research/reports/dataset_split_summary.json`
- `services/ai/research/reports/split_distribution.png`
- `services/ai/research/reports/split_validation_report.md`


