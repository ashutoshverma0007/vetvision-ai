#!/usr/bin/env python3
"""
==============================================================================
VetVision AI - Research Dataset Manifest Builder & Leakage Control
==============================================================================
Module: services.ai.research.build_research_manifest
Purpose: Reads existing dataset audit reports to generate a clean, leakage-
         controlled research manifest for cattle Lumpy Skin Disease (LSD) imagery.

Key Rules:
1. Read existing audit/inventory/duplicate CSV reports rather than recalculating.
2. Deduplicate exact same-class duplicates: keep exactly ONE representative, mark
   redundant copies as EXCLUDED (EXACT_DUPLICATE_SAME_CLASS).
3. Exclude ALL cross-class exact duplicate files (CROSS_CLASS_EXACT_DUPLICATE_CONFLICT).
   Never arbitrarily resolve label conflicts without clinical review.
4. Exclude ALL cross-class near-duplicate files (CROSS_CLASS_NEAR_DUPLICATE_LABEL_CONFLICT).
5. Retain same-class near-duplicate groups for research, assigning them a group ID
   so that all members stay in the SAME train/val/test split in future partitioning.
6. Rigorous automated validation: Fails loudly if any conflict leaks into USABLE.
7. READ-ONLY: Never modifies, deletes, or moves source images.
==============================================================================
"""

import argparse
import csv
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple


def build_near_duplicate_components(
    near_pairs: List[Dict[str, str]],
    img_to_class: Dict[str, str]
) -> Tuple[List[Dict[str, Any]], Dict[str, str], Set[str]]:
    """
    Constructs connected components of near-duplicate images from pairwise dHash links.
    Returns:
        components_list, img_to_comp_id, cross_class_near_images
    """
    adj = defaultdict(set)
    for p in near_pairs:
        im1 = p['image_1']
        im2 = p['image_2']
        adj[im1].add(im2)
        adj[im2].add(im1)

    visited = set()
    components_list = []
    img_to_comp_id = {}
    cross_class_near_images = set()

    comp_idx = 1
    for node in sorted(adj.keys()):
        if node not in visited:
            comp = []
            queue = [node]
            visited.add(node)
            while queue:
                curr = queue.pop(0)
                comp.append(curr)
                for neighbor in sorted(adj[curr]):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)

            comp = sorted(comp)
            comp_classes = sorted(list(set(img_to_class[img] for img in comp)))
            is_cross = len(comp_classes) > 1

            if is_cross:
                comp_id = f'ND-CONFLICT-{comp_idx:04d}'
                comp_type = 'CROSS_CLASS_CONFLICT'
                cross_class_near_images.update(comp)
            else:
                comp_id = f'ND-SAME-{comp_idx:04d}'
                comp_type = 'SAME_CLASS'

            for img in comp:
                img_to_comp_id[img] = comp_id

            components_list.append({
                'component_id': comp_id,
                'component_type': comp_type,
                'class_or_classes': ';'.join(comp_classes),
                'image_count': len(comp),
                'is_cross_class_conflict': is_cross,
                'filenames': ';'.join(comp)
            })
            comp_idx += 1

    return components_list, img_to_comp_id, cross_class_near_images


