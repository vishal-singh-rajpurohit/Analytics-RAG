import re
import os
import json
import pandas as pd
from typing import Dict, Any, Optional
from datetime import datetime

from langchain_core.messages import SystemMessage, HumanMessage

from app.config.config import settings
from app.agents.states import AnalysisState
from app.agents.prompts.agent_prompts import ANALYST_SYSTEM_PROMPT
from app.agents.llm_factory import get_chat_model as get_llm


def clean_code_markdown(text: str) -> str:
    """Extracts raw python code from Markdown triple-backtick blocks."""
    match = re.search(r"```python\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    match = re.search(r"```\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()


def generate_fallback_analysis_code(query: str, schema: Dict[str, Any]) -> str:
    """
    Intelligent heuristic code generator when running in offline/dry-run mode
    without an active OpenAI API key.
    """
    cols = [col["name"] for col in schema.get("columns", [])]
    query_lower = query.lower()

    # Numerical and categorical column identification
    num_cols = [c["name"] for c in schema.get("columns", []) if "int" in c.get("dtype", "") or "float" in c.get("dtype", "")]
    cat_cols = [c["name"] for c in schema.get("columns", []) if "object" in c.get("dtype", "") or "string" in c.get("dtype", "")]

    # Check for specific column mentions in query
    mentioned_num_col = next((c for c in num_cols if c.lower() in query_lower), num_cols[0] if num_cols else None)
    mentioned_cat_col = next((c for c in cat_cols if c.lower() in query_lower), cat_cols[0] if cat_cols else None)

    if any(k in query_lower for k in ["summary", "describe", "overview", "stats", "statistics"]):
        return (
            "# Generate statistical summary of the dataset\n"
            "result = df.describe(include='all').transpose()\n"
            "print('Dataset Statistical Overview:')\n"
            "print(result)\n"
        )
    elif any(k in query_lower for k in ["top", "highest", "best", "most"]) and mentioned_cat_col and mentioned_num_col:
        return (
            f"# Group by '{mentioned_cat_col}' and aggregate '{mentioned_num_col}'\n"
            f"grouped = df.groupby('{mentioned_cat_col}')['{mentioned_num_col}'].sum().sort_values(ascending=False).head(10)\n"
            f"result = grouped.reset_index()\n"
            f"print(f'Top {mentioned_cat_col} by {mentioned_num_col}:')\n"
            f"print(result)\n"
        )
    elif any(k in query_lower for k in ["correlation", "corr"]):
        return (
            "# Compute correlation matrix for numeric columns\n"
            "result = df.select_dtypes(include=['number']).corr().round(3)\n"
            "print('Correlation Matrix:')\n"
            "print(result)\n"
        )
    elif any(k in query_lower for k in ["trend", "over time", "date", "monthly", "quarter", "q1", "q2", "q3", "q4"]):
        date_col = next((c for c in cols if "date" in c.lower() or "time" in c.lower() or "year" in c.lower()), None)
        if date_col and mentioned_num_col:
            return (
                f"# Time series trend analysis\n"
                f"df_copy = df.copy()\n"
                f"df_copy['{date_col}'] = pd.to_datetime(df_copy['{date_col}'], errors='coerce')\n"
                f"result = df_copy.dropna(subset=['{date_col}']).groupby(df_copy['{date_col}'].dt.to_period('M'))['{mentioned_num_col}'].sum().reset_index()\n"
                f"result['{date_col}'] = result['{date_col}'].astype(str)\n"
                f"print('Monthly Trend Analysis:')\n"
                f"print(result)\n"
            )

    # General default: group by or describe
    if mentioned_cat_col:
        return (
            f"# Frequency distribution of {mentioned_cat_col}\n"
            f"result = df['{mentioned_cat_col}'].value_counts().head(10).reset_index()\n"
            f"result.columns = ['{mentioned_cat_col}', 'count']\n"
            f"print('Top categories:')\n"
            f"print(result)\n"
        )
    elif num_cols:
        return (
            f"# Numerical distribution summary\n"
            f"result = df[{num_cols[:3]}].describe()\n"
            f"print('Summary:')\n"
            f"print(result)\n"
        )
    else:
        return (
            "# Default dataset preview\n"
            "result = df.head(10)\n"
            "print(result)\n"
        )


def analyst_agent(state: AnalysisState) -> AnalysisState:
    """
    Agent 2: The Analyst LangGraph Node.
    Analyzes natural language queries and writes executable Python code using pandas.
    """
    query = state.get("user_query", "")
    schema = state.get("dataset_schema", {})
    history = state.get("chat_history", [])

    llm = get_llm()

    if llm:
        schema_summary = json.dumps({
            "columns": [c.get("name") for c in schema.get("columns", [])],
            "sample_rows": schema.get("sample_preview", [])[:3]
        }, indent=2)

        prompt = f"""
Dataset Schema and Sample:
{schema_summary}

User Query:
"{query}"

Write executable Python code to compute the answer from DataFrame `df` and store it in `result`.
"""
        messages = [
            SystemMessage(content=ANALYST_SYSTEM_PROMPT),
            HumanMessage(content=prompt)
        ]

        try:
            response = llm.invoke(messages)
            code = clean_code_markdown(response.content)
        except Exception as e:
            # Fallback on LLM failure
            code = generate_fallback_analysis_code(query, schema)
    else:
        # Fallback offline mode
        code = generate_fallback_analysis_code(query, schema)

    state["analysis_code"] = code

    # Record agent step
    steps = state.get("agent_steps") or []
    steps.append({
        "agent": "Analyst",
        "status": "completed",
        "summary": f"Generated Python pandas code for query: '{query}'",
        "timestamp": datetime.utcnow().isoformat(),
        "code_snippet": code
    })
    state["agent_steps"] = steps

    return state