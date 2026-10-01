"""
Model Training Pipeline Specification for Lumpy Skin Disease (LSD) Screening.

This script demonstrates training configuration for transfer learning (e.g. ResNet-50 / EfficientNet)
with cross-entropy loss and AdamW optimizer.
"""

import os
import argparse
from app.core.logger import logger

def parse_args():
    parser = argparse.ArgumentParser(description="Train Bovine LSD Classifier")
    parser.add_argument("--data-dir", type=str, default="data/lsd_dataset", help="Path to dataset")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--output-dir", type=str, default="models/weights")
    return parser.parse_args()

def main():
    args = parse_args()
    logger.info("Initializing LSD model training pipeline...")
    
    if not os.path.exists(args.data_dir):
        logger.warn(f"Dataset directory '{args.data_dir}' not found. Training requires a validated dataset.")
        print(f"STATUS: DATASET_NOT_FOUND at {args.data_dir}")
        print("Please mount a validated bovine dermatological dataset to execute full training.")
        return

    logger.info(f"Training parameters: epochs={args.epochs}, batch_size={args.batch_size}, lr={args.lr}")

if __name__ == "__main__":
    main()
