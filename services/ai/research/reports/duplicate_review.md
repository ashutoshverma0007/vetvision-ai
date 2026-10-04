# VetVision AI - LSD Dataset Duplicate Review & Clinical Audit

> **Dataset Audited:** data-processed/lumpy_unbalanced/lumpy  
> **Absolute Path:** C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy  
> **Total Images:** 1,019 | **Unique SHA-256 Hashes:** 1,014  

> [!IMPORTANT]
> **Read-Only Audit Principle:**
> No images were deleted, altered, or moved during this audit. This document identifies duplicate clusters, perceptual similarities, and clinical label contradictions to guide leak-free dataset partitioning and disambiguation before any model training.

---

## Executive Summary & Duplicate Taxonomy

| Category | Count | Clinical Contamination Risk | Impact on Model Training |
|---|---|---|---|
| **Same-Class Exact Duplicates** | **2 groups** (4 files) | Low | Causes train/val/test data leakage if un-deduplicated. |
| **Cross-Class Exact Duplicates** | **3 groups** (6 files) | **CRITICAL** | Identical images have conflicting labels; forces contradictory loss gradients. |
| **Cross-Class Near-Duplicates** | **10 pairs** (d $\le$ 4) | **HIGH** | Structural/visual duplicates carrying conflicting clinical labels. |
| **Same-Class Near-Duplicates** | **105 pairs** (d $\le$ 4) | Medium | Similar/repeated camera angles; must be partitioned in same fold. |

---

## 1. Cross-Class Exact Duplicates (CRITICAL CONFLICTS)

These image pairs have **identical SHA-256 cryptographic hashes** (byte-for-byte identical content), but have been assigned **different clinical severity classes** in the dataset.

| Group ID | SHA-256 Hash | Conflicting Labels | Files & Absolute Paths |
|---|---|---|---|
| **EXACT-0001** | cf0decc97e5f837e...34072a2f | **Mild;Normal** | Mild_106.png (C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\\Mild_106.png)<br>Normal_Skin_429.png (C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\\Normal_Skin_429.png) |
| **EXACT-0002** | 2999ccc06334fa3f...bbf6cc5c | **Mild;Normal** | Mild_161.png (C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\\Mild_161.png)<br>Normal_Skin_588.png (C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\\Normal_Skin_588.png) |
| **EXACT-0004** | 611ef573c5047bf5...aa6fc701 | **Mild;Normal** | Mild_56.png (C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\\Mild_56.png)<br>Normal_Skin_242.png (C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\\Normal_Skin_242.png) |

### Diagnostic Breakdown of Cross-Class Exact Contaminations:
- **EXACT-0001 (cf0decc97e5f837e8fb407fc33383b47dc401e442fd6d13ef6ce401534072a2f):**
  - Mild_106.png &rarr; **Mild** (C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Mild_106.png)
  - Normal_Skin_429.png &rarr; **Normal** (C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Normal_Skin_429.png)
  - *Clinical Impact:* A neural network trained on these images cannot converge cleanly because the loss function receives conflicting gradient updates for the exact same pixel matrix.
- **EXACT-0002 (2999ccc06334fa3fc2fd80bf81e0b9a61a7821091263f30ed4f0cc83bbf6cc5c):**
  - Mild_161.png &rarr; **Mild** (C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Mild_161.png)
  - Normal_Skin_588.png &rarr; **Normal** (C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Normal_Skin_588.png)
  - *Clinical Impact:* A neural network trained on these images cannot converge cleanly because the loss function receives conflicting gradient updates for the exact same pixel matrix.
- **EXACT-0004 (611ef573c5047bf5fdd8130b503f09aa3550fe698834d0b7b2629654aa6fc701):**
  - Mild_56.png &rarr; **Mild** (C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Mild_56.png)
  - Normal_Skin_242.png &rarr; **Normal** (C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Normal_Skin_242.png)
  - *Clinical Impact:* A neural network trained on these images cannot converge cleanly because the loss function receives conflicting gradient updates for the exact same pixel matrix.

