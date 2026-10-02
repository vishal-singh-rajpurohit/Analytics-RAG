import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column



class TimeStamp:
    created_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )