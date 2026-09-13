from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from models import Annotation, AnnotationIn, Document

app = FastAPI(title="PDF Annotator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/documents", response_model=Document)
def upload_document(file: UploadFile):
    # ponytail: scaffold only — save file under data/uploads, insert row, return Document
    raise NotImplementedError


@app.get("/documents/{document_id}/annotations", response_model=list[Annotation])
def list_annotations(document_id: str, page: int | None = None):
    # ponytail: scaffold only — SELECT from annotations, optional page filter
    raise NotImplementedError


@app.post("/documents/{document_id}/annotations", response_model=Annotation)
def create_annotation(document_id: str, annotation: AnnotationIn):
    # ponytail: scaffold only — INSERT into annotations, return with generated id
    raise NotImplementedError
