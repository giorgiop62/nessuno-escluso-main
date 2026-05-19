import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { onAuthStateChanged } from "firebase/auth";

import { firebaseAuth, getMissingFirebaseEnv } from "@/integrations/firebase/client";

function FirebaseAuthDebug() {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("Avvio Firebase Auth...");

  useEffect(() => {
    const missingEnv = getMissingFirebaseEnv();
    if (missingEnv.length) {
      setStatus(`Env mancanti: ${missingEnv.join(", ")}`);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (user) => setStatus(user ? `Login: ${user.email ?? user.uid}` : "Non loggato"),
      (error) => setStatus(error.message),
    );

    return unsubscribe;
  }, []);

  return (
    <main style={{ minHeight: "100vh", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>Firebase Auth debug</h1>
      <p style={{ color: "#555", maxWidth: 640 }}>
        React con Firebase Auth, senza router e senza CSS app.
      </p>
      <p style={{ color: "#555" }}>{status}</p>
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
    <FirebaseAuthDebug />
  </StrictMode>,
);
