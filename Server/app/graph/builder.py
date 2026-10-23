import os
import re
import pandas as pd
from typing import Dict, Any, Literal
from datetime import datetime

from langgraph.graph import StateGraph, START, END

from app.agents.states import AnalysisState
from app.agents.cleaner.cleaner import cleaner_agent
from app.agents.analyst.analysis import analyst_agent
from app.agents.executor.sandbox import execute_sandboxed_code
from app.agents.fixer.fixer import fixer_agent
from app.agents.visualizer.visualizer import visualizer_agent
from app.agents.direct_responder import direct_responder_agent
from app.agents.prompts.agent_prompts import ROUTER_SYSTEM_PROMPT
from app.agents.llm_factory import get_chat_model
from app.utils.csv_loader import read_csv_robust
from langchain_core.messages import SystemMessage, HumanMessage


def router_node(state: AnalysisState) -> AnalysisState:
    """
    Router Node: Intelligently classifies user query intent.
    Decides whether the query can be answered DIRECTLY by the LLM (no tool required),
    or if it requires specialist tools: 'clean', 'visualize', or 'analyze'.
    """
    query = (state.get("user_query") or "").strip()
    q_lower = query.lower()
    dataset_path = state.get("dataset_path")
    schema = state.get("dataset_schema", {})
    cols = [c.get("name", "").lower() for c in schema.get("columns", []) if isinstance(c, dict)]

    # Rule 0: If no dataset or schema is present, route directly to LLM
    if not dataset_path and not cols:
        state["intent"] = "direct"
        state["tool_required"] = False
        state["tool_used"] = []
        return state

    # Rule 1: Check if LLM is available to make intelligent classification
    llm = get_chat_model()
    classified_intent = None

    if llm and len(query.split()) > 2:
        try:
            messages = [
                SystemMessage(content=ROUTER_SYSTEM_PROMPT),
                HumanMessage(
                    content=(
                        f"Dataset columns: {cols[:10]}\n"
                        f"User Query: \"{query}\"\n"
                        "Decide: direct, clean, visualize, or analyze."
                    )
                )
            ]
            resp = llm.invoke(messages)
            text_resp = (resp.content if hasattr(resp, "content") else str(resp)).strip().lower()
            match = re.search(r"\b(direct|clean|visualize|analyze)\b", text_resp)
            if match:
                classified_intent = match.group(1)
        except Exception as e:
            print(f"[ROUTER] LLM intent classification notice: {e}. Using deterministic heuristics.")

    if not classified_intent:
        # Rule 2: Deterministic heuristics
        # Advisory / recommendation indicators (questions inquiring if a chart or method is suitable)
        advisory_indicators = [
            "is pie chart", "is a pie chart", "is bar chart", "is a bar chart",
            "is a good", "is it a good", "will be a good", "would be a good",
            "is good", "good mode", "good way", "best way", "good choice", "good option",
            "should i use", "can i use", "could i use", "which chart", "what chart",
            "recommend a chart", "recommend chart", "suggest a chart",
            "how should i visualize", "how to visualize", "when to use", "pros and cons",
            "is it better to", "would it be better", "how to choose"
        ]
        is_advisory_request = any(ind in q_lower for ind in advisory_indicators)
        if not is_advisory_request and (
            any(q_lower.startswith(w) for w in ["is ", "are ", "should ", "would ", "can ", "could ", "why "])
            and any(term in q_lower for term in ["good", "better", "best", "suit", "appropriate", "mode", "way", "choice", "recommend"])
        ):
            is_advisory_request = True

        # Calculation / analytical tool indicators
        calc_indicators = [
            "calculate", "compute", "sum of", "total", "average of", "mean of",
            "count of", "how many", "filter", "group by", "grouped by", " by ",
            "top ", "bottom ", "highest", "lowest", "max", "min", "aggregate",
            "std dev", "standard deviation", "variance", "quantile", "percentile"
        ]
        is_calc_request = any(ind in q_lower for ind in calc_indicators)

        # Cleaning tool indicators
        clean_indicators = ["clean", "null", "missing", "duplicate", "anomaly", "health", "audit", "deduplicate"]
        is_clean_request = any(ind in q_lower for ind in clean_indicators)

        # Visualization tool indicators
        viz_indicators = ["chart", "plot", "graph", "visualize", "histogram", "scatter", "distribution", "trend", "heatmap", "bar chart", "pie chart"]
        is_viz_request = any(ind in q_lower for ind in viz_indicators)

        # Direct questions: definitions, concepts, greetings, advice, explanations
        direct_indicators = [
            "what is", "what are", "why is", "why are", "how does", "how do i",
            "explain", "definition", "define", "tell me about", "difference between",
            "meaning of", "what does", "hi", "hello", "hey", "who are you", "help",
            "what can you do", "advice", "best practices", "how to improve", "recommendations"
        ]
        is_direct_question = any(ind in q_lower for ind in direct_indicators)

        # Check if columns are explicitly mentioned
        mentioned_cols = [c for c in cols if len(c) > 1 and c in q_lower]

        if is_advisory_request:
            classified_intent = "direct"
        elif is_clean_request and not is_direct_question:
            classified_intent = "clean"
        elif is_viz_request and not is_direct_question:
            classified_intent = "visualize"
        elif is_direct_question:
            if mentioned_cols and is_calc_request:
                classified_intent = "analyze"
            else:
                classified_intent = "direct"
        elif is_calc_request or (mentioned_cols and any(k in q_lower for k in ["show", "list", "get", "find", "compare"])):
            classified_intent = "analyze"
        elif mentioned_cols:
            classified_intent = "analyze"
        else:
            classified_intent = "direct"

    state["intent"] = classified_intent
    state["tool_required"] = (classified_intent != "direct")
    if classified_intent == "direct":
        state["tool_used"] = []
    elif classified_intent == "clean":
        state["tool_used"] = ["Cleaner"]
    elif classified_intent == "visualize":
        state["tool_used"] = ["Analyst", "Sandbox", "Visualizer"]
    else:
        state["tool_used"] = ["Analyst", "Sandbox"]

    return state


