from typing import TypedDict, List, Dict, Any, Optional

class AnalysisState(TypedDict):
    analysis_id: str
    dataset_path: str
    cleaned_file_path: Optional[str]
    dataset_schema: Dict[str, Any]
    user_query: str
    chat_history: List[Dict[str, str]]
    
    # Cleaner Agent outputs
    cleaning_report: Dict[str, Any]
    
    # Intent / Router
    intent: str  # "clean" | "analyze" | "visualize" | "general"
    
    # Analyst Agent outputs
    analysis_code: Optional[str]
    code_execution_result: Optional[str]
    analysis_summary: Optional[str]
    
    # Sandbox & Self-Healing
    execution_error: Optional[str]
    retry_count: int
    
    # Visualizer Agent outputs
    visualization_code: Optional[str]
    chart_paths: List[str]
    chart_description: Optional[str]
    
    # Execution Timeline & Final Response
    agent_steps: List[Dict[str, Any]]
    final_response: Dict[str, Any]