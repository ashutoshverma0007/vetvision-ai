# Efficient and Explainable Deep Learning for Three-Class Lumpy Skin Disease Screening in Cattle Using EfficientNet-B0 and ONNX Runtime

**Ashutosh Verma**, **Sachin Kumar Gupta**, **Harshit Dubey**  
*Department of Computer Science and Engineering, Chandigarh University, Mohali-140413, Punjab, India*  
Contact: `ashu.akv0007@gmail.com`, `sachinkumargupta24.2004@gmail.com`, `Harshitdubey63063@gmail.com`

---

## Abstract

Lumpy Skin Disease (LSD) is a high-consequence viral epizootic impacting cattle health and agricultural economies worldwide. Rapid field-level screening is vital to mitigate outbreaks, yet existing automated visual approaches are frequently constrained by binary formulations that fail to differentiate lesion progression, high computational latency on edge hardware, lack of visual interpretability, and methodological vulnerabilities such as data leakage. 

This paper presents **VetVision AI**, an efficient, explainable, three-class deep learning screening framework designed to classify cattle skin photographs into **Normal Skin**, **Mild Lumpy Skin**, and **Severe Lumpy Skin**. Following a forensic data curation audit that eliminated 25 duplicate and conflicting label instances, a leakage-resistant dataset of 994 images was partitioned into 696 training, 150 validation, and 148 held-out test samples using group-aware perceptual hashing. We evaluated transfer learning architectures under class-weighted loss formulations to address severe class imbalance. 

On the held-out test set ($N = 148$), our selected **EfficientNet-B0** model achieved **90.54% overall accuracy** (134/148), **83.35% macro-averaged F1-score**, **90.38% weighted F1-score**, and **91.51% macro ROC-AUC**. Crucially, the model achieved **zero false negatives from Severe to Normal**, ensuring critical cases receive veterinary attention. To enable resource-constrained rural deployment, the trained network was exported to ONNX Runtime, reducing median single-image CPU inference latency from 25.75 ms to **6.79 ms** (a **73.88% latency reduction**; 146.61 FPS throughput) with 100% prediction concordance. Visual transparency is provided via authentic **Grad-CAM** saliency maps generated from the final convolutional block. 

While these findings demonstrate viable CPU-based veterinary triage, the small size of the Severe test cohort ($N = 12$) and reliance on retrospective single-source images require that VetVision AI be utilized strictly as a preliminary screening decision-support aid, not a definitive veterinary diagnosis.

**Index Terms** — Lumpy skin disease, three-class screening, EfficientNet-B0, ONNX Runtime, explainable artificial intelligence, Grad-CAM, CPU inference acceleration, veterinary informatics.

---

## I. Introduction

### A. Background and Epidemiological Context
Lumpy Skin Disease (LSD) is an economically devastating, vector-borne poxvirus infection of cattle caused by the *Capripoxvirus* genus. Characterized by fever, emaciation, enlarged lymph nodes, and eruption of firm, circumscribed cuticular nodules, LSD induces profound economic losses through plummeting milk yields, permanent hide damage, secondary bacterial infections, and trade restrictions [1], [2]. The unprecedented resurgence of LSD across South Asia and India has underscored the urgency for accessible, rapid, and accurate preliminary detection tools [1]. Standard confirmatory diagnosis requires specialized veterinary clinical examination and laboratory molecular diagnostics (e.g., real-time PCR) [2], which remain largely inaccessible in remote, resource-constrained smallholder pastoral settings.

### B. Motivation: Moving Beyond Binary Classification
Recent advances in computer vision have applied deep convolutional neural networks (CNNs) to photographic screening of cattle skin lesions [3]–[5]. However, the vast majority of prior works treat LSD detection as a monolithic **binary classification task** (Healthy vs. Diseased). In practical veterinary practice, binary labels offer insufficient clinical utility:
1. **Clinical Triage:** Early "Mild" localized nodules require prompt supportive therapy, ring vaccination, and vector control to prevent herd transmission, whereas generalized "Severe" ulcerated lesions require strict quarantine and emergency antibiotic intervention for secondary myiasis.
2. **Resource Allocation:** In resource-limited pastoral settings, field veterinarians must triage animal treatment based on visual presentation severity rather than binary flags.
3. **Diagnostic Specificity:** Binary classifiers frequently conflate mild dermatological lesions with insect bites or ringworm, generating false positives that undermine farmer compliance.

