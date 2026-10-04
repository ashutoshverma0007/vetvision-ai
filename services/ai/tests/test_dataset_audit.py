"""
Unit tests for the reproducible dataset audit pipeline.
"""

import tempfile
from pathlib import Path
from PIL import Image

from services.ai.research.dataset_audit import (
    determine_class_from_filename,
    compute_sha256,
    compute_dhash,
    audit_dataset,
)


def test_determine_class_from_filename():
    assert determine_class_from_filename("Normal001.png") == "Normal"
    assert determine_class_from_filename("normal_cow_123.jpg") == "Normal"
    assert determine_class_from_filename("Mild543.png") == "Mild"
    assert determine_class_from_filename("mild_lesion.jpeg") == "Mild"
    assert determine_class_from_filename("Severe999.png") == "Severe"
    assert determine_class_from_filename("severe_lsd.webp") == "Severe"
    assert determine_class_from_filename("random_image.png") == "Unknown"


def test_compute_sha256_and_dhash():
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir) / "test.png"
        img = Image.new("RGB", (64, 64), color=(200, 100, 50))
        img.save(tmp_path)

        sha = compute_sha256(tmp_path)
        assert len(sha) == 64

        dhash_int, dhash_hex = compute_dhash(img)
        assert isinstance(dhash_int, int)
        assert len(dhash_hex) == 16


def test_audit_dataset_pipeline():
    with tempfile.TemporaryDirectory() as tmp_data_dir, tempfile.TemporaryDirectory() as tmp_out_dir:
        data_p = Path(tmp_data_dir)
        out_p = Path(tmp_out_dir)

        # Create 3 images: 1 Normal, 1 Mild, 1 Severe (which is an exact duplicate of Mild)
        img1 = Image.new("RGB", (256, 256), color=(255, 0, 0))
        img1.save(data_p / "Normal001.png")

        img2 = Image.new("RGB", (256, 256), color=(0, 255, 0))
        img2.save(data_p / "Mild001.png")

        # Duplicate of img2 with Severe name -> cross-class duplicate!
        img2.save(data_p / "Severe001.png")

        result = audit_dataset(data_p, out_p, near_dupe_threshold=4, verbose=False)

        assert result["audit_metadata"]["total_files_discovered"] == 3
        assert result["audit_metadata"]["valid_images_count"] == 3
        assert result["audit_metadata"]["corrupted_images_count"] == 0
        assert result["class_distribution"]["counts"]["Normal"] == 1
        assert result["class_distribution"]["counts"]["Mild"] == 1
        assert result["class_distribution"]["counts"]["Severe"] == 1
        assert result["duplicate_and_integrity_profile"]["exact_duplicate_groups_count"] == 1
        assert result["duplicate_and_integrity_profile"]["cross_class_exact_duplicate_groups_count"] == 1

        # Check all report files were generated
        assert (out_p / "dataset_audit.json").exists()
        assert (out_p / "image_inventory.csv").exists()
        assert (out_p / "duplicate_report.csv").exists()
        assert (out_p / "near_duplicate_report.csv").exists()
        assert (out_p / "class_distribution.png").exists()
