import React, { useState, useEffect, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import { listAnnotations, createAnnotation, deleteAnnotation } from "../api.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const TOOL_CAPTURE = "capture";
const TOOL_IGNORE = "ignore";
const COLORS = {
  capture: { stroke: "#22c55e", fill: "rgba(34,197,94,0.12)" },
  ignore: { stroke: "#ef4444", fill: "rgba(239,68,68,0.12)" },
};

/** Single rendered PDF page with annotation overlay */
function PdfPage({ pdf, pageNum, scale, annotations, onAddAnnotation, onDeleteAnnotation, tool, readOnly }) {
  const canvasRef = React.useRef(null);
  const overlayRef = React.useRef(null);
  const [drawing, setDrawing] = useState(null); // {x, y, w, h} in canvas coords
  const [viewport, setViewport] = useState(null);
  const renderTaskRef = React.useRef(null);

  // Render PDF page
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pdf || !canvasRef.current) return;
      const page = await pdf.getPage(pageNum);
      const vp = page.getViewport({ scale });
      setViewport(vp);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      canvas.width = vp.width;
      canvas.height = vp.height;
      // Cancel any pending render
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (_) {}
      }
      if (cancelled) return;
      const task = page.render({ canvasContext: ctx, viewport: vp });
      renderTaskRef.current = task;
      try {
        await task.promise;
      } catch (e) {
        if (e?.name !== "RenderingCancelledException") console.error(e);
      }
    })();
    return () => { cancelled = true; };
  }, [pdf, pageNum, scale]);

  // Draw annotation overlay
  useEffect(() => {
    if (!overlayRef.current || !viewport) return;
    const canvas = overlayRef.current;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved annotations
    for (const ann of annotations) {
      const [x0, y0, x1, y1] = bboxToCanvas(ann.bbox, viewport);
      const { stroke, fill } = COLORS[ann.annotation_type] || COLORS.ignore;
      ctx.fillStyle = fill;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    }

    // Draw in-progress rect
    if (drawing) {
      const { stroke, fill } = COLORS[tool] || COLORS.capture;
      ctx.fillStyle = fill;
      ctx.fillRect(drawing.x, drawing.y, drawing.w, drawing.h);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(drawing.x, drawing.y, drawing.w, drawing.h);
      ctx.setLineDash([]);
    }
  }, [annotations, drawing, viewport, tool]);

  // Convert PDF bbox [x0,y0,x1,y1] (PDF user-space) to canvas coords
  function bboxToCanvas([px0, py0, px1, py1], vp) {
    // PDF y-axis is bottom-up; canvas y-axis top-down
    const [cx0, cy0] = vp.convertToViewportPoint(px0, py0);
    const [cx1, cy1] = vp.convertToViewportPoint(px1, py1);
    return [
      Math.min(cx0, cx1), Math.min(cy0, cy1),
      Math.max(cx0, cx1), Math.max(cy0, cy1),
    ];
  }

  function canvasToBbox(cx0, cy0, cx1, cy1, vp) {
    // Inverse: canvas → PDF user-space
    const [px0, py0] = vp.convertToPdfPoint(Math.min(cx0, cx1), Math.min(cy0, cy1));
    const [px1, py1] = vp.convertToPdfPoint(Math.max(cx0, cx1), Math.max(cy0, cy1));
    return [px0, py0, px1, py1];
  }

  function getPos(e) {
    const rect = overlayRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  const onMouseDown = useCallback((e) => {
    if (readOnly) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    setDrawing({ x, y, w: 0, h: 0, startX: x, startY: y });
  }, [readOnly]);

  const onMouseMove = useCallback((e) => {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    setDrawing(d => ({
      ...d,
      x: Math.min(d.startX, x),
      y: Math.min(d.startY, y),
      w: Math.abs(x - d.startX),
      h: Math.abs(y - d.startY),
    }));
  }, [drawing]);

  const onMouseUp = useCallback((e) => {
    if (!drawing || !viewport) { setDrawing(null); return; }
    e.preventDefault();
    const { w, h } = drawing;
    if (w < 5 || h < 5) { setDrawing(null); return; } // ignore tiny clicks
    const bbox = canvasToBbox(drawing.x, drawing.y, drawing.x + drawing.w, drawing.y + drawing.h, viewport);
    onAddAnnotation({ page_number: pageNum, annotation_type: tool, bbox });
    setDrawing(null);
  }, [drawing, viewport, tool, pageNum, onAddAnnotation]);

  return (
    <div className="pdf-page-wrapper">
      <canvas ref={canvasRef} />
      <canvas
        ref={overlayRef}
        className="annotation-layer"
        style={{ cursor: readOnly ? "default" : "crosshair" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => setDrawing(null)}
      />
    </div>
  );
}

/** Full multi-page PDF viewer with toolbar */
export default function PdfViewer({ document, readOnly = false }) {
  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.3);
  const [tool, setTool] = useState(TOOL_CAPTURE);
  const [annotations, setAnnotations] = useState([]); // all annotations for this doc
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load PDF
  useEffect(() => {
    if (!document) return;
    setPdf(null);
    setAnnotations([]);
    setCurrentPage(1);
    setLoading(true);
    setError(null);

    const url = `http://localhost:8000/documents/${document.id}/file`;
    pdfjsLib.getDocument(url).promise
      .then((pdfDoc) => {
        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        setLoading(false);
      })
      .catch((e) => {
        setError("Failed to load PDF: " + e.message);
        setLoading(false);
      });
  }, [document?.id]);

  // Load annotations
  useEffect(() => {
    if (!document) return;
    listAnnotations(document.id)
      .then(setAnnotations)
      .catch(() => setAnnotations([]));
  }, [document?.id]);

  const pageAnnotations = annotations.filter(a => a.page_number === currentPage);

  const handleAdd = useCallback(async (ann) => {
    try {
      const saved = await createAnnotation(document.id, ann);
      setAnnotations(prev => [...prev, saved]);
    } catch (e) {
      // Optimistic offline fallback: store with temp id
      setAnnotations(prev => [...prev, { ...ann, id: `tmp-${Date.now()}` }]);
    }
  }, [document?.id]);

  const handleDelete = useCallback(async (id) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    try { await deleteAnnotation(document.id, id); } catch (_) {}
  }, [document?.id]);

  if (!document) return (
    <div className="empty"><div className="icon">📄</div><p>Select a document to view</p></div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Toolbar */}
      <div className="viewer-toolbar">
        {!readOnly && (
          <>
            <span className="tool-label">Draw:</span>
            <button
              className={`btn btn-sm ${tool === TOOL_CAPTURE ? "btn-green" : "btn-ghost"}`}
              onClick={() => setTool(TOOL_CAPTURE)}
              title="Draw green capture rectangle"
            >🟢 Capture</button>
            <button
              className={`btn btn-sm ${tool === TOOL_IGNORE ? "" : "btn-ghost"}`}
              style={tool === TOOL_IGNORE ? { background: "#ef4444", color: "#fff" } : {}}
              onClick={() => setTool(TOOL_IGNORE)}
              title="Draw red ignore rectangle"
            >🔴 Ignore</button>
            <div className="legend" style={{ marginLeft: 12 }}>
              <span className="legend-item">
                <span className="legend-dot green" />
                <span className="muted">capture</span>
              </span>
              <span className="legend-item">
                <span className="legend-dot red" />
                <span className="muted">ignore</span>
              </span>
            </div>
          </>
        )}

        <div className="page-nav">
          <button className="btn btn-ghost btn-sm" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>−</button>
          <span>{Math.round(scale * 100)}%</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setScale(s => Math.min(3, s + 0.2))}>+</button>
          <span style={{ marginLeft: 8 }}>Page</span>
          <button className="btn btn-ghost btn-sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>‹</button>
          <span>{currentPage} / {numPages || "?"}</span>
          <button className="btn btn-ghost btn-sm" disabled={currentPage >= numPages} onClick={() => setCurrentPage(p => p + 1)}>›</button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="canvas-container">
        {loading && <div className="empty"><div className="icon">⏳</div><p>Loading PDF…</p></div>}
        {error && <div className="empty"><div className="icon">⚠️</div><p>{error}</p></div>}
        {pdf && !loading && (
          <PdfPage
            key={`${document.id}-${currentPage}`}
            pdf={pdf}
            pageNum={currentPage}
            scale={scale}
            annotations={pageAnnotations}
            onAddAnnotation={handleAdd}
            onDeleteAnnotation={handleDelete}
            tool={tool}
            readOnly={readOnly}
          />
        )}
        {pdf && !loading && annotations.length > 0 && (
          <div style={{ width: "100%", maxWidth: 900 }}>
            <h2 style={{ marginBottom: 8 }}>Annotations — page {currentPage}</h2>
            {pageAnnotations.length === 0 && <p className="muted">No annotations on this page.</p>}
            {pageAnnotations.map(a => (
              <div key={a.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "6px 10px", marginBottom: 6,
                background: "var(--surface2)", borderRadius: 6,
                border: `1px solid ${a.annotation_type === "capture" ? "var(--green)" : "var(--red)"}22`,
              }}>
                <span style={{ fontSize: "0.8rem", flex: 1 }}>
                  <strong style={{ color: a.annotation_type === "capture" ? "var(--green)" : "var(--red)" }}>
                    {a.annotation_type}
                  </strong>
                  {" "}— bbox [{a.bbox.map(v => v.toFixed(0)).join(", ")}]
                  {a.extracted_text && <em className="muted"> · "{a.extracted_text.slice(0, 60)}"</em>}
                </span>
                {!readOnly && (
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(a.id)} title="Delete">✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
