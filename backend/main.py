from pathlib import Path

from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from models import Annotation, AnnotationIn, Document

UPLOAD_DIR = Path(__file__).parent / "data" / "uploads"
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


@app.post("/documents", response_model=Document)
def upload_document(file: UploadFile):
    # ponytail: scaffold only — save file under UPLOAD_DIR/{id}.pdf, insert row,
    # return Document with file_url="/uploads/{id}.pdf" (served by the mount above)
    raise NotImplementedError


@app.get("/documents/{document_id}/annotations", response_model=list[Annotation])
def list_annotations(document_id: str, page: int | None = None):
    # ponytail: scaffold only — SELECT from annotations, optional page filter
    raise NotImplementedError


@app.post("/documents/{document_id}/annotations", response_model=Annotation)
def create_annotation(document_id: str, annotation: AnnotationIn):
    # ponytail: scaffold only — INSERT into annotations, return with generated id
    raise NotImplementedError
