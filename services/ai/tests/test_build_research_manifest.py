"""
Unit tests for the research dataset manifest builder and leakage control pipeline.
"""

import tempfile
import csv
from pathlib import Path
from services.ai.research.build_research_manifest import (
    build_near_duplicate_components,
    build_research_manifest,
)


def test_build_near_duplicate_components():
    near_pairs = [
        {'image_1': 'Mild_1.png', 'image_2': 'Mild_2.png'},
        {'image_1': 'Mild_2.png', 'image_2': 'Mild_3.png'},
        {'image_1': 'Normal_1.png', 'image_2': 'Severe_1.png'},  # Cross-class!
    ]
    img_to_class = {
        'Mild_1.png': 'Mild',
        'Mild_2.png': 'Mild',
        'Mild_3.png': 'Mild',
        'Normal_1.png': 'Normal',
        'Severe_1.png': 'Severe',
    }

    comps, img_to_comp, cross_images = build_near_duplicate_components(near_pairs, img_to_class)

    assert len(comps) == 2
    # One is same-class Mild with 3 images
    same_comp = next(c for c in comps if c['component_type'] == 'SAME_CLASS')
    assert same_comp['image_count'] == 3
    assert same_comp['class_or_classes'] == 'Mild'

    # One is cross-class conflict with 2 images
    conflict_comp = next(c for c in comps if c['component_type'] == 'CROSS_CLASS_CONFLICT')
    assert conflict_comp['image_count'] == 2
    assert set(conflict_comp['class_or_classes'].split(';')) == {'Normal', 'Severe'}

    assert cross_images == {'Normal_1.png', 'Severe_1.png'}


