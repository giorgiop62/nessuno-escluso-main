import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";

function CssDebug() {
  const [value, setValue] = useState("");

  return (
    <main className="min-h-screen px-5 py-10">
      <h1 className="font-hand text-4xl">CSS debug</h1>
      <p className="mt-2 font-hand-clean text-sm text-muted-foreground">
        React con il CSS dell'app, senza Firebase, auth o router.
      </p>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Scrivi qui"
        className="mt-6 w-full rounded-lg border border-border bg-card px-4 py-3 font-hand-clean text-base outline-none"
      />
      <p className="mt-4 font-hand-clean text-sm text-muted-foreground">Valore: {value}</p>
    </main>
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <CssDebug />
  </StrictMode>,
);
