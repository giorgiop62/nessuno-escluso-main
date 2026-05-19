import { StrictMode, startTransition } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";
import { AuthGate, AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { CreateEventForm } from "@/components/CreateEventForm";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

if (window.location.pathname === "/create") {
  createRoot(rootElement).render(
    <StrictMode>
      <I18nProvider>
        <AuthProvider>
          <AuthGate>
            <CreateEventForm onCreated={(id) => window.location.assign(`/event/${id}`)} />
          </AuthGate>
        </AuthProvider>
      </I18nProvider>
    </StrictMode>,
  );
} else {
  startTransition(() => {
    void import("./router")
      .then(({ getRouter }) => {
        const router = getRouter();
        return router.load().finally(async () => {
          const { RouterProvider } = await import("@tanstack/react-router");
          createRoot(rootElement).render(
            <StrictMode>
              <RouterProvider router={router} />
            </StrictMode>,
          );
        });
      })
      .catch((error) => {
        console.error(error);
        createRoot(rootElement).render(
          <StrictMode>
            <p>Questa pagina non si è caricata.</p>
          </StrictMode>,
        );
      });
  });
}