Consequently, developing a **three-class image-based screening model** (distinguishing *Normal Skin*, *Mild Lumpy Skin*, and *Severe Lumpy Skin*) represents a substantial practical step forward, provided the system balances accuracy, computational overhead, and explainability.

### C. Problem Statement and Integrity Considerations
Despite promising reported accuracies in veterinary computer vision literature (often exceeding 95%), many published benchmarks suffer from systemic methodological pitfalls:
1. **Data Leakage and Duplicate Bias:** Public agricultural datasets frequently contain exact duplicates, near-duplicate burst captures, and identical cattle photographed from multiple angles. Splitting datasets without cryptographic and perceptual hashing causes identical samples to cross into test sets, artificially inflating test metrics [14], [18].
2. **Mathematical and Reporting Errors:** Imbalanced classification studies frequently miscalculate or report impossible metrics (such as reporting low micro-F1 alongside high accuracy in single-label tasks, where mathematically $F1_{\mu} \equiv \text{Accuracy}$) [16], [17].
3. **Unverified Explainability:** Multiple works claim "Explainable AI" without providing verifiable gradient hooks, reproducible code, or provenance tracking [12], [20].
4. **Computational Inefficiency:** Complex Vision Transformers or heavy ensembles cannot run on rural field hardware lacking dedicated GPU acceleration [10], [15].

### D. Objective and Scope
This work introduces **VetVision AI**, addressing these gaps through an auditable, reproducible engineering pipeline:
1. **Three-Class Formulation:** Screening cattle skin images into *Normal*, *Mild*, and *Severe* categories.
2. **Leakage-Resistant Data Curation:** Audit of 1,019 raw cattle skin images, excluding 25 conflict/duplicate cases, and partitioning 994 usable images with perceptual hashing into 696 Train, 150 Validation, and 148 Test splits.
3. **Class-Weighted Transfer Learning:** Benchmarking EfficientNet-B0 and MobileNetV3-Large under inverse-frequency weighting to protect minority Severe cases.
4. **Authentic Explainability:** Implementing a standalone, reproducible Grad-CAM utility that hooks directly into the trained model's final convolutional layer (`features[-1]`).
5. **CPU Inference Acceleration:** Exporting to ONNX Runtime with zero-copy CPU optimization to enable real-time field deployment.

**Scope and Limitation Notice:** VetVision AI is explicitly engineered as a preliminary screening decision-support tool. It does not establish definitive histological diagnosis or disease staging, which remain the sole purview of licensed veterinary professionals.

---

## II. Literature Review

Automated image-based detection of animal diseases has grown rapidly with deep learning architectures. Gupta et al. reviewed the clinical emergence of LSD in India, emphasizing the critical importance of early visual detection coupled with laboratory surveillance [1]. Manjunathareddy et al. conducted extensive molecular and pathological analyses during high-mortality outbreaks, demonstrating that clinical manifestation varies widely from mild localized nodules to severe systemic necrosis [2].

In computer vision applications, Senthilkumar et al. compared pretrained CNN architectures (including ResNet, MobileNetV2, and VGG), observing that MobileNetV2 attained reliable screening performance for mobile deployments [3]. Pal et al. explored CNN and transformer architectures for LSD classification, noting strong representational capacity but highlighting the risk of overfitting on small cohorts [4]. Ullah et al. introduced a mobile application integrating vision transformers that claimed 98.12% accuracy on 8,000 images [5]. However, cross-study comparisons remain problematic due to wide discrepancies in dataset curation, unaddressed duplicate images, lack of external validation, and varying evaluation protocols.

The foundational architectures powering these systems rely on hierarchical representation learning. AlexNet established deep CNNs for visual categorization [6], and He et al. introduced residual connections to train deep networks without degradation [7]. Tan and Le developed EfficientNet, demonstrating that compound scaling of network depth, width, and resolution optimizes the accuracy–latency Pareto frontier [8]. Howard et al. introduced MobileNetV3, using hardware-aware neural architecture search and depthwise separable convolutions to maximize mobile CPU efficiency [9]. While Vision Transformers offer global attention mechanisms [10], their compute and memory footprints remain prohibitive for resource-constrained veterinary field deployments [15].

