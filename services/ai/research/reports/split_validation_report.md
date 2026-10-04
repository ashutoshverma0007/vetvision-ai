# VetVision AI - Dataset Split & Leakage Validation Report

> **Generated:** 2026-10-04T01:25:09.922299+00:00  
> **Pipeline Module:** `services.ai.research.split_dataset`  
> **Source Manifest:** `C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\services\ai\research\reports\research_manifest.csv`  
> **Deterministic Random Seed:** `42`  
> **Target Split Ratios:** 70.0% TRAIN / 15.0% VALIDATION / 15.0% TEST  

---

## 1. Executive Summary

This report documents the reproducible, leakage-controlled partitioning of the curated **VetVision AI Research Dataset** (derived from the original unbalanced Lumpy Skin Disease imagery). 

To ensure clinical and algorithmic validity, the partition strictly enforces **zero data leakage**:
1. **Group Containment:** All 97 multi-image same-class near-duplicate groups (196 total images) are kept **100% intact** within their assigned split. **Zero groups cross partition boundaries.**
2. **Cryptographic Disjointness:** Exact SHA-256 overlap across all partition pairs (`TRAIN ∩ VAL`, `TRAIN ∩ TEST`, `VAL ∩ TEST`) is **strictly 0**.
3. **Quarantine Compliance:** Zero excluded images (same-class exact duplicates, cross-class exact conflicts, or cross-class near-duplicate conflicts) were permitted into any split.
4. **Stratification Fidelity:** Class proportions (~69.5% Normal, ~22.0% Mild, ~8.5% Severe) are preserved across all three splits within fractions of a percent of theoretical targets.

---

## 2. Dataset Population Overview

| Category | Total Images | Normal | Mild | Severe | Notes |
|:---|:---:|:---:|:---:|:---:|:---|
| **Original Dataset** | **1019** | 697 | 231 | 91 | Raw unaugmented source directory (`lumpy_unbalanced/lumpy`) |
| **Usable Research Dataset** | **994** | **691** | **219** | **84** | Filtered strictly by `research_status == 'USABLE'` |
| **Excluded Images** | **25** | 6 | 12 | 7 | Quarantined to prevent synthetic bias and test poisoning |

### Excluded Breakdown:
- **Same-Class Exact Duplicates:** 2 images (redundant identical copies; exactly 1 representative kept)
- **Cross-Class Exact Duplicates:** 6 images (identical images labeled with contradictory clinical classes)
- **Cross-Class Near-Duplicates:** 17 images (perceptual variants labeled with contradictory clinical classes)

---

## 3. Split Distribution & Class Breakdown

| Metric | TRAIN | VALIDATION | TEST | Full Usable Set | Theoretical Target |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Total Images** | **696** | **150** | **148** | **994** | 696 / 149 / 149 |
| **Overall Percentage** | **70.02%** | **15.09%** | **14.89%** | **100.00%** | 70.0% / 15.0% / 15.0% |
| **Normal Count** | 484 | 104 | 103 | 691 | 484 / 104 / 103 |
| **Mild Count** | 153 | 33 | 33 | 219 | 153 / 33 / 33 |
| **Severe Count** | 59 | 13 | 12 | 84 | 59 / 13 / 12 |

### Class Allocation Percentages (of Each Class Total):
- **Normal (691 total):**
  - TRAIN: **484** (70.04%)
  - VALIDATION: **104** (15.05%)
  - TEST: **103** (14.91%)
- **Mild (219 total):**
  - TRAIN: **153** (69.86%)
  - VALIDATION: **33** (15.07%)
  - TEST: **33** (15.07%)
- **Severe (84 total):**
  - TRAIN: **59** (70.24%)
  - VALIDATION: **13** (15.48%)
  - TEST: **12** (14.29%)

### Within-Split Class Proportions (Preservation of Prior Class Distribution):
- **TRAIN:** Normal: 69.54%, Mild: 21.98%, Severe: 8.48%
- **VALIDATION:** Normal: 69.33%, Mild: 22.0%, Severe: 8.67%
- **TEST:** Normal: 69.59%, Mild: 22.3%, Severe: 8.11%
- *(Reference Usable Population: Normal: 69.52%, Mild: 22.03%, Severe: 8.45%)*

---

## 4. Near-Duplicate Group Allocation & Leakage Prevention

Same-class near-duplicate groups represent perceptual variants (e.g. slight rotations, crops, or burst captures of identical animal subjects). Placing members of the same group into different splits creates catastrophic information leakage, yielding over-optimistic evaluation metrics.

