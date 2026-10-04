#!/usr/bin/env python3
"""
==============================================================================
VetVision AI - Reproducible Dataset Audit & Quality Analysis Pipeline
==============================================================================
Module: services.ai.research.dataset_audit
Purpose: Audits veterinary image datasets for cattle Lumpy Skin Disease (LSD)
         screening. Performs deterministic integrity validation, class balance
         analysis, dimension profiling, exact duplicate detection (SHA-256),
         and perceptual near-duplicate discovery (dHash).

Guardrails:
- READ-ONLY: Never modifies, deletes, renames, or augments source images.
- DETERMINISTIC: 100% reproducible sorting, hashing, and metrics.
- NO FABRICATION: Reports actual raw counts and anomaly metrics.
==============================================================================
"""

import argparse
import csv
import hashlib
import json
import math
import os
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np
from PIL import Image

# Supported image file extensions
SUPPORTED_EXTENSIONS: Set[str] = {'.png', '.jpg', '.jpeg', '.bmp', '.webp'}

# Standard clinical severity classes for Lumpy Skin Disease
VALID_CLASSES: Tuple[str, ...] = ('Normal', 'Mild', 'Severe')


def determine_class_from_filename(filename: str) -> str:
    """
    Extracts the clinical classification from the image filename prefix.
    Matches:
      - Normal* -> Normal
      - Mild*   -> Mild
      - Severe* -> Severe
    Returns 'Unknown' if the prefix is unrecognized.
    """
    stem = Path(filename).stem.strip().lower()
    if stem.startswith('normal'):
        return 'Normal'
    if stem.startswith('mild'):
        return 'Mild'
    if stem.startswith('severe'):
        return 'Severe'
    return 'Unknown'


def compute_sha256(file_path: Path, chunk_size: int = 65536) -> str:
    """
    Computes deterministic SHA-256 cryptographic hash of the raw image bytes.
    """
    sha = hashlib.sha256()
    with open(file_path, 'rb') as fp:
        while chunk := fp.read(chunk_size):
            sha.update(chunk)
    return sha.hexdigest()


def compute_dhash(img: Image.Image, hash_size: int = 8) -> Tuple[int, str]:
    """
    Computes a deterministic 64-bit difference hash (dHash) for perceptual comparison.
    1. Converts image to 8-bit grayscale (L).
    2. Resizes to (hash_size + 1, hash_size) using LANCZOS antialiasing.
    3. Compares adjacent horizontal pixels to capture structural gradients.
    Returns:
        (integer_hash, 16-character hex string)
    """
    resized = img.convert('L').resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    arr = np.array(resized, dtype=np.int32)
    diff = arr[:, 1:] > arr[:, :-1]
    bit_string = ''.join('1' if b else '0' for b in diff.flatten())
    int_val = int(bit_string, 2)
    return int_val, f'{int_val:016x}'