In medical and veterinary image analysis, transfer learning is essential due to limited labeled samples, but it is vulnerable to distribution shifts and dataset artifacts [11], [14]. Zech et al. demonstrated that medical classifiers frequently learn institutional confounding features rather than disease pathology [14]. Selvaraju et al. introduced Grad-CAM, enabling visual localization of predictive features through gradient backpropagation into the final convolutional layers [12]. However, as Ghassemi et al. cautioned, visual saliency maps must be interpreted with restraint, as heatmaps do not establish biological validity or clinical proof [20]. Furthermore, guidelines such as CLAIM (Checklist for Artificial Intelligence in Medical Imaging) [16] and TRIPOD+AI [17] mandate transparent reporting of sample sizes, class distributions, calibration, and reproducible evaluation splits [18], [19].

---

## III. Proposed Methodology

### A. System Architecture
The VetVision AI architecture operates across four systematic stages:
1. **Input Preprocessing:** Normalization and tensor formatting of photographic cattle skin inputs.
2. **Feature Extraction:** Pretrained EfficientNet-B0 backbone extracting 1,280-dimensional visual feature vectors.
3. **Dual-Head Output:**
   - **Inference Branch:** Adapted linear classification head ($1280 \to 3$) producing softmax probabilities for *Normal*, *Mild*, and *Severe*.
   - **Explainability Branch:** Grad-CAM engine computing gradient-weighted feature activations to generate native-resolution attention heatmaps.
4. **ONNX Runtime Optimization:** High-efficiency CPU execution engine for low-latency field screening.

```
+------------------------------------------------------------------------------------------------+
|                                    VETVISION AI PIPELINE                                       |
+------------------------------------------------------------------------------------------------+
|                                                                                                |
|  [ Cattle Skin Photo ] ---> [ Preprocessing ] ---> [ EfficientNet-B0 ] ---> [ Classifier Head ]|
|      (256x256 RGB)          - Resize 224x224           Backbone              Linear 1280 -> 3  |
|                             - ImageNet Norm          Stages 0 - 8            Softmax Output    |
|                                                     (1280 Channels)                 |          |
|                                                            |                        v          |
|                                                            v                +---------------+  |
|                                                    [ Grad-CAM Hook ]        | Normal  (p0)  |  |
|                                                     features[-1]            | Mild    (p1)  |  |
|                                                            |                | Severe  (p2)  |  |
|                                                            v                +---------------+  |
|                                                    [ Saliency Heatmap ]             |          |
|                                                    Jet Overlay (256x256)            v          |
|                                                            |               [ Triage Decision ] |
|                                                            v               (Threshold >= 0.65) |
|                                                    [ Screen Review ]                           |
+------------------------------------------------------------------------------------------------+
```

### B. Dataset Curation, Deduplication, and Partitioning
The raw dataset comprised 1,019 images sourced from the Lumpy Skin Disease DataHub repository. Prior to model training, a forensic data integrity audit was conducted:
1. **Exclusion of Conflicts:** 25 images were identified and removed due to data contamination:
   - 17 cross-class near-duplicate label conflicts (identical cattle patches labeled as different severity classes).
   - 6 cross-class exact duplicate conflicts (identical SHA-256 hashes with conflicting class labels).
   - 2 same-class exact redundant duplicates.
2. **Curated Usable Dataset:** The remaining **994 verified images** comprised:
   - **Normal Skin:** 691 images (69.52%)
   - **Mild Lumpy Skin:** 219 images (22.03%)
   - **Severe Lumpy Skin:** 84 images (8.45%)
3. **Leakage-Resistant Partitioning:** Using perceptual difference hashing (dHash) with a Hamming distance threshold $\le 10$, all 97 near-duplicate clusters (comprising 196 images) were strictly partitioned as atomic units into designated splits to prevent cross-split data leakage.
4. **Split Distribution:**
   - **Training Set:** 696 images (484 Normal, 153 Mild, 59 Severe) — 70.02%
   - **Validation Set:** 150 images (104 Normal, 33 Mild, 13 Severe) — 15.09%
   - **Held-Out Test Set:** 148 images (103 Normal, 33 Mild, 12 Severe) — 14.89%

Zero SHA-256 or perceptual hash overlap exists across any split.