---

## 2. Same-Class Exact Duplicates (REDUNDANT COPIES)

These image groups have **identical SHA-256 hashes** and agree on the class label. They represent redundant byte-level duplicates that must be deduplicated to avoid train-test data leakage.

| Group ID | SHA-256 Hash | Class | File Count | Duplicate Files & Absolute Paths |
|---|---|---|---|---|
| **EXACT-0003** | ceac74a3c8234924...fa93d2e1 | Mild | 2 | Mild_194.png (C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\\Mild_194.png)<br>Mild_206.png (C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\\Mild_206.png) |
| **EXACT-0005** | ae48828d131be574...4f73f3b5 | Severe | 2 | Severe_89.png (C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\\Severe_89.png)<br>Severe_90.png (C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\\Severe_90.png) |

---

## 3. Cross-Class Near-Duplicates (PERCEPTUAL CONFLICTS)

These image pairs have **different SHA-256 hashes** (slight compression/encoding variations), but an **extremely small perceptual Hamming distance** ($\le 2$ bits difference on 64-bit dHash) while carrying **conflicting clinical labels**.

| Pair ID | Image 1 (Class) | Image 2 (Class) | Hamming Dist | dHash 1 | dHash 2 | Clinical Risk |
|---|---|---|---|---|---|---|
| **NEAR-00007** | Mild_12.png (**Mild**) | Normal_Skin_429.png (**Normal**) | **0** | 42666779332e2f4d | 42666779332e2f4d | CRITICAL (Identical dHash) |
| **NEAR-00028** | Mild_214.png (**Mild**) | Severe_16.png (**Severe**) | **0** | 4ca43031a92c4447 | 4ca43031a92c4447 | CRITICAL (Identical dHash) |
| **NEAR-00032** | Mild_25.png (**Mild**) | Severe_31.png (**Severe**) | **0** | a797e577317367e3 | a797e577317367e3 | CRITICAL (Identical dHash) |
| **NEAR-00004** | Mild_102.png (**Mild**) | Severe_84.png (**Severe**) | **1** | c6445c4e287c1030 | c6445c4e287c10b0 | HIGH |
| **NEAR-00025** | Mild_209.png (**Mild**) | Normal_Skin_347.png (**Normal**) | **1** | b36e6e6bcd941436 | b36e6e6bcd941416 | HIGH |
| **NEAR-00029** | Mild_216.png (**Mild**) | Normal_Skin_588.png (**Normal**) | **1** | 4848ccccc99327e3 | 4848cccc899327e3 | HIGH |
| **NEAR-00037** | Mild_80.png (**Mild**) | Severe_79.png (**Severe**) | **1** | 1cb3ab92998b19e5 | 1cf3ab92998b19e5 | HIGH |
| **NEAR-00038** | Mild_92.png (**Mild**) | Severe_77.png (**Severe**) | **2** | 1cd2a92b92979981 | 1cd2a92b93979983 | MODERATE |
| **NEAR-00084** | Normal_Skin_5.png (**Normal**) | Severe_11.png (**Severe**) | **2** | f2b0649206226276 | f2b2649a06226276 | MODERATE |
| **NEAR-00086** | Normal_Skin_510.png (**Normal**) | Severe_11.png (**Severe**) | **2** | f2b0649206226276 | f2b2649a06226276 | MODERATE |

### Detailed Cross-Class Near-Duplicate Candidate Paths:
- **NEAR-00007 (Distance = 0):**
  - Image 1: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Mild_12.png (**Mild**)
  - Image 2: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Normal_Skin_429.png (**Normal**)
- **NEAR-00028 (Distance = 0):**
  - Image 1: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Mild_214.png (**Mild**)
  - Image 2: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Severe_16.png (**Severe**)
- **NEAR-00032 (Distance = 0):**
  - Image 1: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Mild_25.png (**Mild**)
  - Image 2: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Severe_31.png (**Severe**)
- **NEAR-00004 (Distance = 1):**
  - Image 1: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Mild_102.png (**Mild**)
  - Image 2: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Severe_84.png (**Severe**)
