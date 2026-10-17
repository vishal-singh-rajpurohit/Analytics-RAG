import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.db import Base
from .time import TimeStamp
# from .auth import User


class Analysis(TimeStamp, Base):
    __tablename__ = "analyses"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    userId: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)

    # Optional relationships for back-population
    user: Mapped["User"] = relationship(back_populates="analyses")
    messages: Mapped[list["Message"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")
    datasets: Mapped[list["Dataset"]] = relationship("Dataset", back_populates="analysis", cascade="all, delete-orphan")


class Message(TimeStamp, Base):
    __tablename__ = "messages"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id: Mapped[UUID] = mapped_column(ForeignKey("analyses.id"), nullable=False)
    
    # Role can be restricted at the application layer or via CheckConstraint ("User" | "Agent")
    role: Mapped[str] = mapped_column(String(20), nullable=False) 
    
    # Stores the agent's response format as a list/array inside JSON
    content: Mapped[list | dict] = mapped_column(JSON, nullable=False) 
    
    # Stores graphic attachments or visualization payloads as a JSON list
    graphics: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)

    analysis: Mapped["Analysis"] = relationship(back_populates="messages")