### C. Preprocessing Pipeline
All images undergo deterministic preprocessing matching both PyTorch training and ONNX deployment:
1. Conversion of all non-RGB formats to 3-channel RGB.
2. Bilinear spatial interpolation resizing to $224 \times 224$ pixels.
3. Pixel scaling to floating-point range $[0.0, 1.0]$.
4. Channel-wise standardization using ImageNet statistics:
   $$\mu = [0.485, 0.456, 0.406], \quad \sigma = [0.229, 0.224, 0.225]$$
   $$x_{\text{norm}} = \frac{x - \mu}{\sigma}$$
5. Transposition from HWC to CHW tensor layout of shape `(1, 3, 224, 224)`.

### D. Model Training and Imbalance Mitigation
To mitigate the severe class imbalance (8.45% Severe vs. 69.52% Normal), we implemented inverse-frequency class-weighted cross-entropy loss:
$$w_c = \frac{N_{\text{train}}}{K \cdot N_c}$$
Where $N_{\text{train}} = 696$, $K = 3$ classes, yielding weights:
$$w_{\text{Normal}} = 0.4793, \quad w_{\text{Mild}} = 1.5163, \quad w_{\text{Severe}} = 3.9322$$

Training followed a two-phase fine-tuning regimen:
- **Phase 1 (Classification Head Only):** EfficientNet-B0 backbone frozen; AdamW optimizer ($\text{lr} = 1 \times 10^{-4}$, weight decay $1 \times 10^{-4}$); batch size 32.
- **Phase 2 (Upper Backbone Fine-Tuning):** Stages 6 through 8 unfrozen ($\text{lr} = 2 \times 10^{-5}$); ReduceLROnPlateau scheduler (factor 0.5, patience 3); early stopping with patience of 8 epochs keyed strictly to Validation Macro-F1.
- **Model Selection:** The optimal checkpoint was attained at Epoch 51 with a Validation Macro-F1 of **87.67%** (Validation Accuracy: 90.00%, Severe Recall: 92.31%).

### E. Grad-CAM Explainability Implementation
To provide visual transparency, we developed a reproducible Grad-CAM utility (`services/ai/research/explainability.py`) directly integrated with the trained PyTorch checkpoint. The mathematical operation follows Selvaraju et al. [12]:
1. Forward pass extracts activation maps $A \in \mathbb{R}^{C \times H \times W}$ from `model.features[-1]` (1,280 channels, $7 \times 7$ grid).
2. Backward pass calculates gradients $\frac{\partial Y^c}{\partial A^k}$ with respect to target class $c$.
3. Channel importance weights are computed via global average pooling:
   $$\alpha_k^c = \frac{1}{H \cdot W} \sum_{i=1}^H \sum_{j=1}^W \frac{\partial Y^c}{\partial A_{i,j}^k}$$
4. Saliency map is generated by rectifying linear combinations of feature activations:
   $$L_{\text{Grad-CAM}}^c = \text{ReLU}\left(\sum_k \alpha_k^c A^k\right)$$
5. The map is min-max normalized to $[0, 1]$, bilinearly upsampled to the native input image resolution ($256 \times 256$), mapped to the Jet false-color colormap, and blended with the original photo at $\alpha = 0.5$.

---

## IV. Experimental Results and Discussion

### A. Three-Class Screening Performance
The selected EfficientNet-B0 model was evaluated once on the strictly quarantined held-out test set ($N = 148$). The verified results are presented in Table I alongside baseline experiments.

#### Table I: Experimental Model Comparison on Quarantined Test Set ($N = 148$)

| Experiment Configuration | Architecture | Loss Formulation | Test Accuracy | Macro-F1 | Weighted-F1 | Macro ROC-AUC | Severe Recall | Severe Missed as Normal |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Exp 1: Baseline** | MobileNetV3-Large | Linear Weights | 87.16% | 76.49% | 86.82% | 88.42% | 66.67% | 0 |
| **Exp 2: Sqrt + Smooth** | MobileNetV3-Large | Sqrt Weights + $\alpha=0.05$ | 87.84% | 75.85% | 86.95% | 88.10% | 58.33% | 0 |
| **Exp 3: Selected Model** | **EfficientNet-B0** | **Linear Weights** | **90.54%** | **83.35%** | **90.38%** | **91.51%** | **75.00%** | **0** |
| **Exp 4: Ablation** | EfficientNet-B0 | Sqrt Weights + $\alpha=0.05$ | Quarantined* | 85.62% (Val) | 88.94% (Val) | 94.21% (Val) | 92.31% (Val) | **1 (Critical Flaw)** |
| **Exp 5: Test-Time Aug.** | EfficientNet-B0 | 2-View / 3-View TTA | Quarantined* | 84.25% (Val) | 87.50% (Val) | 93.80% (Val) | 92.31% (Val) | 0 |

