import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bot,
  CalendarClock,
  Camera,
  CircleCheck,
  CircleDashed,
  Flag,
  Image as ImageIcon,
  MapPin,
  Send,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/mutah/AppShell";
import { DecisionSummary } from "@/components/mutah/DecisionSummary";
import { EvidenceList } from "@/components/mutah/Evidence";
import { Button, Card, EmptyState, SectionTitle, Tag } from "@/components/mutah/ui";
import { OfficialImageAction } from "@/components/mutah/OfficialImageAction";
import { decideFor } from "@/lib/mutah/decision";
import { useLang } from "@/lib/mutah/i18n";
import {
  VERIFICATION_LABEL,
  ZONE_HINT,
  ZONE_INDICATORS,
  ZONE_LABEL,
  ZONE_ORDER,
  formatDate,
} from "@/lib/mutah/labels";
import { useMutah } from "@/lib/mutah/store";
import type { EvidenceImage, Facility, ZoneKey } from "@/lib/mutah/types";

export const Route = createFileRoute("/facility/$id")({
  head: () => ({
    meta: [
      { title: "أدلة الوصول | مُتاح ماب" },
      {
        name: "description",
        content:
          "أدلة مرئية متعددة عن مسار الوصول والمدخل والمواقف والمصعد ودورة المياه المخصصة، مع توضيح ما نعرفه وما لا نعرفه.",
      },
      { property: "og:title", content: "أدلة الوصول | مُتاح ماب" },
      {
        property: "og:description",
        content: "الأدلة أولًا: صور متعددة، خمسة مسارات، وحالة مخصصة لاحتياجاتك.",
      },
    ],
  }),
  component: FacilityProfile,
});

