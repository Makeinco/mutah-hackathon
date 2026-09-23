import { Link } from "@tanstack/react-router";
import { CircleAlert, CircleCheck, CircleHelp, Clock3, MapPin } from "lucide-react";
import type { ComponentType } from "react";
import { decideFor, VERDICT_LABEL, type NeedOutcome } from "@/lib/mutah/decision";
import { useLang } from "@/lib/mutah/i18n";
import { ACCESS_NEED_LABEL, VERIFICATION_LABEL, relativeDate } from "@/lib/mutah/labels";
import type { AccessNeed, Facility } from "@/lib/mutah/types";
import { AccessNeedIcon } from "./AccessNeedIcon";
import { Tag } from "./ui";

const DEFAULT_NEEDS: AccessNeed[] = [
  "step_free",
  "ramp_when_raised",
  "parking",
  "elevator",
  "accessible_restroom",
];

const OUTCOME_STYLE: Record<
  NeedOutcome,
  {
    icon: ComponentType<{ className?: string }>;
    className: string;
    iconWrap: string;
    card: string;
  }
> = {
  met: {
    icon: CircleCheck,
    className: "text-access-strong",
    iconWrap: "bg-access-soft text-access-strong",
    card: "border-access/20 bg-access-soft/25",
  },
  not_met: {
    icon: CircleAlert,
    className: "text-warn-strong",
    iconWrap: "bg-caution-soft text-caution",
    card: "border-caution/20 bg-caution-soft/20",
  },
  unknown: {
    icon: CircleHelp,
    className: "text-muted-foreground",
    iconWrap: "bg-muted text-muted-foreground",
    card: "border-border bg-surface",
  },
};

export function FacilityCard({ facility, needs }: { facility: Facility; needs: AccessNeed[] }) {
  const { pick, t, lang } = useLang();
  const decision = decideFor(facility, needs);
  const shownNeeds = (needs.length > 0 ? needs : DEFAULT_NEEDS).slice(0, 5);
  const shownResults = decideFor(facility, shownNeeds).results;
  const name = pick(facility.name);
  const missing = Math.max(0, decision.total - decision.completeness);
  const evidenceLabel =
    missing === 0
      ? lang === "ar"
        ? "البيانات مكتملة"
        : "Complete data"
      : lang === "ar"
        ? "البيانات غير مكتملة"
        : "Incomplete data";
  const EvidenceIcon =
    missing === 0 ? CircleCheck : decision.completeness === 0 ? CircleAlert : Clock3;

  return (
    <article className="mutah-surface mutah-open-edge group overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/30">
      <div className="flex gap-4 p-4 sm:p-5">
        {facility.imageUrl ? (
          <img
            src={facility.imageUrl}
            alt={pick(facility.imageAlt)}
            loading="lazy"
            width={1200}
            height={900}
            className="size-24 shrink-0 rounded-2xl object-cover sm:size-28"
          />
        ) : (
          <div className="flex size-24 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-input text-center text-xs text-muted-foreground sm:size-28">
            {t("noPhoto")}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-tight">
            <Link
              to="/facility/$id"
              params={{ id: facility.id }}
              className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {name}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {pick(facility.category)} · {pick(facility.area)}
            {facility.distanceKm !== undefined
              ? lang === "ar"
                ? ` · نحو ${facility.distanceKm} كم`
                : ` · about ${facility.distanceKm} km`
              : ""}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Tag
              tone={
                decision.verdict === "available"
                  ? "access"
                  : decision.verdict === "not_available"
                    ? "warn"
                    : "neutral"
              }
            >
              {pick(VERDICT_LABEL[decision.verdict])}
            </Tag>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <EvidenceIcon className="size-4" aria-hidden="true" />
              {evidenceLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-surface/45 px-4 py-4 sm:px-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-bold">{lang === "ar" ? "احتياجات الوصول" : "Access needs"}</p>
          <span className="text-xs text-muted-foreground">
            {lang === "ar" ? "وفق احتياجاتك" : "For your needs"}
          </span>
        </div>

        <ul className="flex flex-wrap gap-2">
          {shownResults.map((result) => {
            const outcome = OUTCOME_STYLE[result.outcome];
            const OutcomeIcon = outcome.icon;
            return (
              <li
                key={result.need}
                title={pick(result.reason)}
                className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 ${outcome.card}`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-lg ${outcome.iconWrap}`}
                >
                  <AccessNeedIcon need={result.need} className="size-4" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold">
                  {pick(ACCESS_NEED_LABEL[result.need])}
                </span>
                <OutcomeIcon className={`size-4 ${outcome.className}`} aria-hidden="true" />
                <span className="text-xs font-semibold">
                  {result.outcome === "met"
                    ? lang === "ar"
                      ? "متوفر"
                      : "Met"
                    : result.outcome === "not_met"
                      ? lang === "ar"
                        ? "عائق موثق"
                        : "Barrier"
                      : lang === "ar"
                        ? "غير معروف"
                        : "Unknown"}
                </span>
                <span className="sr-only">. {pick(result.reason)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
        <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{pick(facility.area)}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{pick(VERIFICATION_LABEL[facility.verification])}</span>
          <span className="hidden sm:inline">· {relativeDate(facility.lastVerifiedISO, lang)}</span>
        </span>
        <Link
          to="/facility/$id"
          params={{ id: facility.id }}
          className="min-h-11 shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t("viewDetails")}
          <span className="sr-only">
            {" "}
            {t("about")} {name}
          </span>
        </Link>
      </div>
    </article>
  );
}
