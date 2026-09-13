import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function App() {
  // ponytail: scaffold only — file input -> pdfjsLib.getDocument -> render page to
  // <canvas> per page, drawing overlay canvas on top for rectangle capture.
  return (
    <div>
      <h1>PDF Annotator</h1>
    </div>
  );
}