def sandbox_node(state: AnalysisState) -> AnalysisState:
    """
    Sandbox Node: Executes analyst code within AST-secured environment.
    """
    code = state.get("analysis_code", "")
    dataset_path = state.get("dataset_path", "")

    try:
        df = read_csv_robust(dataset_path) if dataset_path and os.path.exists(dataset_path) else pd.DataFrame()
    except Exception:
        df = pd.DataFrame()

    exec_result = execute_sandboxed_code(code=code, df=df)

    steps = state.get("agent_steps") or []

    if exec_result["success"]:
        state["code_execution_result"] = exec_result["formatted_output"]
        state["execution_error"] = None
        steps.append({
            "agent": "Sandbox",
            "status": "completed",
            "summary": "Executed Python analysis successfully.",
            "timestamp": datetime.utcnow().isoformat(),
            "stdout": exec_result["stdout"]
        })
    else:
        state["execution_error"] = exec_result["error"]
        steps.append({
            "agent": "Sandbox",
            "status": "failed",
            "summary": f"Execution error: {exec_result['error'][:150]}",
            "timestamp": datetime.utcnow().isoformat(),
            "error": exec_result["error"]
        })

    state["agent_steps"] = steps
    return state


def synthesizer_node(state: AnalysisState) -> AnalysisState:
    """
    Synthesizer Node: Combines findings from Direct LLM Responder, Cleaner, Analyst,
    Sandbox, and Visualizer into a structured final response.
    """
    intent = state.get("intent", "direct")
    query = state.get("user_query", "")
    analysis_res = state.get("code_execution_result", "")
    exec_err = state.get("execution_error", "")
    cleaning_rep = state.get("cleaning_report", {})
    chart_paths = state.get("chart_paths", [])
    direct_res = state.get("direct_response", "")

    if intent in ["direct", "general"]:
        summary = direct_res or "I am ready to help answer questions or analyze your dataset."
        tool_used = []
        tool_required = False
    elif intent == "clean":
        tool_used = ["Cleaner"]
        tool_required = True
        summary = (
            f"### 🧹 Dataset Health & Cleaning Report\n\n"
            f"- **Health Score**: `{cleaning_rep.get('health_score', 0)}/100`\n"
            f"- **Total Rows**: {cleaning_rep.get('total_rows', 0):,}\n"
            f"- **Total Columns**: {cleaning_rep.get('total_columns', 0)}\n"
            f"- **Missing Cells**: {cleaning_rep.get('total_missing_cells', 0)}\n"
            f"- **Duplicate Rows**: {cleaning_rep.get('duplicate_rows', 0)}\n\n"
            f"**Key Recommendations:**\n" +
            "\n".join([f"- {r}" for r in cleaning_rep.get("recommendations", [])[:4]])
        )
    else:
        tool_used = ["Analyst", "Sandbox"]
        if chart_paths:
            tool_used.append("Visualizer")
        tool_required = True

        if exec_err:
            summary = (
                f"### Analysis Incomplete\n"
                f"An error occurred while executing the code:\n```\n{exec_err}\n```"
            )
        else:
            summary = (
                f"### 📈 Analysis Results\n\n"
                f"{analysis_res}\n\n"
            )
            if chart_paths:
                summary += "*✅ A visualization has been generated below based on your request.*"

    state["final_response"] = {
        "analysis_id": state.get("analysis_id"),
        "user_query": query,
        "intent": intent,
        "tool_required": tool_required,
        "tool_used": tool_used,
        "is_direct_answer": (intent in ["direct", "general"]),
        "summary": summary,
        "code": state.get("analysis_code"),
        "result_text": analysis_res,
        "chart_urls": chart_paths,
        "cleaning_report": cleaning_rep,
        "agent_steps": state.get("agent_steps", []),
        "timestamp": datetime.utcnow().isoformat()
    }

    return state


