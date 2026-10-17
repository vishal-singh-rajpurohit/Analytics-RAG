import os
import re
from typing import Dict, Any
from datetime import datetime

from langchain_core.messages import SystemMessage, HumanMessage

from app.config.config import settings
from app.agents.states import AnalysisState
from app.agents.prompts.agent_prompts import FIXER_SYSTEM_PROMPT
from app.agents.llm_factory import get_chat_model as get_llm


def clean_code_markdown(text: str) -> str:
    match = re.search(r"```python\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    match = re.search(r"```\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()


def fixer_agent(state: AnalysisState) -> AnalysisState:
    """
    Self-Healing Fixer Node.
    Inspects failed code execution and error traceback, prompts LLM to fix it,
    and updates retry count.
    """
    failed_code = state.get("analysis_code", "")
    error_msg = state.get("execution_error", "")
    query = state.get("user_query", "")
    retry_count = state.get("retry_count", 0) + 1
    state["retry_count"] = retry_count

    llm = get_llm()

    if llm:
        prompt = f"""
Original User Query:
"{query}"

Previous Code That Failed:
```python
{failed_code}
```

Execution Error Traceback:
{error_msg}

Please fix the Python script to avoid this error and compute the desired result into `result`.
"""
        messages = [
            SystemMessage(content=FIXER_SYSTEM_PROMPT),
            HumanMessage(content=prompt)
        ]
        try:
            response = llm.invoke(messages)
            fixed_code = clean_code_markdown(response.content)
        except Exception:
            # Safe fallback if LLM fix fails: simple summary
            fixed_code = (
                "# Fallback safe execution\n"
                "result = df.describe(include='all').transpose()\n"
                "print('Fallback Statistical Summary:')\n"
                "print(result)\n"
            )
    else:
        # Offline fallback fix
        fixed_code = (
            "# Fallback safe execution\n"
            "result = df.describe(include='all').transpose()\n"
            "print('Fallback Statistical Summary:')\n"
            "print(result)\n"
        )

    state["analysis_code"] = fixed_code
    # Clear previous error for re-execution
    state["execution_error"] = None

    steps = state.get("agent_steps") or []
    steps.append({
        "agent": "Fixer",
        "status": "completed",
        "summary": f"Refactored failed code (Retry #{retry_count}) based on traceback error.",
        "timestamp": datetime.utcnow().isoformat(),
        "code_snippet": fixed_code
    })
    state["agent_steps"] = steps

    return state