def test_build_research_manifest_pipeline():
    with tempfile.TemporaryDirectory() as tmp_in_dir, tempfile.TemporaryDirectory() as tmp_out_dir:
        in_p = Path(tmp_in_dir)
        out_p = Path(tmp_out_dir)

        # 1. Create mock image_inventory.csv
        inv_file = in_p / 'image_inventory.csv'
        with open(inv_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'filename', 'relative_path', 'absolute_path', 'inferred_class',
                'sha256_hash', 'dhash_hex', 'width', 'height', 'channels',
                'color_mode', 'file_size_bytes'
            ])
            writer.writeheader()
            writer.writerows([
                # Isolated normal
                {'filename': 'Normal_1.png', 'relative_path': 'Normal_1.png', 'absolute_path': '/p/Normal_1.png', 'inferred_class': 'Normal', 'sha256_hash': 'sha_n1', 'dhash_hex': 'dh_n1', 'width': 256, 'height': 256, 'channels': 3, 'color_mode': 'RGB', 'file_size_bytes': 100},
                # Same class exact duplicate pair
                {'filename': 'Mild_1.png', 'relative_path': 'Mild_1.png', 'absolute_path': '/p/Mild_1.png', 'inferred_class': 'Mild', 'sha256_hash': 'sha_m_dup', 'dhash_hex': 'dh_m_dup', 'width': 256, 'height': 256, 'channels': 3, 'color_mode': 'RGB', 'file_size_bytes': 100},
                {'filename': 'Mild_2.png', 'relative_path': 'Mild_2.png', 'absolute_path': '/p/Mild_2.png', 'inferred_class': 'Mild', 'sha256_hash': 'sha_m_dup', 'dhash_hex': 'dh_m_dup', 'width': 256, 'height': 256, 'channels': 3, 'color_mode': 'RGB', 'file_size_bytes': 100},
                # Cross class exact duplicate pair
                {'filename': 'Mild_3.png', 'relative_path': 'Mild_3.png', 'absolute_path': '/p/Mild_3.png', 'inferred_class': 'Mild', 'sha256_hash': 'sha_cross_exact', 'dhash_hex': 'dh_ce', 'width': 256, 'height': 256, 'channels': 3, 'color_mode': 'RGB', 'file_size_bytes': 100},
                {'filename': 'Severe_3.png', 'relative_path': 'Severe_3.png', 'absolute_path': '/p/Severe_3.png', 'inferred_class': 'Severe', 'sha256_hash': 'sha_cross_exact', 'dhash_hex': 'dh_ce', 'width': 256, 'height': 256, 'channels': 3, 'color_mode': 'RGB', 'file_size_bytes': 100},
                # Cross class near duplicate pair
                {'filename': 'Normal_4.png', 'relative_path': 'Normal_4.png', 'absolute_path': '/p/Normal_4.png', 'inferred_class': 'Normal', 'sha256_hash': 'sha_n4', 'dhash_hex': 'dh_cross_near_1', 'width': 256, 'height': 256, 'channels': 3, 'color_mode': 'RGB', 'file_size_bytes': 100},
                {'filename': 'Severe_4.png', 'relative_path': 'Severe_4.png', 'absolute_path': '/p/Severe_4.png', 'inferred_class': 'Severe', 'sha256_hash': 'sha_s4', 'dhash_hex': 'dh_cross_near_2', 'width': 256, 'height': 256, 'channels': 3, 'color_mode': 'RGB', 'file_size_bytes': 100},
            ])

        # 2. Create mock duplicate_report.csv
        dupe_file = in_p / 'duplicate_report.csv'
        with open(dupe_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'group_id', 'sha256_hash', 'file_count', 'inferred_classes',
                'is_cross_class_conflict', 'filenames', 'file_paths'
            ])
            writer.writeheader()
            writer.writerows([
                {'group_id': 'EXACT-0001', 'sha256_hash': 'sha_m_dup', 'file_count': '2', 'inferred_classes': 'Mild', 'is_cross_class_conflict': 'False', 'filenames': 'Mild_1.png;Mild_2.png', 'file_paths': 'Mild_1.png;Mild_2.png'},
                {'group_id': 'EXACT-0002', 'sha256_hash': 'sha_cross_exact', 'file_count': '2', 'inferred_classes': 'Mild;Severe', 'is_cross_class_conflict': 'True', 'filenames': 'Mild_3.png;Severe_3.png', 'file_paths': 'Mild_3.png;Severe_3.png'}
            ])

        # 3. Create mock near_duplicate_report.csv
        near_file = in_p / 'near_duplicate_report.csv'
        with open(near_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'pair_id', 'image_1', 'class_1', 'image_2', 'class_2',
                'hamming_distance', 'is_cross_class_conflict', 'dhash_1', 'dhash_2'
            ])
            writer.writeheader()
            writer.writerows([
                {'pair_id': 'NEAR-0001', 'image_1': 'Normal_4.png', 'class_1': 'Normal', 'image_2': 'Severe_4.png', 'class_2': 'Severe', 'hamming_distance': '1', 'is_cross_class_conflict': 'True', 'dhash_1': 'dh_cross_near_1', 'dhash_2': 'dh_cross_near_2'}
            ])

        # Run pipeline
        summary = build_research_manifest(in_p, out_p, verbose=False)

        assert summary['counts']['original']['total'] == 7
        # Usable: Normal_1, Mild_1 (representative) -> 2 images!
        assert summary['counts']['usable']['total'] == 2
        # Excluded: Mild_2 (same class dup), Mild_3 (cross exact), Severe_3 (cross exact), Normal_4 (cross near), Severe_4 (cross near) -> 5 images!
        assert summary['counts']['excluded']['total'] == 5
        assert summary['counts']['excluded']['by_reason']['exact_duplicate_same_class'] == 1
        assert summary['counts']['excluded']['by_reason']['cross_class_exact_conflict'] == 2
        assert summary['counts']['excluded']['by_reason']['cross_class_near_duplicate_conflict'] == 2

        # Check outputs exist
        assert (out_p / 'research_manifest.csv').exists()
        assert (out_p / 'research_dataset_summary.json').exists()
        assert (out_p / 'excluded_conflicts.csv').exists()
        assert (out_p / 'duplicate_groups.csv').exists()
        assert (out_p / 'near_duplicate_groups.csv').exists()
