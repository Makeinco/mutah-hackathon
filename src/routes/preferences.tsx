import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AccessNeedIcon } from "@/components/mutah/AccessNeedIcon";
import { AppShell } from "@/components/mutah/AppShell";
import { Button } from "@/components/mutah/ui";
import { useLang } from "@/lib/mutah/i18n";
import { ACCESS_NEEDS, ACCESS_NEED_LABEL } from "@/lib/mutah/labels";
import { useMutah } from "@/lib/mutah/store";
import type { AccessNeed } from "@/lib/mutah/types";

export const Route = createFileRoute("/preferences")({
  head: () => ({
    meta: [
      { title: "احتياجات الوصول | مُتاح ماب" },
      {
        name: "description",
        content:
          "اختر ما يجعل الزيارة أسهل: مسار بلا درجات، منحدر، مسار خالٍ من العوائق، درابزين، موقف مخصص، مصعد، أو دورة مياه مخصصة.",
      },
      { property: "og:title", content: "احتياجات الوصول | مُتاح ماب" },
      {
        property: "og:description",
        content: "نستخدم احتياجاتك لشرح ما يطابقها وما لا يطابقها في كل مكان.",
      },
    ],
  }),
  component: Preferences,
});

function Preferences() {
  const navigate = useNavigate();
  const { needs, setNeeds, skipNeeds } = useMutah();
  const { t, pick, lang } = useLang();
  const [selected, setSelected] = useState<AccessNeed[]>(needs);

  const toggle = (n: AccessNeed) =>
    setSelected((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));

  return (
    <AppShell title={t("accessNeeds")}>
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold">{t("needsTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("needsIntro")}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ar"
            ? "اختر فقط ما يهمك. سيستخدم مُتاح هذه الاختيارات لشرح حالة كل مرفق وفق احتياجاتك."
            : "Choose only what matters to you. MUTAH uses these selections to explain each facility against your needs."}
        </p>

        <fieldset className="mt-8">
          <legend className="sr-only">{t("needsLegend")}</legend>
          <ul className="grid gap-3 sm:grid-cols-2">
            {ACCESS_NEEDS.map((n) => {
              const checked = selected.includes(n);
              return (
                <li key={n}>
                  <label
                    className={[
                      "flex min-h-20 cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 text-base font-semibold transition-colors",
                      checked
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-card hover:bg-muted",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(n)}
                      className="sr-only"
                    />
                    <span
                      className={[
                        "flex size-11 shrink-0 items-center justify-center rounded-xl border",
                        checked ? "border-primary/20 bg-background" : "border-border bg-surface",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      <AccessNeedIcon need={n} className="size-5" />
                    </span>
                    <span className="flex-1">{pick(ACCESS_NEED_LABEL[n])}</span>
                    <span className="sr-only">
                      {checked ? (lang === "ar" ? "محدد" : "selected") : ""}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="sm:flex-1"
            onClick={() => {
              setNeeds(selected);
              navigate({ to: "/discover" });
            }}
          >
            {t("continueLabel")}
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => {
              skipNeeds();
              navigate({ to: "/discover" });
            }}
          >
            {t("skipForNow")}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
