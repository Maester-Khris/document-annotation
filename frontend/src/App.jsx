import React, { useState, useEffect } from "react";
import "./index.css";
import Home from "./pages/Home.jsx";
import Workspace from "./pages/Workspace.jsx";

function useHash() {
  const [hash, setHash] = useState(window.location.hash || "#home");
  useEffect(() => {
    const handler = () => setHash(window.location.hash || "#home");
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHash();
  const [workspaceDoc, setWorkspaceDoc] = useState(null);

  const page = hash.startsWith("#workspace") ? "workspace" : "home";

  const navigateWorkspace = (doc) => {
    setWorkspaceDoc(doc);
    window.location.hash = "#workspace";
  };

  return (
    <>
      {/* Nav */}
      <nav className="nav">
        <span className="nav-brand">📐 Provision</span>
        <a href="#home" className={page === "home" ? "active" : ""}>Home</a>
        <a href="#workspace" className={page === "workspace" ? "active" : ""}>Workspace</a>
      </nav>

      {/* Pages */}
      {page === "home" && (
        <Home onNavigateWorkspace={navigateWorkspace} />
      )}
      {page === "workspace" && (
        <Workspace initialDoc={workspaceDoc} />
      )}
    </>
  );
}
