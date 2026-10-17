import os
import re
import uuid
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
try:
    import seaborn as sns
except ImportError:
    sns = None
from typing import Dict, Any, Optional
from datetime import datetime
from app.utils.csv_loader import read_csv_robust

from langchain_core.messages import SystemMessage, HumanMessage

from app.config.config import settings
from app.agents.states import AnalysisState
from app.agents.prompts.agent_prompts import VISUALIZER_SYSTEM_PROMPT
from app.agents.llm_factory import get_chat_model as get_llm


def extract_code(text: str) -> str:
    match = re.search(r"```python\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    match = re.search(r"```\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()


def generate_fallback_visualization_code(query: str, schema: Dict[str, Any]) -> str:
    """
    Generates Matplotlib code when running in offline mode.
    Selects suitable chart type based on column types and query intent.
    """
    cols = [col["name"] for col in schema.get("columns", [])]
    num_cols = [c["name"] for c in schema.get("columns", []) if "int" in c.get("dtype", "") or "float" in c.get("dtype", "")]
    cat_cols = [c["name"] for c in schema.get("columns", []) if "object" in c.get("dtype", "") or "string" in c.get("dtype", "")]
    date_cols = [c for c in cols if "date" in c.lower() or "time" in c.lower() or "year" in c.lower()]

    query_lower = query.lower()

    if ("trend" in query_lower or "over time" in query_lower or "monthly" in query_lower) and date_cols and num_cols:
        dcol = date_cols[0]
        ncol = num_cols[0]
        return f"""
import matplotlib.pyplot as plt
import pandas as pd

plt.figure(figsize=(10, 5))
df_plot = df.copy()
df_plot['{dcol}'] = pd.to_datetime(df_plot['{dcol}'], errors='coerce')
trend_data = df_plot.dropna(subset=['{dcol}']).groupby(df_plot['{dcol}'].dt.to_period('M'))['{ncol}'].sum()

plt.plot([str(p) for p in trend_data.index], trend_data.values, marker='o', color='#2563eb', linewidth=2.5, markersize=6)
plt.title('Trend of {ncol} Over Time', fontsize=14, fontweight='bold', pad=15)
plt.xlabel('{dcol}', fontsize=12)
plt.ylabel('{ncol}', fontsize=12)
plt.xticks(rotation=45, ha='right')
plt.grid(True, linestyle='--', alpha=0.5)
plt.tight_layout()
plt.savefig(CHART_SAVE_PATH, dpi=200, bbox_inches='tight')
plt.close('all')
"""
    elif cat_cols and num_cols:
        ccol = cat_cols[0]
        ncol = num_cols[0]
        return f"""
import matplotlib.pyplot as plt

plt.figure(figsize=(10, 5))
top_data = df.groupby('{ccol}')['{ncol}'].sum().sort_values(ascending=False).head(10)

colors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1']
bars = plt.bar(top_data.index.astype(str), top_data.values, color=colors[:len(top_data)], edgecolor='#1e40af', alpha=0.85)

plt.title('Top 10 {ccol} by {ncol}', fontsize=14, fontweight='bold', pad=15)
plt.xlabel('{ccol}', fontsize=12)
plt.ylabel('{ncol}', fontsize=12)
plt.xticks(rotation=45, ha='right')
plt.grid(axis='y', linestyle='--', alpha=0.5)
plt.tight_layout()
plt.savefig(CHART_SAVE_PATH, dpi=200, bbox_inches='tight')
plt.close('all')
"""
    elif num_cols and len(num_cols) >= 2 and any(k in query_lower for k in ["scatter", "correlation", "relation"]):
        x_col = num_cols[0]
        y_col = num_cols[1]
        return f"""
import matplotlib.pyplot as plt

plt.figure(figsize=(8, 6))
plt.scatter(df['{x_col}'], df['{y_col}'], alpha=0.6, color='#8b5cf6', edgecolors='none', s=45)
plt.title('Scatter Plot: {x_col} vs {y_col}', fontsize=14, fontweight='bold', pad=15)
plt.xlabel('{x_col}', fontsize=12)
plt.ylabel('{y_col}', fontsize=12)
plt.grid(True, linestyle='--', alpha=0.5)
plt.tight_layout()
plt.savefig(CHART_SAVE_PATH, dpi=200, bbox_inches='tight')
plt.close('all')
"""
    elif num_cols:
        ncol = num_cols[0]
        return f"""
import matplotlib.pyplot as plt

plt.figure(figsize=(9, 5))
plt.hist(df['{ncol}'].dropna(), bins=25, color='#06b6d4', edgecolor='#0891b2', alpha=0.8)
plt.title('Distribution of {ncol}', fontsize=14, fontweight='bold', pad=15)
plt.xlabel('{ncol}', fontsize=12)
plt.ylabel('Frequency', fontsize=12)
plt.grid(axis='y', linestyle='--', alpha=0.5)
plt.tight_layout()
plt.savefig(CHART_SAVE_PATH, dpi=200, bbox_inches='tight')
plt.close('all')
"""
    else:
        return f"""
import matplotlib.pyplot as plt

plt.figure(figsize=(8, 5))
plt.text(0.5, 0.5, 'No numeric columns available for plotting.', ha='center', va='center', fontsize=12)
plt.axis('off')
plt.tight_layout()
plt.savefig(CHART_SAVE_PATH, dpi=200, bbox_inches='tight')
plt.close('all')
"""


def visualizer_agent(state: AnalysisState) -> AnalysisState:
    """
    Agent 3: The Visualizer LangGraph Node.
    Generates Matplotlib charts based on dataset and analyst's findings,
    saves the figure as a PNG, and records the chart URL.
    """
    query = state.get("user_query", "")
    schema = state.get("dataset_schema", {})
    analysis_res = state.get("code_execution_result", "")
    dataset_path = state.get("dataset_path", "")

    # Ensure charts output directory exists
    charts_dir = os.path.join("app", "uploads", "charts")
    os.makedirs(charts_dir, exist_ok=True)

    chart_filename = f"chart_{uuid.uuid4().hex[:12]}.png"
    chart_save_path = os.path.join(charts_dir, chart_filename)
    chart_url = f"/api/v1/analysis/charts/{chart_filename}"

    llm = get_llm()

    if llm:
        prompt = f"""
Dataset Schema:
{schema.get('columns', [])}

User Query:
"{query}"

Previous Analyst Findings:
"{analysis_res[:500]}"

Save path variable is: CHART_SAVE_PATH

Write Python code using Matplotlib to create an attractive, professional chart.
Save the figure to CHART_SAVE_PATH and close the figure.
"""
        messages = [
            SystemMessage(content=VISUALIZER_SYSTEM_PROMPT),
            HumanMessage(content=prompt)
        ]
        try:
            resp = llm.invoke(messages)
            viz_code = extract_code(resp.content)
        except Exception:
            viz_code = generate_fallback_visualization_code(query, schema)
    else:
        viz_code = generate_fallback_visualization_code(query, schema)

    state["visualization_code"] = viz_code

    # Execute visualization code safely
    try:
        df = read_csv_robust(dataset_path) if os.path.exists(dataset_path) else pd.DataFrame()
        exec_globals = {
            "__builtins__": __builtins__,
            "pd": pd,
            "np": np,
            "plt": plt,
            "sns": sns,
            "df": df,
            "CHART_SAVE_PATH": chart_save_path,
        }
        exec(viz_code, exec_globals)

        if os.path.exists(chart_save_path):
            chart_paths = state.get("chart_paths") or []
            chart_paths.append(chart_url)
            state["chart_paths"] = chart_paths
            state["chart_description"] = f"Visual chart generated for query: {query}"
        else:
            chart_url = None
    except Exception as e:
        chart_url = None
        plt.close('all')

    steps = state.get("agent_steps") or []
    steps.append({
        "agent": "Visualizer",
        "status": "completed" if chart_url else "failed",
        "summary": f"Generated Matplotlib visualization: {chart_filename}" if chart_url else "Chart generation failed.",
        "timestamp": datetime.utcnow().isoformat(),
        "chart_url": chart_url,
        "code_snippet": viz_code
    })
    state["agent_steps"] = steps

    return state
