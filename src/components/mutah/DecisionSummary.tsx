import { CircleAlert, CircleCheck, CircleHelp, CircleSlash } from "lucide-react";
import { useState, type ComponentType } from "react";
import { VERDICT_DETAIL, VERDICT_LABEL, type Decision, type Verdict } from "@/lib/mutah/decision";
import { useLang } from "@/lib/mutah/i18n";
import { ACCESS_NEED_LABEL } from "@/lib/mutah/labels";
import { cn } from "@/lib/utils";
import { AccessNeedIcon } from "./AccessNeedIcon";

const VERDICT_STYLE: Record<
  Verdict,
  { icon: ComponentType<{ className?: string }>; frame: string; accent: string }
> = {
  available: {
    icon: CircleCheck,
    frame: "border-access bg-access-soft",
    accent: "text-access-strong",
  },
  partial: { icon: CircleAlert, frame: "border-caution bg-caution-soft", accent: "text-caution" },
  not_available: {
    icon: CircleSlash,
    frame: "border-destructive/50 bg-destructive/5",
    accent: "text-destructive",
  },
  insufficient: {
    icon: CircleHelp,
    frame: "border-input border-dashed bg-unknown-soft",
    accent: "text-unknown",
  },
};

export function DecisionSummary({ decision, hasNeeds }: { decision: Decision; hasNeeds: boolean }) {
  const { pick, t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const style = VERDICT_STYLE[decision.verdict];
  const Icon = style.icon;
  const missing = Math.max(0, decision.total - decision.completeness);

  return (
    <section
      aria-labelledby="decision-title"
      className={cn(
        "door-reveal mutah-surface mutah-open-edge rounded-2xl border-2 p-5",
        style.frame,
      )}
    >
      <p className="mb-2 text-sm font-semibold text-muted-foreground">{t("personalStatus")}</p>
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 size-7 shrink-0", style.accent)} aria-hidden="true" />
        <div>
          <h2 id="decision-title" className={cn("text-xl font-bold", style.accent)}>
            {hasNeeds ? pick(VERDICT_LABEL[decision.verdict]) : t("infoLimited")}
          </h2>
          <p className="mt-1 text-sm text-foreground/80">
            {hasNeeds ? pick(VERDICT_DETAIL[decision.verdict]) : t("noNeedsYet")}
          </p>
        </div>
      </div>

      {decision.results.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mt-4 min-h-11 rounded-xl border border-border bg-background/80 px-4 text-sm font-bold transition-colors hover:bg-background"
          >
            {t("whyThisResult")}
          </button>

          {open ? (
            <ul className="door-reveal mt-3 space-y-2">
              {decision.results.map((r) => (
                <li
                  key={r.need}
                  className="flex gap-2 rounded-xl border border-border/70 bg-background/80 p-3 text-sm"
                >
                  <span className="relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <AccessNeedIcon need={r.need} className="size-5" aria-hidden="true" />
                    <span
                      className={`absolute -bottom-1 -end-1 size-2.5 rounded-full border-2 border-background ${r.outcome === "met" ? "bg-access" : r.outcome === "not_met" ? "bg-caution" : "bg-unknown"}`}
                      aria-hidden="true"
                    />
                  </span>
                  <span>
                    <span className="font-semibold">{pick(ACCESS_NEED_LABEL[r.need])}</span>
                    <span className="text-muted-foreground"> — {pick(r.reason)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      <p className="mt-4 text-sm text-muted-foreground">
        {missing === 0
          ? t("infoComplete")
          : lang === "ar"
            ? `توجد أدلة ناقصة في ${missing === 1 ? "عنصر واحد" : "بعض العناصر"}.`
            : `Evidence is still missing for ${missing === 1 ? "one item" : "some items"}.`}
      </p>
    </section>
  );
}
