import os
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from datetime import datetime
from app.agents.states import AnalysisState
from app.utils.csv_loader import read_csv_robust, sanitize_for_json

def scan_dataset(file_path: str) -> Dict[str, Any]:
    """
    Scans a CSV dataset using pandas to extract structural metrics,
    missing values, duplicate rows, column statistics, and outlier anomalies.
    """
    if not os.path.exists(file_path):
        return {
            "error": f"File not found at path: {file_path}",
            "health_score": 0,
            "status": "failed"
        }

    try:
        df = read_csv_robust(file_path)
    except Exception as e:
        return {
            "error": f"Failed to read CSV: {str(e)}",
            "health_score": 0,
            "status": "failed"
        }

    total_rows = len(df)
    total_cols = len(df.columns)
    duplicate_rows = int(df.duplicated().sum())

    columns_info: List[Dict[str, Any]] = []
    missing_by_col: Dict[str, int] = {}
    total_missing_cells = 0
    anomalies: List[Dict[str, Any]] = []

    for col in df.columns:
        series = df[col]
        missing_count = int(series.isna().sum())
        total_missing_cells += missing_count
        missing_pct = round((missing_count / total_rows * 100), 2) if total_rows > 0 else 0
        missing_by_col[col] = missing_count

        col_dtype = str(series.dtype)
        unique_count = int(series.nunique(dropna=True))

        col_meta: Dict[str, Any] = {
            "name": col,
            "dtype": col_dtype,
            "missing_count": missing_count,
            "missing_pct": missing_pct,
            "unique_count": unique_count,
        }

        # Numeric outlier detection using Interquartile Range (IQR)
        if pd.api.types.is_numeric_dtype(series) and series.dropna().shape[0] > 4:
            clean_series = series.dropna()
            q1 = float(clean_series.quantile(0.25))
            q3 = float(clean_series.quantile(0.75))
            iqr = q3 - q1
            lower_bound = q1 - (1.5 * iqr)
            upper_bound = q3 + (1.5 * iqr)

            outlier_mask = (clean_series < lower_bound) | (clean_series > upper_bound)
            outlier_count = int(outlier_mask.sum())

            col_meta["mean"] = round(float(clean_series.mean()), 2)
            col_meta["std"] = round(float(clean_series.std()), 2) if len(clean_series) > 1 else 0
            col_meta["min"] = round(float(clean_series.min()), 2)
            col_meta["max"] = round(float(clean_series.max()), 2)
            col_meta["outlier_count"] = outlier_count

            if outlier_count > 0:
                anomalies.append({
                    "column": col,
                    "type": "outlier_iqr",
                    "count": outlier_count,
                    "lower_bound": round(lower_bound, 2),
                    "upper_bound": round(upper_bound, 2),
                    "description": f"{outlier_count} values outside normal range [{round(lower_bound, 2)}, {round(upper_bound, 2)}]"
                })

        columns_info.append(col_meta)

    # Health score calculation (out of 100)
    total_cells = total_rows * total_cols if (total_rows * total_cols) > 0 else 1
    missing_ratio = total_missing_cells / total_cells
    duplicate_ratio = duplicate_rows / total_rows if total_rows > 0 else 0
    penalty = (missing_ratio * 50) + (duplicate_ratio * 30) + (min(len(anomalies) * 5, 20))
    health_score = max(0, min(100, int(100 - penalty)))

    # Actionable cleaning recommendations
    recommendations = []
    if duplicate_rows > 0:
        recommendations.append(f"Drop {duplicate_rows} exact duplicate rows to maintain data integrity.")
    for col, cnt in missing_by_col.items():
        if cnt > 0:
            pct = round(cnt / total_rows * 100, 1)
            if pct > 40:
                recommendations.append(f"Consider dropping column '{col}' due to high nullity ({pct}% missing).")
            else:
                recommendations.append(f"Impute missing values in '{col}' ({cnt} nulls, {pct}%) using median or forward fill.")
    if anomalies:
        for a in anomalies[:3]:
            recommendations.append(f"Review potential outliers in '{a['column']}': {a['description']}.")

    if not recommendations:
        recommendations.append("Dataset is clean with zero missing values, duplicates, or severe outliers.")

    return sanitize_for_json({
        "status": "success",
        "total_rows": total_rows,
        "total_columns": total_cols,
        "duplicate_rows": duplicate_rows,
        "total_missing_cells": total_missing_cells,
        "health_score": health_score,
        "missing_by_column": missing_by_col,
        "columns": columns_info,
        "anomalies": anomalies,
        "recommendations": recommendations,
        "scanned_at": datetime.utcnow().isoformat(),
    })


def cleaner_agent(state: AnalysisState) -> AnalysisState:
    """
    Agent 1: The Cleaner LangGraph Node.
    Scans the dataset path, identifies missing values and anomalies,
    and updates the state with a comprehensive cleaning report.
    """
    file_path = state.get("dataset_path") or ""
    report = scan_dataset(file_path)

    # Update state
    state["cleaning_report"] = report

    # Record agent step for the UI timeline
    steps = state.get("agent_steps") or []
    summary_text = (
        f"Scanned {report.get('total_rows', 0)} rows and {report.get('total_columns', 0)} columns. "
        f"Data Health Score: {report.get('health_score', 0)}/100. "
        f"Detected {report.get('total_missing_cells', 0)} missing values and {len(report.get('anomalies', []))} anomaly groups."
    )
    steps.append({
        "agent": "Cleaner",
        "status": "completed",
        "summary": summary_text,
        "timestamp": datetime.utcnow().isoformat(),
        "details": {
            "health_score": report.get("health_score"),
            "duplicates": report.get("duplicate_rows"),
            "missing_cells": report.get("total_missing_cells"),
            "anomalies_count": len(report.get("anomalies", [])),
        }
    })
    state["agent_steps"] = steps

    return state