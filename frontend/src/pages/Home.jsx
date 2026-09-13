import React, { useState, useEffect, useCallback } from "react";
import { listDocuments, uploadDocument } from "../api.js";

export default function Home({ onNavigateWorkspace }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [docName, setDocName] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDocs = useCallback(() => {
    setLoading(true);
    listDocuments()
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleFilePick = (file) => {
    if (!file || file.type !== "application/pdf") {
      showToast("Only PDF files are supported", "error");
      return;
    }
    setPendingFile(file);
    setDocName(file.name.replace(/\.pdf$/i, ""));
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      await uploadDocument(pendingFile, docName || pendingFile.name);
      showToast("Document uploaded");
      setPendingFile(null);
      setDocName("");
      fetchDocs();
    } catch (e) {
      showToast("Upload failed: " + e.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDocClick = (doc) => {
    onNavigateWorkspace(doc);
  };

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1>Document Annotator</h1>
          <p className="muted">Import construction drawings, annotate regions, extract text.</p>
        </div>

        {/* Upload card */}
        <div className="card" style={{ marginBottom: 32 }}>
          <h2>Import Document</h2>

          {/* Drop zone */}
          <label
            className={`upload-zone ${dragOver ? "drag-over" : ""}`}
            style={{ marginBottom: pendingFile ? 16 : 0 }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFilePick(e.dataTransfer.files[0]);
            }}
          >
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => handleFilePick(e.target.files[0])}
            />
            <div className="icon">📂</div>
            {pendingFile
              ? <><strong>{pendingFile.name}</strong><p>Ready to upload — set a name below</p></>
              : <><strong>Click or drag a PDF here</strong><p>Supports multi-page construction drawings</p></>
            }
          </label>

          {pendingFile && (
            <>
              <div className="field">
                <label>Document name</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Floor Plan Level 2"
                  onKeyDown={(e) => e.key === "Enter" && handleUpload()}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleUpload}
                  disabled={uploading || !docName.trim()}
                >
                  {uploading ? "Uploading…" : "⬆ Upload"}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => { setPendingFile(null); setDocName(""); }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>

        {/* Document list */}
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Documents</h2>
          <button className="btn btn-ghost btn-sm" onClick={fetchDocs}>↻ Refresh</button>
        </div>

        {loading && <div className="empty"><div className="icon">⏳</div><p>Loading…</p></div>}

        {!loading && documents.length === 0 && (
          <div className="empty">
            <div className="icon">📋</div>
            <p>No documents yet. Import a PDF above to get started.</p>
          </div>
        )}

        {!loading && documents.length > 0 && (
          <div className="doc-list">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="doc-item"
                onClick={() => handleDocClick(doc)}
                title="Open in Workspace"
              >
                <span className="doc-icon">📄</span>
                <div className="doc-info">
                  <div className="doc-name">{doc.name || doc.filename}</div>
                  <div className="doc-meta">
                    {doc.page_count != null ? `${doc.page_count} pages` : "PDF"}
                    {doc.annotation_count > 0 && ` · ${doc.annotation_count} annotations`}
                  </div>
                </div>
                <span className={`doc-badge ${doc.annotation_count > 0 ? "badge-annotated" : "badge-unannotated"}`}>
                  {doc.annotation_count > 0 ? "Annotated" : "New"}
                </span>
                <span style={{ color: "var(--muted)", fontSize: "1.1rem" }}>→</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