# Conditional Routing Functions
def route_intent(state: AnalysisState) -> Literal["direct_llm", "cleaner", "analyst"]:
    intent = state.get("intent", "direct")
    if intent in ["direct", "general"]:
        return "direct_llm"
    elif intent == "clean":
        return "cleaner"
    else:
        return "analyst"


def route_sandbox(state: AnalysisState) -> Literal["visualizer", "fixer", "synthesizer"]:
    error = state.get("execution_error")
    retry_count = state.get("retry_count", 0)
    intent = state.get("intent", "analyze")
    query = (state.get("user_query") or "").lower()

    if error:
        if retry_count < 3:
            return "fixer"
        return "synthesizer"

    # If code succeeded, check if visualization is needed
    if intent == "visualize" or any(k in query for k in ["plot", "draw", "visualize", "render chart", "generate chart", "create chart"]):
        return "visualizer"

    return "synthesizer"


def build_analysis_graph():
    """
    Constructs and compiles the multi-agent LangGraph workflow.
    Supports both Direct LLM Answers and On-Demand Specialist Tool execution.
    """
    graph = StateGraph(AnalysisState)

    # Register nodes
    graph.add_node("router", router_node)
    graph.add_node("direct_llm", direct_responder_agent)
    graph.add_node("cleaner", cleaner_agent)
    graph.add_node("analyst", analyst_agent)
    graph.add_node("sandbox", sandbox_node)
    graph.add_node("fixer", fixer_agent)
    graph.add_node("visualizer", visualizer_agent)
    graph.add_node("synthesizer", synthesizer_node)

    # Define edges
    graph.add_edge(START, "router")

    graph.add_conditional_edges(
        "router",
        route_intent,
        {
            "direct_llm": "direct_llm",
            "cleaner": "cleaner",
            "analyst": "analyst",
        }
    )

    graph.add_edge("direct_llm", "synthesizer")
    graph.add_edge("cleaner", "synthesizer")
    graph.add_edge("analyst", "sandbox")

    graph.add_conditional_edges(
        "sandbox",
        route_sandbox,
        {
            "visualizer": "visualizer",
            "fixer": "fixer",
            "synthesizer": "synthesizer"
        }
    )

    graph.add_edge("fixer", "sandbox")  # Retry loop
    graph.add_edge("visualizer", "synthesizer")
    graph.add_edge("synthesizer", END)

    return graph.compile()


# Singleton compiled graph instance
compiled_analysis_graph = build_analysis_graph()