*\*Note: Experiments 4 and 5 were rejected during validation and never evaluated on the test set to maintain test-set quarantine integrity.*

#### Analysis of Experiment 3 Results:
- **Test Set Accuracy:** **90.54%** (134 out of 148 samples correctly identified).
- **Macro-Averaged F1-Score:** **83.35%** (Macro Precision: 84.22%, Macro Recall: 82.61%).
- **Weighted F1-Score:** **90.38%** (Weighted Precision: 90.32%, Weighted Recall: 90.54%).
- **Area Under the ROC Curve:** Macro One-vs-Rest ROC-AUC is **91.51%** (Weighted ROC-AUC: 93.42%).
- **Correction Regarding Micro-F1:** The preliminary draft erroneously listed a micro-F1 of 33.75%. In single-label multi-class classification, micro-averaged F1 is mathematically identical to overall accuracy ($F1_{\text{micro}} \equiv \text{Accuracy} = 90.54\%$). We report the verified metric accordingly.

### B. Class-Specific Breakdown and Confusion Matrix
The class-level performance on the test set demonstrates robust discriminative capability across all categories:

#### Table II: Class-Specific Test Performance (Experiment 3, $N = 148$)

| Disease Screening Class | Test Support ($N$) | Precision | Recall (Sensitivity) | F1-Score | Specificity |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Normal Skin** | 103 | 94.34% | 97.09% (100/103) | 95.69% | 86.67% |
| **Mild Lumpy Skin** | 33 | 83.33% | 75.76% (25/33) | 79.37% | 95.65% |
| **Severe Lumpy Skin** | 12 | 75.00% | 75.00% (9/12) | 75.00% | 97.79% |
| **Macro Average** | **148** | **84.22%** | **82.61%** | **83.35%** | **93.37%** |
| **Weighted Average** | **148** | **90.32%** | **90.54%** | **90.38%** | **89.58%** |

#### Three-Class Confusion Matrix:
$$\mathbf{C} = \begin{pmatrix} 100 & 2 & 1 \\ 6 & 25 & 2 \\ 0 & 3 & 9 \end{pmatrix}$$
- **Normal Class (Row 0, $N=103$):** 100 classified correctly as Normal, 2 predicted as Mild, 1 predicted as Severe.
- **Mild Class (Row 1, $N=33$):** 25 classified correctly as Mild, 6 misclassified as Normal, 2 predicted as Severe.
- **Severe Class (Row 2, $N=12$):** 9 classified correctly as Severe, 3 classified as Mild, and **0 misclassified as Normal**.

**Clinical Safety Significance:** In veterinary epidemiology, a false negative that classifies a Severe animal as Normal represents a catastrophic failure mode, as an untreated, severely infected animal remains within the general herd. VetVision AI achieved **zero Severe-to-Normal misclassifications**, with all three misclassified Severe animals placed into the Mild category, which still triggers isolation and clinical review.

### C. CPU Inference Efficiency and ONNX Acceleration
To evaluate operational feasibility in rural field clinics lacking GPU hardware, benchmark tests were conducted comparing native PyTorch eager execution against ONNX Runtime on a single CPU thread (Intel Core i5-12500H, Windows 11, 100 benchmark iterations, 20 warmup iterations).

#### Table III: CPU Inference Benchmark and ONNX Acceleration

| Metric | PyTorch Eager (Float32) | ONNX Runtime (CPU) | Improvement |
| :--- | :---: | :---: | :---: |
| **Median Latency (P50)** | 25.75 ms | **6.79 ms** | **-73.63% (-18.96 ms)** |
| **Mean Latency** | 26.11 ms | **6.82 ms** | **-73.88% (-19.29 ms)** |
| **95th Percentile (P95)** | 31.67 ms | **7.61 ms** | **-75.97% (-24.06 ms)** |
| **Throughput (FPS)** | 38.30 images/s | **146.61 images/s** | **+282.8% (3.83x)** |
| **Model Disk Size** | 39.76 MiB | **15.29 MiB** | **-61.54% (-24.47 MiB)** |
| **Max Absolute Logit Diff** | Reference | $7.23 \times 10^{-5}$ | Numerically Equivalent |
| **Class Prediction Agreement** | Reference | **100.0% (50/50)** | Perfect Concordance |

