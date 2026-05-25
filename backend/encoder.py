"""
NanEncoder - Custom JSON serializer for vectorbt output.
Handles NaN, Inf, datetime, numpy types, and pandas objects.
"""

import json
import math
import numpy as np
import pandas as pd
from datetime import datetime, date


class NanEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles vectorbt/pandas/numpy edge cases."""

    def default(self, obj):
        # numpy types
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            if np.isnan(obj) or np.isinf(obj):
                return None
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, (np.bool_,)):
            return bool(obj)

        # pandas types
        if isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        if isinstance(obj, pd.Series):
            return obj.to_dict()
        if isinstance(obj, pd.DataFrame):
            return obj.to_dict(orient="records")
        if isinstance(obj, pd.Timedelta):
            return str(obj)

        # datetime
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()

        # timedelta
        from datetime import timedelta
        if isinstance(obj, timedelta):
            return str(obj)

        return super().default(obj)


def safe_json_response(data: dict) -> dict:
    """
    Convert a dict with numpy/pandas values to JSON-safe dict.
    Replaces NaN/Inf with None, converts timestamps to ISO strings.
    """
    def _clean(value):
        if isinstance(value, dict):
            return {k: _clean(v) for k, v in value.items()}
        if isinstance(value, (list, tuple)):
            return [_clean(v) for v in value]
        if isinstance(value, (np.floating, float)):
            if math.isnan(value) or math.isinf(value):
                return None
            return float(value)
        if isinstance(value, (np.integer,)):
            return int(value)
        if isinstance(value, (np.bool_,)):
            return bool(value)
        if isinstance(value, np.ndarray):
            return _clean(value.tolist())
        if isinstance(value, pd.Timestamp):
            return value.isoformat()
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        if isinstance(value, pd.Timedelta):
            return str(value)
        if isinstance(value, pd.Series):
            return _clean(value.to_dict())
        if isinstance(value, pd.DataFrame):
            return _clean(value.to_dict(orient="records"))
        if pd.isna(value):
            return None
        return value

    return _clean(data)