function FacilityProfile() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { getFacility, needs, contributions } = useMutah();
  const { t, pick, lang } = useLang();
  const facility = getFacility(id);
  const [activeZone, setActiveZone] = useState<ZoneKey>("entrance");

  const gallery = useMemo(() => {
    if (!facility) return [] as EvidenceImage[];
    const seen = new Set<string>();
    return ZONE_ORDER.flatMap((zone) => facility.zones[zone].images).filter((image) => {
      if (!image.url || seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    });
  }, [facility]);

  if (!facility) {
    return (
      <AppShell>
        <EmptyState
          title={t("notFound")}
          description={t("notFoundBody")}
          action={
            <Link to="/discover">
              <Button>{t("backToDiscover")}</Button>
            </Link>
          }
        />
      </AppShell>
    );
  }

  const decision = decideFor(facility, needs);
  const pending = contributions.filter(
    (c) => c.facilityId === facility.id && c.status === "pending_review",
  );
  const documentedZones = ZONE_ORDER.filter((zone) => facility.zones[zone].documented).length;

  return (
    <AppShell title={pick(facility.name)}>
      <article className="mx-auto max-w-3xl">
        <header>
          <h1 className="text-2xl font-bold">{pick(facility.name)}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
            <span>{pick(facility.category)}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <MapPin className="size-4" aria-hidden="true" />
              {pick(facility.area)}
            </span>
          </p>
        </header>

        {facility.imageUrl ? (
          <figure className="mt-5">
            <img
              src={facility.imageUrl}
              alt={pick(facility.imageAlt)}
              className="aspect-video w-full rounded-2xl object-cover"
            />
            <figcaption className="mt-2 text-xs text-muted-foreground">
              {lang === "ar"
                ? "الصورة الرسمية للمرفق — منفصلة عن أدلة الوصول."
                : "Official facility photo — separate from access evidence."}
            </figcaption>
          </figure>
        ) : null}

        <OfficialImageAction facility={facility} />

        <div className="mt-5">
          <DecisionSummary decision={decision} hasNeeds={needs.length > 0} />
        </div>

        {pending.length > 0 ? (
          <p className="mt-4 rounded-xl border-2 border-dashed border-input bg-unknown-soft p-4 text-sm">
            {pending.length} {t("pendingHere")}
          </p>
        ) : null}

        <EvidenceGallery facility={facility} gallery={gallery} />

        <section aria-labelledby="evidence-title" className="mt-10">
          <div id="evidence-title">
            <SectionTitle
              hint={
                lang === "ar"
                  ? "كل منطقة لها أدلتها الخاصة. عدم وجود صورة لمنطقة ما يعني أنها غير موثقة بعد، وليس أنها غير موجودة."
                  : "Each zone has its own evidence. No image for a zone means it is not documented yet, not that it does not exist."
              }
            >
              {t("evidenceHere")}
            </SectionTitle>
          </div>

          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            <Tag tone="brand">
              {lang === "ar"
                ? `${documentedZones} من 5 مناطق لديها أدلة`
                : `${documentedZones} of 5 zones have evidence`}
            </Tag>
            {documentedZones < 5 ? (
              <Tag>
                {lang === "ar" ? "توجد مناطق تحتاج توثيقًا" : "Some zones still need documentation"}
              </Tag>
            ) : null}
          </div>

          <ZoneEvidence facility={facility} activeZone={activeZone} onZoneChange={setActiveZone} />
        </section>

        <section aria-labelledby="analysis-title" className="mt-10">
          <div id="analysis-title">
            <SectionTitle hint={t("analysisTrailHint")}>{t("analysisTrail")}</SectionTitle>
          </div>
          <Card className="mutah-open-edge bg-surface">
            <ol className="mb-4 grid gap-3 sm:grid-cols-4">
              {[
                {
                  icon: Bot,
                  ar: "رصد الذكاء الاصطناعي",
                  en: "AI observed",
                  complete: facility.source === "contributor_image" && documentedZones > 0,
                  applicable: facility.source === "contributor_image",
                },
                {
                  icon: UserCheck,
                  ar: "أكد المساهم أو صحّح",
                  en: "Contributor confirmed or corrected",
                  complete:
                    facility.source === "contributor_image" &&
                    !["contributor_only", "pending_review"].includes(facility.verification),
                  applicable: facility.source === "contributor_image",
                },
                {
                  icon: ShieldCheck,
                  ar: "راجع فريق مُتاح",
                  en: "MUTAH reviewed",
                  complete: ["team_reviewed", "stale"].includes(facility.verification),
                  applicable: true,
                },
                {
                  icon: Send,
                  ar: "نُشرت المعلومة",
                  en: "Information published",
                  complete: ["team_reviewed", "stale"].includes(facility.verification),
                  applicable: true,
                },
              ].map((step) => {
                const StepIcon = step.icon;
                const StateIcon = step.complete ? CircleCheck : CircleDashed;
                return (
                  <li
                    key={step.en}
                    className={`rounded-xl border p-3 text-sm ${step.complete ? "border-access/30 bg-access-soft/40" : "border-dashed border-input bg-background"}`}
                  >
                    <span className="mb-2 flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <StepIcon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="font-semibold">{lang === "ar" ? step.ar : step.en}</span>
                    <span className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <StateIcon className="size-3.5" aria-hidden="true" />
                      {!step.applicable
                        ? lang === "ar"
                          ? "غير منطبق على مصدر هذا السجل"
                          : "Not part of this record's source"
                        : step.complete
                          ? lang === "ar"
                            ? "مكتملة لهذا السجل"
                            : "Complete for this record"
                          : lang === "ar"
                            ? "لم تكتمل لهذا السجل"
                            : "Not complete for this record"}
                    </span>
                  </li>
                );
              })}
            </ol>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                {t("source")}:{" "}
                {facility.source === "team_survey" ? t("sourceTeam") : t("sourceContributor")}
              </li>
              <li>{t("notCertification")}</li>
              <li>
                {lang === "ar"
                  ? "الذكاء الاصطناعي يصف ما تدعمه الصور فقط؛ النتيجة المنشورة تتطلب مراجعة بشرية."
                  : "AI only describes what the images support; published evidence requires human review."}
              </li>
            </ul>
          </Card>
        </section>

        <section aria-labelledby="status-title" className="mt-10">
          <div id="status-title">
            <SectionTitle>{t("infoStatus")}</SectionTitle>
          </div>
          <Card>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
                {pick(VERIFICATION_LABEL[facility.verification])}
              </li>
              <li className="flex items-center gap-2">
                <CalendarClock className="size-5 text-primary" aria-hidden="true" />
                {t("lastVerified")}: {formatDate(facility.lastVerifiedISO, lang)}
              </li>
              <li>
                <Tag>
                  {t("source")}:{" "}
                  {facility.source === "team_survey" ? t("sourceTeam") : t("sourceContributor")}
                </Tag>
              </li>
            </ul>
          </Card>
        </section>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="sm:flex-1"
            onClick={() =>
              navigate({ to: "/contribute/$facilityId", params: { facilityId: facility.id } })
            }
          >
            <Camera className="size-5" aria-hidden="true" />
            {t("contributeNewer")}
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate({ to: "/contribute" })}>
            <Flag className="size-5" aria-hidden="true" />
            {t("reportChange")}
          </Button>
        </div>
      </article>
    </AppShell>
  );
}

