import os
import uuid
import json
import aiofiles
import pandas as pd
from typing import Optional, Dict, Any, List
from datetime import datetime

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config.config import settings
from app.models.auth import User
from app.models.analysis import Analysis, Message
from app.models.dataset import Dataset, DatasetVersion
from app.agents.cleaner.cleaner import scan_dataset
from app.graph.builder import compiled_analysis_graph
from app.schema.analysis import UploadFilePayload, UploadResponse, QueryRequest, QueryResponse, PreviewResponse
from app.utils.csv_loader import read_csv_robust, sanitize_for_json, dataframe_to_json_records


UPLOAD_RAW_DIR = os.path.join("app", "uploads", "raw")
UPLOAD_CHARTS_DIR = os.path.join("app", "uploads", "charts")

os.makedirs(UPLOAD_RAW_DIR, exist_ok=True)
os.makedirs(UPLOAD_CHARTS_DIR, exist_ok=True)


def _get_meta_path(analysis_id: str) -> str:
    return os.path.join(UPLOAD_RAW_DIR, f"{analysis_id}_meta.json")


def _save_session_meta(analysis_id: str, meta: Dict[str, Any]):
    meta_path = _get_meta_path(analysis_id)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, default=str)


def _load_session_meta(analysis_id: str) -> Optional[Dict[str, Any]]:
    meta_path = _get_meta_path(analysis_id)
    if os.path.exists(meta_path):
        with open(meta_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

async def handle_upload(
    csv: UploadFile,
    analysis_id: Optional[str] = None,
    current_user: Optional[User] = None,
    db: Optional[AsyncSession] = None
) -> UploadResponse:
    if not csv.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only CSV files (.csv) are supported."
        )

    # Strictly enforce: Only 1 CSV file per Analysis (Chat) session
    if analysis_id:
        existing_meta = _load_session_meta(analysis_id)
        if existing_meta:
            if current_user and existing_meta.get("user_id") and existing_meta.get("user_id") != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to access this analysis session."
                )

            if existing_meta.get("dataset_path") or existing_meta.get("original_filename"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Analysis session '{analysis_id}' already has an uploaded dataset ('{existing_meta.get('original_filename', 'CSV')}'). "
                           "Each analysis chat is strictly limited to one CSV file. Multiple CSV files cannot be uploaded to the same analysis chat. "
                           "Please start a new analysis chat to analyze a different dataset."
                )

        if db and current_user:
            try:
                stmt = select(Dataset).where(Dataset.analysis_id == uuid.UUID(analysis_id))
                res = await db.execute(stmt)
                if res.scalar_one_or_none():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Analysis session '{analysis_id}' already has a dataset registered in database. "
                               "Each analysis chat is strictly limited to one CSV file."
                    )
            except HTTPException:
                raise
            except Exception as e:
                print(f"[DB-LOG] DB single-dataset check skipped: {e}")

        session_id = analysis_id
    else:
        session_id = str(uuid.uuid4())

    file_bytes = await csv.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty. Please provide a valid CSV dataset."
        )

    safe_filename = "".join(c for c in csv.filename if c.isalnum() or c in "._- ")
    dataset_filename = f"{session_id}_{safe_filename}"
    file_path = os.path.join(UPLOAD_RAW_DIR, dataset_filename)

    # Save CSV file to disk
    async with aiofiles.open(file_path, "wb") as buffer:
        await buffer.write(file_bytes)

    # Run Cleaner Agent audit
    cleaning_report = sanitize_for_json(scan_dataset(file_path))

    # Load preview dataframe
    try:
        df_preview = read_csv_robust(file_path, nrows=10)
        sample_preview = dataframe_to_json_records(df_preview)
    except Exception:
        sample_preview = []

    columns_summary = cleaning_report.get("columns", [])

    # Persist session metadata
    meta = {
        "analysis_id": session_id,
        "dataset_path": file_path,
        "original_filename": csv.filename,
        "total_rows": cleaning_report.get("total_rows", 0),
        "total_columns": cleaning_report.get("total_columns", 0),
        "health_score": cleaning_report.get("health_score", 100),
        "cleaning_report": cleaning_report,
        "sample_preview": sample_preview,
        "columns": columns_summary,
        "chat_history": [],
        "created_at": datetime.utcnow().isoformat(),
        "user_id": str(current_user.id) if current_user else "anonymous"
    }
    _save_session_meta(session_id, meta)

    # Optional DB storage if database is available
    if db and current_user:
        try:
            analysis = Analysis(
                id=uuid.UUID(session_id),
                title=f"Analysis: {csv.filename}",
                userId=uuid.UUID(str(current_user.id)),
                status="READY"
            )
            db.add(analysis)
            await db.flush()

            dataset = Dataset(analysis_id=analysis.id)
            db.add(dataset)
            await db.flush()

            dataset_version = DatasetVersion(
                dataset_id=dataset.id,
                version="V1",
                original_filename=csv.filename,
                original_url=file_path,
                file_url=file_path,
                row_count=cleaning_report.get("total_rows", 0),
                column_count=cleaning_report.get("total_columns", 0),
                status="ready"
            )
            db.add(dataset_version)
            await db.commit()
        except Exception as e:
            print(f"[DB-LOG] Optional DB persist skipped: {e}")

    return UploadResponse(
        analysis_id=session_id,
        dataset_id=session_id,
        filename=csv.filename,
        total_rows=cleaning_report.get("total_rows", 0),
        total_columns=cleaning_report.get("total_columns", 0),
        health_score=cleaning_report.get("health_score", 100),
        cleaning_report=cleaning_report,
        sample_preview=sample_preview,
        columns=columns_summary,
        msg="Dataset successfully uploaded, scanned, and bound to this analysis chat session."
    )


