import os
from typing import Optional
from fastapi import APIRouter, status, Depends, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.db import get_db
from app.models.auth import User
from app.controllers import analysis_controller, auth_controller
from app.schema.analysis import (
    UploadResponse,
    QueryRequest,
    QueryResponse,
    PreviewResponse,
)

router = APIRouter(tags=["Analysis"])

@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    csv: UploadFile = File(...),
    analysis_id: Optional[str] = Form(None),
    current_user: User = Depends(auth_controller.get_current_user),
    db: Optional[AsyncSession] = Depends(get_db)
):
    """
    Uploads exactly one CSV dataset for an analysis chat session.
    Requires user authentication.
    Rejects if the analysis chat session already has an uploaded dataset.
    """
    return await analysis_controller.handle_upload(
        csv=csv,
        analysis_id=analysis_id,
        current_user=current_user,
        db=db
    )


@router.post("/new", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def new_analysis(
    csv: UploadFile = File(...),
    analysis_id: Optional[str] = Form(None),
    current_user: User = Depends(auth_controller.get_current_user),
    db: Optional[AsyncSession] = Depends(get_db)
):
    """
    Creates a new analysis chat session with a single CSV dataset.
    Requires user authentication.
    """
    return await analysis_controller.handle_upload(
        csv=csv,
        analysis_id=analysis_id,
        current_user=current_user,
        db=db
    )


@router.delete("/{analysis_id}", status_code=status.HTTP_200_OK)
async def delete_analysis(
    analysis_id: str,
    current_user: User = Depends(auth_controller.get_current_user),
    db: Optional[AsyncSession] = Depends(get_db)
):
    """
    Deletes an analysis chat session, its associated CSV dataset, and artifacts.
    Requires user authentication and ownership of the analysis session.
    """
    return await analysis_controller.handle_delete_analysis(
        analysis_id=analysis_id,
        current_user=current_user,
        db=db
    )


@router.post("/query", response_model=QueryResponse)
async def query_dataset(
    payload: QueryRequest,
    current_user: User = Depends(auth_controller.get_current_user),
    db: Optional[AsyncSession] = Depends(get_db)
):
    """
    Submits a natural language query to the LangGraph Multi-Agent workflow:
    Cleaner -> Analyst -> Sandbox -> Fixer -> Visualizer -> Synthesizer.
    Requires user authentication and ownership of the analysis session.
    """
    return await analysis_controller.handle_query(
        payload=payload,
        current_user=current_user,
        db=db
    )


@router.get("/datasets")
async def list_datasets(
    current_user: User = Depends(auth_controller.get_current_user),
):
    """
    Returns list of all uploaded and analyzed datasets belonging to current authenticated user.
    """
    return await analysis_controller.handle_list_datasets(current_user=current_user)


@router.get("/{analysis_id}")
async def get_analysis_metadata(
    analysis_id: str,
    current_user: User = Depends(auth_controller.get_current_user),
):
    """
    Fetches full metadata and cleaning report for a specific analysis session.
    Requires user authentication and ownership of the analysis session.
    """
    return await analysis_controller.handle_get_analysis(
        analysis_id=analysis_id,
        current_user=current_user
    )


@router.get("/{analysis_id}/preview", response_model=PreviewResponse)
async def get_preview(
    analysis_id: str,
    limit: int = Query(50, ge=1, le=500),
    current_user: User = Depends(auth_controller.get_current_user),
):
    """
    Fetches paginated data rows and column types for table inspection.
    Requires user authentication and ownership of the analysis session.
    """
    return await analysis_controller.handle_preview(
        analysis_id=analysis_id,
        limit=limit,
        current_user=current_user
    )


@router.get("/charts/{filename}")
async def get_chart_image(filename: str):
    """
    Serves generated Matplotlib visualization images.
    """
    charts_dir = os.path.join("app", "uploads", "charts")
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(charts_dir, safe_filename)

    if not os.path.exists(file_path):
        return FileResponse(
            os.path.join("app", "public", "placeholder_chart.png") 
            if os.path.exists("app/public/placeholder_chart.png") 
            else file_path,
            status_code=404
        )

    return FileResponse(file_path, media_type="image/png")