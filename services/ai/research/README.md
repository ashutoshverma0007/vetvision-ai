# VetVision AI - Dataset Audit & Quality Analysis Pipeline

## 1. Overview

The `services/ai/research/` module hosts the reproducible dataset audit pipeline for VetVision AI's machine learning research phase. This pipeline performs comprehensive quality control, cryptographic integrity checks, class distribution profiling, and perceptual duplicate detection on cattle health imagery—specifically Lumpy Skin Disease (LSD) datasets.

> [!IMPORTANT]
> **Strict Research Guardrails:**
> - **Read-Only:** The raw source dataset is strictly read-only. Images are never renamed, moved, altered, augmented, or deleted.
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

Execute `dataset_audit.py` by providing the absolute or relative path to the image dataset:

```bash
python services/ai/research/dataset_audit.py "C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_balanced\lumpy1"
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

Running the pipeline populates `services/ai/research/reports/` with five reproducible artifacts:

| Artifact | Format | Description |
|---|---|---|
| [`dataset_audit.json`](file:///services/ai/research/reports/dataset_audit.json) | JSON | Complete machine-readable summary covering metadata, class distribution, dimension statistics, channel profiles, duplicate metrics, and cross-class contamination warnings. |
| [`image_inventory.csv`](file:///services/ai/research/reports/image_inventory.csv) | CSV | Full inventory of every discovered file (filename, relative path, class, width, height, channels, mode, aspect ratio, bytes, SHA-256 hash, and 64-bit dHash hex). |
| [`class_distribution.png`](file:///services/ai/research/reports/class_distribution.png) | PNG | Publication-quality 300 DPI visualization illustrating class counts and balance percentages. |
| [`duplicate_report.csv`](file:///services/ai/research/reports/duplicate_report.csv) | CSV | Granular report of all exact duplicate groups (identical SHA-256), including file counts, file paths, and cross-class conflict flags. |
| [`near_duplicate_report.csv`](file:///services/ai/research/reports/near_duplicate_report.csv) | CSV | Perceptual near-duplicate candidate pairs (dHash Hamming distance $\le$ threshold) identifying structural similarities and cross-class contradictions. |

---

## 5. Audit Results: Baseline Findings (`lumpy1` Dataset)

The baseline audit conducted on the `lumpy1` balanced cattle Lumpy Skin Disease dataset yielded critical insights:

### 5.1 Volume & Class Balance
- **Total Images Scanned:** `2,091`
- **Corrupted / Unreadable Images:** `0` (100% readable files)
- **Normal Class:** `697` images (`33.33%`)
- **Mild Class:** `697` images (`33.33%`)
- **Severe Class:** `697` images (`33.33%`)
- **Apparent Balance:** Perfectly balanced 1:1:1 prior to deduplication.

### 5.2 Resolution & Format Profile
- **File Extensions:** 100% `.png` (`2,091` files)
- **Dimensions:** Uniform `256 x 256` pixels across all 2,091 images (min: 256, max: 256, mean: 256.0).
- **Aspect Ratio:** Exact `1.0` (square format).
- **Color Modes:**
  - `RGB` (3-channel): `2,062` images (`98.6%`)
  - `RGBA` (4-channel with alpha transparency): `29` images (`1.4%`)
  - *Recommendation:* Preprocessing must discard or composite alpha channels prior to model ingestion to avoid shape mismatches.

### 5.3 Cryptographic Integrity & Exact Duplicates (SHA-256)
- **Unique SHA-256 Hashes:** Only `756` unique images exist across all `2,091` files.
- **Exact Duplicate Groups:** `456` groups comprising `1,791` redundant copies.
- **Redundancy Rate:** **63.8%** of the dataset consists of duplicated image content.
- **Critical Cross-Class Contamination Discovered:**
  - `2` duplicate groups contain images with conflicting clinical labels:
    - Group `EXACT-0003` (`cf0decc9...`): `Normal450.png` has the **exact identical image bytes** as `Mild1002.png`, `Mild1056.png`, `Mild1186.png`, `Mild1257.png`, and `Mild918.png`.
    - Group `EXACT-0147` (`611ef573...`): `Normal410.png` has the **exact identical image bytes** as `Mild1268.png`.
  - *Impact:* Training on un-deduplicated data would cause data leakage between train/val/test splits and force the neural network to learn conflicting gradients for identical pixels.

### 5.4 Perceptual Near-Duplicates (64-bit dHash, Distance $\le$ 4)
- **Near-Duplicate Candidate Pairs:** `1,346` pairs of distinct SHA-256 images.
- **Cross-Class Near-Duplicates:** `147` pairs have different clinical labels despite high perceptual structural similarity.

---

## 6. Next Steps for Dataset Preparation (Pre-Training Phase)

Before commencing any model training, the following data cleaning steps should be designed:
1. **Deduplication:** Remove redundant exact duplicate copies, retaining one canonical image per unique hash.
2. **Label Disambiguation:** Resolve or quarantine the 2 cross-class exact duplicate groups (`Normal` vs `Mild`).
3. **Leak-Free Partitioning:** Group-aware splitting so that near-duplicate variants are restricted to the same partition (avoiding test set data contamination).
4. **Channel Normalization:** Convert `RGBA` images to `RGB` consistently.
