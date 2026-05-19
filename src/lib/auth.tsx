import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { LogIn } from "lucide-react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { firebaseAuth, getMissingFirebaseEnv } from "@/integrations/firebase/client";
import { useI18n } from "@/lib/i18n";

type AuthContextValue = {
  user: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signInWithGoogle: async () => {
        const missingEnv = getMissingFirebaseEnv();
        if (missingEnv.length) {
          throw new Error(`Configura Firebase in .env: ${missingEnv.join(", ")}`);
        }
        await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      },
      signOut: async () => {
        await firebaseSignOut(firebaseAuth);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, signInWithGoogle } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setError("");
    try {
      await signInWithGoogle();
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setError(message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="bg-card paper-texture postit-shadow rounded-xl border border-border/40 px-6 py-5 text-center">
          <p className="font-hand text-3xl">{t("loadingApp")}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <section className="w-full max-w-sm bg-card paper-texture postit-shadow-lg rounded-xl border border-border/40 px-5 py-6 text-center">
          <img
            src="/nessuno-escluso-logo.png"
            alt="Nessuno Escluso"
            className="mx-auto h-auto w-full max-w-[280px] rounded-lg object-contain"
          />
          <p className="mt-2 font-hand-clean text-base text-muted-foreground">
            {t("loginSubtitle")}
          </p>
          <button
            onClick={() => void handleGoogleLogin()}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 font-hand text-xl text-background postit-shadow"
          >
            <LogIn className="size-5" />
            {t("loginGoogle")}
          </button>
          {error && <p className="mt-4 font-hand-clean text-sm text-destructive">{error}</p>}
        </section>
      </main>
    );
  }

  return children;
}

// Shared app auth hook; kept here so the provider and consumer stay in one tiny module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