- **NEAR-00025 (Distance = 1):**
  - Image 1: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Mild_209.png (**Mild**)
  - Image 2: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Normal_Skin_347.png (**Normal**)
- **NEAR-00029 (Distance = 1):**
  - Image 1: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Mild_216.png (**Mild**)
  - Image 2: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Normal_Skin_588.png (**Normal**)
- **NEAR-00037 (Distance = 1):**
  - Image 1: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Mild_80.png (**Mild**)
  - Image 2: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Severe_79.png (**Severe**)
- **NEAR-00038 (Distance = 2):**
  - Image 1: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Mild_92.png (**Mild**)
  - Image 2: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Severe_77.png (**Severe**)
- **NEAR-00084 (Distance = 2):**
  - Image 1: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Normal_Skin_5.png (**Normal**)
  - Image 2: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Severe_11.png (**Severe**)
- **NEAR-00086 (Distance = 2):**
  - Image 1: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Normal_Skin_510.png (**Normal**)
  - Image 2: C:\Users\Ashutosh Verma\OneDrive\Desktop\VET VISION AI\data\lsd\LumpySkinDisease_DataHub\LumpySkinDisease_DataHub\data-processed\lumpy_unbalanced\lumpy\Severe_11.png (**Severe**)

---

## 4. Same-Class Near-Duplicates (STRUCTURAL CLUSTERS)

These pairs have distinct SHA-256 hashes but share identical or nearly identical perceptual dHash fingerprints within the same clinical severity class.

Total same-class near-duplicate pairs discovered: **105**
- **Normal:** 57 pairs
- **Mild:** 30 pairs
- **Severe:** 18 pairs