def build_research_manifest(
    reports_dir: Path,
    output_dir: Path,
    verbose: bool = True
) -> Dict[str, Any]:
    """
    Generates the research manifest and supporting exclusion/duplicate reports.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Verify existence of required input audit files
    inv_file = reports_dir / 'image_inventory.csv'
    dupe_file = reports_dir / 'duplicate_report.csv'
    near_file = reports_dir / 'near_duplicate_report.csv'

    for f in (inv_file, dupe_file, near_file):
        if not f.is_file():
            raise FileNotFoundError(f'Missing required audit report file: {f}')

    # 2. Load audit reports
    with open(inv_file, encoding='utf-8') as fp:
        inventory = list(csv.DictReader(fp))

    with open(dupe_file, encoding='utf-8') as fp:
        exact_dupes = list(csv.DictReader(fp))

    with open(near_file, encoding='utf-8') as fp:
        near_pairs = list(csv.DictReader(fp))

    if verbose:
        print('=' * 78)
        print('VetVision AI - Research Dataset Manifest Builder')
        print('=' * 78)
        print(f'Input Audit Directory:  {reports_dir}')
        print(f'Output Reports Directory: {output_dir}')
        print(f'Discovered Inventory:   {len(inventory):,} images')
        print(f'Exact Duplicate Groups: {len(exact_dupes):,}')
        print(f'Near Duplicate Pairs:   {len(near_pairs):,}')
        print('-' * 78)

    # Map filename to image record and class
    img_info = {item['filename']: item for item in inventory}
    img_to_class = {item['filename']: item['inferred_class'] for item in inventory}

    # 3. Process near-duplicate connected components
    near_comps, img_to_near_comp_id, cross_class_near_images = build_near_duplicate_components(
        near_pairs, img_to_class
    )

    # 4. Process exact duplicate groups
    exact_dupe_rows = []
    exact_cross_class_images = set()
    exact_same_class_excluded = set()
    img_to_exact_group_id = {}
    exact_group_to_conflicting_classes = {}

    for d in exact_dupes:
        gid = d['group_id']
        sha = d['sha256_hash']
        is_cross = d['is_cross_class_conflict'].lower() == 'true'
        fnames = sorted(d['filenames'].split(';'))
        classes = sorted(list(set(img_to_class[fn] for fn in fnames)))

        for fn in fnames:
            img_to_exact_group_id[fn] = gid

        if is_cross:
            # Exclude EVERY file in cross-class exact duplicate groups
            exact_group_to_conflicting_classes[gid] = ';'.join(classes)
            for fn in fnames:
                exact_cross_class_images.add(fn)
            rep_file = 'NONE (ALL EXCLUDED)'
            ex_files = ';'.join(fnames)
        else:
            # Pick deterministically the first filename as representative
            rep_file = fnames[0]
            ex_files_list = fnames[1:]
            for fn in ex_files_list:
                exact_same_class_excluded.add(fn)
            ex_files = ';'.join(ex_files_list)

        exact_dupe_rows.append({
            'group_id': gid,
            'sha256': sha,
            'file_count': len(fnames),
            'inferred_classes': ';'.join(classes),
            'is_cross_class_conflict': is_cross,
            'representative_file': rep_file,
            'excluded_files': ex_files,
            'all_filenames': ';'.join(fnames)
        })

    # 5. Build Manifest Records with Status and Exclusion Reasons
    manifest_records = []
    excluded_conflicts_records = []

    for item in inventory:
        fn = item['filename']
        cls = item['inferred_class']
        sha = item['sha256_hash']
        dhash = item.get('dhash_hex', '')
        rel_path = item['relative_path']
        abs_path = item['absolute_path']
        exact_gid = img_to_exact_group_id.get(fn, '')
        near_gid = img_to_near_comp_id.get(fn, '')

        # Exclusion evaluation hierarchy:
        # Priority 1: Cross-class exact duplicate conflict
        # Priority 2: Cross-class near-duplicate conflict
        # Priority 3: Exact same-class redundant copy
        if fn in exact_cross_class_images:
            status = 'EXCLUDED'
            reason = 'CROSS_CLASS_EXACT_DUPLICATE_CONFLICT'
            conflicting_cls = exact_group_to_conflicting_classes.get(exact_gid, cls)
        elif fn in cross_class_near_images:
            status = 'EXCLUDED'
            reason = 'CROSS_CLASS_NEAR_DUPLICATE_LABEL_CONFLICT'
            # Find conflicting classes in its near duplicate component
            comp_obj = next(c for c in near_comps if c['component_id'] == near_gid)
            conflicting_cls = comp_obj['class_or_classes']
        elif fn in exact_same_class_excluded:
            status = 'EXCLUDED'
            reason = 'EXACT_DUPLICATE_SAME_CLASS'
            conflicting_cls = cls
        else:
            status = 'USABLE'
            reason = 'NONE'
            conflicting_cls = ''

        record = {
            'filename': fn,
            'relative_path': rel_path,
            'absolute_path': abs_path,
            'class': cls,
            'sha256': sha,
            'perceptual_hash': dhash,
            'exact_duplicate_group': exact_gid,
            'near_duplicate_group': near_gid,
            'research_status': status,
            'exclusion_reason': reason,
            'width': item['width'],
            'height': item['height'],
            'channels': item['channels'],
            'color_mode': item['color_mode'],
            'file_size_bytes': item['file_size_bytes']
        }
        manifest_records.append(record)

        if status == 'EXCLUDED':
            excluded_conflicts_records.append({
                'filename': fn,
                'class': cls,
                'exclusion_reason': reason,
                'exact_duplicate_group': exact_gid,
                'near_duplicate_group': near_gid,
                'conflicting_classes': conflicting_cls,
                'sha256': sha,
                'perceptual_hash': dhash,
                'absolute_path': abs_path
            })

    # Sort manifest deterministically
    manifest_records.sort(key=lambda r: (r['class'], r['filename']))
    excluded_conflicts_records.sort(key=lambda r: (r['exclusion_reason'], r['class'], r['filename']))

    # 6. CRITICAL VALIDATION CHECKS (FAIL LOUDLY IF INCONSISTENT)
    if verbose:
        print('Running rigorous leakage & consistency assertions...')

    usable_filenames = set(r['filename'] for r in manifest_records if r['research_status'] == 'USABLE')
    excluded_filenames = set(r['filename'] for r in manifest_records if r['research_status'] == 'EXCLUDED')

    # Check 1: No overlap between usable and excluded
    assert len(usable_filenames.intersection(excluded_filenames)) == 0, 'CRITICAL: Image present in both USABLE and EXCLUDED!'

    # Check 2: Total accounts for 100% of images
    assert len(usable_filenames) + len(excluded_filenames) == len(inventory), 'CRITICAL: USABLE + EXCLUDED does not match total images!'

    # Check 3: ZERO cross-class exact duplicate images in USABLE
    leaked_exact_cross = usable_filenames.intersection(exact_cross_class_images)
    if leaked_exact_cross:
        raise AssertionError(f'CRITICAL LEAKAGE: Cross-class exact duplicate images marked USABLE: {leaked_exact_cross}')

    # Check 4: ZERO cross-class near-duplicate images in USABLE
    leaked_near_cross = usable_filenames.intersection(cross_class_near_images)
    if leaked_near_cross:
        raise AssertionError(f'CRITICAL LEAKAGE: Cross-class near-duplicate images marked USABLE: {leaked_near_cross}')

    # Check 5: ZERO redundant same-class duplicate images in USABLE
    leaked_exact_same = usable_filenames.intersection(exact_same_class_excluded)
    if leaked_exact_same:
        raise AssertionError(f'CRITICAL LEAKAGE: Redundant same-class duplicate images marked USABLE: {leaked_exact_same}')

    # Check 6: All USABLE images have exclusion_reason == 'NONE'
    for r in manifest_records:
        if r['research_status'] == 'USABLE':
            assert r['exclusion_reason'] == 'NONE', f'CRITICAL: USABLE image has exclusion reason: {r}'
        else:
            assert r['exclusion_reason'] != 'NONE', f'CRITICAL: EXCLUDED image has no exclusion reason: {r}'

    if verbose:
        print('All 6 leakage and consistency assertions PASSED successfully.')

    # 7. Aggregate Statistics
    orig_counts = Counter(item['inferred_class'] for item in inventory)
    usable_counts = Counter(r['class'] for r in manifest_records if r['research_status'] == 'USABLE')
    excluded_counts = Counter(r['class'] for r in manifest_records if r['research_status'] == 'EXCLUDED')
    reason_counts = Counter(r['exclusion_reason'] for r in manifest_records if r['research_status'] == 'EXCLUDED')

    # Calculate usable near-duplicate groups and member counts
    usable_same_class_comps = []
    usable_images_in_same_groups = set()

    for comp_obj in near_comps:
        if comp_obj['component_type'] == 'SAME_CLASS':
            fnames = comp_obj['filenames'].split(';')
            # Keep only usable files in component
            usable_fnames = [fn for fn in fnames if fn in usable_filenames]
            if len(usable_fnames) >= 2:
                usable_same_class_comps.append({
                    'component_id': comp_obj['component_id'],
                    'class': comp_obj['class_or_classes'],
                    'usable_image_count': len(usable_fnames),
                    'filenames': ';'.join(usable_fnames)
                })
                usable_images_in_same_groups.update(usable_fnames)

    summary_data = {
        'metadata': {
            'pipeline_version': '1.0.0',
            'manifest_timestamp_utc': datetime.now(timezone.utc).isoformat(),
            'dataset_source': 'lumpy_unbalanced/lumpy',
            'audit_source_dir': str(reports_dir.resolve()),
            'manifest_output_dir': str(output_dir.resolve()),
            'disclaimer': 'Research manifest for machine learning experimentation. Not certified as a clinical diagnostic benchmark.'
        },
        'counts': {
            'original': {
                'total': len(inventory),
                'normal': orig_counts.get('Normal', 0),
                'mild': orig_counts.get('Mild', 0),
                'severe': orig_counts.get('Severe', 0)
            },
            'usable': {
                'total': len(usable_filenames),
                'normal': usable_counts.get('Normal', 0),
                'mild': usable_counts.get('Mild', 0),
                'severe': usable_counts.get('Severe', 0),
                'percentages': {
                    'normal': round(usable_counts.get('Normal', 0) / len(usable_filenames) * 100.0, 2),
                    'mild': round(usable_counts.get('Mild', 0) / len(usable_filenames) * 100.0, 2),
                    'severe': round(usable_counts.get('Severe', 0) / len(usable_filenames) * 100.0, 2)
                }
            },
            'excluded': {
                'total': len(excluded_filenames),
                'by_reason': {
                    'exact_duplicate_same_class': reason_counts.get('EXACT_DUPLICATE_SAME_CLASS', 0),
                    'cross_class_exact_conflict': reason_counts.get('CROSS_CLASS_EXACT_DUPLICATE_CONFLICT', 0),
                    'cross_class_near_duplicate_conflict': reason_counts.get('CROSS_CLASS_NEAR_DUPLICATE_LABEL_CONFLICT', 0)
                },
                'by_class': {
                    'normal': excluded_counts.get('Normal', 0),
                    'mild': excluded_counts.get('Mild', 0),
                    'severe': excluded_counts.get('Severe', 0)
                }
            }
        },
        'near_duplicate_groups': {
            'total_same_class_groups_eligible': len(usable_same_class_comps),
            'total_images_participating_in_groups': len(usable_images_in_same_groups),
            'by_class': {
                'normal_groups': len([c for c in usable_same_class_comps if c['class'] == 'Normal']),
                'mild_groups': len([c for c in usable_same_class_comps if c['class'] == 'Mild']),
                'severe_groups': len([c for c in usable_same_class_comps if c['class'] == 'Severe'])
            }
        },
        'validation_status': {
            'all_leakage_checks_passed': True,
            'cross_class_exact_leaked': 0,
            'cross_class_near_leaked': 0,
            'source_dataset_intact': True
        }
    }

    # 8. Write Artifacts
    # Artifact 1: research_manifest.csv
    manifest_csv = output_dir / 'research_manifest.csv'
    manifest_fields = [
        'filename', 'relative_path', 'absolute_path', 'class', 'sha256',
        'perceptual_hash', 'exact_duplicate_group', 'near_duplicate_group',
        'research_status', 'exclusion_reason', 'width', 'height', 'channels',
        'color_mode', 'file_size_bytes'
    ]
    with open(manifest_csv, 'w', newline='', encoding='utf-8') as fp:
        writer = csv.DictWriter(fp, fieldnames=manifest_fields)
        writer.writeheader()
        writer.writerows(manifest_records)

    # Artifact 2: research_dataset_summary.json
    summary_json = output_dir / 'research_dataset_summary.json'
    with open(summary_json, 'w', encoding='utf-8') as fp:
        json.dump(summary_data, fp, indent=2)

    # Artifact 3: excluded_conflicts.csv
    excluded_csv = output_dir / 'excluded_conflicts.csv'
    excluded_fields = [
        'filename', 'class', 'exclusion_reason', 'exact_duplicate_group',
        'near_duplicate_group', 'conflicting_classes', 'sha256',
        'perceptual_hash', 'absolute_path'
    ]
    with open(excluded_csv, 'w', newline='', encoding='utf-8') as fp:
        writer = csv.DictWriter(fp, fieldnames=excluded_fields)
        writer.writeheader()
        writer.writerows(excluded_conflicts_records)

    # Artifact 4: duplicate_groups.csv
    dupes_csv = output_dir / 'duplicate_groups.csv'
    dupes_fields = [
        'group_id', 'sha256', 'file_count', 'inferred_classes',
        'is_cross_class_conflict', 'representative_file', 'excluded_files', 'all_filenames'
    ]
    with open(dupes_csv, 'w', newline='', encoding='utf-8') as fp:
        writer = csv.DictWriter(fp, fieldnames=dupes_fields)
        writer.writeheader()
        writer.writerows(exact_dupe_rows)

    # Artifact 5: near_duplicate_groups.csv
    near_groups_csv = output_dir / 'near_duplicate_groups.csv'
    near_fields = [
        'component_id', 'component_type', 'class_or_classes', 'image_count',
        'is_cross_class_conflict', 'filenames'
    ]
    with open(near_groups_csv, 'w', newline='', encoding='utf-8') as fp:
        writer = csv.DictWriter(fp, fieldnames=near_fields)
        writer.writeheader()
        writer.writerows(near_comps)

    if verbose:
        print('-' * 78)
        print('MANIFEST SUMMARY:')
        print('ORIGINAL:')
        print(f'Total = {len(inventory)}')
        print(f'Normal = {orig_counts.get("Normal", 0)}')
        print(f'Mild = {orig_counts.get("Mild", 0)}')
        print(f'Severe = {orig_counts.get("Severe", 0)}')
        print()
        print('USABLE:')
        print(f'Total = {len(usable_filenames)}')
        print(f'Normal = {usable_counts.get("Normal", 0)}')
        print(f'Mild = {usable_counts.get("Mild", 0)}')
        print(f'Severe = {usable_counts.get("Severe", 0)}')
        print()
        print('EXCLUDED:')
        print(f'Total = {len(excluded_filenames)}')
        print(f'Exact same-class duplicate = {reason_counts.get("EXACT_DUPLICATE_SAME_CLASS", 0)}')
        print(f'Cross-class exact conflict = {reason_counts.get("CROSS_CLASS_EXACT_DUPLICATE_CONFLICT", 0)}')
        print(f'Cross-class near-duplicate conflict = {reason_counts.get("CROSS_CLASS_NEAR_DUPLICATE_LABEL_CONFLICT", 0)}')
        print()
        print('NEAR-DUPLICATE GROUPS:')
        print(f'Total same-class groups = {len(usable_same_class_comps)}')
        print(f'Total images participating = {len(usable_images_in_same_groups)}')
        print('-' * 78)
        print('GENERATED MANIFEST ARTIFACTS:')
        print(f'  1. {manifest_csv}')
        print(f'  2. {summary_json}')
        print(f'  3. {excluded_csv}')
        print(f'  4. {dupes_csv}')
        print(f'  5. {near_groups_csv}')
        print('=' * 78)

    return summary_data


def main():
    parser = argparse.ArgumentParser(
        description='VetVision AI - Research Dataset Manifest Builder'
    )
    parser.add_argument(
        '--reports-dir',
        type=str,
        default=str(Path(__file__).parent / 'reports' / 'unbalanced'),
        help='Directory containing unbalanced dataset audit reports'
    )
    parser.add_argument(
        '--output-dir',
        '-o',
        type=str,
        default=str(Path(__file__).parent / 'reports'),
        help='Directory to output the research manifest and summary'
    )
    parser.add_argument(
        '--quiet',
        action='store_true',
        help='Suppress console progress output'
    )

    args = parser.parse_args()
    reports_dir = Path(args.reports_dir).resolve()
    output_dir = Path(args.output_dir).resolve()

    try:
        build_research_manifest(
            reports_dir=reports_dir,
            output_dir=output_dir,
            verbose=not args.quiet
        )
    except Exception as err:
        print(f'ERROR: Manifest build failed: {err}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
