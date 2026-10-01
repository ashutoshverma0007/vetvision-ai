from app.models.pytorch_adapter import PyTorchAdapter
from app.models.onnx_adapter import ONNXAdapter

def test_pytorch_adapter_reports_unavailable_when_weights_missing():
    adapter = PyTorchAdapter()
    loaded = adapter.load("non_existent_weights.pt")
    assert loaded is False
    assert adapter.is_available() is False

def test_onnx_adapter_reports_unavailable_when_weights_missing():
    adapter = ONNXAdapter()
    loaded = adapter.load("non_existent_model.onnx")
    assert loaded is False
    assert adapter.is_available() is False
