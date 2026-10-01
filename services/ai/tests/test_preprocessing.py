import numpy as np
from PIL import Image
from app.preprocessing.pipeline import PreprocessingPipeline

def test_preprocessing_output_shape_and_dtype():
    pipeline = PreprocessingPipeline(target_width=224, target_height=224)
    img = Image.new("RGB", (640, 480), color=(128, 64, 32))
    tensor = pipeline.preprocess_pil_image(img)

    assert isinstance(tensor, np.ndarray)
    assert tensor.dtype == np.float32
    assert tensor.shape == (1, 3, 224, 224)

def test_preprocessing_handles_rgba():
    pipeline = PreprocessingPipeline(target_width=224, target_height=224)
    img = Image.new("RGBA", (300, 300), color=(255, 0, 0, 128))
    tensor = pipeline.preprocess_pil_image(img)

    assert tensor.shape == (1, 3, 224, 224)
