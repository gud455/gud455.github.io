"""LLM Course chapters 1–4 practice. No automatic Hub uploads.

Install: python -m pip install torch transformers datasets accelerate numpy
Run inference: python llm-part1-practice.py
Run MRPC fine-tuning explicitly: python llm-part1-practice.py --train
Reference: https://huggingface.co/learn/llm-course/
Written for Gud's learning notes; no benchmark scores are assumed.
"""

import argparse
import importlib.metadata
import json
from pathlib import Path
import platform
import subprocess
import sys


def binary_metrics(predictions, references):
    """Accuracy and binary F1, with label 1 as the positive class."""
    if len(predictions) != len(references) or not len(references):
        raise ValueError("Predictions and references must have equal nonzero length")
    if any(p not in (0, 1) or y not in (0, 1) for p, y in zip(predictions, references)):
        raise ValueError("Only binary labels 0 and 1 are supported")
    pairs = [(int(p), int(y)) for p, y in zip(predictions, references)]
    tp = sum(p == 1 and y == 1 for p, y in pairs)
    fp = sum(p == 1 and y == 0 for p, y in pairs)
    fn = sum(p == 0 and y == 1 for p, y in pairs)
    denominator = 2 * tp + fp + fn
    return {
        "accuracy": sum(p == y for p, y in pairs) / len(pairs),
        "f1": 2 * tp / denominator if denominator else 0.0,
    }


def infer():
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    checkpoint = "distilbert/distilbert-base-uncased-finetuned-sst-2-english"
    tokenizer = AutoTokenizer.from_pretrained(checkpoint)
    model = AutoModelForSequenceClassification.from_pretrained(checkpoint)
    model.eval()
    inputs = tokenizer(
        ["The explanation is clear.", "This example is confusing."],
        padding=True, truncation=True, return_tensors="pt",
    )
    print("Checkpoint:", checkpoint)
    print("Revision:", getattr(model.config, "_commit_hash", None))
    print("Tokens:", tokenizer.convert_ids_to_tokens(inputs["input_ids"][0].tolist()))
    print("IDs shape:", tuple(inputs["input_ids"].shape))
    print("Padding mask:", inputs["attention_mask"])
    with torch.no_grad():
        scores = model(**inputs).logits
    print("Logits shape:", tuple(scores.shape))
    for probabilities in scores.softmax(dim=-1):
        index = probabilities.argmax().item()
        print(model.config.id2label[index], probabilities[index].item())


def train(output_dir):
    import numpy as np
    import torch
    from datasets import load_dataset
    from transformers import (
        AutoModelForSequenceClassification, AutoTokenizer,
        DataCollatorWithPadding, Trainer, TrainingArguments, set_seed,
    )

    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    # Avoid mixing fresh results into an existing experiment directory.
    if any(output.iterdir()):
        raise ValueError("Output directory is not empty; choose a fresh --output-dir")
    seed = 42
    set_seed(seed)  # Includes random task-head initialization.
    checkpoint = "google-bert/bert-base-uncased"
    raw = load_dataset("glue", "mrpc")
    tokenizer = AutoTokenizer.from_pretrained(checkpoint)

    def tokenize(examples):
        return tokenizer(examples["sentence1"], examples["sentence2"], truncation=True)

    encoded = raw.map(tokenize, batched=True)
    model = AutoModelForSequenceClassification.from_pretrained(
        checkpoint, num_labels=2,
        id2label={0: "NOT_PARAPHRASE", 1: "PARAPHRASE"},
        label2id={"NOT_PARAPHRASE": 0, "PARAPHRASE": 1},
    )
    args = TrainingArguments(
        output_dir=str(output), learning_rate=2e-5,
        per_device_train_batch_size=8, per_device_eval_batch_size=8,
        num_train_epochs=3, eval_strategy="epoch", save_strategy="epoch",
        load_best_model_at_end=True, metric_for_best_model="f1",
        greater_is_better=True, save_total_limit=2,
        seed=seed, data_seed=seed, report_to="none", push_to_hub=False,
    )

    def compute_metrics(result):
        return binary_metrics(np.argmax(result.predictions, axis=-1), result.label_ids)

    trainer = Trainer(
        model=model, args=args, train_dataset=encoded["train"],
        eval_dataset=encoded["validation"], processing_class=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer), compute_metrics=compute_metrics,
    )
    versions = {
        package: importlib.metadata.version(package)
        for package in ("torch", "transformers", "datasets", "accelerate", "numpy")
    }
    manifest = {
        "python": platform.python_version(), "packages": versions,
        "checkpoint": checkpoint, "model_revision": getattr(model.config, "_commit_hash", None),
        "dataset": "glue/mrpc", "positive_label": 1,
        "dataset_fingerprints": {k: v._fingerprint for k, v in raw.items()},
        "split_sizes": {k: len(v) for k, v in raw.items()},
        "device": str(args.device), "cuda_device": (
            torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
        ), "training_arguments": args.to_dict(),
        "notes": "Validation is used for checkpoint selection. No independent test score is claimed.",
    }
    (output / "run_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, default=str), encoding="utf-8",
    )
    freeze = subprocess.run(
        [sys.executable, "-m", "pip", "freeze"],
        capture_output=True, text=True, check=False,
    )
    if freeze.returncode == 0:
        (output / "requirements-observed.txt").write_text(freeze.stdout, encoding="utf-8")
    trainer.train()
    metrics = trainer.evaluate()
    trainer.save_metrics("validation", metrics)
    final = output / "final"
    trainer.save_model(str(final))
    tokenizer.save_pretrained(str(final))
    trainer.save_state()
    print("Validation metrics (used for model selection):", metrics)
    print("Inference export:", final)
    print("No Hub upload was performed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train", action="store_true", help="Run full MRPC fine-tuning")
    parser.add_argument("--output-dir", default="outputs/llm-part1-mrpc")
    options = parser.parse_args()
    if options.train:
        train(options.output_dir)
    else:
        infer()