| Split | Total Near-Duplicate Groups | Group Images | Singletons | Total Images | Groups by Class (Normal / Mild / Severe) |
|:---|:---:|:---:|:---:|:---:|:---|
| **TRAIN** | **70** | 141 | 555 | 696 | 39 Normal / 18 Mild / 13 Severe |
| **VALIDATION** | **15** | 31 | 119 | 150 | 9 Normal / 3 Mild / 3 Severe |
| **TEST** | **12** | 24 | 124 | 148 | 8 Normal / 3 Mild / 1 Severe |
| **Total** | **97** | **196** | **798** | **994** | **56 Normal / 24 Mild / 17 Severe** |

### Split Boundary Crossing Check:
- **Number of near-duplicate groups crossing split boundaries:** **`0`** (Requirement: 0) -> **PASSED**

---

## 5. Cryptographic & File Disjointness Audit

| Comparison Pair | SHA-256 Hash Overlap | Filename Overlap | Status |
|:---|:---:|:---:|:---:|
| **TRAIN vs. VALIDATION** | **`0`** | **`0`** | **PASSED (Zero Leakage)** |
| **TRAIN vs. TEST** | **`0`** | **`0`** | **PASSED (Zero Leakage)** |
| **VALIDATION vs. TEST** | **`0`** | **`0`** | **PASSED (Zero Leakage)** |

---

## 6. Mathematical Rationale for Discrete Group Allocations

The requested split ratio was 70% TRAIN / 15% VALIDATION / 15% TEST.
- **Normal (691 images):** Exact 70/15/15 requires `483.7 / 103.65 / 103.65`. Actual split: `484 / 104 / 103` (70.04% / 15.05% / 14.91%).
- **Mild (219 images):** Exact 70/15/15 requires `153.3 / 32.85 / 32.85`. Actual split: `153 / 33 / 33` (69.86% / 15.07% / 15.07%).
- **Severe (84 images):** Exact 70/15/15 requires `58.8 / 12.60 / 12.60`. Actual split: `59 / 13 / 12` (70.24% / 15.48% / 14.29%).

### Why Exact Continuous Percentages Cannot Be Met:
1. **Discrete Indivisibility:** Images are discrete integers. For Severe (84 images), 15% is 12.6 images. Allocating non-integer counts is impossible.
2. **Indivisible Near-Duplicate Units:** 17 multi-image Severe groups (34 images) cannot be severed. For example, assigning a group of 2 images moves the split count in increments of 2.
3. **Leakage Prevention Priority:** Per requirement 15, atomic group integrity is strictly prioritized over decimal perfection. The achieved split is the mathematically closest valid configuration without breaking group boundaries.

---

## 7. Automated Validation Checks Summary

| Check ID | Assertion Description | Target | Result | Status |
|:---|:---|:---:|:---:|:---:|
| **CHK-01** | Excluded images in any split | 0 | 0 | **PASSED** |
| **CHK-02** | Near-duplicate groups spanning multiple splits | 0 | 0 | **PASSED** |
| **CHK-03** | Exact SHA-256 hash overlap between splits | 0 | 0 | **PASSED** |
| **CHK-04** | Cross-class conflict samples in any split | 0 | 0 | **PASSED** |
| **CHK-05** | Source image duplicate appearances across splits | 0 | 0 | **PASSED** |
| **CHK-06** | Unknown class labels in any split | 0 | 0 | **PASSED** |
| **CHK-07** | Total partitioned images equals usable universe | 994 | 994 | **PASSED** |

---

## 8. Artifact Inventory

The following reproducible artifacts were generated by this run:
- [dataset_split.csv](file:///C:/Users/Ashutosh Verma/OneDrive/Desktop/VET VISION AI/services/ai/research/reports/dataset_split.csv): Row-level mapping of each usable image to its assigned split with all provenance metadata.
- [dataset_split_summary.json](file:///C:/Users/Ashutosh Verma/OneDrive/Desktop/VET VISION AI/services/ai/research/reports/dataset_split_summary.json): Complete machine-readable split distribution and audit metrics.
- [split_distribution.png](file:///C:/Users/Ashutosh Verma/OneDrive/Desktop/VET VISION AI/services/ai/research/reports/split_distribution.png): High-resolution visualization of counts and class proportions.
- [split_validation_report.md](file:///C:/Users/Ashutosh Verma/OneDrive/Desktop/VET VISION AI/services/ai/research/reports/split_validation_report.md): This validation document.

---

*End of Report.*
