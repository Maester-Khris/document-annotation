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
- **Backend**: FastAPI with two resources — `POST /documents` (upload a PDF)
  and `GET/POST /documents/{id}/annotations` (list/create annotations).
- **Storage**: SQLite (`backend/data/app.db`), schema in `backend/schema.sql`,
  bootstrapped by `init-db.sh`. Uploaded PDFs are stored on disk under
  `backend/data/uploads/`.
- **Data model**: each annotation stores `document_id`, `page_number`,
  `annotation_type` (`ignore`/`capture`), and `bbox` — required fields for a
  multipage document to reload correctly.

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
