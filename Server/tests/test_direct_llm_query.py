import os
import tempfile
import pytest
from app.graph.builder import compiled_analysis_graph, router_node
from app.agents.cleaner.cleaner import scan_dataset
from app.controllers.analysis_controller import handle_query
from app.schema.analysis import QueryRequest
from app.models.auth import User
import uuid


def test_router_direct_intent_for_conceptual_queries():
    state = {
        "user_query": "What is customer churn?",
        "dataset_path": "dummy.csv",
        "dataset_schema": {
            "columns": [{"name": "customer_id"}, {"name": "revenue"}, {"name": "category"}]
        }
    }
    updated = router_node(state)
    assert updated["intent"] == "direct"
    assert updated["tool_required"] is False
    assert updated["tool_used"] == []

    # Explaining concepts
    state2 = {
        "user_query": "Explain the difference between mean and median",
        "dataset_path": "dummy.csv",
        "dataset_schema": {"columns": [{"name": "revenue"}]}
    }
    updated2 = router_node(state2)
    assert updated2["intent"] == "direct"
    assert updated2["tool_required"] is False

    # Greeting
    state3 = {
        "user_query": "Hi, who are you and what can you do?",
        "dataset_path": "dummy.csv",
        "dataset_schema": {"columns": []}
    }
    updated3 = router_node(state3)
    assert updated3["intent"] == "direct"
    assert updated3["tool_required"] is False


def test_router_tool_intent_for_analysis_queries():
    # Calculation query
    state1 = {
        "user_query": "Calculate the average revenue by category",
        "dataset_path": "dummy.csv",
        "dataset_schema": {
            "columns": [{"name": "revenue"}, {"name": "category"}]
        }
    }
    updated1 = router_node(state1)
    assert updated1["intent"] == "analyze"
    assert updated1["tool_required"] is True
    assert "Analyst" in updated1["tool_used"]

    # Visualization query
    state2 = {
        "user_query": "Plot a bar chart of top products by revenue",
        "dataset_path": "dummy.csv",
        "dataset_schema": {
            "columns": [{"name": "product"}, {"name": "revenue"}]
        }
    }
    updated2 = router_node(state2)
    assert updated2["intent"] == "visualize"
    assert updated2["tool_required"] is True
    assert "Visualizer" in updated2["tool_used"]

    # Cleaning query
    state3 = {
        "user_query": "Audit missing values and duplicate rows in the dataset",
        "dataset_path": "dummy.csv",
        "dataset_schema": {
            "columns": [{"name": "product"}, {"name": "revenue"}]
        }
    }
    updated3 = router_node(state3)
    assert updated3["intent"] == "clean"
    assert updated3["tool_required"] is True
    assert "Cleaner" in updated3["tool_used"]


def test_full_pipeline_direct_query_execution():
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", encoding="utf-8") as f:
        f.write("customer_id,monthly_charges,churn\n")
        f.write("1,50.5,No\n")
        f.write("2,75.0,Yes\n")
        temp_path = f.name

    try:
        report = scan_dataset(temp_path)
        initial_state = {
            "analysis_id": "test_direct_session",
            "dataset_path": temp_path,
            "cleaned_file_path": None,
            "dataset_schema": {
                "columns": report["columns"],
                "total_rows": report["total_rows"],
                "total_columns": report["total_columns"],
                "sample_preview": []
            },
            "user_query": "What is customer churn?",
            "chat_history": [],
            "cleaning_report": report,
            "intent": "direct",
            "tool_required": False,
            "tool_used": [],
            "direct_response": None,
            "analysis_code": None,
            "code_execution_result": None,
            "analysis_summary": None,
            "execution_error": None,
            "retry_count": 0,
            "visualization_code": None,
            "chart_paths": [],
            "chart_description": None,
            "agent_steps": [],
            "final_response": {}
        }

        final_state = compiled_analysis_graph.invoke(initial_state)

        assert final_state is not None
        assert "final_response" in final_state
        resp = final_state["final_response"]

        # Verifications
        assert resp["is_direct_answer"] is True
        assert resp["tool_required"] is False
        assert resp["tool_used"] == []
        assert "churn" in resp["summary"].lower()

        # Check steps: direct LLM executed, but Analyst/Sandbox tools were NOT invoked
        agents_run = [s["agent"] for s in final_state["agent_steps"]]
        assert "LLM Assistant" in agents_run
        assert "Analyst" not in agents_run
        assert "Sandbox" not in agents_run
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_full_pipeline_query_without_dataset():
    """Validates that a direct question works even if no dataset is attached."""
    initial_state = {
        "analysis_id": "general_test_123",
        "dataset_path": None,
        "cleaned_file_path": None,
        "dataset_schema": {
            "columns": [],
            "total_rows": 0,
            "total_columns": 0,
            "sample_preview": []
        },
        "user_query": "Explain what a p-value represents",
        "chat_history": [],
        "cleaning_report": {},
        "intent": "direct",
        "tool_required": False,
        "tool_used": [],
        "direct_response": None,
        "analysis_code": None,
        "code_execution_result": None,
        "analysis_summary": None,
        "execution_error": None,
        "retry_count": 0,
        "visualization_code": None,
        "chart_paths": [],
        "chart_description": None,
        "agent_steps": [],
        "final_response": {}
    }

    final_state = compiled_analysis_graph.invoke(initial_state)
    assert final_state is not None
    resp = final_state["final_response"]
    assert resp["is_direct_answer"] is True
    assert resp["tool_required"] is False
    assert "p-value" in resp["summary"].lower() or "hypothesis" in resp["summary"].lower()


@pytest.mark.asyncio
async def test_api_query_endpoint_general_session():
    """Test handle_query auto-initializing general session and answering directly."""
    mock_user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        name="Tester"
    )

    req = QueryRequest(
        analysis_id="general",
        query="What is customer retention rate?"
    )

    resp = await handle_query(payload=req, current_user=mock_user)
    assert resp is not None
    assert resp.is_direct_answer is True
    assert resp.tool_required is False
    assert resp.tool_used == []
    assert "retention" in resp.summary.lower()
