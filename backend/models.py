from typing import Literal, Optional

from pydantic import BaseModel


class Document(BaseModel):
    id: str
    filename: str
    file_url: str  # local static path today, CDN URL once ingestion is split out
    page_count: Optional[int] = None


class AnnotationIn(BaseModel):
    document_id: str
    page_number: int
    annotation_type: Literal["ignore", "capture"]
    bbox: list[float]  # [x0, y0, x1, y1] in PDF user-space units


class Annotation(AnnotationIn):
    id: str
    extracted_text: Optional[str] = None
