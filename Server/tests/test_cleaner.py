import os
import tempfile
import pandas as pd
import numpy as np

from app.agents.cleaner.cleaner import scan_dataset


def test_cleaner_detects_missing_values_and_anomalies():
    # Create temporary CSV with intentional nulls, duplicates, and outliers
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", encoding="utf-8") as f:
        f.write("id,category,revenue,quantity\n")
        f.write("1,Electronics,100,2\n")
        f.write("2,Clothing,,5\n")  # missing revenue
        f.write("3,Electronics,120,3\n")
        f.write("3,Electronics,120,3\n")  # duplicate row
        f.write("5,Furniture,15000,1\n")  # outlier revenue
        f.write("6,Clothing,80,4\n")
        f.write("7,Electronics,110,2\n")
        f.write("8,Furniture,200,1\n")
        temp_path = f.name

    try:
        report = scan_dataset(temp_path)
        assert report["status"] == "success"
        assert report["total_rows"] == 8
        assert report["total_columns"] == 4
        assert report["duplicate_rows"] >= 1
        assert report["total_missing_cells"] >= 1
        assert report["missing_by_column"]["revenue"] == 1
        assert len(report["anomalies"]) >= 1
        assert report["health_score"] < 100
        assert len(report["recommendations"]) > 0
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_cleaner_handles_clean_dataset():
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", encoding="utf-8") as f:
        f.write("name,score\n")
        f.write("Alice,95\n")
        f.write("Bob,88\n")
        f.write("Charlie,92\n")
        temp_path = f.name

    try:
        report = scan_dataset(temp_path)
        assert report["status"] == "success"
        assert report["total_missing_cells"] == 0
        assert report["duplicate_rows"] == 0
        assert report["health_score"] == 100
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    test_cleaner_detects_missing_values_and_anomalies()
    test_cleaner_handles_clean_dataset()
    print("ALL CLEANER TESTS PASSED!")
