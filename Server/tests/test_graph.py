import os
import tempfile
import pandas as pd

from app.graph.builder import compiled_analysis_graph
from app.agents.cleaner.cleaner import scan_dataset


def test_full_langgraph_pipeline_execution():
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", encoding="utf-8") as f:
        f.write("product,category,revenue\n")
        f.write("Laptop,Electronics,1200\n")
        f.write("Phone,Electronics,800\n")
        f.write("Shirt,Apparel,50\n")
        f.write("Desk,Furniture,300\n")
        temp_path = f.name

    try:
        report = scan_dataset(temp_path)
        initial_state = {
            "analysis_id": "test_analysis_123",
            "dataset_path": temp_path,
            "cleaned_file_path": None,
            "dataset_schema": {
                "columns": report["columns"],
                "total_rows": report["total_rows"],
                "total_columns": report["total_columns"],
                "sample_preview": []
            },
            "user_query": "What is the total revenue by category?",
            "chat_history": [],
            "cleaning_report": report,
            "intent": "analyze",
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
        response = final_state["final_response"]
        assert response["analysis_id"] == "test_analysis_123"
        assert len(final_state["agent_steps"]) >= 2
        # Analyst and Sandbox should have executed
        agents_run = [step["agent"] for step in final_state["agent_steps"]]
        assert "Analyst" in agents_run
        assert "Sandbox" in agents_run
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    test_full_langgraph_pipeline_execution()
    print("ALL GRAPH TESTS PASSED!")