async def handle_delete_analysis(
    analysis_id: str,
    current_user: Optional[User] = None,
    db: Optional[AsyncSession] = None
) -> Dict[str, Any]:
    """
    Deletes an analysis chat session and cleans up its associated CSV and artifacts.
    """
    meta = _load_session_meta(analysis_id)
    if not meta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis session '{analysis_id}' not found."
        )

    if current_user and meta.get("user_id") and meta.get("user_id") != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this analysis session."
        )

    # Remove CSV file
    dataset_path = meta.get("dataset_path", "")
    if dataset_path and os.path.exists(dataset_path):
        try:
            os.remove(dataset_path)
        except Exception as e:
            print(f"[CLEANUP] Could not remove CSV file {dataset_path}: {e}")

    if dataset_path:
        fallback_path = os.path.join(UPLOAD_RAW_DIR, os.path.basename(dataset_path))
        if os.path.exists(fallback_path):
            try:
                os.remove(fallback_path)
            except Exception:
                pass

    # Remove metadata file
    meta_path = _get_meta_path(analysis_id)
    if os.path.exists(meta_path):
        try:
            os.remove(meta_path)
        except Exception:
            pass

    # Optional DB delete
    if db:
        try:
            stmt = select(Analysis).where(Analysis.id == uuid.UUID(analysis_id))
            res = await db.execute(stmt)
            analysis_obj = res.scalar_one_or_none()
            if analysis_obj:
                await db.delete(analysis_obj)
                await db.commit()
        except Exception as e:
            print(f"[DB-LOG] DB delete skipped: {e}")

    return {
        "status": "success",
        "analysis_id": analysis_id,
        "message": f"Analysis chat '{analysis_id}' and its single CSV dataset were successfully deleted."
    }