function EvidenceGallery({ facility, gallery }: { facility: Facility; gallery: EvidenceImage[] }) {
  const { t, pick, lang } = useLang();
  const visible = gallery.slice(0, 4);

  if (visible.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border-2 border-dashed border-input p-10 text-center text-sm text-muted-foreground">
        <ImageIcon className="mx-auto mb-3 size-6" aria-hidden="true" />
        {t("noRecentPhoto")}
      </div>
    );
  }

  return (
    <section
      aria-label={lang === "ar" ? "معرض أدلة الوصول" : "Access evidence gallery"}
      className="mt-5"
    >
      <div className={`grid gap-2 ${visible.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {visible.map((image, index) => (
          <img
            key={`${image.url}-${index}`}
            src={image.url}
            alt={pick(image.alt) || pick(facility.imageAlt)}
            width={1200}
            height={900}
            className={`door-reveal w-full rounded-2xl object-cover ${index === 0 && visible.length > 2 ? "col-span-2 aspect-video" : "aspect-4/3"}`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {lang === "ar"
          ? "الصور قد تمثل مناطق مختلفة داخل وخارج المرفق. افتح كل مسار أدناه لمعرفة ما يدعمه الدليل."
          : "Images may represent different areas inside and outside the facility. Open each zone below to see what its evidence supports."}
      </p>
    </section>
  );
}

function ZoneEvidence({
  facility,
  activeZone,
  onZoneChange,
}: {
  facility: Facility;
  activeZone: ZoneKey;
  onZoneChange: (z: ZoneKey) => void;
}) {
  const { t, pick, lang } = useLang();
  const zone = facility.zones[activeZone];
  const items = ZONE_INDICATORS[activeZone].map((k) => facility.indicators[k]);

  return (
    <div>
      <div role="tablist" aria-label={t("evidenceViews")} className="flex flex-wrap gap-2">
        {ZONE_ORDER.map((z) => {
          const documented = facility.zones[z].documented;
          const selected = z === activeZone;
          return (
            <button
              key={z}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onZoneChange(z)}
              className={[
                "min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition-colors",
                selected
                  ? "border-primary bg-primary-soft text-primary"
                  : documented
                    ? "border-border bg-background hover:bg-muted"
                    : "border-dashed border-input bg-unknown-soft/60 text-muted-foreground",
              ].join(" ")}
            >
              {pick(ZONE_LABEL[z])}
              {!documented ? (
                <span className="ms-1 text-xs">
                  · {lang === "ar" ? "غير موثق" : "not documented"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="door-reveal mt-5" key={activeZone}>
        <p className="text-sm text-muted-foreground">{pick(ZONE_HINT[activeZone])}</p>

        {zone.images.length > 0 ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {zone.images.map((image, i) => (
              <li key={`${image.url}-${i}`}>
                <img
                  src={image.url}
                  alt={pick(image.alt)}
                  loading="lazy"
                  width={1200}
                  height={900}
                  className="aspect-4/3 w-full rounded-2xl object-cover"
                />
              </li>
            ))}
          </ul>
        ) : zone.documented ? (
          <div className="mt-4 rounded-2xl border border-border bg-surface p-6 text-sm">
            <p className="font-semibold">
              {lang === "ar"
                ? "توجد أدلة مراجعة لهذا المسار"
                : "Reviewed evidence is available for this zone"}
            </p>
            <p className="mt-1 text-muted-foreground">
              {lang === "ar"
                ? "تظهر الخلاصة المراجعة أدناه. لا تُعرض الصور الخاصة ما لم تمر بعملية النشر الآمنة."
                : "The reviewed summary appears below. Private images are not shown unless they complete the safe publication process."}
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-input bg-unknown-soft/50 p-6 text-center text-sm">
            <p className="font-semibold">{t("noEvidenceForZone")}</p>
            <p className="mt-1 text-muted-foreground">
              {lang === "ar"
                ? "هذه الحالة لا تعني أن العنصر غير موجود؛ نحتاج صورة مناسبة فقط."
                : "This does not mean the feature is absent; an appropriate photo is still needed."}
            </p>
            <Link
              to="/contribute/$facilityId"
              params={{ facilityId: facility.id }}
              search={{ zone: activeZone }}
              className="mt-3 inline-flex min-h-11 items-center rounded-xl border-2 border-input bg-background px-4 font-semibold hover:bg-muted"
            >
              {t("contributeThisView")}
            </Link>
          </div>
        )}

        <div className="mt-5">
          <EvidenceList items={items} />
        </div>
      </div>
    </div>
  );
}
