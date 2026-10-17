import os
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
from app.utils.csv_loader import read_csv_robust


def router_node(state: AnalysisState) -> AnalysisState:
    """
    Router Node: Classifies user query intent.
    """
    query = (state.get("user_query") or "").lower()

    if any(k in query for k in ["clean", "null", "missing", "duplicate", "anomaly", "health", "audit"]):
        intent = "clean"
    elif any(k in query for k in ["chart", "plot", "graph", "visualize", "trend", "histogram", "scatter", "distribution"]):
        intent = "visualize"
    elif any(k in query for k in ["hi", "hello", "who are you", "help"]):
        intent = "general"
    else:
        intent = "analyze"

    state["intent"] = intent
    return state


def sandbox_node(state: AnalysisState) -> AnalysisState:
    """
    Sandbox Node: Executes analyst code within AST-secured environment.
    """
    code = state.get("analysis_code", "")
    dataset_path = state.get("dataset_path", "")

    try:
        df = read_csv_robust(dataset_path) if os.path.exists(dataset_path) else pd.DataFrame()
    except Exception as e:
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
    Synthesizer Node: Combines findings from Cleaner, Analyst, Sandbox, and Visualizer
    into a structured final response.
    """
    intent = state.get("intent", "analyze")
    query = state.get("user_query", "")
    analysis_res = state.get("code_execution_result", "")
    exec_err = state.get("execution_error", "")
    cleaning_rep = state.get("cleaning_report", {})
    chart_paths = state.get("chart_paths", [])

    if intent == "clean":
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
    elif intent == "general":
        summary = (
            "Hello! I am your **Multi-Agent Data Analysis Workspace** assistant.\n\n"
            "I can help you:\n"
            "- 🧹 **Scan & Clean**: Audit nulls, duplicates, and statistical outliers.\n"
            "- 🧠 **Analyze**: Ask questions in plain English, and I'll generate & execute Pandas code.\n"
            "- 📊 **Visualize**: Request charts, trends, distributions, and comparisons via Matplotlib.\n\n"
            "Try asking: *'Show me the sales trend'* or *'Audit missing values'*."
        )
    else:
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
                summary += f"*\u2705 A visualization has been generated below based on your request.*"

    state["final_response"] = {
        "analysis_id": state.get("analysis_id"),
        "user_query": query,
        "intent": intent,
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
def route_intent(state: AnalysisState) -> Literal["cleaner", "analyst", "synthesizer"]:
    intent = state.get("intent", "analyze")
    if intent == "clean":
        return "cleaner"
    elif intent in ["analyze", "visualize"]:
        return "analyst"
    else:
        return "synthesizer"


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
    if intent == "visualize" or any(k in query for k in ["chart", "plot", "trend", "graph", "histogram", "scatter"]):
        return "visualizer"

    return "synthesizer"


def build_analysis_graph():
    """
    Constructs and compiles the multi-agent LangGraph workflow.
    """
    graph = StateGraph(AnalysisState)

    # Register nodes
    graph.add_node("router", router_node)
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
            "cleaner": "cleaner",
            "analyst": "analyst",
            "synthesizer": "synthesizer"
        }
    )

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
