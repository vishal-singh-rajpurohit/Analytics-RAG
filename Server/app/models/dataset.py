import uuid
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.db import Base
from .time import TimeStamp
from .auth import User
from .analysis import Analysis


class Dataset(TimeStamp, Base):
    __tablename__ = "datasets"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id: Mapped[UUID] = mapped_column(ForeignKey("analyses.id"), nullable=False)

    # Relationships
    analysis: Mapped["Analysis"] = relationship(back_populates="datasets")
    versions: Mapped[list["DatasetVersion"]] = relationship(back_populates="dataset", cascade="all, delete-orphan")


class DatasetVersion(TimeStamp, Base):
    __tablename__ = "dataset_versions"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[UUID] = mapped_column(ForeignKey("datasets.id"), nullable=False)
    
    version: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "1.0", "v2"
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    
    row_count: Mapped[int] = mapped_column(Integer, nullable=True)
    column_count: Mapped[int] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=True) # e.g., "processing", "ready"

    # Relationship
    dataset: Mapped["Dataset"] = relationship(back_populates="versions")