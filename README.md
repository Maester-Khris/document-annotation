# PDF Annotator

A small web app for viewing a multipage PDF and annotating it with red
(ignore) and green (capture) rectangles, with annotations persisted across
restarts.

## Required

### List of tasks

- Import and view a multipage PDF
- Move between pages
- Draw red rectangles around content to ignore
- Draw green rectangles around text to capture
- Save annotations so they survive an application restart

### Our approach

- **Frontend**: React + Vite, PDF rendered with `pdf.js` via its vector/text
  layer onto a `<canvas>` per page, with a transparent overlay canvas on top
  to capture rectangle drawing (mouse down/move/up -> bbox in PDF
  user-space coordinates).
- **Backend**: FastAPI with two resources — `GET/POST /documents` (list/upload
  PDFs) and `GET/POST /documents/{id}/annotations` (list/create annotations).
- **Storage**: SQLite (`backend/data/app.db`), schema in `backend/schema.sql`,
  bootstrapped by `init-db.sh`. Uploaded PDFs are stored on disk under
  `backend/documents/uploads/` and served through a dedicated static mount
  (`/uploads/...`), not proxied through a business-logic endpoint — the
  frontend only ever consumes `Document.file_url`, so this is a drop-in
  swap point for S3/CDN-backed storage later.
- **Data model** (`backend/schema.sql`):

  ```sql
  documents
    id            TEXT PRIMARY KEY        -- UUID (SQLite has no native UUID type)
    filename      TEXT NOT NULL
    file_url      TEXT NOT NULL           -- static mount path, e.g. /uploads/{id}.pdf
    page_count    INTEGER
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP

  annotations
    id                TEXT PRIMARY KEY        -- UUID
    document_id       TEXT NOT NULL REFERENCES documents(id)  -- UUID
    page_number       INTEGER NOT NULL        -- required: multipage doc
    annotation_type   TEXT NOT NULL           -- 'ignore' | 'capture'
    bbox              TEXT NOT NULL           -- JSON [x0, y0, x1, y1], PDF user-space
    extracted_text    TEXT                    -- populated by OCR (see Additional)
    version           INTEGER NOT NULL DEFAULT 1  -- optimistic concurrency (see Next steps)
    created_at        TEXT DEFAULT CURRENT_TIMESTAMP
  ```

  `Document.file_url` (API response field, not a stored column) is derived
  from `id` — resolves to the local static mount today, a CDN URL once
  ingestion is split out (see Next steps).

  `id`/`document_id` are UUIDs, validated as such at the API boundary
  (Pydantic's `UUID` type in `models.py`), but cast to plain strings for
  SQLite storage and for the JSON wire format — SQLite has no native UUID
  type, and a string is the fastest thing to work with while iterating
  locally. Revisit if a binary/native UUID column becomes worth it (e.g. on
  Postgres, which has one) purely for storage-size or index-performance
  reasons — not required at this scale.

### What we found out


## Additional (local OCR)

- Bonus scope: run OCR locally on the contents of each green ("capture")
rectangle and save the extracted text alongside the annotation. 
- What we did

## Next steps

- Implement the upload/annotation endpoints (currently scaffolded, not wired
  to SQLite yet)
- Implement PDF rendering + rectangle drawing in `App.jsx`
- Wire local OCR (`pytesseract`) on capture rectangles
- Record a short walkthrough video
- Capture setup/run commands as a script or log
- Split document ingestion into its own layer (upload → object storage →
  CDN), so serving a large PDF no longer round-trips through the app
  backend at all; `Document.file_url` already isolates the frontend from
  this change
- Concurrent editing: SQLite serializes writers (no Postgres-style
  row-level MVCC), so move to Postgres before multiple people edit the
  same project at once. Concurrent inserts of different annotations need
  no coordination (independent rows); conflicting edits to the *same*
  annotation are handled with optimistic concurrency — a conditional
  `UPDATE ... WHERE id = ? AND version = ?` — with the actual
  accept/reject/merge policy as app-level logic, not yet implemented
