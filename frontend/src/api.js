const BASE = "http://localhost:8000";

async function request(method, path, body, isForm = false) {
  const opts = { method, headers: {} };
  if (body) {
    if (isForm) {
      opts.body = body; // FormData
    } else {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ── Documents ────────────────────────────────────────────────────────────────

export async function listDocuments() {
  return request("GET", "/documents");
}

/**
 * @param {File} file
 * @param {string} name  user-supplied display name (sent as query param)
 */
export async function uploadDocument(file, name) {
  const fd = new FormData();
  fd.append("file", file);
  const path = `/documents?name=${encodeURIComponent(name)}`;
  const opts = { method: "POST", body: fd };
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

/** Raw PDF blob URL for a document */
export function pdfUrl(documentId) {
  return `${BASE}/documents/${documentId}/file`;
}

// ── Annotations ──────────────────────────────────────────────────────────────

export async function listAnnotations(documentId, page) {
  const q = page != null ? `?page=${page}` : "";
  return request("GET", `/documents/${documentId}/annotations${q}`);
}

/**
 * @param {string} documentId
 * @param {{ page_number, annotation_type, bbox }} ann
 */
export async function createAnnotation(documentId, ann) {
  return request("POST", `/documents/${documentId}/annotations`, {
    document_id: documentId,
    ...ann,
  });
}

export async function deleteAnnotation(documentId, annotationId) {
  return request("DELETE", `/documents/${documentId}/annotations/${annotationId}`);
}