ONNX Runtime optimization achieves a sub-7 millisecond inference latency on standard CPU hardware, enabling instantaneous screening feedback even on low-cost field laptops or mobile devices.

### D. Visual Explainability via Grad-CAM
Figure 1 illustrates authentic Grad-CAM saliency overlays generated by `services/ai/research/explainability.py` across representative validation samples:
1. **Normal Skin:** Heatmaps show diffuse, low-intensity background activations without concentrated focus, consistent with the absence of nodular lesions.
2. **Mild Lumpy Skin:** Strong focal gradients cluster directly over early, isolated circular cuticular nodules, confirming that the model attends to authentic pathological features rather than image backgrounds or cattle tags.
3. **Severe Lumpy Skin:** High-intensity activation zones encompass widespread, coalescing necrotic plaques and ulcerated lesions across the dermis.

---

## V. Limitations and Ethical Considerations

In accordance with CLAIM [16] and TRIPOD+AI [17] clinical reporting standards, we explicitly delineate the following scientific and operational limitations:

1. **Small Dataset and Severe Cohort Scarcity:** While 994 curated images represent a substantial improvement over small ad-hoc sets, the Severe class contains only 12 test examples. Although the 75% recall (9/12) is encouraging, the statistical confidence interval for this minority class remains broad.
2. **Prior Test Set Exposure:** Because early exploratory experiments evaluated baseline models on the same split partition, this test set cannot be described as a pristine, untouched prospective holdout. Future clinical trials must evaluate completely independent, newly collected cohorts.
3. **Lack of Farm-Level and Geographic Independence:** All images originate from public online agricultural archives. Independence at the animal, breed, and farm level cannot be guaranteed. Confounding factors such as ambient lighting, coat color, and mud splatters may affect performance in diverse field environments.
4. **Epistemic Limits of Grad-CAM:** While Grad-CAM provides valuable visual localization, gradient heatmaps represent mathematical correlations of network activations; they do not constitute histological or biological proof of disease causality [20].
5. **Screening Support vs. Veterinary Diagnosis:** VetVision AI is explicitly not a diagnostic tool. In clinical practice, any animal flagged as Mild or Severe must undergo confirmatory veterinary examination and PCR testing before therapeutic or quarantine decisions are finalized.

---

## VI. Conclusion and Future Work

This study introduced **VetVision AI**, aligning deep learning research with the practical realities of veterinary triage for Lumpy Skin Disease in cattle. By transitioning from a simplistic binary model to an audited, three-class screening framework (*Normal*, *Mild*, *Severe*), VetVision AI achieved **90.54% test accuracy**, **83.35% macro-F1**, and **zero Severe-to-Normal false negatives** on a held-out test set of 148 images. Deployment via ONNX Runtime accelerated CPU inference by **73.88%** to **6.79 ms per image** (146.61 FPS), while authentic Grad-CAM heatmaps provided verifiable visual explanations of predictive attention.

### Future Work
Future investigations will focus on:
1. **Prospective Multicenter Field Trials:** Collecting prospective photographic cohorts across diverse cattle breeds and lighting conditions with animal-level tracking.
2. **Mobile and Edge Quantization:** Evaluating INT8 quantization and TensorRT execution on embedded agricultural edge devices (e.g., Raspberry Pi 5, NVIDIA Jetson).
3. **Differential Cutaneous Diagnosis:** Expanding the classification head to distinguish LSD from clinical lookalikes such as pseudo-lumpy skin disease (bovine herpesvirus 2), dermatophilosis, and ringworm.
4. **Uncertainty Calibration:** Integrating temperature scaling and conformal prediction to allow the model to abstain with a formal "Requires Clinical Review" flag when prediction uncertainty exceeds calibrated bounds.

---

## References

