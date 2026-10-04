"""
Unit tests for the reproducible leakage-controlled dataset splitter.
Module: services.ai.tests.test_split_dataset
"""

import csv
import pytest
from pathlib import Path
from services.ai.research.split_dataset import (
    load_manifest,
    partition_class_into_units,
    split_dataset_group_stratified,
    validate_splits,
    VALID_CLASSES,
)


@pytest.fixture
def mock_manifest_data():
    """
    Creates a representative mock dataset with singletons, near-duplicate groups,
    and excluded conflict images.
    """
    usable = [
        # Normal singletons
        {"filename": "Normal_1.png", "class": "Normal", "sha256": "sha_n1", "near_duplicate_group": "", "research_status": "USABLE"},
        {"filename": "Normal_2.png", "class": "Normal", "sha256": "sha_n2", "near_duplicate_group": "", "research_status": "USABLE"},
        {"filename": "Normal_3.png", "class": "Normal", "sha256": "sha_n3", "near_duplicate_group": "", "research_status": "USABLE"},
        # Normal near-duplicate group
        {"filename": "Normal_4.png", "class": "Normal", "sha256": "sha_n4", "near_duplicate_group": "ND-SAME-0001", "research_status": "USABLE"},
        {"filename": "Normal_5.png", "class": "Normal", "sha256": "sha_n5", "near_duplicate_group": "ND-SAME-0001", "research_status": "USABLE"},

        # Mild singletons
        {"filename": "Mild_1.png", "class": "Mild", "sha256": "sha_m1", "near_duplicate_group": "", "research_status": "USABLE"},
        {"filename": "Mild_2.png", "class": "Mild", "sha256": "sha_m2", "near_duplicate_group": "", "research_status": "USABLE"},
        # Mild near-duplicate group
        {"filename": "Mild_3.png", "class": "Mild", "sha256": "sha_m3", "near_duplicate_group": "ND-SAME-0002", "research_status": "USABLE"},
        {"filename": "Mild_4.png", "class": "Mild", "sha256": "sha_m4", "near_duplicate_group": "ND-SAME-0002", "research_status": "USABLE"},

        # Severe singletons
        {"filename": "Severe_1.png", "class": "Severe", "sha256": "sha_s1", "near_duplicate_group": "", "research_status": "USABLE"},
        # Severe near-duplicate group
        {"filename": "Severe_2.png", "class": "Severe", "sha256": "sha_s2", "near_duplicate_group": "ND-SAME-0003", "research_status": "USABLE"},
        {"filename": "Severe_3.png", "class": "Severe", "sha256": "sha_s3", "near_duplicate_group": "ND-SAME-0003", "research_status": "USABLE"},
    ]

    excluded = [
        {"filename": "Mild_Conflict.png", "class": "Mild", "sha256": "sha_c1", "near_duplicate_group": "ND-CONFLICT-0001", "research_status": "EXCLUDED", "exclusion_reason": "CROSS_CLASS_NEAR_DUPLICATE_LABEL_CONFLICT"},
        {"filename": "Normal_Conflict.png", "class": "Normal", "sha256": "sha_c2", "near_duplicate_group": "ND-CONFLICT-0001", "research_status": "EXCLUDED", "exclusion_reason": "CROSS_CLASS_NEAR_DUPLICATE_LABEL_CONFLICT"},
    ]

    return usable, excluded


def test_partition_class_into_units():
    records = [
        {"filename": "Mild_1.png", "near_duplicate_group": ""},
        {"filename": "Mild_2.png", "near_duplicate_group": "ND-SAME-0001"},
        {"filename": "Mild_3.png", "near_duplicate_group": "ND-SAME-0001"},
        {"filename": "Mild_4.png", "near_duplicate_group": ""},
    ]

    units = partition_class_into_units(records)
    # Expect 1 group unit (size 2) and 2 singleton units (size 1)
    assert len(units) == 3
    group_units = [u for u in units if len(u) > 1]
    singleton_units = [u for u in units if len(u) == 1]

    assert len(group_units) == 1
    assert len(group_units[0]) == 2
    assert {r["filename"] for r in group_units[0]} == {"Mild_2.png", "Mild_3.png"}
    assert len(singleton_units) == 2


