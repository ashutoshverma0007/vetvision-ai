"""
Statistical metrics calculation for clinical multiclass classification:
- Accuracy
- Per-class Precision, Recall, F1
- Macro & Weighted F1
- Confusion Matrix
"""

from typing import List, Dict, Any
import numpy as np

def compute_confusion_matrix(y_true: List[int], y_pred: List[int], num_classes: int = 3) -> np.ndarray:
    cm = np.zeros((num_classes, num_classes), dtype=int)
    for t, p in zip(y_true, y_pred):
        if 0 <= t < num_classes and 0 <= p < num_classes:
            cm[t, p] += 1
    return cm

def compute_classification_metrics(y_true: List[int], y_pred: List[int], class_names: List[str] = None) -> Dict[str, Any]:
    if class_names is None:
        class_names = ["NORMAL", "MILD", "SEVERE"]
    num_classes = len(class_names)
    
    if len(y_true) == 0:
        return {"error": "Empty dataset provided"}

    cm = compute_confusion_matrix(y_true, y_pred, num_classes)
    total_samples = len(y_true)
    accuracy = float(np.trace(cm) / total_samples) if total_samples > 0 else 0.0

    per_class = {}
    precisions = []
    recalls = []
    f1s = []

    for i, name in enumerate(class_names):
        tp = float(cm[i, i])
        fp = float(np.sum(cm[:, i]) - tp)
        fn = float(np.sum(cm[i, :]) - tp)

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        precisions.append(precision)
        recalls.append(recall)
        f1s.append(f1)

        per_class[name] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "support": int(np.sum(cm[i, :]))
        }

    macro_f1 = float(np.mean(f1s))
    macro_precision = float(np.mean(precisions))
    macro_recall = float(np.mean(recalls))

    return {
        "total_samples": total_samples,
        "accuracy": round(accuracy, 4),
        "macro_precision": round(macro_precision, 4),
        "macro_recall": round(macro_recall, 4),
        "macro_f1": round(macro_f1, 4),
        "per_class": per_class,
        "confusion_matrix": cm.tolist()
    }
