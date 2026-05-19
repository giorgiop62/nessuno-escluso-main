import { Languages } from "lucide-react";
import { useI18n, type Language } from "@/lib/i18n";

const languages: { value: Language; label: string }[] = [
  { value: "it", label: "IT" },
  { value: "en", label: "EN" },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-border/40 bg-card/90 p-1 paper-texture postit-shadow ${
        compact ? "" : "px-2"
      }`}
      aria-label={t("language")}
      title={t("language")}
    >
      {!compact && <Languages className="size-4 text-muted-foreground" />}
      {languages.map((item) => (
        <button
          key={item.value}
          onClick={() => setLanguage(item.value)}
          className={`min-w-8 rounded-full px-2 py-1 font-hand-clean text-xs transition-colors ${
            language === item.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
