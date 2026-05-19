import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

function ReactDebug() {
  const [value, setValue] = useState("");

  return (
    <main style={{ minHeight: "100vh", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>React debug</h1>
      <p style={{ color: "#555", maxWidth: 640 }}>
        Questa pagina usa React, ma non carica router, auth, Firebase o CSS dell'app.
      </p>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Scrivi qui"
        style={{
          boxSizing: "border-box",
          width: "100%",
          maxWidth: 640,
          padding: "14px 16px",
          borderRadius: 8,
          border: "1px solid #aaa",
          fontSize: 18,
        }}
      />
      <p style={{ color: "#555" }}>Valore: {value}</p>
    </main>
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <ReactDebug />
  </StrictMode>,
);
