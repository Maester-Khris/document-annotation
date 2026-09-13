import shutil
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from db import get_connection
from models import Annotation, AnnotationIn, Document

UPLOAD_DIR = Path(__file__).parent / "documents" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="PDF Annotator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ponytail: local stand-in for an S3/CDN-backed ingestion layer — the frontend
# only ever consumes Document.file_url, so swapping this mount for a real CDN
# URL later touches this one line, not the frontend.
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/documents", response_model=list[Document])
def list_documents():
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT d.*, COUNT(a.id) AS annotation_count
        FROM documents d
        LEFT JOIN annotations a ON a.document_id = d.id
        GROUP BY d.id
        ORDER BY d.created_at DESC
        """
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.post("/documents", response_model=Document)
def upload_document(file: UploadFile, name: str):
    if file.content_type != "application/pdf":
        raise HTTPException(400, "Only PDF files are supported")

    doc_id = uuid.uuid4()
    dest = UPLOAD_DIR / f"{doc_id}.pdf"
    with dest.open("wb") as out:
        shutil.copyfileobj(file.file, out)

    try:
        page_count = len(PdfReader(dest).pages)
    except PdfReadError:
        page_count = None  # malformed upload; keep the file, just skip the count

    file_url = f"/uploads/{doc_id}.pdf"
    conn = get_connection()
    conn.execute(
        "INSERT INTO documents (id, filename, file_url, page_count) VALUES (?, ?, ?, ?)",
        (str(doc_id), name, file_url, page_count),
    )
    conn.commit()
    conn.close()

    return Document(id=doc_id, filename=name, file_url=file_url, page_count=page_count)


@app.get("/documents/{document_id}/annotations", response_model=list[Annotation])
def list_annotations(document_id: str, page: int | None = None):
    # ponytail: scaffold only — SELECT from annotations, optional page filter
    raise NotImplementedError


@app.post("/documents/{document_id}/annotations", response_model=Annotation)
def create_annotation(document_id: str, annotation: AnnotationIn):
    # ponytail: scaffold only — INSERT into annotations, return with generated id
    raise NotImplementedError