def test_split_dataset_group_integrity(mock_manifest_data):
    usable, excluded = mock_manifest_data
    splits = split_dataset_group_stratified(usable, seed=42, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15)

    # All usable images must be accounted for
    total_split = sum(len(s) for s in splits.values())
    assert total_split == len(usable)

    # Check that ND-SAME-0001 members are in the exact same split
    nd1_splits = {
        s for s, records in splits.items()
        if any(r["filename"] in ("Normal_4.png", "Normal_5.png") for r in records)
    }
    assert len(nd1_splits) == 1, f"ND-SAME-0001 was split across: {nd1_splits}"

    # Check that ND-SAME-0002 members are in the exact same split
    nd2_splits = {
        s for s, records in splits.items()
        if any(r["filename"] in ("Mild_3.png", "Mild_4.png") for r in records)
    }
    assert len(nd2_splits) == 1, f"ND-SAME-0002 was split across: {nd2_splits}"

    # Validate passes with zero leakage
    audit = validate_splits(splits, usable, excluded)
    assert audit["all_checks_passed"] is True
    assert audit["near_duplicate_groups_crossing_splits"] == 0
    assert audit["excluded_images_in_splits"] == 0
    assert audit["sha256_overlap"]["train_vs_validation"] == 0
    assert audit["sha256_overlap"]["train_vs_test"] == 0
    assert audit["sha256_overlap"]["validation_vs_test"] == 0


def test_split_dataset_reproducibility(mock_manifest_data):
    usable, _ = mock_manifest_data
    split1 = split_dataset_group_stratified(usable, seed=42)
    split2 = split_dataset_group_stratified(usable, seed=42)

    for s in ("TRAIN", "VALIDATION", "TEST"):
        files1 = [r["filename"] for r in split1[s]]
        files2 = [r["filename"] for r in split2[s]]
        assert files1 == files2, f"Splits not identical for {s} with same seed"


def test_validate_splits_catches_excluded_leakage(mock_manifest_data):
    usable, excluded = mock_manifest_data
    splits = split_dataset_group_stratified(usable, seed=42)

    # Intentionally contaminate TRAIN with an excluded file
    splits["TRAIN"].append(excluded[0])

    with pytest.raises(ValueError, match="excluded image"):
        validate_splits(splits, usable, excluded)


def test_validate_splits_catches_group_crossing(mock_manifest_data):
    usable, excluded = mock_manifest_data
    splits = split_dataset_group_stratified(usable, seed=42)

    # Intentionally split ND-SAME-0001 across TRAIN and TEST
    splits["TRAIN"] = [r for r in splits["TRAIN"] if r["filename"] != "Normal_5.png"]
    splits["TEST"].append({"filename": "Normal_5.png", "class": "Normal", "sha256": "sha_n5", "near_duplicate_group": "ND-SAME-0001", "research_status": "USABLE"})

    with pytest.raises(ValueError, match="near-duplicate group"):
        validate_splits(splits, usable, excluded)


def test_validate_splits_catches_sha_leakage(mock_manifest_data):
    usable, excluded = mock_manifest_data
    splits = split_dataset_group_stratified(usable, seed=42)

    # Intentionally duplicate a SHA across TRAIN and TEST
    splits["TEST"].append({"filename": "Dup_Sha.png", "class": "Normal", "sha256": "sha_n1", "near_duplicate_group": "", "research_status": "USABLE"})

    with pytest.raises(ValueError, match="SHA-256 LEAKAGE FAILURE"):
        validate_splits(splits, usable, excluded)


def test_validate_splits_catches_unknown_class(mock_manifest_data):
    usable, excluded = mock_manifest_data
    splits = split_dataset_group_stratified(usable, seed=42)

    splits["TRAIN"].append({"filename": "Alien.png", "class": "UnknownAlienClass", "sha256": "sha_alien", "near_duplicate_group": "", "research_status": "USABLE"})

    with pytest.raises(ValueError, match="UNKNOWN CLASS"):
        validate_splits(splits, usable, excluded)


def test_actual_research_manifest_split():
    manifest_path = Path("services/ai/research/reports/research_manifest.csv")
    if not manifest_path.exists():
        pytest.skip("Research manifest not found")

    usable, excluded, fieldnames = load_manifest(manifest_path)
    assert len(usable) == 994
    assert len(excluded) == 25

    splits = split_dataset_group_stratified(usable, seed=42)
    audit = validate_splits(splits, usable, excluded)

    assert audit["all_checks_passed"] is True
    assert audit["total_usable_images"] == 994
    assert audit["total_split_images"] == 994
    assert audit["near_duplicate_groups_crossing_splits"] == 0
    assert audit["excluded_images_in_splits"] == 0
    assert audit["total_near_duplicate_groups_partitioned"] == 97
    assert audit["sha256_overlap"]["train_vs_validation"] == 0
    assert audit["sha256_overlap"]["train_vs_test"] == 0
    assert audit["sha256_overlap"]["validation_vs_test"] == 0