[1] T. Gupta, V. Patial, D. Bali, S. Angaria, M. Sharma, and R. Chahota, "A review: Lumpy skin disease and its emergence in India," *Veterinary Research Communications*, vol. 44, nos. 3–4, pp. 111–118, 2020.  
[2] G. B. Manjunathareddy et al., "Pathological, immunological and molecular epidemiological analysis of lumpy skin disease virus in Indian cattle during a high-mortality epidemic," *Veterinary Quarterly*, vol. 44, no. 1, pp. 1–22, 2024.  
[3] C. Senthilkumar, C. Sindhu, G. Vadivu, and S. Neethirajan, "Early detection of lumpy skin disease in cattle using deep learning—A comparative analysis of pretrained models," *Veterinary Sciences*, vol. 11, no. 10, Art. no. 510, 2024.  
[4] M. Pal et al., "Implementation of a deep learning system for detection and classification of lumpy skin disease in cattle: Enhancing precision and efficiency in veterinary diagnostics," *Veterinary Medicine and Science*, vol. 11, no. 6, Art. no. e70664, 2025.  
[5] A. Ullah et al., "A vision transformer model-integrated mobile application for early and accurate detection of lumpy skin disease in cattle," *Scientific Reports*, vol. 16, Art. no. 683, 2026.  
[6] A. Krizhevsky, I. Sutskever, and G. E. Hinton, "ImageNet classification with deep convolutional neural networks," in *Advances in Neural Information Processing Systems (NeurIPS)*, vol. 25, pp. 1097–1105, 2012.  
[7] K. He, X. Zhang, S. Ren, and J. Sun, "Deep residual learning for image recognition," in *Proc. IEEE Conf. Computer Vision and Pattern Recognition (CVPR)*, 2016, pp. 770–778.  
[8] M. Tan and Q. V. Le, "EfficientNet: Rethinking model scaling for convolutional neural networks," in *Proc. 36th Int. Conf. Machine Learning (ICML)*, PMLR, vol. 97, pp. 6105–6114, 2019.  
[9] A. Howard et al., "Searching for MobileNetV3," in *Proc. IEEE/CVF Int. Conf. Computer Vision (ICCV)*, 2019, pp. 1314–1324.  
[10] A. Dosovitskiy et al., "An image is worth 16x16 words: Transformers for image recognition at scale," in *Proc. Int. Conf. Learning Representations (ICLR)*, 2021.  
[11] G. Litjens et al., "A survey on deep learning in medical image analysis," *Medical Image Analysis*, vol. 42, pp. 60–88, 2017.  
[12] R. R. Selvaraju et al., "Grad-CAM: Visual explanations from deep networks via gradient-based localization," in *Proc. IEEE Int. Conf. Computer Vision (ICCV)*, 2017, pp. 618–626.  
[13] S. P. Mohanty, D. P. Hughes, and M. Salathé, "Using deep learning for image-based plant disease detection," *Frontiers in Plant Science*, vol. 7, Art. no. 1419, 2016.  
[14] J. R. Zech, M. A. Badgeley, M. Liu, A. B. Costa, J. J. Titano, and E. K. Oermann, "Variable generalization performance of a deep learning model to detect pneumonia in chest radiographs: A cross-sectional study," *PLOS Medicine*, vol. 15, no. 11, Art. no. e1002683, 2018.  
[15] C. J. Kelly, A. Karthikesalingam, M. Suleyman, G. Corrado, and D. King, "Key challenges for delivering clinical impact with artificial intelligence," *BMC Medicine*, vol. 17, Art. no. 195, 2019.  
[16] J. Mongan, L. Moy, and C. E. Kahn, Jr., "Checklist for artificial intelligence in medical imaging (CLAIM): A guide for authors and reviewers," *Radiology: Artificial Intelligence*, vol. 2, no. 2, Art. no. e200029, 2020.  
[17] G. S. Collins et al., "TRIPOD+AI statement: Updated guidance for reporting clinical prediction models that use regression or machine learning methods," *BMJ*, vol. 385, Art. no. e078378, 2024.  
[18] S. Kapoor and A. Narayanan, "Leakage and the reproducibility crisis in machine-learning-based science," *Patterns*, vol. 4, no. 9, Art. no. 100804, 2023.  
[19] B. Van Calster et al., "Calibration: The Achilles heel of predictive analytics," *BMC Medicine*, vol. 17, Art. no. 230, 2019.  
[20] S. Ghassemi, L. Oakden-Rayner, and A. L. Beam, "The false hope of current approaches to explainable artificial intelligence in health care," *The Lancet Digital Health*, vol. 3, no. 11, pp. e745–e750, 2021.
