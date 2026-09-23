import { Languages } from "lucide-react";
import { useLang } from "@/lib/mutah/i18n";
import { cn } from "@/lib/utils";

/** Language is a first-class control, always reachable from the header. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, t } = useLang();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn("inline-flex items-center gap-1 rounded-full border-2 border-border p-1", className)}
    >
      <Languages className="mx-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      {(["ar", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
          className={cn(
            "min-h-9 rounded-full px-3 text-xs font-bold transition-colors",
            lang === code
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-muted",
          )}
        >
          {code === "ar" ? "العربية" : "English"}
        </button>
      ))}
    </div>
  );
}
