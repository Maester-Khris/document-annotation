from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel


class Document(BaseModel):
    id: UUID
    filename: str
    file_url: str  # local static path today, CDN URL once ingestion is split out
    page_count: Optional[int] = None
    annotation_count: int = 0


class AnnotationIn(BaseModel):
    document_id: UUID
    page_number: int
    annotation_type: Literal["ignore", "capture"]
    bbox: list[float]  # [x0, y0, x1, y1] in PDF user-space units


class Annotation(AnnotationIn):
    id: UUID
    extracted_text: Optional[str] = None
    version: int = 1  # optimistic concurrency: caller must echo this back on update
