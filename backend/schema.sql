CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY, -- UUID, stored as TEXT (SQLite has no native UUID type)
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  page_count INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY, -- UUID, stored as TEXT
  document_id TEXT NOT NULL REFERENCES documents(id), -- UUID, stored as TEXT
  page_number INTEGER NOT NULL,
  annotation_type TEXT NOT NULL CHECK(annotation_type IN ('ignore', 'capture')),
  bbox TEXT NOT NULL,
  extracted_text TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_annotations_document ON annotations(document_id);