def render_distribution_chart(
    class_counts: Dict[str, int],
    total_images: int,
    output_path: Path
) -> bool:
    """
    Generates a publication-grade bar chart showing the dataset class distribution.
    Prefers Matplotlib; gracefully falls back to PIL ImageDraw if unavailable.
    """
    labels = [c for c in VALID_CLASSES if c in class_counts]
    # Include 'Unknown' if any exist
    if 'Unknown' in class_counts and class_counts['Unknown'] > 0:
        labels.append('Unknown')

    counts = [class_counts.get(c, 0) for c in labels]
    percentages = [(c / total_images * 100.0) if total_images > 0 else 0.0 for c in counts]

    # Attempt Matplotlib rendering
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt

        plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
        fig, ax = plt.subplots(figsize=(8.5, 5.5), dpi=300)

        # VetVision clinical palette: Emerald, Amber, Crimson, Slate
        color_map = {
            'Normal': '#10B981',   # Emerald
            'Mild': '#F59E0B',     # Amber
            'Severe': '#EF4444',   # Crimson
            'Unknown': '#64748B'   # Slate
        }
        bar_colors = [color_map.get(c, '#3B82F6') for c in labels]

        bars = ax.bar(labels, counts, color=bar_colors, width=0.55, edgecolor='#1E293B', linewidth=1.2)

        # Add data labels on top of bars
        for bar, count, pct in zip(bars, counts, percentages):
            yval = bar.get_height()
            ax.text(
                bar.get_x() + bar.get_width() / 2.0,
                yval + (max(counts) * 0.02),
                f'{count:,}\n({pct:.1f}%)',
                ha='center',
                va='bottom',
                fontsize=11,
                fontweight='bold',
                color='#0F172A'
            )

        ax.set_title('Cattle Lumpy Skin Disease (LSD) - Class Distribution Audit', fontsize=14, fontweight='bold', pad=15)
        ax.set_ylabel('Number of Images', fontsize=11, fontweight='semibold')
        ax.set_xlabel('Clinical Severity Class', fontsize=11, fontweight='semibold')
        ax.set_ylim(0, max(counts) * 1.18 if counts else 100)
        ax.grid(axis='y', linestyle='--', alpha=0.5)

        # Subtitle caption
        fig.text(
            0.5, 0.01,
            f'Total Dataset Images: {total_images:,}  |  Generated by VetVision AI Research Audit Pipeline',
            ha='center', fontsize=9, color='#64748B'
        )

        plt.tight_layout()
        fig.savefig(output_path, dpi=300)
        plt.close(fig)
        return True

    except ImportError:
        # Fallback to pure Pillow rendering if matplotlib is not installed
        from PIL import ImageDraw, ImageFont

        width, height = 900, 600
        img = Image.new('RGB', (width, height), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)

        # Title
        draw.text((width // 2 - 220, 30), 'LSD Dataset Class Distribution', fill=(15, 23, 42))

        max_c = max(counts) if counts else 1
        bar_width = 120
        gap = 80
        start_x = (width - (len(labels) * bar_width + (len(labels) - 1) * gap)) // 2
        base_y = 500
        chart_h = 360

        colors = {
            'Normal': (16, 185, 129),
            'Mild': (245, 158, 11),
            'Severe': (239, 68, 68),
            'Unknown': (100, 116, 139)
        }

        for i, (label, count, pct) in enumerate(zip(labels, counts, percentages)):
            x0 = start_x + i * (bar_width + gap)
            x1 = x0 + bar_width
            bh = int((count / max_c) * chart_h) if max_c > 0 else 0
            y0 = base_y - bh
            y1 = base_y
            color = colors.get(label, (59, 130, 246))

            draw.rectangle([x0, y0, x1, y1], fill=color, outline=(30, 41, 59))
            draw.text((x0 + 10, y0 - 35), f'{count:,}', fill=(15, 23, 42))
            draw.text((x0 + 10, y0 - 18), f'({pct:.1f}%)', fill=(100, 116, 139))
            draw.text((x0 + 25, base_y + 15), label, fill=(15, 23, 42))

        # Base line
        draw.line([(50, base_y), (width - 50, base_y)], fill=(148, 163, 184), width=2)
        img.save(output_path)
        return True


def audit_dataset(
    dataset_dir: Path,
    output_dir: Path,
    near_dupe_threshold: int = 4,
    verbose: bool = True
) -> Dict[str, Any]:
    """
    Executes a complete, reproducible dataset audit.
    """
    start_time = time.time()
    output_dir.mkdir(parents=True, exist_ok=True)

    if not dataset_dir.is_dir():
        raise FileNotFoundError(f'Supplied dataset path is not a valid directory: {dataset_dir}')

    if verbose:
        print('=' * 78)
        print('VetVision AI - Cattle LSD Dataset Audit Pipeline')
        print('=' * 78)
        print(f'Dataset Path:    {dataset_dir}')
        print(f'Output Directory: {output_dir}')
        print(f'Near-Dupe Dist:  <= {near_dupe_threshold} bits Hamming distance')
        print('-' * 78)
        print('Phase 1: Discovering image files...')

    # Discover files recursively & sort deterministically
    raw_files = [
        p for p in dataset_dir.rglob('*')
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
    ]
    raw_files.sort(key=lambda p: str(p.relative_to(dataset_dir)).lower())
    total_discovered = len(raw_files)

    if total_discovered == 0:
        raise ValueError(f'No supported image files found in: {dataset_dir}')

    if verbose:
        print(f'Discovered {total_discovered:,} image files. Analyzing file contents...')

    # Collections for audit results
    inventory: List[Dict[str, Any]] = []
    corrupted_files: List[Dict[str, Any]] = []
    class_counter: Counter = Counter()
    extension_counter: Counter = Counter()
    mode_counter: Counter = Counter()
    channels_counter: Counter = Counter()
    resolution_counter: Counter = Counter()
    filename_counter: Counter = Counter()

    sha_to_records: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    dhash_entries: List[Tuple[str, str, str, int, str]] = []  # (filename, class, sha256, dhash_int, dhash_hex)

    widths: List[int] = []
    heights: List[int] = []
    aspect_ratios: List[float] = []

    for idx, p in enumerate(raw_files, start=1):
        rel_path = str(p.relative_to(dataset_dir))
        fname = p.name
        filename_counter[fname] += 1
        file_size = p.stat().st_size
        ext = p.suffix.lower()
        extension_counter[ext] += 1
        inferred_class = determine_class_from_filename(fname)
        class_counter[inferred_class] += 1

        # Check binary SHA-256
        try:
            sha256 = compute_sha256(p)
        except Exception as e:
            corrupted_files.append({
                'filename': fname,
                'relative_path': rel_path,
                'error': f'Failed reading bytes for SHA-256: {str(e)}'
            })
            continue

        # Check image validity with PIL
        try:
            with Image.open(p) as img_verify:
                img_verify.verify()

            with Image.open(p) as img:
                w, h = img.size
                mode = img.mode
                channels = len(img.getbands())

                # Perceptual dHash
                dhash_int, dhash_hex = compute_dhash(img)

            widths.append(w)
            heights.append(h)
            ar = round(w / h, 4) if h > 0 else 0.0
            aspect_ratios.append(ar)

            mode_counter[mode] += 1
            channels_counter[channels] += 1
            resolution_counter[(w, h)] += 1

            record = {
                'filename': fname,
                'relative_path': rel_path,
                'absolute_path': str(p.resolve()),
                'file_size_bytes': file_size,
                'file_extension': ext,
                'inferred_class': inferred_class,
                'is_corrupted': False,
                'width': w,
                'height': h,
                'channels': channels,
                'color_mode': mode,
                'aspect_ratio': ar,
                'sha256_hash': sha256,
                'dhash_hex': dhash_hex
            }
            inventory.append(record)
            sha_to_records[sha256].append(record)
            dhash_entries.append((fname, inferred_class, sha256, dhash_int, dhash_hex))

        except Exception as img_err:
            corrupted_files.append({
                'filename': fname,
                'relative_path': rel_path,
                'error': f'Corrupted or unreadable image: {str(img_err)}'
            })
            inventory.append({
                'filename': fname,
                'relative_path': rel_path,
                'absolute_path': str(p.resolve()),
                'file_size_bytes': file_size,
                'file_extension': ext,
                'inferred_class': inferred_class,
                'is_corrupted': True,
                'width': None,
                'height': None,
                'channels': None,
                'color_mode': None,
                'aspect_ratio': None,
                'sha256_hash': sha256,
                'dhash_hex': None
            })

    valid_images_count = len(inventory) - len(corrupted_files)

    if verbose:
        print(f'Phase 2: Completed integrity inspection. Valid: {valid_images_count:,}, Corrupted: {len(corrupted_files):,}')
        print('Phase 3: Calculating duplicate groups and perceptual near-duplicates...')

    # Exact Duplicates (Identical SHA-256)
    duplicate_groups: List[Dict[str, Any]] = []
    exact_duplicate_files_count = 0
    cross_class_exact_duplicates: List[Dict[str, Any]] = []

    for sha, group in sha_to_records.items():
        if len(group) > 1:
            exact_duplicate_files_count += len(group)
            group_classes = sorted(list(set(item['inferred_class'] for item in group)))
            is_cross_class = len(group_classes) > 1
            entry = {
                'group_id': f'EXACT-{len(duplicate_groups) + 1:04d}',
                'sha256_hash': sha,
                'file_count': len(group),
                'inferred_classes': ';'.join(group_classes),
                'is_cross_class_conflict': is_cross_class,
                'filenames': ';'.join(sorted([item['filename'] for item in group])),
                'file_paths': ';'.join(sorted([item['relative_path'] for item in group]))
            }
            duplicate_groups.append(entry)
            if is_cross_class:
                cross_class_exact_duplicates.append(entry)

    # Duplicate Filenames (in different folders)
    duplicate_filenames = {k: v for k, v in filename_counter.items() if v > 1}

    # Perceptual Near-Duplicates (Pairwise dHash Hamming distance <= threshold for distinct SHA-256 hashes)
    near_duplicate_pairs: List[Dict[str, Any]] = []
    cross_class_near_duplicates: List[Dict[str, Any]] = []
    n_entries = len(dhash_entries)

    for i in range(n_entries):
        f1, c1, s1, h1, dh1_hex = dhash_entries[i]
        for j in range(i + 1, n_entries):
            f2, c2, s2, h2, dh2_hex = dhash_entries[j]
            # Skip exact byte duplicates (already covered in exact duplicate report)
            if s1 == s2:
                continue

            # Compute Hamming distance between 64-bit integer hashes
            dist = (h1 ^ h2).bit_count()
            if dist <= near_dupe_threshold:
                is_cross = (c1 != c2)
                pair_record = {
                    'pair_id': f'NEAR-{len(near_duplicate_pairs) + 1:05d}',
                    'image_1': f1,
                    'class_1': c1,
                    'image_2': f2,
                    'class_2': c2,
                    'hamming_distance': dist,
                    'is_cross_class_conflict': is_cross,
                    'dhash_1': dh1_hex,
                    'dhash_2': dh2_hex
                }
                near_duplicate_pairs.append(pair_record)
                if is_cross:
                    cross_class_near_duplicates.append(pair_record)

    # Sort near duplicates deterministically: first by distance, then image_1
    near_duplicate_pairs.sort(key=lambda x: (x['hamming_distance'], x['image_1'], x['image_2']))

    # Compute dimension statistics
    def calc_stats(vals: List[float | int]) -> Dict[str, float]:
        if not vals:
            return {'min': 0.0, 'max': 0.0, 'mean': 0.0, 'median': 0.0, 'std': 0.0}
        n = len(vals)
        s_vals = sorted(vals)
        mean = float(np.mean(vals))
        median = float(np.median(vals))
        std = float(np.std(vals))
        return {
            'min': float(min(vals)),
            'max': float(max(vals)),
            'mean': round(mean, 2),
            'median': round(median, 2),
            'std': round(std, 2)
        }

    width_stats = calc_stats(widths)
    height_stats = calc_stats(heights)
    aspect_ratio_stats = calc_stats(aspect_ratios)

    sorted_resolutions = [
        {'width': w, 'height': h, 'count': cnt}
        for (w, h), cnt in sorted(resolution_counter.items(), key=lambda x: x[1], reverse=True)
    ]

    # Class balance calculation
    class_percentages = {
        cls: round((count / total_discovered * 100.0), 2)
        for cls, count in class_counter.items()
    }

    # Anomaly checks
    alpha_channel_files = [
        r['filename'] for r in inventory
        if r.get('channels') == 4 or r.get('color_mode') in ('RGBA', 'LA')
    ]
    unrecognized_classes = [
        r['filename'] for r in inventory
        if r['inferred_class'] == 'Unknown'
    ]

    # Assemble Structured JSON Audit
    audit_data: Dict[str, Any] = {
        'audit_metadata': {
            'pipeline_version': '1.0.0',
            'audit_timestamp_utc': datetime.now(timezone.utc).isoformat(),
            'dataset_root_path': str(dataset_dir.resolve()),
            'dataset_folder_name': dataset_dir.name,
            'total_files_discovered': total_discovered,
            'valid_images_count': valid_images_count,
            'corrupted_images_count': len(corrupted_files),
            'execution_time_seconds': round(time.time() - start_time, 2)
        },
        'class_distribution': {
            'counts': dict(class_counter),
            'percentages': class_percentages,
            'is_perfectly_balanced': len(set(class_counter.values())) == 1 and 'Unknown' not in class_counter
        },
        'file_format_profile': {
            'extensions': dict(extension_counter),
            'color_modes': dict(mode_counter),
            'channels': {str(k): v for k, v in channels_counter.items()}
        },
        'dimension_profile': {
            'width_pixels': width_stats,
            'height_pixels': height_stats,
            'aspect_ratio': aspect_ratio_stats,
            'distinct_resolutions': sorted_resolutions
        },
        'duplicate_and_integrity_profile': {
            'unique_sha256_hashes': len(sha_to_records),
            'exact_duplicate_files_count': exact_duplicate_files_count,
            'exact_duplicate_groups_count': len(duplicate_groups),
            'cross_class_exact_duplicate_groups_count': len(cross_class_exact_duplicates),
            'duplicate_filenames_across_dirs_count': len(duplicate_filenames),
            'near_duplicate_candidate_pairs_count': len(near_duplicate_pairs),
            'cross_class_near_duplicate_pairs_count': len(cross_class_near_duplicates),
            'near_duplicate_hamming_threshold': near_dupe_threshold
        },
        'anomalies_and_inconsistencies': {
            'corrupted_files': corrupted_files,
            'unrecognized_class_filenames': unrecognized_classes,
            'alpha_channel_transparency_images': {
                'count': len(alpha_channel_files),
                'filenames': alpha_channel_files[:20]  # Sample first 20 if large
            },
            'cross_class_exact_duplicates': [
                {
                    'group_id': item['group_id'],
                    'sha256': item['sha256_hash'],
                    'conflicting_classes': item['inferred_classes'],
                    'files': item['filenames'].split(';')
                }
                for item in cross_class_exact_duplicates
            ]
        }
    }

    if verbose:
        print('Phase 4: Writing audit report artifacts...')

    # 1. reports/dataset_audit.json
    audit_json_path = output_dir / 'dataset_audit.json'
    with open(audit_json_path, 'w', encoding='utf-8') as fp:
        json.dump(audit_data, fp, indent=2)

    # 2. reports/image_inventory.csv
    inventory_csv_path = output_dir / 'image_inventory.csv'
    fieldnames = [
        'filename', 'relative_path', 'inferred_class', 'is_corrupted',
        'width', 'height', 'channels', 'color_mode', 'aspect_ratio',
        'file_size_bytes', 'file_extension', 'sha256_hash', 'dhash_hex', 'absolute_path'
    ]
    with open(inventory_csv_path, 'w', newline='', encoding='utf-8') as fp:
        writer = csv.DictWriter(fp, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(inventory)

    # 3. reports/duplicate_report.csv
    dupe_csv_path = output_dir / 'duplicate_report.csv'
    dupe_fields = [
        'group_id', 'sha256_hash', 'file_count', 'inferred_classes',
        'is_cross_class_conflict', 'filenames', 'file_paths'
    ]
    with open(dupe_csv_path, 'w', newline='', encoding='utf-8') as fp:
        writer = csv.DictWriter(fp, fieldnames=dupe_fields)
        writer.writeheader()
        writer.writerows(duplicate_groups)

    # 4. reports/near_duplicate_report.csv
    near_dupe_csv_path = output_dir / 'near_duplicate_report.csv'
    near_fields = [
        'pair_id', 'image_1', 'class_1', 'image_2', 'class_2',
        'hamming_distance', 'is_cross_class_conflict', 'dhash_1', 'dhash_2'
    ]
    with open(near_dupe_csv_path, 'w', newline='', encoding='utf-8') as fp:
        writer = csv.DictWriter(fp, fieldnames=near_fields)
        writer.writeheader()
        writer.writerows(near_duplicate_pairs)

    # 5. reports/class_distribution.png
    chart_png_path = output_dir / 'class_distribution.png'
    render_distribution_chart(class_counter, total_discovered, chart_png_path)

    total_time = round(time.time() - start_time, 2)
    audit_data['audit_metadata']['execution_time_seconds'] = total_time

    if verbose:
        print('-' * 78)
        print('AUDIT SUMMARY:')
        print(f'  • Total Images Discovered:     {total_discovered:,}')
        print(f'  • Class Counts:                ' + ', '.join(f'{k}: {v:,} ({class_percentages.get(k, 0)}%)' for k, v in class_counter.items()))
        print(f'  • Corrupted / Unreadable:      {len(corrupted_files):,}')
        print(f'  • Dimensions (W x H):          Min: {int(width_stats["min"])}x{int(height_stats["min"])}, '
              f'Max: {int(width_stats["max"])}x{int(height_stats["max"])}, Mean: {width_stats["mean"]}x{height_stats["mean"]}')
        print(f'  • Color Modes:                 ' + ', '.join(f'{k}: {v:,}' for k, v in mode_counter.items()))
        print(f'  • Unique Image Hashes:         {len(sha_to_records):,} of {total_discovered:,}')
        print(f'  • Exact Duplicate Groups:      {len(duplicate_groups):,} ({exact_duplicate_files_count:,} duplicate files)')
        print(f'  • Cross-Class Exact Dupes:     {len(cross_class_exact_duplicates):,} groups (HIGH CONTAMINATION RISK)')
        print(f'  • Near-Duplicate Pairs:        {len(near_duplicate_pairs):,} (Hamming dist <= {near_dupe_threshold})')
        print(f'  • Cross-Class Near Dupes:      {len(cross_class_near_duplicates):,} pairs')
        print('-' * 78)
        print('GENERATED REPORTS:')
        print(f'  1. {audit_json_path}')
        print(f'  2. {inventory_csv_path}')
        print(f'  3. {chart_png_path}')
        print(f'  4. {dupe_csv_path}')
        print(f'  5. {near_dupe_csv_path}')
        print(f'Audit finished in {total_time}s')
        print('=' * 78)

    return audit_data


def main():
    parser = argparse.ArgumentParser(
        description='VetVision AI - Cattle Lumpy Skin Disease Dataset Audit Pipeline'
    )
    parser.add_argument(
        'dataset_path',
        type=str,
        help='Path to the directory containing dataset images'
    )
    parser.add_argument(
        '--output-dir',
        '-o',
        type=str,
        default=str(Path(__file__).parent / 'reports'),
        help='Directory where audit reports will be generated (default: services/ai/research/reports)'
    )
    parser.add_argument(
        '--near-duplicate-threshold',
        type=int,
        default=4,
        help='Maximum dHash Hamming distance for near-duplicate candidates (default: 4)'
    )
    parser.add_argument(
        '--quiet',
        action='store_true',
        help='Suppress console progress output'
    )

    args = parser.parse_args()

    dataset_path = Path(args.dataset_path).resolve()
    output_dir = Path(args.output_dir).resolve()

    try:
        audit_dataset(
            dataset_dir=dataset_path,
            output_dir=output_dir,
            near_dupe_threshold=args.near_duplicate_threshold,
            verbose=not args.quiet
        )
    except Exception as err:
        print(f'ERROR: Dataset audit failed: {err}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