async def handle_query(
    payload: QueryRequest,
    current_user: Optional[User] = None,
    db: Optional[AsyncSession] = None
) -> QueryResponse:
    """
    Executes LangGraph multi-agent workflow for a natural language user query.
    """
    meta = _load_session_meta(payload.analysis_id)
    if not meta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis session '{payload.analysis_id}' not found. Please upload a dataset first."
        )

    if current_user and meta.get("user_id") and meta.get("user_id") != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this analysis session."
        )

    dataset_path = meta.get("dataset_path", "")
    if not os.path.exists(dataset_path):
        fallback_path = os.path.join(UPLOAD_RAW_DIR, os.path.basename(dataset_path))
        if os.path.exists(fallback_path):
            dataset_path = fallback_path
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dataset file missing on disk for analysis '{payload.analysis_id}'."
            )

    # Initialize LangGraph state
    initial_state = {
        "analysis_id": payload.analysis_id,
        "dataset_path": dataset_path,
        "cleaned_file_path": None,
        "dataset_schema": {
            "columns": meta.get("columns", []),
            "total_rows": meta.get("total_rows", 0),
            "total_columns": meta.get("total_columns", 0),
            "sample_preview": meta.get("sample_preview", [])
        },
        "user_query": payload.query,
        "chat_history": meta.get("chat_history", []),
        "cleaning_report": meta.get("cleaning_report", {}),
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

    # Run LangGraph multi-agent pipeline
    try:
        final_state = compiled_analysis_graph.invoke(initial_state)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Multi-agent execution encountered an error: {str(e)}"
        )

    resp_data = final_state.get("final_response", {})

    # Append query and rich response to chat history in meta
    history = meta.get("chat_history", [])
    now_iso = datetime.utcnow().isoformat()
    history.append({
        "role": "user",
        "content": payload.query,
        "timestamp": now_iso
    })
    history.append({
        "role": "assistant",
        "content": resp_data.get("summary", ""),
        "code": resp_data.get("code"),
        "chart_urls": resp_data.get("chart_urls", []),
        "agent_steps": resp_data.get("agent_steps", []),
        "result_text": resp_data.get("result_text"),
        "timestamp": now_iso
    })
    meta["chat_history"] = history
    _save_session_meta(payload.analysis_id, meta)

    return QueryResponse(
        analysis_id=payload.analysis_id,
        user_query=payload.query,
        intent=resp_data.get("intent", "analyze"),
        summary=resp_data.get("summary", ""),
        code=resp_data.get("code"),
        result_text=resp_data.get("result_text"),
        chart_urls=resp_data.get("chart_urls", []),
        cleaning_report=resp_data.get("cleaning_report"),
        agent_steps=resp_data.get("agent_steps", []),
        timestamp=datetime.utcnow().isoformat()
    )


async def handle_preview(
    analysis_id: str,
    limit: int = 50,
    current_user: Optional[User] = None
) -> PreviewResponse:
    """
    Returns paginated rows and column definitions for table inspection.
    """
    meta = _load_session_meta(analysis_id)
    if not meta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis session not found."
        )

    if current_user and meta.get("user_id") and meta.get("user_id") != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to preview this dataset."
        )

    file_path = meta.get("dataset_path", "")

    if not os.path.exists(file_path):
        fallback_path = os.path.join(UPLOAD_RAW_DIR, os.path.basename(file_path))
        if os.path.exists(fallback_path):
            file_path = fallback_path
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset file missing."
            )

    try:
        df = read_csv_robust(file_path, nrows=limit)
        rows = dataframe_to_json_records(df)
        columns = [{"name": str(col), "dtype": str(df[col].dtype)} for col in df.columns]

        return PreviewResponse(
            columns=columns,
            rows=rows,
            total_rows=meta.get("total_rows", len(df)),
            total_columns=meta.get("total_columns", len(df.columns))
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read dataset preview: {str(e)}"
        )


async def handle_list_datasets(current_user: Optional[User] = None) -> List[Dict[str, Any]]:
    """
    Lists all uploaded datasets found in the system for the given user.
    """
    datasets = []
    if os.path.exists(UPLOAD_RAW_DIR):
        for fname in os.listdir(UPLOAD_RAW_DIR):
            if fname.endswith("_meta.json"):
                fpath = os.path.join(UPLOAD_RAW_DIR, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                        datasets.append({
                            "analysis_id": meta.get("analysis_id"),
                            "filename": meta.get("original_filename", fname.replace("_meta.json", "")),
                            "total_rows": meta.get("total_rows", 0),
                            "total_columns": meta.get("total_columns", 0),
                            "health_score": meta.get("health_score", 100),
                            "created_at": meta.get("created_at"),
                            "user_id": meta.get("user_id")
                        })
                except Exception:
                    pass
    if current_user:
        datasets = [d for d in datasets if d.get("user_id") == str(current_user.id)]
    return sorted(datasets, key=lambda x: str(x.get("created_at") or ""), reverse=True)


async def handle_get_analysis(
    analysis_id: str,
    current_user: Optional[User] = None
) -> Dict[str, Any]:
    """
    Retrieves full analysis metadata, schema, and cleaning report.
    """
    meta = _load_session_meta(analysis_id)
    if not meta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis session '{analysis_id}' not found."
        )

    if current_user and meta.get("user_id") and meta.get("user_id") != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this analysis session."
        )

    return sanitize_for_json(meta)
