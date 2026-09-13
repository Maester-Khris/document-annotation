import React, { useState, useEffect, useCallback } from "react";
import { listDocuments, listAnnotations } from "../api.js";
import PdfViewer from "../components/PdfViewer.jsx";

const SORTS = [
  { id: "all", label: "All" },
  { id: "annotated", label: "Annotated" },
  { id: "unannotated", label: "Unannotated" },
];

export default function Workspace({ initialDoc }) {
  const [documents, setDocuments] = useState([]);
  const [annCounts, setAnnCounts] = useState({}); // docId → count
  const [selectedDoc, setSelectedDoc] = useState(initialDoc || null);
  const [sort, setSort] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await listDocuments();
      setDocuments(docs);
      // Fetch annotation counts in parallel
      const counts = await Promise.allSettled(
        docs.map(d => listAnnotations(d.id).then(anns => ({ id: d.id, count: anns.length })))
      );
      const map = {};
      for (const r of counts) {
        if (r.status === "fulfilled") map[r.value.id] = r.value.count;
      }
      setAnnCounts(map);
    } catch (_) {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // If Home navigated us here with a doc, select it
  useEffect(() => {
    if (initialDoc) setSelectedDoc(initialDoc);
  }, [initialDoc]);

  const sorted = documents.filter(d => {
    if (sort === "annotated") return (annCounts[d.id] || 0) > 0;
    if (sort === "unannotated") return (annCounts[d.id] || 0) === 0;
    return true;
  });

  const isAnnotated = (doc) => (annCounts[doc.id] || 0) > 0;

  return (
    <div className="workspace-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2 style={{ margin: 0, marginBottom: 12 }}>Documents</h2>
          <div className="sort-bar">
            <span>Show:</span>
            {SORTS.map(s => (
              <button
                key={s.id}
                className={`sort-chip ${sort === s.id ? "active" : ""}`}
                onClick={() => setSort(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-body">
          {loading && <p className="muted" style={{ textAlign: "center", paddingTop: 24 }}>Loading…</p>}

          {!loading && sorted.length === 0 && (
            <div className="empty" style={{ padding: "24px 8px" }}>
              <div className="icon">📋</div>
              <p>No documents match this filter.</p>
            </div>
          )}

          <div className="doc-list">
            {sorted.map(doc => {
              const annotated = isAnnotated(doc);
              const isSelected = selectedDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  className={`doc-item ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedDoc(doc)}
                >
                  <span className="doc-icon">📄</span>
                  <div className="doc-info">
                    <div className="doc-name" style={{ fontSize: "0.85rem" }}>
                      {doc.name || doc.filename}
                    </div>
                    <div className="doc-meta">
                      {doc.page_count != null ? `${doc.page_count}p` : "PDF"}
                      {annotated && ` · ${annCounts[doc.id]} ann.`}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                    <span className={`doc-badge ${annotated ? "badge-annotated" : "badge-unannotated"}`}>
                      {annotated ? "Annotated" : "New"}
                    </span>
                    <button
                      className={`btn btn-sm ${annotated ? "btn-ghost" : "btn-green"}`}
                      style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                      onClick={(e) => { e.stopPropagation(); setSelectedDoc(doc); }}
                    >
                      {annotated ? "Resume" : "Annotate"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Viewer panel */}
      <div className="viewer-panel">
        {selectedDoc
          ? <PdfViewer key={selectedDoc.id} document={selectedDoc} readOnly={false} />
          : (
            <div className="empty" style={{ marginTop: 80 }}>
              <div className="icon">👈</div>
              <p>Select a document from the sidebar to start annotating.</p>
            </div>
          )
        }
      </div>
    </div>
  );
}
