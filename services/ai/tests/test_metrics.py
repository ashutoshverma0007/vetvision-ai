from evaluation.metrics import compute_classification_metrics, compute_confusion_matrix

def test_metrics_calculation_perfect_accuracy():
    y_true = [0, 1, 2, 0, 1, 2]
    y_pred = [0, 1, 2, 0, 1, 2]
    metrics = compute_classification_metrics(y_true, y_pred)

    assert metrics["accuracy"] == 1.0
    assert metrics["macro_f1"] == 1.0
    assert metrics["per_class"]["NORMAL"]["f1_score"] == 1.0
    assert metrics["per_class"]["MILD"]["f1_score"] == 1.0
    assert metrics["per_class"]["SEVERE"]["f1_score"] == 1.0

def test_confusion_matrix_dimensions():
    y_true = [0, 1, 2]
    y_pred = [0, 2, 1]
    cm = compute_confusion_matrix(y_true, y_pred, num_classes=3)

    assert cm.shape == (3, 3)
    assert cm[0, 0] == 1  # 0 predicted as 0
    assert cm[1, 2] == 1  # 1 predicted as 2
    assert cm[2, 1] == 1  # 2 predicted as 1