| Pair ID | Class | Image 1 | Image 2 | Hamming Dist | dHash 1 | dHash 2 |
|---|---|---|---|---|---|---|
| NEAR-00002 | Mild | Mild_100.png | Mild_228.png | 0 | e7c4d4c5ade7c4cd | e7c4d4c5ade7c4cd |
| NEAR-00006 | Mild | Mild_106.png | Mild_12.png | 0 | 42666779332e2f4d | 42666779332e2f4d |
| NEAR-00008 | Mild | Mild_122.png | Mild_17.png | 0 | 78ab9389ba7173ba | 78ab9389ba7173ba |
| NEAR-00009 | Mild | Mild_123.png | Mild_7.png | 0 | 73767dbb3979692d | 73767dbb3979692d |
| NEAR-00010 | Mild | Mild_15.png | Mild_84.png | 0 | fcbad1d0d3b29334 | fcbad1d0d3b29334 |
| NEAR-00011 | Mild | Mild_156.png | Mild_218.png | 0 | 7d2d61811b49492a | 7d2d61811b49492a |
| NEAR-00012 | Mild | Mild_157.png | Mild_213.png | 0 | 18326064a554564c | 18326064a554564c |
| NEAR-00016 | Mild | Mild_167.png | Mild_222.png | 0 | fbfbecdab3b75b79 | fbfbecdab3b75b79 |
| NEAR-00017 | Mild | Mild_178.png | Mild_208.png | 0 | 7643f2591a227363 | 7643f2591a227363 |
| NEAR-00019 | Mild | Mild_186.png | Mild_224.png | 0 | 7a4d8c98cc3c330b | 7a4d8c98cc3c330b |
| NEAR-00022 | Mild | Mild_191.png | Mild_215.png | 0 | a39b09cd2d0dc4e4 | a39b09cd2d0dc4e4 |
| NEAR-00023 | Mild | Mild_198.png | Mild_212.png | 0 | 93643c34b4d4ca4b | 93643c34b4d4ca4b |
| NEAR-00024 | Mild | Mild_20.png | Mild_71.png | 0 | de5844484fa436b6 | de5844484fa436b6 |
| NEAR-00027 | Mild | Mild_211.png | Mild_43.png | 0 | a3b4ada9b2fcf8ee | a3b4ada9b2fcf8ee |
| NEAR-00033 | Mild | Mild_27.png | Mild_40.png | 0 | a8f333717373baae | a8f333717373baae |
| NEAR-00035 | Mild | Mild_30.png | Mild_97.png | 0 | f37b79f175095666 | f37b79f175095666 |
| NEAR-00041 | Normal | Normal_Skin_105.png | Normal_Skin_304.png | 0 | d8f1b1582c2c1eae | d8f1b1582c2c1eae |
| NEAR-00042 | Normal | Normal_Skin_114.png | Normal_Skin_400.png | 0 | e864c2c9e3e3d9f9 | e864c2c9e3e3d9f9 |
| NEAR-00044 | Normal | Normal_Skin_121.png | Normal_Skin_405.png | 0 | 9a9376c4ccd4445c | 9a9376c4ccd4445c |
| NEAR-00046 | Normal | Normal_Skin_125.png | Normal_Skin_168.png | 0 | a28df8f074e0e8da | a28df8f074e0e8da |
| NEAR-00050 | Normal | Normal_Skin_135.png | Normal_Skin_170.png | 0 | d22ba98c56b388a9 | d22ba98c56b388a9 |
| NEAR-00054 | Normal | Normal_Skin_148.png | Normal_Skin_577.png | 0 | 8ec4f0f99988db48 | 8ec4f0f99988db48 |
| NEAR-00055 | Normal | Normal_Skin_149.png | Normal_Skin_415.png | 0 | f834841616363646 | f834841616363646 |
| NEAR-00057 | Normal | Normal_Skin_154.png | Normal_Skin_91.png | 0 | 72b696ccc9637802 | 72b696ccc9637802 |
| NEAR-00058 | Normal | Normal_Skin_155.png | Normal_Skin_98.png | 0 | 242429b9eb531924 | 242429b9eb531924 |
| NEAR-00060 | Normal | Normal_Skin_157.png | Normal_Skin_656.png | 0 | 8ccdec706ca66cf0 | 8ccdec706ca66cf0 |
| NEAR-00061 | Normal | Normal_Skin_160.png | Normal_Skin_7.png | 0 | a6a3eb9ccd6d6860 | a6a3eb9ccd6d6860 |
| NEAR-00064 | Normal | Normal_Skin_164.png | Normal_Skin_84.png | 0 | d45534a4a62626a6 | d45534a4a62626a6 |
| NEAR-00066 | Normal | Normal_Skin_173.png | Normal_Skin_78.png | 0 | 2e525889a94dcc9a | 2e525889a94dcc9a |
| NEAR-00068 | Normal | Normal_Skin_175.png | Normal_Skin_659.png | 0 | 6665711b5f773506 | 6665711b5f773506 |
| NEAR-00073 | Normal | Normal_Skin_231.png | Normal_Skin_652.png | 0 | cb38698929743434 | cb38698929743434 |
| NEAR-00074 | Normal | Normal_Skin_240.png | Normal_Skin_44.png | 0 | 7cfc756510994145 | 7cfc756510994145 |
| NEAR-00078 | Normal | Normal_Skin_294.png | Normal_Skin_64.png | 0 | a62019392933b7bd | a62019392933b7bd |
| NEAR-00079 | Normal | Normal_Skin_3.png | Normal_Skin_303.png | 0 | f4458595c9693b96 | f4458595c9693b96 |
| NEAR-00082 | Normal | Normal_Skin_473.png | Normal_Skin_57.png | 0 | 0d9e91a1a32708d1 | 0d9e91a1a32708d1 |
| NEAR-00083 | Normal | Normal_Skin_5.png | Normal_Skin_510.png | 0 | f2b0649206226276 | f2b0649206226276 |
| NEAR-00085 | Normal | Normal_Skin_509.png | Normal_Skin_73.png | 0 | a3757033a79193ea | a3757033a79193ea |
| NEAR-00088 | Normal | Normal_Skin_530.png | Normal_Skin_648.png | 0 | cccce97173fb9be4 | cccce97173fb9be4 |
| NEAR-00089 | Normal | Normal_Skin_531.png | Normal_Skin_60.png | 0 | 361c9c9c9e2c34d8 | 361c9c9c9e2c34d8 |
| NEAR-00092 | Normal | Normal_Skin_575.png | Normal_Skin_61.png | 0 | e28a9a1696b42646 | e28a9a1696b42646 |
| NEAR-00093 | Normal | Normal_Skin_590.png | Normal_Skin_66.png | 0 | 327239310715595b | 327239310715595b |
| NEAR-00095 | Normal | Normal_Skin_628.png | Normal_Skin_74.png | 0 | 465127636377350b | 465127636377350b |
| NEAR-00097 | Normal | Normal_Skin_632.png | Normal_Skin_707.png | 0 | dd6b3ae26872fa68 | dd6b3ae26872fa68 |
| NEAR-00099 | Severe | Severe_13.png | Severe_4.png | 0 | eb4b81556f2b1919 | eb4b81556f2b1919 |
| NEAR-00100 | Severe | Severe_14.png | Severe_5.png | 0 | 90b6c6c4c1d1313a | 90b6c6c4c1d1313a |
| NEAR-00102 | Severe | Severe_17.png | Severe_78.png | 0 | dddbc5edc3f576fe | dddbc5edc3f576fe |
| NEAR-00103 | Severe | Severe_18.png | Severe_2.png | 0 | fe9f5e747071980c | fe9f5e747071980c |
| NEAR-00104 | Severe | Severe_19.png | Severe_81.png | 0 | bcb86a60b052e4b4 | bcb86a60b052e4b4 |
| NEAR-00105 | Severe | Severe_20.png | Severe_3.png | 0 | ee7ededfe6123ede | ee7ededfe6123ede |
| NEAR-00107 | Severe | Severe_37.png | Severe_88.png | 0 | 44cc497b135bc2e2 | 44cc497b135bc2e2 |
| NEAR-00110 | Severe | Severe_51.png | Severe_80.png | 0 | f8b8b8f9b9bcee68 | f8b8b8f9b9bcee68 |
| NEAR-00111 | Severe | Severe_6.png | Severe_70.png | 0 | d8fb2e5b4b686b4b | d8fb2e5b4b686b4b |
| NEAR-00112 | Severe | Severe_64.png | Severe_91.png | 0 | 909026246866264d | 909026246866264d |
| NEAR-00113 | Severe | Severe_67.png | Severe_7.png | 0 | 1d9b132ba97bf7be | 1d9b132ba97bf7be |
| NEAR-00001 | Mild | Mild_10.png | Mild_147.png | 1 | a8390e2225bd8d65 | a0390e2225bd8d65 |
| NEAR-00005 | Mild | Mild_105.png | Mild_32.png | 1 | 33d1e1d1d088cc48 | 33d1c1d1d088cc48 |
| NEAR-00015 | Mild | Mild_161.png | Mild_216.png | 1 | 4848cccc899327e3 | 4848ccccc99327e3 |
| NEAR-00018 | Mild | Mild_179.png | Mild_29.png | 1 | 49b92f8b9b8fa92f | 49b92f8b9b8fa927 |
| NEAR-00020 | Mild | Mild_19.png | Mild_57.png | 1 | 8bc53f5c33b96726 | 8bc73f5c33b96726 |
| NEAR-00026 | Mild | Mild_210.png | Mild_68.png | 1 | a42d716b96c4e4e1 | a42d716b96c4e4e0 |
| NEAR-00030 | Mild | Mild_220.png | Mild_76.png | 1 | 8c5fcb9171787364 | 8c5fcb91717873e4 |
| NEAR-00039 | Normal | Normal_Skin_100.png | Normal_Skin_158.png | 1 | 64dad2d0986468f0 | 6cdad2d0986468f0 |
| NEAR-00040 | Normal | Normal_Skin_101.png | Normal_Skin_475.png | 1 | 6d6859d17054e752 | 6c6859d17054e752 |
| NEAR-00043 | Normal | Normal_Skin_118.png | Normal_Skin_178.png | 1 | 66391932735afc37 | 663919327b5afc37 |
| NEAR-00045 | Normal | Normal_Skin_122.png | Normal_Skin_263.png | 1 | 7670c06376163a1a | 6670c06376163a1a |
| NEAR-00047 | Normal | Normal_Skin_127.png | Normal_Skin_166.png | 1 | 7f7d56561e19094d | 7b7d56561e19094d |
| NEAR-00048 | Normal | Normal_Skin_132.png | Normal_Skin_541.png | 1 | e870362b21290101 | e872362b21290101 |
| NEAR-00049 | Normal | Normal_Skin_133.png | Normal_Skin_172.png | 1 | 0c9c1ec6b0121288 | 0c1c1ec6b0121288 |
| NEAR-00051 | Normal | Normal_Skin_138.png | Normal_Skin_626.png | 1 | 0d105812b2a05959 | 0d105812baa05959 |
| NEAR-00053 | Normal | Normal_Skin_143.png | Normal_Skin_159.png | 1 | 598cb6b434140d1a | 5d8cb6b434140d1a |
| NEAR-00059 | Normal | Normal_Skin_156.png | Normal_Skin_30.png | 1 | 69f29617a8bcdde5 | 69f29613a8bcdde5 |
| NEAR-00062 | Normal | Normal_Skin_162.png | Normal_Skin_69.png | 1 | 0f2ce866c6d9a333 | 0f2ce866c699a333 |
| NEAR-00063 | Normal | Normal_Skin_163.png | Normal_Skin_713.png | 1 | 81880e221644fc1c | c1880e221644fc1c |
| NEAR-00065 | Normal | Normal_Skin_171.png | Normal_Skin_54.png | 1 | fb37863a9c8ca868 | fb37861a9c8ca868 |
| NEAR-00069 | Normal | Normal_Skin_176.png | Normal_Skin_79.png | 1 | 06158c9e4ed29613 | 06158c9e4ed09613 |
| NEAR-00072 | Normal | Normal_Skin_221.png | Normal_Skin_89.png | 1 | 344c8cecec642666 | 344c8cec6c642666 |
| NEAR-00077 | Normal | Normal_Skin_27.png | Normal_Skin_598.png | 1 | c887bcc8cc87a3f4 | c807bcc8cc87a3f4 |
| NEAR-00080 | Normal | Normal_Skin_373.png | Normal_Skin_83.png | 1 | fd696b89cb6f249c | bd696b89cb6f249c |
| NEAR-00081 | Normal | Normal_Skin_401.png | Normal_Skin_82.png | 1 | c5961e488acb6951 | c5961e488aeb6951 |
| NEAR-00087 | Normal | Normal_Skin_512.png | Normal_Skin_662.png | 1 | bc2773763eddcd98 | fc2773763eddcd98 |
| NEAR-00094 | Normal | Normal_Skin_621.png | Normal_Skin_685.png | 1 | f1dc7cfcd852d0d4 | f1dc7cfcd850d0d4 |
| NEAR-00096 | Normal | Normal_Skin_630.png | Normal_Skin_698.png | 1 | 31c34bc9c96dcb61 | 31c34bc9c92dcb61 |
| NEAR-00098 | Severe | Severe_1.png | Severe_48.png | 1 | 7363095339971ac6 | 7363095339971bc6 |
| NEAR-00101 | Severe | Severe_15.png | Severe_76.png | 1 | 524098b020212226 | 524298b020212226 |
| NEAR-00106 | Severe | Severe_36.png | Severe_83.png | 1 | 316f746cc13010f5 | 316f746cc13010f7 |
| NEAR-00108 | Severe | Severe_39.png | Severe_85.png | 1 | 377761d543c3cd8d | 377761d543e3cd8d |
| NEAR-00114 | Severe | Severe_72.png | Severe_89.png | 1 | b1237330b29a2b0a | b1237330929a2b0a |
| NEAR-00115 | Severe | Severe_72.png | Severe_90.png | 1 | b1237330b29a2b0a | b1237330929a2b0a |
| NEAR-00003 | Mild | Mild_100.png | Mild_54.png | 2 | e7c4d4c5ade7c4cd | e7c4d0c5ace7c4cd |
| NEAR-00021 | Mild | Mild_190.png | Mild_33.png | 2 | 0c45838c161a3934 | 0c45838c161a3994 |
| NEAR-00031 | Mild | Mild_228.png | Mild_54.png | 2 | e7c4d4c5ade7c4cd | e7c4d0c5ace7c4cd |
| NEAR-00056 | Normal | Normal_Skin_153.png | Normal_Skin_708.png | 2 | ccb2164c46c7c7e9 | 8cb2964c46c7c7e9 |
| NEAR-00067 | Normal | Normal_Skin_174.png | Normal_Skin_715.png | 2 | b3e594584d94248c | b3d594584d94248c |
| NEAR-00071 | Normal | Normal_Skin_207.png | Normal_Skin_87.png | 2 | 616c42cfcbf2f6e0 | 616c42c7cbb2f6e0 |
| NEAR-00075 | Normal | Normal_Skin_249.png | Normal_Skin_90.png | 2 | 2f6b9b63e6dcf0e0 | 0f6bdb63e6dcf0e0 |
| NEAR-00090 | Normal | Normal_Skin_543.png | Normal_Skin_9.png | 2 | 3f9bd0ba9a696d8b | 3f9fd09a9a696d8b |
| NEAR-00091 | Normal | Normal_Skin_565.png | Normal_Skin_712.png | 2 | 4743a6963636b627 | c743a6963636b626 |
| NEAR-00109 | Severe | Severe_43.png | Severe_71.png | 2 | c8e8c0c060108080 | c8e0c0c060100080 |
| NEAR-00034 | Mild | Mild_3.png | Mild_58.png | 3 | 98f0206061d3b304 | 98a0206061d3f304 |
| NEAR-00036 | Mild | Mild_6.png | Mild_96.png | 3 | c9e99811211197bf | c9c91811211397bf |
| NEAR-00070 | Normal | Normal_Skin_202.png | Normal_Skin_340.png | 3 | 0b1b09491b535f59 | 0b9909491bd35f59 |
| NEAR-00013 | Mild | Mild_16.png | Mild_27.png | 4 | a8f133717373bbba | a8f333717373baae |
| NEAR-00014 | Mild | Mild_16.png | Mild_40.png | 4 | a8f133717373bbba | a8f333717373baae |
| NEAR-00052 | Normal | Normal_Skin_142.png | Normal_Skin_505.png | 4 | 00dcd45793838900 | 00b8d45793838d00 |
| NEAR-00076 | Normal | Normal_Skin_267.png | Normal_Skin_59.png | 4 | fb3737646466d6df | ff7337646466dedf |

---

## 5. Recommended Action Plan for Pre-Training

1. **Deduplication Strategy:**
   - Keep one canonical instance per unique SHA-256 hash.
   - Remove redundant intra-class duplicates (Mild_194.png, Severe_89.png).

2. **Quarantine & Disambiguation Strategy:**
   - **Quarantine the 3 cross-class exact duplicate pairs** (Mild_106/Normal_Skin_429, Mild_161/Normal_Skin_588, Mild_56/Normal_Skin_242) from the training set until reviewed by a veterinarian.
   - **Quarantine the 3 distance-0 cross-class near duplicate pairs** (Mild_12/Normal_Skin_429, Mild_214/Severe_16, Mild_25/Severe_31).

3. **Leak-Free Partitioning:**
   - Place all connected perceptual near-duplicate components into the *same* train, validation, or test split using a graph component algorithm (GroupKFold), ensuring zero data leakage.

4. **Transparency Removal:**
   - Standardize the 10 RGBA images by dropping the alpha channel or alpha-blending onto a neutral background.

5. **Dataset Integrity Guarantee:**
   - The original raw dataset remains 100% read-only and preserved in place.
