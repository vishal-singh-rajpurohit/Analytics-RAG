import os
import math
import pandas as pd
import numpy as np
from typing import Optional, Any, List, Dict


def read_csv_robust(file_path: str, **kwargs) -> pd.DataFrame:
    """
    Robustly reads a CSV file by trying standard and legacy encodings
    (utf-8, latin1, iso-8859-1, cp1252, utf-8-sig) and falls back
    to encoding_errors='replace' to avoid UnicodeDecodeError crashes.
    """
    if not os.path.exists(file_path):
        return pd.DataFrame()

    encodings = ["utf-8", "latin1", "iso-8859-1", "cp1252", "utf-8-sig"]
    for enc in encodings:
        try:
            return pd.read_csv(file_path, encoding=enc, **kwargs)
        except (UnicodeDecodeError, UnicodeError):
            continue

    try:
        return pd.read_csv(file_path, encoding="utf-8", encoding_errors="replace", **kwargs)
    except Exception:
        return pd.read_csv(file_path, encoding="latin1", **kwargs)


def sanitize_for_json(obj: Any) -> Any:
    """
    Recursively replaces NaN, Infinity, -Infinity, and numpy scalar types
    with None or Python native types so Starlette/json.dumps never raises
    'ValueError: Out of range float values are not JSON compliant: nan'.
    """
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, (np.floating, np.integer)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return obj.item()
    elif isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    return obj


def dataframe_to_json_records(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Converts a pandas DataFrame into a list of dicts guaranteed to have
    all NaN and Inf values converted to None so it can be serialized to JSON.
    """
    if df.empty:
        return []
    df_clean = df.replace([np.inf, -np.inf], np.nan)
    df_clean = df_clean.astype(object).where(pd.notnull(df_clean), None)
    records = df_clean.to_dict(orient="records")
    return sanitize_for_json(records)
