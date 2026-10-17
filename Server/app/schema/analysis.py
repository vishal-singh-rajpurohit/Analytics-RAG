from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class UploadFilePayload(BaseModel):
    analysis_id: Optional[str] = None


class UploadResponse(BaseModel):
    analysis_id: str
    dataset_id: str
    filename: str
    total_rows: int
    total_columns: int
    health_score: int
    cleaning_report: Dict[str, Any]
    sample_preview: List[Dict[str, Any]]
    columns: List[Dict[str, Any]]
    msg: str = "Dataset uploaded and analyzed successfully."


class QueryRequest(BaseModel):
    analysis_id: str
    query: str
    dataset_id: Optional[str] = None


class QueryResponse(BaseModel):
    analysis_id: str
    user_query: str
    intent: str
    summary: str
    code: Optional[str] = None
    result_text: Optional[str] = None
    chart_urls: List[str] = Field(default_factory=list)
    cleaning_report: Optional[Dict[str, Any]] = None
    agent_steps: List[Dict[str, Any]] = Field(default_factory=list)
    timestamp: str


class PreviewResponse(BaseModel):
    columns: List[Dict[str, Any]]
    rows: List[Dict[str, Any]]
    total_rows: int
    total_columns: int